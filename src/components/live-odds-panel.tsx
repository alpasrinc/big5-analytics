"use client";

import { useState } from "react";
import { Loader2, Radio } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Input } from "./ui/input";
import { BOOKMAKER, fetchOddsmathMarkets, MARKET_COLUMN_LIST } from "@/lib/oddsmath-client";
import type { MarketPick, OddsmathMarketResult, SingleMarket } from "@/lib/oddsmath-client";

const KEY_LABEL: Record<string, string> = { "1": "1", X: "X", "2": "2", O: "Ü2.5", U: "A2.5" };

export function LiveOddsPanel({
  onApply,
  onClear,
}: {
  // Receives { db_column: value } built from 1XBET's odds, so the caller can
  // drop them straight into the numeric filters.
  onApply?: (values: Record<string, number>) => void;
  // Receives the column list to unset when a toggle is switched back off.
  onClear?: (columns: string[]) => void;
}) {
  const [url, setUrl] = useState("");
  const [loadingWhich, setLoadingWhich] = useState<MarketPick | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ms, setMs] = useState<OddsmathMarketResult | null>(null);
  const [ou, setOu] = useState<OddsmathMarketResult | null>(null);
  const [msActive, setMsActive] = useState(false);
  const [ouActive, setOuActive] = useState(false);
  // The URL whose odds are currently reflected in msActive/ouActive — lets a
  // toggle notice you've pasted in a different match since it last fetched,
  // so it clears the previous match's filters instead of leaving them lit.
  const [appliedUrl, setAppliedUrl] = useState<string | null>(null);

  // Clears whichever columns are currently applied and resets both toggles —
  // used both by the explicit off-clicks below and when switching matches.
  const clearActive = () => {
    const cols: string[] = [];
    if (msActive) cols.push(...MARKET_COLUMN_LIST["1x2"]);
    if (ouActive) cols.push(...MARKET_COLUMN_LIST.ou25);
    if (cols.length) onClear?.(cols);
    setMsActive(false);
    setOuActive(false);
    setMs(null);
    setOu(null);
  };

  // Only one match's odds should be "live" at a time — if a toggle fires for
  // a URL different from the one currently applied, drop the old one first.
  const ensureActiveUrl = (trimmed: string) => {
    if (appliedUrl && appliedUrl !== trimmed && (msActive || ouActive)) clearActive();
    setAppliedUrl(trimmed);
  };

  // Each toggle behaves like the league filter chips: off → on fetches and
  // applies that market's odds; on → off clears those columns again. No
  // re-fetch needed to turn one off, since the column list is static.
  const toggleSingle = async (which: SingleMarket) => {
    const isActive = which === "1x2" ? msActive : ouActive;
    if (isActive) {
      onClear?.(MARKET_COLUMN_LIST[which]);
      if (which === "1x2") {
        setMsActive(false);
        setMs(null);
      } else {
        setOuActive(false);
        setOu(null);
      }
      return;
    }
    const trimmed = url.trim();
    if (!trimmed || loadingWhich) return;
    ensureActiveUrl(trimmed);
    setLoadingWhich(which);
    setError(null);
    try {
      const { results, values } = await fetchOddsmathMarkets(trimmed, which);
      if (which === "1x2") setMs(results[0]);
      else setOu(results[0]);
      if (Object.keys(values).length === 0) throw new Error("1XBET bu maç için oran vermiyor");
      onApply?.(values);
      if (which === "1x2") setMsActive(true);
      else setOuActive(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Oranlar alınamadı");
    } finally {
      setLoadingWhich(null);
    }
  };

  const toggleBoth = async () => {
    if (msActive && ouActive) {
      clearActive();
      return;
    }
    const trimmed = url.trim();
    if (!trimmed || loadingWhich) return;
    ensureActiveUrl(trimmed);
    setLoadingWhich("both");
    setError(null);
    try {
      const { results, values } = await fetchOddsmathMarkets(trimmed, "both");
      for (const result of results) {
        if (result.market === "1x2") setMs(result);
        else setOu(result);
      }
      if (Object.keys(values).length === 0) throw new Error("1XBET bu maç için oran vermiyor");
      onApply?.(values);
      setMsActive(true);
      setOuActive(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Oranlar alınamadı");
    } finally {
      setLoadingWhich(null);
    }
  };

  const msRow = ms?.rows.find((r) => r.bookmaker === BOOKMAKER) ?? null;
  const ouRow = ou?.rows.find((r) => r.bookmaker === BOOKMAKER) ?? null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 text-sm text-foreground hover:border-muted-2 transition-colors"
        >
          <Radio className="h-3.5 w-3.5 text-muted" />
          Anlık Oran
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="border-b border-border p-2.5">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && toggleBoth()}
            placeholder="oddsmath.com maç linki"
            className="h-8 text-xs"
          />
          <div className="mt-1.5 flex items-center gap-1.5">
            <ToggleChip
              label="MS"
              active={msActive}
              loading={loadingWhich === "1x2"}
              disabled={!!loadingWhich}
              onClick={() => toggleSingle("1x2")}
            />
            <ToggleChip
              label="Alt Üst"
              active={ouActive}
              loading={loadingWhich === "ou25"}
              disabled={!!loadingWhich}
              onClick={() => toggleSingle("ou25")}
            />
            <ToggleChip
              label="İkisi"
              active={msActive && ouActive}
              loading={loadingWhich === "both"}
              disabled={!!loadingWhich}
              onClick={toggleBoth}
            />
          </div>
        </div>
        <div className="p-2.5">
          {error && <p className="px-1 py-2 text-xs text-away">{error}</p>}
          {!error && !msActive && !ouActive && !loadingWhich && (
            <p className="px-1 py-2 text-xs text-muted">
              OddsMath maç linkini yapıştırıp MS / Alt Üst / İkisi&apos;ne basın — 1XBET&apos;in oranı
              seçili kaldığı sürece filtrede kalır, tekrar basınca kaldırılır.
            </p>
          )}
          {(ms?.event ?? ou?.event) && (
            <p className="mb-2 truncate px-1 text-xs font-semibold text-foreground">
              {(ms?.event ?? ou?.event)!.home} – {(ms?.event ?? ou?.event)!.away}
            </p>
          )}
          {(msRow || ouRow) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 text-sm">
              {ms &&
                msRow &&
                ms.keys.map((k) => <OddValue key={k} label={KEY_LABEL[k] ?? k} value={msRow.values[k]} />)}
              {ou &&
                ouRow &&
                ou.keys.map((k) => <OddValue key={k} label={KEY_LABEL[k] ?? k} value={ouRow.values[k]} />)}
            </div>
          )}
        </div>
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
      className={`flex h-7 flex-1 items-center justify-center gap-1 rounded-md border px-1.5 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        active
          ? "border-accent/50 bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] text-accent"
          : "border-border bg-surface-2 text-muted hover:text-foreground"
      }`}
    >
      {loading && <Loader2 className="h-3 w-3 animate-spin" />}
      {label}
    </button>
  );
}

function OddValue({ label, value }: { label: string; value: number | null }) {
  return (
    <span className="flex items-center gap-1">
      <span className="text-muted-2">{label}</span>
      <span className="font-mono font-semibold text-odds">{value ?? "—"}</span>
    </span>
  );
}
