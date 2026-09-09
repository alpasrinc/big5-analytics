"use client";

import { useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { Search, Download } from "lucide-react";
import { FiltersLeft } from "./filters-left";
import { FiltersRight } from "./filters-right";
import { MatchesTable } from "./matches-table";
import { MatchDetailDialog } from "./match-detail-dialog";
import { ColumnPicker } from "./column-picker";
import { Input } from "./ui/input";
import {
  applyExactToNumeric,
  DEFAULT_VISIBLE_MARKETS,
  DEFAULT_VISIBLE_STATS,
  ODDS_MARKETS,
  STAT_MARKETS,
} from "@/lib/schema";
import type { Match } from "@/lib/schema";
import type { FilterState, MatchesResponse } from "@/lib/api-types";
import { filtersToSearchParams, searchParamsToFilters } from "@/lib/api-types";
import { DEFAULT_FILTERS } from "@/lib/api-types";

// Next passes searchParams as string | string[] | undefined per key; flatten
// back into the plain URLSearchParams our filter (de)serializers expect.
function toURLSearchParams(sp: Record<string, string | string[] | undefined>) {
  const out = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) value.forEach((v) => out.append(key, v));
    else out.append(key, value);
  }
  return out;
}

// Persists a column-visibility selection (list of market ids) to
// localStorage under `key`, restoring it once on mount (client-only, to
// avoid an SSR/hydration mismatch).
function usePersistedColumns(key: string, defaultValue: string[]) {
  const [ids, setIds] = useState<string[]>(defaultValue);

  useEffect(() => {
    // Deferred to a microtask so this reads as "subscribing to an external
    // store" rather than a synchronous setState in the effect body.
    Promise.resolve().then(() => {
      try {
        const saved = localStorage.getItem(key);
        if (saved) setIds(JSON.parse(saved));
      } catch {
        // ignore malformed/unavailable storage
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const change = (next: string[]) => {
    setIds(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // ignore storage write failures (private mode, quota, etc.)
    }
  };

  return [ids, change] as const;
}

export function MatchesView({
  initialSearch,
  applyLiveOddsRef,
  clearOddsColumnsRef,
}: {
  initialSearch?: Record<string, string | string[] | undefined>;
  // Lets the header's live-odds panels (siblings outside this component's
  // tree) push fetched prices into the numeric filters without lifting the
  // whole filter state up to AppShell — set once here, called from there.
  applyLiveOddsRef?: MutableRefObject<((values: Record<string, number>) => void) | null>;
  // Same wiring, for switching a market toggle back off: unsets the given
  // numeric filter columns instead of setting them.
  clearOddsColumnsRef?: MutableRefObject<((columns: string[]) => void) | null>;
}) {
  const [filters, setFilters] = useState<FilterState>(() =>
    initialSearch && Object.keys(initialSearch).length
      ? searchParamsToFilters(toURLSearchParams(initialSearch))
      : DEFAULT_FILTERS
  );
  const [result, setResult] = useState<MatchesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Match | null>(null);
  const [visibleMarkets, changeVisibleMarkets] = usePersistedColumns(
    "big5-visible-odds-columns",
    DEFAULT_VISIBLE_MARKETS
  );
  const [visibleStats, changeVisibleStats] = usePersistedColumns(
    "big5-visible-stat-columns",
    DEFAULT_VISIBLE_STATS
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateFilters = (f: FilterState) => {
    setLoading(true);
    setFilters(f);
  };

  // Applies a { column: value } map (e.g. from a fetched live-odds average)
  // as "tam" bands on top of whatever numeric filters are already set.
  const applyLiveOdds = (values: Record<string, number>) => {
    setLoading(true);
    setFilters((prev) => {
      let numeric = prev.numeric;
      for (const [col, value] of Object.entries(values)) {
        numeric = applyExactToNumeric(numeric, col, value);
      }
      return { ...prev, numeric, page: 1 };
    });
  };

  // Unsets the given numeric filter columns — the other half of a market
  // toggle: switching it back off should clear exactly what applying it set.
  const clearOddsColumns = (columns: string[]) => {
    setLoading(true);
    setFilters((prev) => {
      const numeric = { ...prev.numeric };
      for (const col of columns) delete numeric[col];
      return { ...prev, numeric, page: 1 };
    });
  };

  useEffect(() => {
    if (applyLiveOddsRef) applyLiveOddsRef.current = applyLiveOdds;
    if (clearOddsColumnsRef) clearOddsColumnsRef.current = clearOddsColumns;
  });

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const sp = filtersToSearchParams(filters);
      // Shallow URL sync (no Next router transition) so the current filter
      // set is shareable and survives a refresh, without spamming browser
      // history — replaceState, not pushState, on every change.
      const isDefault = JSON.stringify(filters) === JSON.stringify(DEFAULT_FILTERS);
      const nextUrl = isDefault ? window.location.pathname : `${window.location.pathname}?${sp.toString()}`;
      window.history.replaceState(null, "", nextUrl);

      fetch(`/api/matches?${sp.toString()}`)
        .then((r) => r.json())
        .then((data: MatchesResponse) => {
          setResult(data);
          setLoading(false);
        });
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filters]);

  return (
    <div className="flex h-full min-h-0 flex-1">
      <FiltersLeft filters={filters} onChange={updateFilters} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 px-5 py-5">
        <div className="flex shrink-0 items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" />
            <Input
              value={filters.q}
              onChange={(e) => updateFilters({ ...filters, q: e.target.value, page: 1 })}
              placeholder="Takım veya hakem adına göre hızlı arama..."
              className="pl-9"
            />
          </div>
          <ColumnPicker
            title="İstatistik Sütunları"
            markets={STAT_MARKETS}
            defaultVisible={DEFAULT_VISIBLE_STATS}
            visible={visibleStats}
            onChange={changeVisibleStats}
          />
          <ColumnPicker
            title="Oran Sütunları"
            markets={ODDS_MARKETS}
            defaultVisible={DEFAULT_VISIBLE_MARKETS}
            visible={visibleMarkets}
            onChange={changeVisibleMarkets}
          />
          <a
            href={`/api/matches/export?${filtersToSearchParams(filters).toString()}`}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 text-sm text-foreground hover:border-muted-2 transition-colors"
            title="Filtrelenmiş maçları CSV olarak indir"
          >
            <Download className="h-3.5 w-3.5 text-muted" />
            Dışa Aktar
          </a>
        </div>
        <MatchesTable
          rows={result?.rows ?? []}
          total={result?.total ?? 0}
          loading={loading}
          filters={filters}
          onChange={updateFilters}
          onSelect={setSelected}
          aggregate={result?.aggregate ?? null}
          visibleMarkets={visibleMarkets}
          visibleStats={visibleStats}
        />
      </div>

      <FiltersRight filters={filters} onChange={updateFilters} />

      <MatchDetailDialog match={selected} onOpenChange={(o) => !o && setSelected(null)} />
    </div>
  );
}
