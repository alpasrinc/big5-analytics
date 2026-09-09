"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Badge } from "./ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { exactValueFromRange, NUMERIC_FIELDS, ODDS_MARKETS, STAT_MARKETS } from "@/lib/schema";
import type { Match } from "@/lib/schema";
import type { FilterState, MatchesAggregate } from "@/lib/api-types";
import { fmtDateShort, fmtOdds, fmtStat, LEAGUE_META } from "@/lib/utils";
import { Button } from "./ui/button";

const FIXED_COLUMNS = [
  { key: "start_datetime", label: "Tarih", sortable: true },
  { key: "league", label: "Lig", sortable: true },
  { key: "fav_surprise", label: "F/S", title: "Favori/Sürpriz İlk Yarı / Maç Sonu" },
  { key: "match", label: "Maç" },
  { key: "total_corners_ft", label: "Korner", sortable: true, align: "right" as const },
  { key: "total_yellow_cards_ft", label: "Kart", sortable: true, align: "right" as const },
];

// Half-time/full-time notation, 1=home win, 0=draw, 2=away win (e.g. "1/2" =
// home led at half time, away won the match) — the standard HT/FT market shorthand.
const RESULT_CODE: Record<string, string> = { H: "1", D: "0", A: "2" };

// Favori (lower closing odds) / Sürpriz / Beraberlik letters for the same
// HT/FT slot, e.g. "F/S" = favorite led at half time, surprise won the
// match. "?" when the closing odds are missing or tied, so we can't tell
// which side was actually the favorite.
function favSurpriseLetter(result: string, favoriteSide: "H" | "A" | null): string {
  if (result === "D") return "B";
  if (!favoriteSide) return "?";
  return result === favoriteSide ? "F" : "S";
}

// The four "most frequent" aggregates now arrive as their *full* ranking
// (most to least frequent), so the dropdown can show every count, not just
// the winner. Row highlighting still only cares about the actual #1 —
// possibly several scorelines tied for it — hence this narrowing helper.
function topTied<T extends { count: number }>(rowsDesc: T[]): T[] {
  return rowsDesc.length ? rowsDesc.filter((r) => r.count === rowsDesc[0].count) : [];
}

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
  const topScores = aggregate?.top_scores ?? [];
  const topScoresOnly = topTied(topScores);
  const [highlightTopScoreHt, setHighlightTopScoreHt] = useState(false);
  const topScoresHt = aggregate?.top_scores_ht ?? [];
  const topScoresHtOnly = topTied(topScoresHt);
  const [highlightTopHtFt, setHighlightTopHtFt] = useState(false);
  const topHtFts = aggregate?.top_ht_fts ?? [];
  const topHtFtsOnly = topTied(topHtFts);
  const [highlightTopFav, setHighlightTopFav] = useState(false);
  const topFav = aggregate?.top_fav ?? [];
  const topFavOnly = topTied(topFav);

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

  // Closing-odds "tam" filters match a ±tolerance band, so a filtered set can
  // still contain rows whose price only came close, not the exact figure
  // typed. This recovers that typed value per column (mirrored onto its
  // MS1/MS2 counterpart too, since a "tam" search always matches either
  // side) so the odds cell that actually equals it can be called out.
  const exactOddsByColumn: Record<string, number> = {};
  for (const f of NUMERIC_FIELDS) {
    if (!f.tolerance) continue;
    const exact = exactValueFromRange(f, filters.numeric[f.col]);
    if (exact === undefined) continue;
    exactOddsByColumn[f.col] = exact;
    if (f.mirrorCol) exactOddsByColumn[f.mirrorCol] = exact;
  }

  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <p className="text-sm text-muted">
            <span className="font-semibold text-foreground">{total.toLocaleString("tr-TR")}</span> maç
            bulundu
          </p>
          {aggregate && (
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
              <CountStat label="1" value={aggregate.count_h} color="var(--home)" />
              <CountStat label="X" value={aggregate.count_d} color="var(--draw)" />
              <CountStat label="2" value={aggregate.count_a} color="var(--away)" />
              <span className="text-border">·</span>
              <CountStat label="Ü2.5" value={aggregate.count_over25} color="var(--odds)" />
              <CountStat label="A2.5" value={aggregate.count_under25} color="var(--odds)" />
              <span className="text-border">·</span>
              <CountStat label="KG Var" value={aggregate.count_btts_yes} color="var(--foreground)" />
              <CountStat label="KG Yok" value={aggregate.count_btts_no} color="var(--foreground)" />
            </div>
          )}
        </div>
        {aggregate && (
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
            <AggStat label="Ort. Gol" value={aggregate.avg_goals} color="var(--foreground)" />
            <AggStat label="Ort. Korner" value={aggregate.avg_corners} color="var(--corner)" />
            <AggStat label="Ort. Kart" value={aggregate.avg_cards} color="var(--card-yellow)" />
            {topScores.length > 0 && (
              <TopFrequentButton
                label="En Sık Skorlar"
                accent="accent"
                active={highlightTopScore}
                onToggle={() => setHighlightTopScore((v) => !v)}
                title="Bu filtrede en çok tekrar eden skorlu maçları listede vurgula"
                items={topScores
                  .slice()
                  .sort((a, b) => b.count - a.count)
                  .map((s) => ({
                    key: `${s.home}-${s.away}`,
                    display: `${s.home}-${s.away}`,
                    count: s.count,
                  }))}
              />
            )}
            {topScoresHt.length > 0 && (
              <TopFrequentButton
                label="En Sık İY Skorları"
                accent="corner"
                active={highlightTopScoreHt}
                onToggle={() => setHighlightTopScoreHt((v) => !v)}
                title="Bu filtrede en çok tekrar eden ilk yarı skorlu maçları listede vurgula"
                items={topScoresHt
                  .slice()
                  .sort((a, b) => b.count - a.count)
                  .map((s) => ({
                    key: `${s.home}-${s.away}`,
                    display: `${s.home}-${s.away}`,
                    count: s.count,
                  }))}
              />
            )}
            {topHtFts.length > 0 && (
              <TopFrequentButton
                label="En Sık İY/MS"
                accent="odds"
                active={highlightTopHtFt}
                onToggle={() => setHighlightTopHtFt((v) => !v)}
                title="Bu filtrede en çok tekrar eden İY/MS kombinasyonlu maçları listede vurgula"
                items={topHtFts
                  .slice()
                  .sort((a, b) => b.count - a.count)
                  .map((h) => ({
                    key: `${h.ht}-${h.ft}`,
                    display: `${RESULT_CODE[h.ht]}/${RESULT_CODE[h.ft]}`,
                    count: h.count,
                  }))}
              />
            )}
            {topFav.length > 0 && (
              <TopFrequentButton
                label="En Sık F/S"
                accent="home"
                active={highlightTopFav}
                onToggle={() => setHighlightTopFav((v) => !v)}
                title="Bu filtrede en çok tekrar eden Favori/Sürpriz İY/MS kombinasyonlu maçları listede vurgula"
                items={topFav
                  .slice()
                  .sort((a, b) => b.count - a.count)
                  .map((h) => ({
                    key: `${h.ht}-${h.ft}`,
                    display: `${h.ht}/${h.ft}`,
                    count: h.count,
                  }))}
              />
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
            <col className="w-[60px]" />
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
                  title={c.title}
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
                topScoresOnly.some((s) => m.home_goals_ft === s.home && m.away_goals_ft === s.away);
              const isTopScoreHt =
                highlightTopScoreHt &&
                topScoresHtOnly.some((s) => m.home_goals_1h === s.home && m.away_goals_1h === s.away);
              const isTopHtFt =
                highlightTopHtFt &&
                topHtFtsOnly.some((h) => m.result_1h === h.ht && m.result_ft === h.ft);
              const homeOdds = m.home_win_closing_odds as number | null;
              const awayOdds = m.away_win_closing_odds as number | null;
              const favoriteSide: "H" | "A" | null =
                typeof homeOdds === "number" && typeof awayOdds === "number" && homeOdds !== awayOdds
                  ? homeOdds < awayOdds
                    ? "H"
                    : "A"
                  : null;
              const htFavLetter = favSurpriseLetter(m.result_1h as string, favoriteSide);
              const ftFavLetter = favSurpriseLetter(m.result_ft, favoriteSide);
              const favTone =
                ftFavLetter === "F" ? "home" : ftFavLetter === "S" ? "away" : ftFavLetter === "B" ? "draw" : "neutral";
              const isTopFav =
                highlightTopFav && topFavOnly.some((h) => htFavLetter === h.ht && ftFavLetter === h.ft);
              const rowHighlightClass = isTopScore
                ? "border-l-accent border-b-border-soft bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] hover:bg-[color-mix(in_srgb,var(--accent)_16%,transparent)]"
                : isTopScoreHt
                  ? "border-l-corner border-b-border-soft bg-[color-mix(in_srgb,var(--corner)_10%,transparent)] hover:bg-[color-mix(in_srgb,var(--corner)_16%,transparent)]"
                  : isTopHtFt
                    ? "border-l-odds border-b-border-soft bg-[color-mix(in_srgb,var(--odds)_10%,transparent)] hover:bg-[color-mix(in_srgb,var(--odds)_16%,transparent)]"
                    : isTopFav
                      ? "border-l-home border-b-border-soft bg-[color-mix(in_srgb,var(--home)_10%,transparent)] hover:bg-[color-mix(in_srgb,var(--home)_16%,transparent)]"
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
                <td className="overflow-hidden whitespace-nowrap px-1 py-2.5 text-center">
                  <Badge
                    tone={favTone}
                    className="font-mono"
                    title="Favori/Sürpriz İlk Yarı / Maç Sonu (F=Favori, B=Beraberlik, S=Sürpriz; favori = kapanışta oranı düşük taraf)"
                  >
                    {htFavLetter}/{ftFavLetter}
                  </Badge>
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
                    <Link
                      href={`/takim/${encodeURIComponent(m.home_team)}`}
                      onClick={(e) => e.stopPropagation()}
                      className="min-w-0 flex-1 truncate text-right font-medium hover:text-accent hover:underline"
                    >
                      {m.home_team}
                    </Link>
                    <span className="shrink-0 whitespace-nowrap rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-foreground">
                      {m.home_goals_ft}–{m.away_goals_ft}
                    </span>
                    <Link
                      href={`/takim/${encodeURIComponent(m.away_team)}`}
                      onClick={(e) => e.stopPropagation()}
                      className="min-w-0 flex-1 truncate font-medium hover:text-accent hover:underline"
                    >
                      {m.away_team}
                    </Link>
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
                {oddsColumns.map((c) => {
                  const value = m[c.key] as number | null;
                  const exact = exactOddsByColumn[c.key];
                  const isExactMatch =
                    exact !== undefined && typeof value === "number" && Math.abs(value - exact) < 0.001;
                  return (
                    <td
                      key={c.key}
                      title={isExactMatch ? "Aradığınız orana tam eşleşiyor" : undefined}
                      className={`whitespace-nowrap px-1.5 py-2.5 text-right font-mono text-xs ${
                        isExactMatch
                          ? "bg-[color-mix(in_srgb,var(--home)_22%,transparent)] font-bold"
                          : ""
                      }`}
                      style={{ color: isExactMatch ? "var(--home)" : c.color }}
                    >
                      {fmtOdds(value as number)}
                    </td>
                  );
                })}
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

// Shows the single most-frequent entry as a button; when more than one
// entry ties for that top spot, hovering expands a dropdown listing all of
// them (still sorted highest-count-first, same order whether hovered or
// not — hovering only reveals the rest of an already-sorted list).
function TopFrequentButton({
  label,
  items,
  active,
  onToggle,
  title,
  accent,
}: {
  label: string;
  items: { key: string; display: string; count: number }[];
  active: boolean;
  onToggle: () => void;
  title: string;
  accent: "accent" | "odds" | "corner" | "home";
}) {
  const [open, setOpen] = useState(false);
  const top = items[0];
  const hasMore = items.length > 1;
  const activeClasses = {
    accent: "border-accent/50 bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-accent",
    odds: "border-odds/50 bg-[color-mix(in_srgb,var(--odds)_16%,transparent)] text-odds",
    corner: "border-corner/50 bg-[color-mix(in_srgb,var(--corner)_16%,transparent)] text-corner",
    home: "border-home/50 bg-[color-mix(in_srgb,var(--home)_16%,transparent)] text-home",
  }[accent];
  const countColor = `var(--${accent})`;

  return (
    <Popover open={hasMore && open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={onToggle}
          onMouseEnter={() => hasMore && setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          title={title}
          className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
            active ? activeClasses : "border-border bg-surface-2 text-muted hover:text-foreground"
          }`}
        >
          <Sparkles className="h-3 w-3" />
          {label}: {top.display} ({top.count})
          {hasMore && (
            <ChevronDown className={`h-3 w-3 opacity-60 transition-transform ${open ? "rotate-180" : ""}`} />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="w-max min-w-[140px] p-0"
      >
        <ul className="max-h-64 overflow-y-auto py-1">
          {items.map((it) => (
            <li
              key={it.key}
              className="flex items-center justify-between gap-4 whitespace-nowrap px-3 py-1.5 text-xs"
            >
              <span className="font-mono text-foreground">{it.display}</span>
              <span className="font-mono font-semibold" style={{ color: countColor }}>
                {it.count}
              </span>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function CountStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="text-muted-2">{label}:</span>
      <span className="font-mono font-semibold" style={{ color }}>
        {value.toLocaleString("tr-TR")}
      </span>
    </span>
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
