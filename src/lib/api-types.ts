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
  avg_home_odds: number | null;
  avg_draw_odds: number | null;
  avg_away_odds: number | null;
  top_score: { home: number; away: number; count: number } | null;
  top_ht_ft: { ht: string; ft: string; count: number } | null;
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
