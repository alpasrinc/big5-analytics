import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();

  const perLeague = db
    .prepare(
      `SELECT
        league,
        COUNT(*) matches,
        AVG(total_goals_ft) avg_goals,
        AVG(total_corners_ft) avg_corners,
        AVG(total_yellow_cards_ft) avg_cards,
        AVG(total_red_cards_ft) avg_red_cards,
        100.0 * SUM(CASE WHEN result_ft='H' THEN 1 ELSE 0 END) / COUNT(*) home_win_pct,
        100.0 * SUM(CASE WHEN result_ft='D' THEN 1 ELSE 0 END) / COUNT(*) draw_pct,
        100.0 * SUM(CASE WHEN result_ft='A' THEN 1 ELSE 0 END) / COUNT(*) away_win_pct,
        100.0 * SUM(CASE WHEN home_goals_ft>0 AND away_goals_ft>0 THEN 1 ELSE 0 END) / COUNT(*) btts_pct,
        100.0 * SUM(CASE WHEN total_goals_ft>2.5 THEN 1 ELSE 0 END) / COUNT(*) over25_pct
      FROM matches GROUP BY league ORDER BY league`
    )
    .all();

  const cornersHistogram = db
    .prepare(
      `SELECT total_corners_ft as bucket, COUNT(*) count FROM matches
       WHERE total_corners_ft IS NOT NULL GROUP BY bucket ORDER BY bucket`
    )
    .all();

  const cardsHistogram = db
    .prepare(
      `SELECT total_yellow_cards_ft as bucket, COUNT(*) count FROM matches
       WHERE total_yellow_cards_ft IS NOT NULL GROUP BY bucket ORDER BY bucket`
    )
    .all();

  const goalsHistogram = db
    .prepare(
      `SELECT total_goals_ft as bucket, COUNT(*) count FROM matches
       WHERE total_goals_ft IS NOT NULL GROUP BY bucket ORDER BY bucket`
    )
    .all();

  // Team-level aggregation combining home + away appearances.
  const teamRows = db
    .prepare(
      `SELECT home_team as team, league,
              home_corners_ft as corners_for, away_corners_ft as corners_against,
              home_yellow_cards_ft as cards_for, away_yellow_cards_ft as cards_against,
              home_goals_ft as goals_for, away_goals_ft as goals_against,
              CASE result_ft WHEN 'H' THEN 3 WHEN 'D' THEN 1 ELSE 0 END as points
       FROM matches
       UNION ALL
       SELECT away_team as team, league,
              away_corners_ft, home_corners_ft,
              away_yellow_cards_ft, home_yellow_cards_ft,
              away_goals_ft, home_goals_ft,
              CASE result_ft WHEN 'A' THEN 3 WHEN 'D' THEN 1 ELSE 0 END
       FROM matches`
    )
    .all() as {
    team: string;
    league: string;
    corners_for: number;
    corners_against: number;
    cards_for: number;
    cards_against: number;
    goals_for: number;
    goals_against: number;
    points: number;
  }[];

  const teamMap = new Map<string, {
    team: string; league: string; played: number; points: number;
    corners_for: number; corners_against: number;
    cards_for: number; cards_against: number;
    goals_for: number; goals_against: number;
  }>();
  for (const r of teamRows) {
    const cur = teamMap.get(r.team) ?? {
      team: r.team, league: r.league, played: 0, points: 0,
      corners_for: 0, corners_against: 0, cards_for: 0, cards_against: 0,
      goals_for: 0, goals_against: 0,
    };
    cur.played += 1;
    cur.points += r.points;
    cur.corners_for += r.corners_for ?? 0;
    cur.corners_against += r.corners_against ?? 0;
    cur.cards_for += r.cards_for ?? 0;
    cur.cards_against += r.cards_against ?? 0;
    cur.goals_for += r.goals_for ?? 0;
    cur.goals_against += r.goals_against ?? 0;
    teamMap.set(r.team, cur);
  }
  const teams = Array.from(teamMap.values()).map((t) => ({
    ...t,
    avg_corners_for: t.corners_for / t.played,
    avg_corners_against: t.corners_against / t.played,
    avg_cards_for: t.cards_for / t.played,
    avg_cards_against: t.cards_against / t.played,
    avg_goals_for: t.goals_for / t.played,
    avg_goals_against: t.goals_against / t.played,
    ppg: t.points / t.played,
  }));

  // Closing-odds calibration: bucket implied probability from home win closing
  // odds and compare to the actual observed home-win frequency in that bucket.
  const oddsRows = db
    .prepare(
      `SELECT home_win_closing_odds odds, result_ft FROM matches WHERE home_win_closing_odds IS NOT NULL`
    )
    .all() as { odds: number; result_ft: string }[];
  const buckets = new Map<string, { implied: number; n: number; wins: number }>();
  for (const r of oddsRows) {
    const implied = 1 / r.odds;
    const bucketIdx = Math.floor(implied * 20) / 20; // 5% buckets
    const key = bucketIdx.toFixed(2);
    const cur = buckets.get(key) ?? { implied: bucketIdx, n: 0, wins: 0 };
    cur.n += 1;
    if (r.result_ft === "H") cur.wins += 1;
    buckets.set(key, cur);
  }
  const oddsCalibration = Array.from(buckets.values())
    .filter((b) => b.n >= 5)
    .sort((a, b) => a.implied - b.implied)
    .map((b) => ({
      implied_pct: Math.round(b.implied * 1000) / 10,
      actual_pct: Math.round((b.wins / b.n) * 1000) / 10,
      n: b.n,
    }));

  return NextResponse.json({
    perLeague,
    cornersHistogram,
    cardsHistogram,
    goalsHistogram,
    teams,
    oddsCalibration,
  });
}
