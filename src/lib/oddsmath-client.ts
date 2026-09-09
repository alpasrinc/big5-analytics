// Client-side helper shared by the header's two OddsMath panels
// (live-odds-panel.tsx and saved-matches-panel.tsx) so both hit
// /api/live-odds and pull out 1XBET's row the same way.
"use client";

// Only 1XBET matters for this workflow — every other bookmaker OddsMath
// returns is fetched (the API doesn't support asking for just one) but
// discarded on the frontend.
export const BOOKMAKER = "1XBET";

export interface OddsmathRow {
  bookmaker: string;
  values: Record<string, number | null>;
  updated: string | null;
}

export interface OddsmathMarketResult {
  market: "1x2" | "ou25";
  keys: string[];
  columns: Record<string, string>;
  event: { home: string; away: string; time: string } | null;
  rows: OddsmathRow[];
}

export type MarketPick = "1x2" | "ou25" | "both";

export type SingleMarket = Exclude<MarketPick, "both">;

// Static mirror of oddsmath.ts's MARKET_COLUMNS, so a toggle can be switched
// off (clearing its numeric filter columns) without a network round trip.
export const MARKET_COLUMN_LIST: Record<SingleMarket, string[]> = {
  "1x2": ["home_win_closing_odds", "draw_closing_odds", "away_win_closing_odds"],
  ou25: ["over_2_5_goals_closing_odds", "under_2_5_goals_closing_odds"],
};

// OddsMath shows each price's own "updated" timestamp (UTC) on its site as a
// relative "N minutes ago" — this reproduces that from the same field.
export function minutesAgo(updated: string | null | undefined): number | null {
  if (!updated) return null;
  const ms = Date.parse(`${updated.replace(" ", "T")}Z`);
  if (Number.isNaN(ms)) return null;
  return Math.max(0, Math.round((Date.now() - ms) / 60000));
}

// Fetches the requested market(s) for a match and extracts 1XBET's prices as
// a flat { db_column: value } map ready for applyExactToNumeric.
export async function fetchOddsmathMarkets(
  url: string,
  which: MarketPick
): Promise<{ results: OddsmathMarketResult[]; values: Record<string, number> }> {
  const markets: OddsmathMarketResult["market"][] = which === "both" ? ["1x2", "ou25"] : [which];
  const results = await Promise.all(
    markets.map(async (market) => {
      const res = await fetch(`/api/live-odds?url=${encodeURIComponent(url)}&market=${market}`);
      const json = (await res.json()) as OddsmathMarketResult & { error?: string };
      if (!res.ok) {
        throw new Error(
          json.error ?? (market === "1x2" ? "1X2 oranları alınamadı" : "2.5 Ü/A oranları alınamadı")
        );
      }
      return json;
    })
  );

  const values: Record<string, number> = {};
  for (const result of results) {
    const row = result.rows.find((r) => r.bookmaker === BOOKMAKER);
    if (!row) continue;
    for (const k of result.keys) {
      const v = row.values[k];
      if (typeof v === "number") values[result.columns[k]] = v;
    }
  }
  return { results, values };
}
