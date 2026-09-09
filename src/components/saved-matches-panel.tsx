"use client";

import { useEffect, useState } from "react";
import { Calendar, Check, Loader2, Plus, Trash2, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Input } from "./ui/input";
import { BOOKMAKER, fetchOddsmathMarkets, MARKET_COLUMN_LIST, minutesAgo } from "@/lib/oddsmath-client";
import type { SingleMarket } from "@/lib/oddsmath-client";

interface SavedMatch {
  id: string;
  url: string;
  home: string;
  away: string;
  // Raw "YYYY-MM-DD HH:mm:ss" from OddsMath, as given by the API (UTC) — see
  // kickoffEpoch/kickoffLabel below for the +3h Turkey-time conversion
  // applied at display/sort time, not stored pre-shifted.
  time: string;
}

// Per-match toggle state — not persisted, purely a live view of "which
// markets are currently applied to the filters for this row" plus 1XBET's
// own last-updated timestamp for each, shown as "X dakika önce".
interface RowState {
  msActive: boolean;
  ouActive: boolean;
  msUpdated: string | null;
  ouUpdated: string | null;
  error: string | null;
}

const EMPTY_ROW: RowState = { msActive: false, ouActive: false, msUpdated: null, ouUpdated: null, error: null };

const STORAGE_KEY = "big5-saved-matches";

function loadSaved(): SavedMatch[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistSaved(matches: SavedMatch[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(matches));
  } catch {
    // ignore storage write failures (private mode, quota, etc.)
  }
}

// OddsMath's event times come back in UTC; this app displays Turkey time.
const KICKOFF_OFFSET_MS = 3 * 60 * 60 * 1000;

function kickoffEpoch(time: string): number {
  if (!time) return Infinity;
  const ms = Date.parse(`${time.replace(" ", "T")}Z`);
  return Number.isNaN(ms) ? Infinity : ms + KICKOFF_OFFSET_MS;
}

function kickoffLabel(time: string): string {
  const epoch = kickoffEpoch(time);
  if (!Number.isFinite(epoch)) return "—";
  const d = new Date(epoch);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

const updatedLabel = (updated: string | null) => {
  const mins = minutesAgo(updated);
  if (mins === null) return null;
  return mins === 0 ? "az önce" : `${mins} dakika önce`;
};

// A small watchlist of today's matches, kept in localStorage: paste an
// OddsMath link once, and from then on toggle whichever market you need for
// that exact match straight from the list — no more re-copying the same
// link over and over during the day.
export function SavedMatchesPanel({
  onApply,
  onClear,
}: {
  onApply?: (values: Record<string, number>) => void;
  onClear?: (columns: string[]) => void;
}) {
  const [matches, setMatches] = useState<SavedMatch[]>([]);
  const [url, setUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  // Only one saved match's odds can actually be "in effect" at a time — they
  // all write into the same numeric filter columns — so this tracks whose
  // toggles are currently live, to clear them the moment a different match
  // gets activated instead of leaving stale blue chips lit for a match
  // you've already moved on from.
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  // Ticks once a minute so the "X dakika önce" labels keep advancing while
  // the panel stays open, without needing a fetch to refresh them.
  const [, setTick] = useState(0);

  useEffect(() => {
    const initial = loadSaved();
    setMatches(initial);

    // One-time backfill for matches saved before this panel tracked kickoff
    // time — fetch it quietly in the background so old entries stop showing
    // "—" and can join the by-time sort like newly added ones.
    const missing = initial.filter((m) => !m.time);
    if (missing.length > 0) {
      (async () => {
        for (const m of missing) {
          try {
            const { results } = await fetchOddsmathMarkets(m.url, "1x2");
            const time = results[0]?.event?.time;
            if (!time) continue;
            setMatches((prev) => {
              const next = prev.map((x) => (x.id === m.id ? { ...x, time } : x));
              persistSaved(next);
              return next;
            });
          } catch {
            // leave it without a time — shows "—" and sorts last, harmless
          }
        }
      })();
    }
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const addMatch = async () => {
    const trimmed = url.trim();
    if (!trimmed || adding) return;
    if (matches.some((m) => m.url === trimmed)) {
      setAddError("Bu maç zaten listede");
      return;
    }
    setAdding(true);
    setAddError(null);
    try {
      const { results } = await fetchOddsmathMarkets(trimmed, "1x2");
      const event = results[0]?.event;
      if (!event) throw new Error("Maç bilgisi alınamadı");
      const next = [
        ...matches,
        { id: crypto.randomUUID(), url: trimmed, home: event.home, away: event.away, time: event.time },
      ];
      setMatches(next);
      persistSaved(next);
      setUrl("");
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Maç eklenemedi");
    } finally {
      setAdding(false);
    }
  };

  const removeMatch = (id: string) => {
    if (id === activeMatchId) clearRowFilters(id);
    const next = matches.filter((m) => m.id !== id);
    setMatches(next);
    persistSaved(next);
    setRows((prev) => {
      const { [id]: _drop, ...rest } = prev;
      return rest;
    });
  };

  const patchRow = (id: string, patch: Partial<RowState>) => {
    setRows((prev) => ({ ...prev, [id]: { ...(prev[id] ?? EMPTY_ROW), ...patch } }));
  };

  // Unsets whatever this row currently has applied and resets its chips —
  // used both when explicitly clearing and when switching to another match.
  const clearRowFilters = (id: string) => {
    const row = rows[id];
    if (!row) return;
    const cols: string[] = [];
    if (row.msActive) cols.push(...MARKET_COLUMN_LIST["1x2"]);
    if (row.ouActive) cols.push(...MARKET_COLUMN_LIST.ou25);
    if (cols.length) onClear?.(cols);
    setRows((prev) => ({ ...prev, [id]: EMPTY_ROW }));
  };

  // Only one match should ever be "live" in the filters — switching to a
  // different one first clears whatever the previously active match left on.
  const ensureActiveMatch = (id: string) => {
    if (activeMatchId && activeMatchId !== id) clearRowFilters(activeMatchId);
    setActiveMatchId(id);
  };

  // Same toggle logic as the Anlık Oran panel, per saved match: off → on
  // fetches 1XBET's price and applies it; on → off clears those columns —
  // no re-fetch needed since the column list per market is static.
  const toggleSingle = async (m: SavedMatch, which: SingleMarket) => {
    const row = rows[m.id] ?? EMPTY_ROW;
    const isActive = which === "1x2" ? row.msActive : row.ouActive;
    if (isActive) {
      onClear?.(MARKET_COLUMN_LIST[which]);
      const patch = which === "1x2" ? { msActive: false, msUpdated: null } : { ouActive: false, ouUpdated: null };
      patchRow(m.id, patch);
      const stillActive = which === "1x2" ? row.ouActive : row.msActive;
      if (!stillActive) setActiveMatchId((cur) => (cur === m.id ? null : cur));
      return;
    }
    if (loadingKey) return;
    ensureActiveMatch(m.id);
    const key = `${m.id}:${which}`;
    setLoadingKey(key);
    patchRow(m.id, { error: null });
    try {
      const { results, values } = await fetchOddsmathMarkets(m.url, which);
      const result = results[0];
      const bookRow = result?.rows.find((r) => r.bookmaker === BOOKMAKER) ?? null;
      if (Object.keys(values).length === 0) throw new Error("1XBET bu maç için oran vermiyor");
      onApply?.(values);
      patchRow(
        m.id,
        which === "1x2"
          ? { msActive: true, msUpdated: bookRow?.updated ?? null }
          : { ouActive: true, ouUpdated: bookRow?.updated ?? null }
      );
    } catch (e) {
      patchRow(m.id, { error: e instanceof Error ? e.message : "Oranlar alınamadı" });
    } finally {
      setLoadingKey(null);
    }
  };

  const toggleBoth = async (m: SavedMatch) => {
    const row = rows[m.id] ?? EMPTY_ROW;
    if (row.msActive && row.ouActive) {
      onClear?.([...MARKET_COLUMN_LIST["1x2"], ...MARKET_COLUMN_LIST.ou25]);
      patchRow(m.id, { msActive: false, ouActive: false, msUpdated: null, ouUpdated: null });
      setActiveMatchId((cur) => (cur === m.id ? null : cur));
      return;
    }
    if (loadingKey) return;
    ensureActiveMatch(m.id);
    const key = `${m.id}:both`;
    setLoadingKey(key);
    patchRow(m.id, { error: null });
    try {
      const { results, values } = await fetchOddsmathMarkets(m.url, "both");
      if (Object.keys(values).length === 0) throw new Error("1XBET bu maç için oran vermiyor");
      onApply?.(values);
      const patch: Partial<RowState> = { msActive: true, ouActive: true };
      for (const result of results) {
        const bookRow = result.rows.find((r) => r.bookmaker === BOOKMAKER) ?? null;
        if (result.market === "1x2") patch.msUpdated = bookRow?.updated ?? null;
        else patch.ouUpdated = bookRow?.updated ?? null;
      }
      patchRow(m.id, patch);
    } catch (e) {
      patchRow(m.id, { error: e instanceof Error ? e.message : "Oranlar alınamadı" });
    } finally {
      setLoadingKey(null);
    }
  };

  // Soonest kickoff first.
  const sorted = [...matches].sort((a, b) => kickoffEpoch(a.time) - kickoffEpoch(b.time));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 text-sm text-foreground hover:border-muted-2 transition-colors"
        >
          <Calendar className="h-3.5 w-3.5 text-muted" />
          Günün Maçları
          {matches.length > 0 && (
            <span className="rounded-full bg-accent/20 px-1.5 py-0.5 text-[11px] font-semibold text-accent">
              {matches.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="end">
        <div className="flex items-center gap-1.5 border-b border-border px-2 py-1.5">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addMatch()}
            placeholder="oddsmath.com maç linki ekle"
            className="h-7 flex-1 text-xs"
          />
          <button
            type="button"
            onClick={addMatch}
            disabled={adding}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-surface-2 text-foreground transition-colors hover:border-muted-2 disabled:cursor-not-allowed disabled:opacity-60"
            title="Listeye ekle"
          >
            {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          </button>
        </div>
        {addError && <p className="px-3.5 pt-1.5 text-xs text-away">{addError}</p>}
        <div className="max-h-[420px] overflow-y-auto p-1.5">
          {matches.length === 0 && (
            <p className="px-2.5 py-3 text-xs text-muted">
              Bugün takip edeceğiniz maçların OddsMath linklerini ekleyin — her birinden istediğiniz
              oranı MS / Alt Üst / İkisi&apos;ne basarak filtreye uygulayabilir, tekrar basınca
              kaldırabilirsiniz.
            </p>
          )}
          {sorted.map((m) => {
            const row = rows[m.id] ?? EMPTY_ROW;
            const msLabel = row.msActive ? updatedLabel(row.msUpdated) : null;
            const ouLabel = row.ouActive ? updatedLabel(row.ouUpdated) : null;
            return (
              <div key={m.id} className="group rounded-md px-1.5 py-1.5 hover:bg-surface-2">
                <div className="flex items-center gap-1.5">
                  {row.msActive || row.ouActive ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-accent" />
                  ) : (
                    <Calendar className="h-3.5 w-3.5 shrink-0 text-muted" />
                  )}
                  <span className="flex-1 truncate text-xs font-medium text-foreground">
                    {m.home} – {m.away}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-muted">{kickoffLabel(m.time)}</span>
                  <button
                    type="button"
                    onClick={() => removeMatch(m.id)}
                    className="shrink-0 rounded-md p-1 text-muted opacity-0 transition-opacity hover:text-away group-hover:opacity-100"
                    title="Listeden kaldır"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <ToggleChip
                    label="MS"
                    active={row.msActive}
                    loading={loadingKey === `${m.id}:1x2`}
                    disabled={!!loadingKey}
                    onClick={() => toggleSingle(m, "1x2")}
                  />
                  <ToggleChip
                    label="Alt Üst"
                    active={row.ouActive}
                    loading={loadingKey === `${m.id}:ou25`}
                    disabled={!!loadingKey}
                    onClick={() => toggleSingle(m, "ou25")}
                  />
                  <ToggleChip
                    label="İkisi"
                    active={row.msActive && row.ouActive}
                    loading={loadingKey === `${m.id}:both`}
                    disabled={!!loadingKey}
                    onClick={() => toggleBoth(m)}
                  />
                </div>
                {row.error && <p className="mt-1 px-0.5 text-[11px] text-away">{row.error}</p>}
                {!row.error && (msLabel || ouLabel) && (
                  <p className="mt-1 px-0.5 text-[11px] text-muted">
                    Son güncelleme:{" "}
                    {msLabel && ouLabel
                      ? `MS ${msLabel} · A/Ü ${ouLabel}`
                      : (msLabel ?? ouLabel)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        {matches.length > 0 && (
          <div className="border-t border-border px-2 py-1">
            <button
              type="button"
              onClick={() => {
                if (activeMatchId) clearRowFilters(activeMatchId);
                setMatches([]);
                setRows({});
                setActiveMatchId(null);
                persistSaved([]);
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-muted transition-colors hover:text-away"
            >
              <Trash2 className="h-3 w-3" /> Listeyi Temizle
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function ToggleChip({
  label,
  active,
  loading,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex h-6 flex-1 items-center justify-center gap-1 rounded-md border px-1 text-[10px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        active
          ? "border-accent/50 bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] text-accent"
          : "border-border bg-surface text-muted hover:text-foreground"
      }`}
    >
      {loading && <Loader2 className="h-3 w-3 animate-spin" />}
      {label}
    </button>
  );
}
