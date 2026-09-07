"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Loader2, Sparkles } from "lucide-react";
import { Badge } from "./ui/badge";
import { ODDS_MARKETS, STAT_MARKETS } from "@/lib/schema";
import type { Match } from "@/lib/schema";
import type { FilterState, MatchesAggregate } from "@/lib/api-types";
import { fmtDateShort, fmtOdds, fmtStat, LEAGUE_META } from "@/lib/utils";
import { Button } from "./ui/button";

const FIXED_COLUMNS = [
  { key: "start_datetime", label: "Tarih", sortable: true },
  { key: "league", label: "Lig", sortable: true },
  { key: "match", label: "Maç" },
  { key: "total_corners_ft", label: "Korner", sortable: true, align: "right" as const },
  { key: "total_yellow_cards_ft", label: "Kart", sortable: true, align: "right" as const },
];

// Half-time/full-time notation, 1=home win, 0=draw, 2=away win (e.g. "1/2" =
// home led at half time, away won the match) — the standard HT/FT market shorthand.
const RESULT_CODE: Record<string, string> = { H: "1", D: "0", A: "2" };

const MARKET_COLOR: Record<string, string> = {
  ms1: "var(--foreground)",
  msx: "var(--foreground)",
  ms2: "var(--foreground)",
  ah_0: "var(--foreground)",
  corners_9_5: "var(--corner)",
  cards_3_5: "var(--card-yellow)",
};

export function MatchesTable({
  rows,
  total,
  loading,
  filters,
  onChange,
  onSelect,
  aggregate,
  visibleMarkets,
  visibleStats,
}: {
  rows: Match[];
  total: number;
  loading: boolean;
  filters: FilterState;
  onChange: (f: FilterState) => void;
  onSelect: (m: Match) => void;
  aggregate: MatchesAggregate | null;
  visibleMarkets: string[];
  visibleStats: string[];
}) {
  const [highlightTopScore, setHighlightTopScore] = useState(false);
  const topScore = aggregate?.top_score ?? null;
  const [highlightTopHtFt, setHighlightTopHtFt] = useState(false);
  const topHtFt = aggregate?.top_ht_ft ?? null;

  const toggleSort = (col: string) => {
    if (filters.sort === col) {
      onChange({ ...filters, dir: filters.dir === "asc" ? "desc" : "asc" });
    } else {
      onChange({ ...filters, sort: col, dir: "desc" });
    }
  };

  const statColumns = STAT_MARKETS.filter((m) => visibleStats.includes(m.id)).flatMap((m) => m.columns);
  const oddsColumns = ODDS_MARKETS.filter((m) => visibleMarkets.includes(m.id)).flatMap((m) =>
    m.columns.map((c) => ({ ...c, color: MARKET_COLOR[m.id] ?? "var(--odds)" }))
  );
  const totalColCount = FIXED_COLUMNS.length + statColumns.length + oddsColumns.length;

  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <p className="text-sm text-muted">
          <span className="font-semibold text-foreground">{total.toLocaleString("tr-TR")}</span> maç
          bulundu
        </p>
        {aggregate && (
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
            <AggStat label="Ort. Gol" value={aggregate.avg_goals} color="var(--foreground)" />
            <AggStat label="Ort. Korner" value={aggregate.avg_corners} color="var(--corner)" />
            <AggStat label="Ort. Kart" value={aggregate.avg_cards} color="var(--card-yellow)" />
            <AggStat label="Ort. MS1" value={aggregate.avg_home_odds} color="var(--home)" odds />
            <AggStat label="Ort. MSX" value={aggregate.avg_draw_odds} color="var(--draw)" odds />
            <AggStat label="Ort. MS2" value={aggregate.avg_away_odds} color="var(--away)" odds />
            {topScore && (
              <button
                onClick={() => setHighlightTopScore((v) => !v)}
                title="Bu filtrede en çok tekrar eden skorlu maçları listede vurgula"
                className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                  highlightTopScore
                    ? "border-accent/50 bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-accent"
                    : "border-border bg-surface-2 text-muted hover:text-foreground"
                }`}
              >
                <Sparkles className="h-3 w-3" />
                En Sık Skor: {topScore.home}-{topScore.away} ({topScore.count})
              </button>
            )}
            {topHtFt && (
              <button
                onClick={() => setHighlightTopHtFt((v) => !v)}
                title="Bu filtrede en çok tekrar eden İY/MS kombinasyonlu maçları listede vurgula"
                className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                  highlightTopHtFt
                    ? "border-odds/50 bg-[color-mix(in_srgb,var(--odds)_16%,transparent)] text-odds"
                    : "border-border bg-surface-2 text-muted hover:text-foreground"
                }`}
              >
                <Sparkles className="h-3 w-3" />
                En Sık İY/MS: {RESULT_CODE[topHtFt.ht]}/{RESULT_CODE[topHtFt.ft]} ({topHtFt.count})
              </button>
            )}
          </div>
        )}
      </div>

      <div className="relative flex-1 overflow-auto">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface/60 backdrop-blur-[1px]">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
          </div>
        )}
        <table className="w-full border-collapse text-sm">
          <colgroup>
            <col className="w-[72px]" />
            <col className="w-[52px]" />
            <col className="min-w-[230px]" />
            <col className="w-[92px]" />
            <col className="w-[86px]" />
            {statColumns.map((c) => (
              <col key={c.key} className="w-[54px]" />
            ))}
            {oddsColumns.map((c) => (
              <col key={c.key} className="w-[50px]" />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-[1] bg-surface-2/95 backdrop-blur">
            <tr>
              {FIXED_COLUMNS.map((c) => (
                <th
                  key={c.key}
                  onClick={() => c.sortable && toggleSort(c.key)}
                  className={`overflow-hidden whitespace-nowrap border-b border-border px-2 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted ${
                    c.align === "right" ? "text-right" : "text-left"
                  } ${c.sortable ? "cursor-pointer select-none hover:text-foreground" : ""}`}
                >
                  <span className="inline-flex items-center gap-1">
                    {c.label}
                    {c.sortable &&
                      (filters.sort === c.key ? (
                        filters.dir === "asc" ? (
                          <ArrowUp className="h-3 w-3 text-accent" />
                        ) : (
                          <ArrowDown className="h-3 w-3 text-accent" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-30" />
                      ))}
                  </span>
                </th>
              ))}
              {[...statColumns, ...oddsColumns].map((c) => (
                <th
                  key={c.key}
                  onClick={() => toggleSort(c.key)}
                  title={c.header}
                  className="cursor-pointer select-none overflow-hidden whitespace-nowrap border-b border-border px-1.5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted hover:text-foreground"
                >
                  <span className="inline-flex items-center justify-end gap-0.5">
                    {c.header}
                    {filters.sort === c.key ? (
                      filters.dir === "asc" ? (
                        <ArrowUp className="h-3 w-3 text-accent" />
                      ) : (
                        <ArrowDown className="h-3 w-3 text-accent" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-30" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => {
              const isTopScore =
                highlightTopScore &&
                topScore !== null &&
                m.home_goals_ft === topScore.home &&
                m.away_goals_ft === topScore.away;
              const isTopHtFt =
                highlightTopHtFt &&
                topHtFt !== null &&
                m.result_1h === topHtFt.ht &&
                m.result_ft === topHtFt.ft;
              const rowHighlightClass = isTopScore
                ? "border-l-accent border-b-border-soft bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] hover:bg-[color-mix(in_srgb,var(--accent)_16%,transparent)]"
                : isTopHtFt
                  ? "border-l-odds border-b-border-soft bg-[color-mix(in_srgb,var(--odds)_10%,transparent)] hover:bg-[color-mix(in_srgb,var(--odds)_16%,transparent)]"
                  : "border-l-transparent border-b-border-soft hover:bg-surface-2/60";
              return (
              <tr
                key={m.match_id}
                onClick={() => onSelect(m)}
                className={`cursor-pointer border-b border-l-2 transition-colors ${rowHighlightClass}`}
              >
                <td className="overflow-hidden whitespace-nowrap px-2 py-2.5 font-mono text-xs text-muted">
                  {fmtDateShort(m.start_datetime)}
                </td>
                <td className="overflow-hidden px-1 py-2.5">
                  <span
                    className="inline-flex items-center gap-1 whitespace-nowrap text-xs"
                    title={m.league}
                  >
                    <span>{LEAGUE_META[m.league]?.flag}</span>
                    {LEAGUE_META[m.league]?.short ?? m.league}
                  </span>
                </td>
                <td className="overflow-hidden px-2 py-2.5">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <Badge
                      tone={m.result_ft === "H" ? "home" : m.result_ft === "A" ? "away" : "draw"}
                      className="shrink-0 font-mono"
                      title="İlk Yarı / Maç Sonu (1=Ev, 0=Berabere, 2=Deplasman)"
                    >
                      {RESULT_CODE[m.result_1h as string]}/{RESULT_CODE[m.result_ft]}
                    </Badge>
                    <span className="min-w-0 flex-1 truncate text-right font-medium">{m.home_team}</span>
                    <span className="shrink-0 whitespace-nowrap rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-foreground">
                      {m.home_goals_ft}–{m.away_goals_ft}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">{m.away_team}</span>
                    <span className="shrink-0 whitespace-nowrap font-mono text-[10px] text-muted-2">
                      ({m.home_goals_1h}–{m.away_goals_1h})
                    </span>
                  </div>
                </td>
                <td className="overflow-hidden whitespace-nowrap px-2 py-2.5 text-right font-mono text-xs text-corner">
                  {m.total_corners_ft ?? "—"}{" "}
                  <span className="text-muted-2">
                    {m.home_corners_ft}-{m.away_corners_ft}
                  </span>
                </td>
                <td className="overflow-hidden whitespace-nowrap px-1 py-2.5 text-right font-mono text-xs text-card-yellow">
                  {m.total_yellow_cards_ft ?? "—"}{" "}
                  <span className="text-muted-2">
                    {m.home_yellow_cards_ft}-{m.away_yellow_cards_ft}
                  </span>
                  {(m.total_red_cards_ft as number) > 0 && (
                    <span className="ml-0.5 text-card-red">+{m.total_red_cards_ft}R</span>
                  )}
                </td>
                {statColumns.map((c) => (
                  <td
                    key={c.key}
                    className="whitespace-nowrap px-1.5 py-2.5 text-right font-mono text-xs text-foreground/80"
                  >
                    {fmtStat(m[c.key] as number, c.decimals, c.suffix)}
                  </td>
                ))}
                {oddsColumns.map((c) => (
                  <td
                    key={c.key}
                    className="whitespace-nowrap px-1.5 py-2.5 text-right font-mono text-xs"
                    style={{ color: c.color }}
                  >
                    {fmtOdds(m[c.key] as number)}
                  </td>
                ))}
              </tr>
              );
            })}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={totalColCount} className="px-3 py-16 text-center text-sm text-muted-2">
                  Filtrelere uyan maç bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
        <p className="text-xs text-muted">
          Sayfa {filters.page} / {totalPages}
        </p>
        <div className="flex items-center gap-1.5">
          <Button
            size="icon"
            variant="outline"
            disabled={filters.page <= 1}
            onClick={() => onChange({ ...filters, page: filters.page - 1 })}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            disabled={filters.page >= totalPages}
            onClick={() => onChange({ ...filters, page: filters.page + 1 })}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function AggStat({
  label,
  value,
  color,
  odds,
}: {
  label: string;
  value: number | null;
  color: string;
  odds?: boolean;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-muted-2">{label}</span>
      <span className="font-mono font-semibold" style={{ color }}>
        {value == null ? "—" : odds ? value.toFixed(2) : value.toFixed(1)}
      </span>
    </span>
  );
}
