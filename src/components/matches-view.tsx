"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { FiltersLeft } from "./filters-left";
import { FiltersRight } from "./filters-right";
import { MatchesTable } from "./matches-table";
import { MatchDetailDialog } from "./match-detail-dialog";
import { ColumnPicker } from "./column-picker";
import { Input } from "./ui/input";
import { DEFAULT_VISIBLE_MARKETS, DEFAULT_VISIBLE_STATS, ODDS_MARKETS, STAT_MARKETS } from "@/lib/schema";
import type { Match } from "@/lib/schema";
import type { FilterState, MatchesResponse } from "@/lib/api-types";
import { filtersToSearchParams } from "@/lib/api-types";
import { DEFAULT_FILTERS } from "@/lib/api-types";

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

export function MatchesView() {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
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

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const sp = filtersToSearchParams(filters);
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
