import type { Match } from "./schema";

export interface MetaResponse {
  leagues: { league: string; country: string; matches: number }[];
  teams: { team: string; league: string }[];
  referees: { referee: string; matches: number }[];
  dateRange: { min_date: string; max_date: string };
  seasons: { season: string }[];
}

export interface MatchesAggregate {
  avg_corners: number | null;
  avg_cards: number | null;
  avg_goals: number | null;
  count_h: number;
  count_d: number;
  count_a: number;
  count_over25: number;
  count_under25: number;
  count_btts_yes: number;
  count_btts_no: number;
  top_scores: { home: number; away: number; count: number }[];
  top_scores_ht: { home: number; away: number; count: number }[];
  top_ht_fts: { ht: string; ft: string; count: number }[];
  top_fav: { ht: string; ft: string; count: number }[];
}

export interface MatchesResponse {
  rows: Match[];
  total: number;
  page: number;
  pageSize: number;
  aggregate: MatchesAggregate;
}

export interface FilterState {
  leagues: string[];
  seasons: string[];
  teams: string[];
  referees: string[];
  result: string[];
  btts: "yes" | "no" | null;
  q: string;
  dateFrom: string;
  dateTo: string;
  numeric: Record<string, { min?: number; max?: number }>;
  sort: string;
  dir: "asc" | "desc";
  page: number;
  pageSize: number;
}

export const DEFAULT_FILTERS: FilterState = {
  leagues: [],
  seasons: [],
  teams: [],
  referees: [],
  result: [],
  btts: null,
  q: "",
  dateFrom: "",
  dateTo: "",
  numeric: {},
  sort: "start_datetime",
  dir: "desc",
  page: 1,
  pageSize: 25,
};

export function filtersToSearchParams(f: FilterState): URLSearchParams {
  const sp = new URLSearchParams();
  f.leagues.forEach((l) => sp.append("league", l));
  f.seasons.forEach((s) => sp.append("season", s));
  f.teams.forEach((t) => sp.append("team", t));
  f.referees.forEach((r) => sp.append("referee", r));
  f.result.forEach((r) => sp.append("result", r));
  if (f.btts) sp.set("btts", f.btts);
  if (f.q) sp.set("q", f.q);
  if (f.dateFrom) sp.set("date_from", f.dateFrom);
  if (f.dateTo) sp.set("date_to", f.dateTo + "T23:59:59");
  for (const [col, range] of Object.entries(f.numeric)) {
    if (range.min !== undefined) sp.set(`min_${col}`, String(range.min));
    if (range.max !== undefined) sp.set(`max_${col}`, String(range.max));
  }
  sp.set("sort", f.sort);
  sp.set("dir", f.dir);
  sp.set("page", String(f.page));
  sp.set("pageSize", String(f.pageSize));
  return sp;
}

// Reverse of filtersToSearchParams — lets the matches view initialize from
// (and the URL bar reflect) the exact same query string sent to /api/matches,
// so a filtered view is a shareable/bookmarkable/refresh-safe link.
export function searchParamsToFilters(sp: URLSearchParams): FilterState {
  const numeric: FilterState["numeric"] = {};
  for (const [key, value] of sp.entries()) {
    let col: string | null = null;
    let kind: "min" | "max" | null = null;
    if (key.startsWith("min_")) {
      col = key.slice(4);
      kind = "min";
    } else if (key.startsWith("max_")) {
      col = key.slice(4);
      kind = "max";
    }
    if (!col || !kind) continue;
    const range = numeric[col] ?? {};
    const num = Number(value);
    if (!Number.isNaN(num)) range[kind] = num;
    numeric[col] = range;
  }

  const btts = sp.get("btts");
  const dir = sp.get("dir");
  return {
    leagues: sp.getAll("league"),
    seasons: sp.getAll("season"),
    teams: sp.getAll("team"),
    referees: sp.getAll("referee"),
    result: sp.getAll("result"),
    btts: btts === "yes" || btts === "no" ? btts : null,
    q: sp.get("q") ?? "",
    dateFrom: sp.get("date_from") ?? "",
    dateTo: (sp.get("date_to") ?? "").replace("T23:59:59", ""),
    numeric,
    sort: sp.get("sort") || DEFAULT_FILTERS.sort,
    dir: dir === "asc" ? "asc" : "desc",
    page: Math.max(1, Number(sp.get("page")) || 1),
    pageSize: Math.min(500, Math.max(1, Number(sp.get("pageSize")) || 25)),
  };
}
