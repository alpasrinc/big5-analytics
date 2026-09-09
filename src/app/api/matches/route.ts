import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { buildMatchesFilter } from "@/lib/matches-query";

// Favori (lower closing win odds) / Beraberlik / Sürpriz versions of the
// result-code CASE expressions below, mirroring the per-row F/S badge logic
// in matches-table.tsx but computed in SQL for the whole filtered set.
const favLetterCase = (resultCol: string) => `CASE
  WHEN ${resultCol} = 'D' THEN 'B'
  WHEN home_win_closing_odds < away_win_closing_odds THEN (CASE WHEN ${resultCol} = 'H' THEN 'F' ELSE 'S' END)
  ELSE (CASE WHEN ${resultCol} = 'A' THEN 'F' ELSE 'S' END)
END`;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const db = getDb();

  const { whereSql, params, sort, dir } = buildMatchesFilter(sp);

  const page = Math.max(1, Number(sp.get("page") || 1));
  const pageSize = Math.min(500, Math.max(1, Number(sp.get("pageSize") || 25)));
  const offset = (page - 1) * pageSize;

  const totalRow = db
    .prepare(`SELECT COUNT(*) as c FROM matches ${whereSql}`)
    .get(params) as { c: number };

  const aggRow = db
    .prepare(
      `SELECT
        AVG(total_corners_ft) avg_corners,
        AVG(total_yellow_cards_ft) avg_cards,
        AVG(total_goals_ft) avg_goals,
        COALESCE(SUM(CASE WHEN result_ft = 'H' THEN 1 ELSE 0 END), 0) count_h,
        COALESCE(SUM(CASE WHEN result_ft = 'D' THEN 1 ELSE 0 END), 0) count_d,
        COALESCE(SUM(CASE WHEN result_ft = 'A' THEN 1 ELSE 0 END), 0) count_a,
        COALESCE(SUM(CASE WHEN total_goals_ft > 2.5 THEN 1 ELSE 0 END), 0) count_over25,
        COALESCE(SUM(CASE WHEN total_goals_ft < 2.5 THEN 1 ELSE 0 END), 0) count_under25,
        COALESCE(SUM(CASE WHEN home_goals_ft > 0 AND away_goals_ft > 0 THEN 1 ELSE 0 END), 0) count_btts_yes,
        COALESCE(SUM(CASE WHEN home_goals_ft = 0 OR away_goals_ft = 0 THEN 1 ELSE 0 END), 0) count_btts_no
      FROM matches ${whereSql}`
    )
    .get(params) as Record<string, number | null>;

  const rows = db
    .prepare(
      `SELECT * FROM matches ${whereSql} ORDER BY ${sort} ${dir}, match_id ${dir} LIMIT @limit OFFSET @offset`
    )
    .all({ ...params, limit: pageSize, offset });

  // Every distinct full-time scoreline across the *whole* filtered set (not
  // just the current page), sorted most-to-least frequent. Powers both the
  // "highlight the most repeated score" table toggle (only the rows tied for
  // the #1 count) and the expandable list showing the full ranking below it.
  const topScoreRows = totalRow.c
    ? (db
        .prepare(
          `SELECT home_goals_ft as home, away_goals_ft as away, COUNT(*) as count
           FROM matches ${whereSql}
           GROUP BY home_goals_ft, away_goals_ft
           ORDER BY count DESC, (home_goals_ft + away_goals_ft) ASC`
        )
        .all(params) as { home: number; away: number; count: number }[])
    : [];

  // Same idea, for the half-time scoreline — its own independent toggle.
  const topScoreHtRows = totalRow.c
    ? (db
        .prepare(
          `SELECT home_goals_1h as home, away_goals_1h as away, COUNT(*) as count
           FROM matches ${whereSql}
           GROUP BY home_goals_1h, away_goals_1h
           ORDER BY count DESC, (home_goals_1h + away_goals_1h) ASC`
        )
        .all(params) as { home: number; away: number; count: number }[])
    : [];

  // Every HT/FT result combo (e.g. "1/2"), same idea as topScoreRows.
  const topHtFtRows = totalRow.c
    ? (db
        .prepare(
          `SELECT result_1h as ht, result_ft as ft, COUNT(*) as count
           FROM matches ${whereSql}
           GROUP BY result_1h, result_ft
           ORDER BY count DESC`
        )
        .all(params) as { ht: string; ft: string; count: number }[])
    : [];

  // Every Favori/Beraberlik/Sürpriz HT/FT combo, e.g. "B/S" = draw at half
  // time, surprise (the higher-odds side) won the match.
  // Favorite is whoever closed with the lower win odds, so matches missing
  // either side's closing odds (or a dead-even price) can't be classified
  // and are excluded rather than lumped into a meaningless bucket.
  const favWhereSql = `${whereSql ? `${whereSql} AND` : "WHERE"} home_win_closing_odds IS NOT NULL AND away_win_closing_odds IS NOT NULL AND home_win_closing_odds != away_win_closing_odds`;
  const topFavRows = totalRow.c
    ? (db
        .prepare(
          `SELECT ${favLetterCase("result_1h")} as ht, ${favLetterCase("result_ft")} as ft, COUNT(*) as count
           FROM matches ${favWhereSql}
           GROUP BY ht, ft
           ORDER BY count DESC`
        )
        .all(params) as { ht: string; ft: string; count: number }[])
    : [];

  return NextResponse.json({
    rows,
    total: totalRow.c,
    page,
    pageSize,
    aggregate: {
      ...aggRow,
      top_scores: topScoreRows,
      top_scores_ht: topScoreHtRows,
      top_ht_fts: topHtFtRows,
      top_fav: topFavRows,
    },
  });
}
