// Incrementally adds ONE league folder (4 Footiqo workbooks: Scores /
// Corners & Cards / Attacking & Possession / Odds) to the existing
// data/football.db, without touching anything already in it.
//
// Unlike build-db.mjs (full rebuild from scratch, re-parses every source),
// this only reads the 4 files for the folder given and INSERT OR IGNOREs
// them — SQLite's own PRIMARY KEY conflict handles de-duplication against
// already-imported matches (Footiqo's `id` is globally unique, so the same
// real match always carries the same id across every export). Safe to run
// while `next dev` is running: better-sqlite3 in WAL mode allows one writer
// alongside the app's readonly reader.
//
// Usage: node scripts/add-league.mjs "<folder>" <leagueId> [competitionType] [idOffset]
import XLSX from "xlsx";
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "..", "data", "football.db");

const [, , folderArg, leagueIdArg, competitionTypeArg, idOffsetArg] = process.argv;
if (!folderArg || !leagueIdArg) {
  console.error('Usage: node scripts/add-league.mjs "<folder>" <leagueId> [competitionType] [idOffset]');
  process.exit(1);
}
const folder = path.resolve(folderArg);
const leagueId = Number(leagueIdArg);
const competitionType = competitionTypeArg || "Domestic Leagues";
const idOffset = idOffsetArg ? Number(idOffsetArg) : 0;

const num = (v) => (v === null || v === undefined || v === "" ? null : Number(v));
function parseFootiqoDate(s) {
  if (!s) return null;
  const m = /^(\d{2})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/.exec(String(s).trim());
  if (!m) return null;
  const [, dd, mm, yy, hh, min] = m;
  return new Date(Date.UTC(2000 + Number(yy), Number(mm) - 1, Number(dd), Number(hh), Number(min))).toISOString();
}
const readSheet1 = (file) => XLSX.utils.sheet_to_json(XLSX.readFile(file).Sheets.Sheet1, { defval: null });

const files = fs.readdirSync(folder);
const findFile = (kind) => {
  const f = files.find((f) => f.toLowerCase().includes(kind));
  if (!f) throw new Error(`Missing "${kind}" file in ${folder}`);
  return path.join(folder, f);
};

const scoresRows = readSheet1(findFile("scores"));
const byRawId = (rows) => new Map(rows.map((r) => [r.id, r]));
const cornersById = byRawId(readSheet1(findFile("corners")));
const attackById = byRawId(readSheet1(findFile("attack")));
const oddsById = byRawId(readSheet1(findFile("odds")));

const rows = scoresRows.map((m) => {
  const c = cornersById.get(m.id) ?? {};
  const a = attackById.get(m.id) ?? {};
  const o = oddsById.get(m.id) ?? {};
  const home_corners_ft = num(c.HCFT);
  const away_corners_ft = num(c.ACFT);
  const home_yellow_cards_ft = num(c.HYCFT);
  const away_yellow_cards_ft = num(c.AYCFT);
  const home_goals_ft = num(m.FTHG);
  const away_goals_ft = num(m.FTAG);

  return {
    match_id: m.id + idOffset,
    start_datetime: parseFootiqoDate(m.matchDate),
    competition_type: competitionType,
    country: m.Country,
    league: m.League,
    league_id: leagueId,
    season: m.Season,
    home_team_id: null,
    home_team: m.homeTeam,
    away_team_id: null,
    away_team: m.awayTeam,
    referee_id: null,
    referee: null,
    referee_country: null,
    neutral_venue: null,
    home_goals_1h: num(m["1HHG"]),
    away_goals_1h: num(m["1HAG"]),
    result_1h: m["1HR"],
    home_goals_2h: num(m["2HHG"]),
    away_goals_2h: num(m["2HAG"]),
    result_2h: m["2HR"],
    home_goals_ft,
    away_goals_ft,
    result_ft: m.FTR,
    total_goals_ft: home_goals_ft + away_goals_ft,
    home_corners_ft,
    away_corners_ft,
    total_corners_ft: home_corners_ft != null && away_corners_ft != null ? home_corners_ft + away_corners_ft : null,
    home_yellow_cards_ft,
    away_yellow_cards_ft,
    total_yellow_cards_ft:
      home_yellow_cards_ft != null && away_yellow_cards_ft != null ? home_yellow_cards_ft + away_yellow_cards_ft : null,
    home_red_cards_ft: null,
    away_red_cards_ft: null,
    total_red_cards_ft: null,
    home_xg_ft: null,
    away_xg_ft: null,
    home_ball_possession_ft: num(a.HBPFT),
    away_ball_possession_ft: num(a.ABPFT),
    home_total_shots_ft: num(a.HTSFT),
    away_total_shots_ft: num(a.ATSFT),
    home_shots_on_target_ft: num(a.HSONFT),
    away_shots_on_target_ft: num(a.ASONFT),
    home_shots_off_target_ft: num(a.HSOFFFT),
    away_shots_off_target_ft: num(a.ASOFFFT),
    home_fouls_ft: null,
    away_fouls_ft: null,
    home_goalkeeper_saves_ft: null,
    away_goalkeeper_saves_ft: null,
    home_corners_1h: num(c.HC1H),
    away_corners_1h: num(c.AC1H),
    home_yellow_cards_1h: num(c.HYC1H),
    away_yellow_cards_1h: num(c.AYC1H),
    home_red_cards_1h: null,
    away_red_cards_1h: null,
    home_xg_1h: null,
    away_xg_1h: null,
    home_ball_possession_1h: num(a.HBP1H),
    away_ball_possession_1h: num(a.ABP1H),
    home_total_shots_1h: num(a.HTS1H),
    away_total_shots_1h: num(a.ATS1H),
    home_shots_on_target_1h: num(a.HSON1H),
    away_shots_on_target_1h: num(a.ASON1H),
    home_shots_off_target_1h: num(a.HSOFF1H),
    away_shots_off_target_1h: num(a.ASOFF1H),
    home_fouls_1h: null,
    away_fouls_1h: null,
    home_goalkeeper_saves_1h: null,
    away_goalkeeper_saves_1h: null,
    home_corners_2h: num(c.HC2H),
    away_corners_2h: num(c.AC2H),
    home_yellow_cards_2h: num(c.HYC2H),
    away_yellow_cards_2h: num(c.AYC2H),
    home_red_cards_2h: null,
    away_red_cards_2h: null,
    home_xg_2h: null,
    away_xg_2h: null,
    home_ball_possession_2h: num(a.HBP2H),
    away_ball_possession_2h: num(a.ABP2H),
    home_total_shots_2h: num(a.HTS2H),
    away_total_shots_2h: num(a.ATS2H),
    home_shots_on_target_2h: num(a.HSON2H),
    away_shots_on_target_2h: num(a.ASON2H),
    home_shots_off_target_2h: num(a.HSOFF2H),
    away_shots_off_target_2h: num(a.ASOFF2H),
    home_fouls_2h: null,
    away_fouls_2h: null,
    home_goalkeeper_saves_2h: null,
    away_goalkeeper_saves_2h: null,
    home_win_closing_odds: num(o.H),
    draw_closing_odds: num(o.D),
    away_win_closing_odds: num(o.A),
    over_0_5_goals_closing_odds: num(o.O05),
    under_0_5_goals_closing_odds: num(o.U05),
    over_1_5_goals_closing_odds: num(o.O15),
    under_1_5_goals_closing_odds: num(o.U15),
    over_2_5_goals_closing_odds: num(o.O25),
    under_2_5_goals_closing_odds: num(o.U25),
    over_3_5_goals_closing_odds: num(o.O35),
    under_3_5_goals_closing_odds: num(o.U35),
    over_4_5_goals_closing_odds: num(o.O45),
    under_4_5_goals_closing_odds: num(o.U45),
    home_ah_minus_1_5_closing_odds: null,
    away_ah_minus_1_5_closing_odds: null,
    home_ah_minus_1_closing_odds: null,
    away_ah_minus_1_closing_odds: null,
    home_ah_0_closing_odds: null,
    away_ah_0_closing_odds: null,
    home_ah_plus_1_closing_odds: null,
    away_ah_plus_1_closing_odds: null,
    home_ah_plus_1_5_closing_odds: null,
    away_ah_plus_1_5_closing_odds: null,
    btts_yes_closing_odds: num(o.BTTSY),
    btts_no_closing_odds: num(o.BTTSN),
    over_7_5_corners_ft_closing_odds: null,
    under_7_5_corners_ft_closing_odds: null,
    over_8_5_corners_ft_closing_odds: null,
    under_8_5_corners_ft_closing_odds: null,
    over_9_5_corners_ft_closing_odds: null,
    under_9_5_corners_ft_closing_odds: null,
    over_10_5_corners_ft_closing_odds: null,
    under_10_5_corners_ft_closing_odds: null,
    over_2_5_yellow_cards_ft_closing_odds: null,
    under_2_5_yellow_cards_ft_closing_odds: null,
    over_3_5_yellow_cards_ft_closing_odds: null,
    under_3_5_yellow_cards_ft_closing_odds: null,
    over_4_5_yellow_cards_ft_closing_odds: null,
    under_4_5_yellow_cards_ft_closing_odds: null,
    over_5_5_yellow_cards_ft_closing_odds: null,
    under_5_5_yellow_cards_ft_closing_odds: null,
  };
});

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 5000");

const cols = Object.keys(rows[0]);
const insert = db.prepare(
  `INSERT OR IGNORE INTO matches (${cols.join(",")}) VALUES (${cols.map((c) => "@" + c).join(",")})`
);
const insertMany = db.transaction((rs) => {
  let inserted = 0;
  for (const r of rs) inserted += insert.run(r).changes;
  return inserted;
});

const inserted = insertMany(rows);
const league = rows[0]?.league;
const country = rows[0]?.country;
const seasons = [...new Set(rows.map((r) => r.season))].sort();
console.log(
  `${country} / ${league}: ${inserted} new rows inserted, ${rows.length - inserted} already present (skipped). Seasons in file: ${seasons[0]}-${seasons[seasons.length - 1]}.`
);
db.close();
