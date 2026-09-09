import { getDb } from "@/lib/db";

export interface TeamSplit {
  played: number;
  w: number;
  d: number;
  l: number;
  avg_goals_for: number | null;
  avg_goals_against: number | null;
  avg_corners_for: number | null;
  avg_corners_against: number | null;
  avg_cards_for: number | null;
  avg_cards_against: number | null;
  btts_pct: number | null;
  over25_pct: number | null;
}

export interface RecentMatch {
  match_id: number;
  start_datetime: string;
  league: string;
  venue: "home" | "away";
  opponent: string;
  goals_for: number;
  goals_against: number;
  corners_for: number | null;
  corners_against: number | null;
  cards_for: number | null;
  cards_against: number | null;
  outcome: "W" | "D" | "L";
}

export interface TeamSummary {
  team: string;
  leagues: string[];
  overall: TeamSplit;
  home: TeamSplit;
  away: TeamSplit;
  recentMatches: RecentMatch[];
}

interface SplitRow {
  played: number;
  w: number;
  d: number;
  l: number;
  avg_goals_for: number | null;
  avg_goals_against: number | null;
  avg_corners_for: number | null;
  avg_corners_against: number | null;
  avg_cards_for: number | null;
  avg_cards_against: number | null;
  btts_pct: number | null;
  over25_pct: number | null;
}

function emptySplit(): TeamSplit {
  return {
    played: 0,
    w: 0,
    d: 0,
    l: 0,
    avg_goals_for: null,
    avg_goals_against: null,
    avg_corners_for: null,
    avg_corners_against: null,
    avg_cards_for: null,
    avg_cards_against: null,
    btts_pct: null,
    over25_pct: null,
  };
}

// Team names are matched exactly against `home_team`/`away_team` — callers
// get the string from a DB-sourced link (table row, leaderboard row, meta
// list), never free-typed, so an exact match is always the intent.
export function getTeamSummary(team: string): TeamSummary | null {
  const db = getDb();

  const homeSplit = db
    .prepare(
      `SELECT
        COUNT(*) played,
        SUM(CASE WHEN result_ft='H' THEN 1 ELSE 0 END) w,
        SUM(CASE WHEN result_ft='D' THEN 1 ELSE 0 END) d,
        SUM(CASE WHEN result_ft='A' THEN 1 ELSE 0 END) l,
        AVG(home_goals_ft) avg_goals_for,
        AVG(away_goals_ft) avg_goals_against,
        AVG(home_corners_ft) avg_corners_for,
        AVG(away_corners_ft) avg_corners_against,
        AVG(home_yellow_cards_ft) avg_cards_for,
        AVG(away_yellow_cards_ft) avg_cards_against,
        100.0 * SUM(CASE WHEN home_goals_ft>0 AND away_goals_ft>0 THEN 1 ELSE 0 END) / COUNT(*) btts_pct,
        100.0 * SUM(CASE WHEN total_goals_ft>2.5 THEN 1 ELSE 0 END) / COUNT(*) over25_pct
       FROM matches WHERE home_team = @team`
    )
    .get({ team }) as SplitRow;

  const awaySplit = db
    .prepare(
      `SELECT
        COUNT(*) played,
        SUM(CASE WHEN result_ft='A' THEN 1 ELSE 0 END) w,
        SUM(CASE WHEN result_ft='D' THEN 1 ELSE 0 END) d,
        SUM(CASE WHEN result_ft='H' THEN 1 ELSE 0 END) l,
        AVG(away_goals_ft) avg_goals_for,
        AVG(home_goals_ft) avg_goals_against,
        AVG(away_corners_ft) avg_corners_for,
        AVG(home_corners_ft) avg_corners_against,
        AVG(away_yellow_cards_ft) avg_cards_for,
        AVG(home_yellow_cards_ft) avg_cards_against,
        100.0 * SUM(CASE WHEN home_goals_ft>0 AND away_goals_ft>0 THEN 1 ELSE 0 END) / COUNT(*) btts_pct,
        100.0 * SUM(CASE WHEN total_goals_ft>2.5 THEN 1 ELSE 0 END) / COUNT(*) over25_pct
       FROM matches WHERE away_team = @team`
    )
    .get({ team }) as SplitRow;

  const home: TeamSplit = homeSplit.played ? { ...homeSplit } : emptySplit();
  const away: TeamSplit = awaySplit.played ? { ...awaySplit } : emptySplit();

  if (!home.played && !away.played) return null;

  const overall: TeamSplit = {
    played: home.played + away.played,
    w: home.w + away.w,
    d: home.d + away.d,
    l: home.l + away.l,
    avg_goals_for: weightedAvg(home.avg_goals_for, home.played, away.avg_goals_for, away.played),
    avg_goals_against: weightedAvg(home.avg_goals_against, home.played, away.avg_goals_against, away.played),
    avg_corners_for: weightedAvg(home.avg_corners_for, home.played, away.avg_corners_for, away.played),
    avg_corners_against: weightedAvg(home.avg_corners_against, home.played, away.avg_corners_against, away.played),
    avg_cards_for: weightedAvg(home.avg_cards_for, home.played, away.avg_cards_for, away.played),
    avg_cards_against: weightedAvg(home.avg_cards_against, home.played, away.avg_cards_against, away.played),
    btts_pct: weightedAvg(home.btts_pct, home.played, away.btts_pct, away.played),
    over25_pct: weightedAvg(home.over25_pct, home.played, away.over25_pct, away.played),
  };

  const leagueRows = db
    .prepare(
      `SELECT DISTINCT league FROM matches WHERE home_team = @team OR away_team = @team ORDER BY league`
    )
    .all({ team }) as { league: string }[];

  const recentRows = db
    .prepare(
      `SELECT match_id, start_datetime, league,
              CASE WHEN home_team = @team THEN 'home' ELSE 'away' END venue,
              CASE WHEN home_team = @team THEN away_team ELSE home_team END opponent,
              CASE WHEN home_team = @team THEN home_goals_ft ELSE away_goals_ft END goals_for,
              CASE WHEN home_team = @team THEN away_goals_ft ELSE home_goals_ft END goals_against,
              CASE WHEN home_team = @team THEN home_corners_ft ELSE away_corners_ft END corners_for,
              CASE WHEN home_team = @team THEN away_corners_ft ELSE home_corners_ft END corners_against,
              CASE WHEN home_team = @team THEN home_yellow_cards_ft ELSE away_yellow_cards_ft END cards_for,
              CASE WHEN home_team = @team THEN away_yellow_cards_ft ELSE home_yellow_cards_ft END cards_against,
              CASE
                WHEN (home_team = @team AND result_ft = 'H') OR (away_team = @team AND result_ft = 'A') THEN 'W'
                WHEN result_ft = 'D' THEN 'D'
                ELSE 'L'
              END outcome
       FROM matches
       WHERE home_team = @team OR away_team = @team
       ORDER BY start_datetime DESC
       LIMIT 20`
    )
    .all({ team }) as RecentMatch[];

  return {
    team,
    leagues: leagueRows.map((r) => r.league),
    overall,
    home,
    away,
    recentMatches: recentRows,
  };
}

function weightedAvg(a: number | null, aw: number, b: number | null, bw: number): number | null {
  const totalW = aw + bw;
  if (!totalW) return null;
  return ((a ?? 0) * aw + (b ?? 0) * bw) / totalW;
}
