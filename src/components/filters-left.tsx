"use client";

import { useMemo, useState } from "react";
import { ChevronDown, RotateCcw, SlidersHorizontal } from "lucide-react";
import { Badge } from "./ui/badge";
import type { FilterState } from "@/lib/api-types";
import { DEFAULT_FILTERS } from "@/lib/api-types";
import { COUNTRY_META, LEAGUE_META, cn } from "@/lib/utils";

const RESULT_OPTIONS = [
  { value: "H", label: "Ev Sahibi Kazandı", tone: "home" as const },
  { value: "D", label: "Berabere", tone: "draw" as const },
  { value: "A", label: "Deplasman Kazandı", tone: "away" as const },
];

const LINE_FILTERS = [
  { field: "total_goals_ft", label: "Toplam Gol Alt/Üst", lines: [2.5, 3.5, 4.5, 5.5] },
  { field: "total_corners_ft", label: "Toplam Korner Alt/Üst", lines: [9.5, 10.5, 11.5] },
  { field: "total_yellow_cards_ft", label: "Toplam Kart Alt/Üst", lines: [3.5, 4.5, 5.5] },
];

// A line filter (e.g. "2.5 Üst") is just filters.numeric[field] set to a
// one-sided {min} or {max} — the same field the right panel's range inputs
// read/write, so a quick-filter click and a manual range entry stay in sync.
function activeLineKey(range?: { min?: number; max?: number }) {
  if (!range) return null;
  if (range.min !== undefined && range.max === undefined) return `over-${range.min - 0.5}`;
  if (range.max !== undefined && range.min === undefined) return `under-${range.max + 0.5}`;
  return null;
}

export function FiltersLeft({
  filters,
  onChange,
}: {
  filters: FilterState;
  onChange: (f: FilterState) => void;
}) {
  const set = <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
    onChange({ ...filters, [key]: value, page: 1 });

  const toggleLeague = (name: string) => {
    const active = filters.leagues.includes(name);
    set("leagues", active ? filters.leagues.filter((l) => l !== name) : [...filters.leagues, name]);
  };

  // Champions League stands alone (no country); every other league groups
  // under its country, sorted alphabetically by Turkish country name.
  const countryGroups = useMemo(() => {
    const groups = new Map<string, string[]>();
    for (const [league, m] of Object.entries(LEAGUE_META)) {
      if (m.country === null) continue;
      if (!groups.has(m.country)) groups.set(m.country, []);
      groups.get(m.country)!.push(league);
    }
    return Array.from(groups.entries()).sort((a, b) =>
      (COUNTRY_META[a[0]]?.tr ?? a[0]).localeCompare(COUNTRY_META[b[0]]?.tr ?? b[0], "tr")
    );
  }, []);

  const [ligOpen, setLigOpen] = useState(true);
  const [openCountries, setOpenCountries] = useState<Set<string>>(new Set());
  const toggleOpen = (country: string) =>
    setOpenCountries((prev) => {
      const next = new Set(prev);
      if (next.has(country)) next.delete(country);
      else next.add(country);
      return next;
    });

  const setLine = (field: string, threshold: number, dir: "over" | "under") => {
    const key = `${dir}-${threshold}`;
    const nextNumeric = { ...filters.numeric };
    if (activeLineKey(nextNumeric[field]) === key) {
      delete nextNumeric[field];
    } else {
      nextNumeric[field] = dir === "over" ? { min: threshold + 0.5 } : { max: threshold - 0.5 };
    }
    onChange({ ...filters, numeric: nextNumeric, page: 1 });
  };

  const activeLineCount = LINE_FILTERS.filter((lf) => activeLineKey(filters.numeric[lf.field])).length;
  const activeCount =
    filters.leagues.length + filters.result.length + (filters.btts ? 1 : 0) + activeLineCount;

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col gap-4 overflow-y-auto border-r border-border bg-surface/40 px-5 py-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-semibold">
          <SlidersHorizontal className="h-4 w-4 text-accent" />
          Filtreler
          {activeCount > 0 && (
            <Badge tone="accent" className="ml-1">
              {activeCount}
            </Badge>
          )}
        </div>
        {activeCount > 0 && (
          <button
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="flex items-center gap-1 text-xs text-muted hover:text-away"
          >
            <RotateCcw className="h-3 w-3" /> Sıfırla
          </button>
        )}
      </div>

      <div>
        <button
          onClick={() => setLigOpen((v) => !v)}
          className="mb-1.5 flex w-full items-center justify-between text-[11px] font-medium uppercase tracking-wide text-muted-2 hover:text-muted"
        >
          <span className="flex items-center gap-1.5">
            Lig
            {filters.leagues.length > 0 && (
              <Badge tone="accent" className="h-4 min-w-4 px-1 normal-case">
                {filters.leagues.length}
              </Badge>
            )}
          </span>
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", ligOpen && "rotate-180")} />
        </button>
        {ligOpen && (
          <div className="flex flex-col gap-1">
            <LeagueRow
              name="Champions League"
              active={filters.leagues.includes("Champions League")}
              onClick={() => toggleLeague("Champions League")}
            />

            {countryGroups.map(([country, leagues]) => {
              if (leagues.length === 1) {
                return (
                  <LeagueRow
                    key={country}
                    name={leagues[0]}
                    active={filters.leagues.includes(leagues[0])}
                    onClick={() => toggleLeague(leagues[0])}
                  />
                );
              }

              const cm = COUNTRY_META[country];
              const hasActive = leagues.some((l) => filters.leagues.includes(l));
              const isOpen = openCountries.has(country) || hasActive;

              return (
                <div key={country} className="overflow-hidden rounded-md border border-border-soft">
                  <button
                    onClick={() => toggleOpen(country)}
                    className="flex w-full items-center justify-between px-2 py-1.5 text-xs font-medium text-foreground hover:bg-surface-2"
                  >
                    <span className="flex items-center gap-1.5">
                      {cm?.flag} {cm?.tr ?? country}
                      {hasActive && (
                        <Badge tone="accent" className="h-4 min-w-4 px-1">
                          {leagues.filter((l) => filters.leagues.includes(l)).length}
                        </Badge>
                      )}
                    </span>
                    <ChevronDown className={cn("h-3.5 w-3.5 text-muted-2 transition-transform", isOpen && "rotate-180")} />
                  </button>
                  {isOpen && (
                    <div className="flex flex-col gap-1 border-t border-border-soft bg-surface-2/40 p-1.5">
                      {leagues.map((name) => (
                        <LeagueRow
                          key={name}
                          name={name}
                          active={filters.leagues.includes(name)}
                          onClick={() => toggleLeague(name)}
                          indent
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <FilterBlock label="Maç Sonucu">
        <div className="flex gap-1.5">
          {RESULT_OPTIONS.map((r) => {
            const active = filters.result.includes(r.value);
            return (
              <button
                key={r.value}
                onClick={() =>
                  set(
                    "result",
                    active ? filters.result.filter((x) => x !== r.value) : [...filters.result, r.value]
                  )
                }
                className={cn(
                  "flex-1 rounded-md border px-2 py-1.5 text-[11px] font-semibold transition-colors",
                  active ? "border-transparent" : "border-border bg-surface-2 text-muted hover:text-foreground"
                )}
                style={
                  active
                    ? {
                        background: `color-mix(in srgb, var(--${r.tone}) 18%, transparent)`,
                        color: `var(--${r.tone})`,
                      }
                    : undefined
                }
              >
                {r.value}
              </button>
            );
          })}
        </div>
      </FilterBlock>

      <FilterBlock label="Karşılıklı Gol (KG)">
        <div className="flex gap-1.5">
          {(["yes", "no"] as const).map((v) => (
            <button
              key={v}
              onClick={() => set("btts", filters.btts === v ? null : v)}
              className={cn(
                "flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors",
                filters.btts === v
                  ? "border-accent/50 bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-accent"
                  : "border-border bg-surface-2 text-muted hover:text-foreground"
              )}
            >
              {v === "yes" ? "Var" : "Yok"}
            </button>
          ))}
        </div>
      </FilterBlock>

      {LINE_FILTERS.map(({ field, label, lines }) => {
        const active = activeLineKey(filters.numeric[field]);
        return (
          <FilterBlock key={field} label={label}>
            <div className="flex flex-col gap-1">
              {lines.map((line) => {
                const overActive = active === `over-${line}`;
                const underActive = active === `under-${line}`;
                return (
                  <div key={line} className="flex items-center gap-1.5">
                    <span className="w-8 shrink-0 font-mono text-[11px] text-muted-2">{line}</span>
                    <button
                      onClick={() => setLine(field, line, "under")}
                      className={cn(
                        "flex-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                        underActive
                          ? "border-accent/50 bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-accent"
                          : "border-border bg-surface-2 text-muted hover:text-foreground"
                      )}
                    >
                      Alt
                    </button>
                    <button
                      onClick={() => setLine(field, line, "over")}
                      className={cn(
                        "flex-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                        overActive
                          ? "border-accent/50 bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-accent"
                          : "border-border bg-surface-2 text-muted hover:text-foreground"
                      )}
                    >
                      Üst
                    </button>
                  </div>
                );
              })}
            </div>
          </FilterBlock>
        );
      })}
    </aside>
  );
}

function LeagueRow({
  name,
  active,
  onClick,
  indent,
}: {
  name: string;
  active: boolean;
  onClick: () => void;
  indent?: boolean;
}) {
  const m = LEAGUE_META[name];
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-md border px-2 text-left text-xs font-medium transition-colors",
        indent ? "py-1" : "py-1.5",
        active
          ? "border-accent/50 bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-accent"
          : "border-border bg-surface-2 text-muted hover:text-foreground"
      )}
    >
      {m?.flag} {name}
    </button>
  );
}

function FilterBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-2">{label}</p>
      {children}
    </div>
  );
}
