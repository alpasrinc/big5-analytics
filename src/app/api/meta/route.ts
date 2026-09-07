import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();

  const leagues = db
    .prepare(
      `SELECT league, country, COUNT(*) as matches FROM matches GROUP BY league ORDER BY league`
    )
    .all();

  const teams = db
    .prepare(
      `SELECT DISTINCT home_team as team, league FROM matches
       UNION
       SELECT DISTINCT away_team as team, league FROM matches
       ORDER BY team`
    )
    .all();

  const referees = db
    .prepare(
      `SELECT referee, COUNT(*) as matches FROM matches WHERE referee IS NOT NULL GROUP BY referee ORDER BY referee`
    )
    .all();

  const dateRange = db
    .prepare(
      `SELECT MIN(start_datetime) as min_date, MAX(start_datetime) as max_date FROM matches`
    )
    .get();

  const seasons = db
    .prepare(`SELECT DISTINCT season FROM matches ORDER BY season`)
    .all();

  return NextResponse.json({ leagues, teams, referees, dateRange, seasons });
}
