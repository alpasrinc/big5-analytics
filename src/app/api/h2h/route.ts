import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export interface H2HMatch {
  match_id: number;
  start_datetime: string;
  league: string;
  home_team: string;
  away_team: string;
  home_goals_ft: number;
  away_goals_ft: number;
  total_corners_ft: number | null;
  home_corners_ft: number | null;
  away_corners_ft: number | null;
  total_yellow_cards_ft: number | null;
  home_yellow_cards_ft: number | null;
  away_yellow_cards_ft: number | null;
  result_ft: string;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const team1 = sp.get("team1");
  const team2 = sp.get("team2");
  if (!team1 || !team2) {
    return NextResponse.json({ error: "team1 ve team2 gerekli" }, { status: 400 });
  }

  const db = getDb();
  const matches = db
    .prepare(
      `SELECT match_id, start_datetime, league, home_team, away_team,
              home_goals_ft, away_goals_ft, total_corners_ft, home_corners_ft, away_corners_ft,
              total_yellow_cards_ft, home_yellow_cards_ft, away_yellow_cards_ft, result_ft
       FROM matches
       WHERE (home_team = @team1 AND away_team = @team2)
          OR (home_team = @team2 AND away_team = @team1)
       ORDER BY start_datetime DESC`
    )
    .all({ team1, team2 }) as H2HMatch[];

  let team1Wins = 0;
  let team2Wins = 0;
  let draws = 0;
  let totalGoals = 0;
  let totalCorners = 0;
  let cornersN = 0;
  let totalCards = 0;
  let cardsN = 0;
  let bttsCount = 0;
  let over25Count = 0;

  for (const m of matches) {
    const team1IsHome = m.home_team === team1;
    if (m.result_ft === "D") draws++;
    else if ((m.result_ft === "H") === team1IsHome) team1Wins++;
    else team2Wins++;

    totalGoals += m.home_goals_ft + m.away_goals_ft;
    if (m.total_corners_ft !== null) {
      totalCorners += m.total_corners_ft;
      cornersN++;
    }
    if (m.total_yellow_cards_ft !== null) {
      totalCards += m.total_yellow_cards_ft;
      cardsN++;
    }
    if (m.home_goals_ft > 0 && m.away_goals_ft > 0) bttsCount++;
    if (m.home_goals_ft + m.away_goals_ft > 2.5) over25Count++;
  }

  const n = matches.length;
  return NextResponse.json({
    team1,
    team2,
    matches,
    summary: n
      ? {
          n,
          team1Wins,
          team2Wins,
          draws,
          avg_goals: totalGoals / n,
          avg_corners: cornersN ? totalCorners / cornersN : null,
          avg_cards: cardsN ? totalCards / cardsN : null,
          btts_pct: (100 * bttsCount) / n,
          over25_pct: (100 * over25Count) / n,
        }
      : null,
  });
}
