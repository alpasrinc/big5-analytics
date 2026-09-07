import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ALL_FILTERABLE_NUMERIC_COLS, SORTABLE_COLS } from "@/lib/schema";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const db = getDb();

  const where: string[] = [];
  const params: Record<string, unknown> = {};

  const leagues = sp.getAll("league").filter(Boolean);
  if (leagues.length) {
    where.push(
      `league IN (${leagues.map((_, i) => `@league${i}`).join(",")})`
    );
    leagues.forEach((l, i) => (params[`league${i}`] = l));
  }

  const seasons = sp.getAll("season").filter(Boolean);
  if (seasons.length) {
    where.push(`season IN (${seasons.map((_, i) => `@season${i}`).join(",")})`);
    seasons.forEach((s, i) => (params[`season${i}`] = s));
  }

  const teams = sp.getAll("team").filter(Boolean);
  if (teams.length) {
    const inList = teams.map((_, i) => `@team${i}`).join(",");
    where.push(`(home_team IN (${inList}) OR away_team IN (${inList}))`);
    teams.forEach((t, i) => (params[`team${i}`] = t));
  }

  const q = sp.get("q");
  if (q) {
    where.push(`(home_team LIKE @q OR away_team LIKE @q OR referee LIKE @q)`);
    params.q = `%${q}%`;
  }

  const referees = sp.getAll("referee").filter(Boolean);
  if (referees.length) {
    where.push(`referee IN (${referees.map((_, i) => `@ref${i}`).join(",")})`);
    referees.forEach((r, i) => (params[`ref${i}`] = r));
  }

  const result = sp.getAll("result").filter(Boolean);
  if (result.length) {
    where.push(`result_ft IN (${result.map((_, i) => `@res${i}`).join(",")})`);
    result.forEach((r, i) => (params[`res${i}`] = r));
  }

  const btts = sp.get("btts");
  if (btts === "yes") where.push(`home_goals_ft > 0 AND away_goals_ft > 0`);
  if (btts === "no") where.push(`(home_goals_ft = 0 OR away_goals_ft = 0)`);

  const neutralVenue = sp.get("neutral_venue");
  if (neutralVenue === "1" || neutralVenue === "0") {
    where.push(`neutral_venue = @nv`);
    params.nv = Number(neutralVenue);
  }

  const dateFrom = sp.get("date_from");
  if (dateFrom) {
    where.push(`start_datetime >= @dateFrom`);
    params.dateFrom = dateFrom;
  }
  const dateTo = sp.get("date_to");
  if (dateTo) {
    where.push(`start_datetime <= @dateTo`);
    params.dateTo = dateTo;
  }

  // Generic min_/max_ numeric filters, restricted to a whitelist to keep the
  // query safe from injection while still covering every stat/odds column.
  for (const [key, value] of sp.entries()) {
    if (value === "" || value === null) continue;
    let col: string | null = null;
    let op: "min" | "max" | null = null;
    if (key.startsWith("min_")) {
      col = key.slice(4);
      op = "min";
    } else if (key.startsWith("max_")) {
      col = key.slice(4);
      op = "max";
    }
    if (!col || !op) continue;
    if (!ALL_FILTERABLE_NUMERIC_COLS.has(col)) continue;
    const num = Number(value);
    if (Number.isNaN(num)) continue;
    const paramKey = `${op}_${col}`;
    where.push(`${col} ${op === "min" ? ">=" : "<="} @${paramKey}`);
    params[paramKey] = num;
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  let sort = sp.get("sort") || "start_datetime";
  if (!SORTABLE_COLS.has(sort)) sort = "start_datetime";
  const dir = sp.get("dir") === "asc" ? "ASC" : "DESC";

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
        AVG(home_win_closing_odds) avg_home_odds,
        AVG(draw_closing_odds) avg_draw_odds,
        AVG(away_win_closing_odds) avg_away_odds
      FROM matches ${whereSql}`
    )
    .get(params) as Record<string, number | null>;

  const rows = db
    .prepare(
      `SELECT * FROM matches ${whereSql} ORDER BY ${sort} ${dir}, match_id ${dir} LIMIT @limit OFFSET @offset`
    )
    .all({ ...params, limit: pageSize, offset });

  // Most frequent exact scoreline across the *whole* filtered set (not just
  // the current page) — powers the "highlight the most repeated score" table
  // toggle. Ties break toward the lower-scoring match, purely for stability.
  const topScoreRow = totalRow.c
    ? (db
        .prepare(
          `SELECT home_goals_ft as home, away_goals_ft as away, COUNT(*) as count
           FROM matches ${whereSql}
           GROUP BY home_goals_ft, away_goals_ft
           ORDER BY count DESC, (home_goals_ft + away_goals_ft) ASC
           LIMIT 1`
        )
        .get(params) as { home: number; away: number; count: number })
    : null;

  // Most frequent half-time/full-time result combo (e.g. "1/2"), same idea
  // as topScoreRow — powers the matching "highlight" toggle for İY/MS.
  const topHtFtRow = totalRow.c
    ? (db
        .prepare(
          `SELECT result_1h as ht, result_ft as ft, COUNT(*) as count
           FROM matches ${whereSql}
           GROUP BY result_1h, result_ft
           ORDER BY count DESC
           LIMIT 1`
        )
        .get(params) as { ht: string; ft: string; count: number })
    : null;

  return NextResponse.json({
    rows,
    total: totalRow.c,
    page,
    pageSize,
    aggregate: { ...aggRow, top_score: topScoreRow, top_ht_ft: topHtFtRow },
  });
}
