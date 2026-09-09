// Server-only client for OddsMath's undocumented live-odds JSON endpoint
// (reverse-engineered from their page's inline `LiveOdds.setup(...)` call and
// `/api/v1/categories-data.js` — no official docs, no auth needed for these
// two markets). Used to pull a match's current bookmaker odds fast, without
// a headless browser, so they can be compared against this app's historical
// closing-odds data while a market is still live.

const LIVE_ODDS_URL = "https://www.oddsmath.com/api/v1/live-odds.json/";

export type OddsmathMarket = "1x2" | "ou25";

// cat_id values for the Full Time versions of each market, taken from
// categories-data.js. OddsMath gates every other market (BTTS, odd/even,
// wider AH/OU ranges) behind login, so we stick to these two.
const CAT_IDS: Record<OddsmathMarket, number> = {
  "1x2": 0,
  ou25: 6,
};

const MARKET_KEYS: Record<OddsmathMarket, string[]> = {
  "1x2": ["1", "X", "2"],
  ou25: ["O", "U"],
};

// Maps each market's odds keys to this app's own closing-odds columns
// (src/lib/schema.ts), so the frontend can hand a fetched price straight to
// the numeric filter panel without re-deriving the mapping itself.
const MARKET_COLUMNS: Record<OddsmathMarket, Record<string, string>> = {
  "1x2": { "1": "home_win_closing_odds", X: "draw_closing_odds", "2": "away_win_closing_odds" },
  ou25: { O: "over_2_5_goals_closing_odds", U: "under_2_5_goals_closing_odds" },
};

export function parseOddsmathEventId(url: string): number | null {
  const match = url.trim().match(/-(\d+)\/?(?:[?#].*)?$/);
  return match ? Number(match[1]) : null;
}

export interface OddsmathRow {
  bookmaker: string;
  values: Record<string, number | null>;
  updated: string | null;
}

export interface OddsmathMarketResult {
  market: OddsmathMarket;
  keys: string[];
  columns: Record<string, string>;
  event: { home: string; away: string; time: string } | null;
  rows: OddsmathRow[];
  average: Record<string, number> | null;
  highest: Record<string, number> | null;
}

interface OddsmathApiEntry {
  live?: Record<string, number | string | undefined>;
}

interface OddsmathApiResponse {
  event?: {
    hometeam?: { name?: string };
    awayteam?: { name?: string };
    time?: string;
  };
  data?: Record<string, OddsmathApiEntry>;
  error?: { message?: string };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function fetchOddsmathMarket(
  matchUrl: string,
  market: OddsmathMarket
): Promise<OddsmathMarketResult> {
  const eventId = parseOddsmathEventId(matchUrl);
  if (!eventId) throw new Error("Geçersiz OddsMath maç linki");

  const keys = MARKET_KEYS[market];
  const apiUrl = `${LIVE_ODDS_URL}?event_id=${eventId}&cat_id=${CAT_IDS[market]}&include_exchanges=1&country_code=TR&language=en`;

  const res = await fetch(apiUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      Referer: matchUrl,
      "X-Requested-With": "XMLHttpRequest",
      Accept: "application/json, text/javascript, */*; q=0.01",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`OddsMath isteği başarısız (HTTP ${res.status})`);

  const json = (await res.json()) as OddsmathApiResponse;
  if (json.error) throw new Error(json.error.message ?? "OddsMath hata döndürdü");

  const rows: OddsmathRow[] = Object.entries(json.data ?? {}).map(([bookmaker, entry]) => ({
    bookmaker,
    values: Object.fromEntries(
      keys.map((k) => {
        const v = entry.live?.[k];
        return [k, typeof v === "number" ? v : null];
      })
    ),
    updated: typeof entry.live?.updated === "string" ? entry.live.updated : null,
  }));

  const summarize = (pick: (vals: number[]) => number) =>
    rows.length
      ? Object.fromEntries(
          keys.map((k) => {
            const vals = rows.map((r) => r.values[k]).filter((v): v is number => v !== null);
            return [k, vals.length ? round2(pick(vals)) : NaN];
          })
        )
      : null;

  return {
    market,
    keys,
    columns: MARKET_COLUMNS[market],
    event: json.event
      ? {
          home: json.event.hometeam?.name ?? "",
          away: json.event.awayteam?.name ?? "",
          time: json.event.time ?? "",
        }
      : null,
    rows,
    average: summarize((vals) => vals.reduce((a, b) => a + b, 0) / vals.length),
    highest: summarize((vals) => Math.max(...vals)),
  };
}
