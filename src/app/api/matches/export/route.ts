import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { buildMatchesFilter } from "@/lib/matches-query";

// Columns exported to CSV, in display order — the DB's raw column set minus
// internal/redundant ones (half-time splits, alternate odds lines not shown
// anywhere in the UI). Kept as an explicit list rather than `SELECT *` so the
// file stays readable in Excel instead of dumping 100+ columns.
const EXPORT_COLUMNS: { col: string; header: string }[] = [
  { col: "start_datetime", header: "Tarih" },
  { col: "country", header: "Ülke" },
  { col: "league", header: "Lig" },
  { col: "season", header: "Sezon" },
  { col: "home_team", header: "Ev Sahibi" },
  { col: "away_team", header: "Deplasman" },
  { col: "result_ft", header: "Sonuç (MS)" },
  { col: "result_1h", header: "Sonuç (İY)" },
  { col: "home_goals_ft", header: "Ev Gol" },
  { col: "away_goals_ft", header: "Dep Gol" },
  { col: "total_goals_ft", header: "Toplam Gol" },
  { col: "home_corners_ft", header: "Ev Korner" },
  { col: "away_corners_ft", header: "Dep Korner" },
  { col: "total_corners_ft", header: "Toplam Korner" },
  { col: "home_yellow_cards_ft", header: "Ev Sarı Kart" },
  { col: "away_yellow_cards_ft", header: "Dep Sarı Kart" },
  { col: "total_yellow_cards_ft", header: "Toplam Sarı Kart" },
  { col: "total_red_cards_ft", header: "Toplam Kırmızı Kart" },
  { col: "home_xg_ft", header: "Ev xG" },
  { col: "away_xg_ft", header: "Dep xG" },
  { col: "home_ball_possession_ft", header: "Ev Top %" },
  { col: "away_ball_possession_ft", header: "Dep Top %" },
  { col: "home_total_shots_ft", header: "Ev Şut" },
  { col: "away_total_shots_ft", header: "Dep Şut" },
  { col: "home_shots_on_target_ft", header: "Ev İsabetli Şut" },
  { col: "away_shots_on_target_ft", header: "Dep İsabetli Şut" },
  { col: "home_fouls_ft", header: "Ev Faul" },
  { col: "away_fouls_ft", header: "Dep Faul" },
  { col: "referee", header: "Hakem" },
  { col: "home_win_closing_odds", header: "MS1" },
  { col: "draw_closing_odds", header: "MSX" },
  { col: "away_win_closing_odds", header: "MS2" },
  { col: "over_2_5_goals_closing_odds", header: "Ü2.5" },
  { col: "under_2_5_goals_closing_odds", header: "A2.5" },
  { col: "btts_yes_closing_odds", header: "KG Var" },
  { col: "btts_no_closing_odds", header: "KG Yok" },
];

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const db = getDb();
  const { whereSql, params, sort, dir } = buildMatchesFilter(sp);

  const selectList = EXPORT_COLUMNS.map((c) => c.col).join(", ");
  const rows = db
    .prepare(`SELECT ${selectList} FROM matches ${whereSql} ORDER BY ${sort} ${dir}, match_id ${dir}`)
    .all(params) as Record<string, unknown>[];

  const lines = [EXPORT_COLUMNS.map((c) => csvCell(c.header)).join(",")];
  for (const row of rows) {
    lines.push(EXPORT_COLUMNS.map((c) => csvCell(row[c.col])).join(","));
  }
  // Leading BOM so Excel on Windows detects UTF-8 and renders Turkish
  // characters (İ, ş, ğ, ç, ö, ü) correctly instead of mojibake.
  const csv = "﻿" + lines.join("\r\n");

  const filename = `big5-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
