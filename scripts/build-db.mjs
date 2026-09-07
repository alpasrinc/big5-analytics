// Reads the source .xlsx workbooks and builds a single denormalized SQLite
// database (data/football.db) that the API routes query at request time.
// Re-run with `npm run build:db` whenever the source spreadsheets change.
import XLSX from "xlsx";
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
const dbPath = path.join(dataDir, "football.db");

if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

const bigFive = XLSX.readFile(path.join(dataDir, "big_five_2025_26.xlsx"), {
  cellDates: true,
});
const premier = XLSX.readFile(
  path.join(dataDir, "premier_corners_cards_odds.xlsx"),
  { cellDates: true }
);

const sheet = (wb, name) => XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: null });

const matches = sheet(bigFive, "Matches_Results");
const statsFt = sheet(bigFive, "Statistics_FT");
const stats1h = sheet(bigFive, "Statistics_1H");
const stats2h = sheet(bigFive, "Statistics_2H");
const odds = sheet(bigFive, "Closing_Odds");
const cornersOdds = sheet(premier, "Corners_Closing_Odds");
const cardsOdds = sheet(premier, "Cards_Closing_Odds");

const byId = (rows) => new Map(rows.map((r) => [r.match_id, r]));
const statsFtById = byId(statsFt);
const stats1hById = byId(stats1h);
const stats2hById = byId(stats2h);
const oddsById = byId(odds);
const cornersOddsById = byId(cornersOdds);
const cardsOddsById = byId(cardsOdds);

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

const cols = [
  ["match_id", "INTEGER PRIMARY KEY"],
  ["start_datetime", "TEXT"],
  ["competition_type", "TEXT"],
  ["country", "TEXT"],
  ["league", "TEXT"],
  ["league_id", "INTEGER"],
  ["season", "TEXT"],
  ["home_team_id", "INTEGER"],
  ["home_team", "TEXT"],
  ["away_team_id", "INTEGER"],
  ["away_team", "TEXT"],
  ["referee_id", "INTEGER"],
  ["referee", "TEXT"],
  ["referee_country", "TEXT"],
  ["neutral_venue", "INTEGER"],
  ["home_goals_1h", "INTEGER"],
  ["away_goals_1h", "INTEGER"],
  ["result_1h", "TEXT"],
  ["home_goals_2h", "INTEGER"],
  ["away_goals_2h", "INTEGER"],
  ["result_2h", "TEXT"],
  ["home_goals_ft", "INTEGER"],
  ["away_goals_ft", "INTEGER"],
  ["result_ft", "TEXT"],
  ["total_goals_ft", "INTEGER"],
  // FT stats
  ["home_corners_ft", "REAL"], ["away_corners_ft", "REAL"], ["total_corners_ft", "REAL"],
  ["home_yellow_cards_ft", "REAL"], ["away_yellow_cards_ft", "REAL"], ["total_yellow_cards_ft", "REAL"],
  ["home_red_cards_ft", "REAL"], ["away_red_cards_ft", "REAL"], ["total_red_cards_ft", "REAL"],
  ["home_xg_ft", "REAL"], ["away_xg_ft", "REAL"],
  ["home_ball_possession_ft", "REAL"], ["away_ball_possession_ft", "REAL"],
  ["home_total_shots_ft", "REAL"], ["away_total_shots_ft", "REAL"],
  ["home_shots_on_target_ft", "REAL"], ["away_shots_on_target_ft", "REAL"],
  ["home_shots_off_target_ft", "REAL"], ["away_shots_off_target_ft", "REAL"],
  ["home_fouls_ft", "REAL"], ["away_fouls_ft", "REAL"],
  ["home_goalkeeper_saves_ft", "REAL"], ["away_goalkeeper_saves_ft", "REAL"],
  // 1H stats
  ["home_corners_1h", "REAL"], ["away_corners_1h", "REAL"],
  ["home_yellow_cards_1h", "REAL"], ["away_yellow_cards_1h", "REAL"],
  ["home_red_cards_1h", "REAL"], ["away_red_cards_1h", "REAL"],
  ["home_xg_1h", "REAL"], ["away_xg_1h", "REAL"],
  ["home_ball_possession_1h", "REAL"], ["away_ball_possession_1h", "REAL"],
  ["home_total_shots_1h", "REAL"], ["away_total_shots_1h", "REAL"],
  ["home_shots_on_target_1h", "REAL"], ["away_shots_on_target_1h", "REAL"],
  ["home_shots_off_target_1h", "REAL"], ["away_shots_off_target_1h", "REAL"],
  ["home_fouls_1h", "REAL"], ["away_fouls_1h", "REAL"],
  ["home_goalkeeper_saves_1h", "REAL"], ["away_goalkeeper_saves_1h", "REAL"],
  // 2H stats
  ["home_corners_2h", "REAL"], ["away_corners_2h", "REAL"],
  ["home_yellow_cards_2h", "REAL"], ["away_yellow_cards_2h", "REAL"],
  ["home_red_cards_2h", "REAL"], ["away_red_cards_2h", "REAL"],
  ["home_xg_2h", "REAL"], ["away_xg_2h", "REAL"],
  ["home_ball_possession_2h", "REAL"], ["away_ball_possession_2h", "REAL"],
  ["home_total_shots_2h", "REAL"], ["away_total_shots_2h", "REAL"],
  ["home_shots_on_target_2h", "REAL"], ["away_shots_on_target_2h", "REAL"],
  ["home_shots_off_target_2h", "REAL"], ["away_shots_off_target_2h", "REAL"],
  ["home_fouls_2h", "REAL"], ["away_fouls_2h", "REAL"],
  ["home_goalkeeper_saves_2h", "REAL"], ["away_goalkeeper_saves_2h", "REAL"],
  // Closing odds - 1X2 / totals / BTTS
  ["home_win_closing_odds", "REAL"], ["draw_closing_odds", "REAL"], ["away_win_closing_odds", "REAL"],
  ["over_0_5_goals_closing_odds", "REAL"], ["under_0_5_goals_closing_odds", "REAL"],
  ["over_1_5_goals_closing_odds", "REAL"], ["under_1_5_goals_closing_odds", "REAL"],
  ["over_2_5_goals_closing_odds", "REAL"], ["under_2_5_goals_closing_odds", "REAL"],
  ["over_3_5_goals_closing_odds", "REAL"], ["under_3_5_goals_closing_odds", "REAL"],
  ["over_4_5_goals_closing_odds", "REAL"], ["under_4_5_goals_closing_odds", "REAL"],
  ["home_ah_minus_1_5_closing_odds", "REAL"], ["away_ah_minus_1_5_closing_odds", "REAL"],
  ["home_ah_minus_1_closing_odds", "REAL"], ["away_ah_minus_1_closing_odds", "REAL"],
  ["home_ah_0_closing_odds", "REAL"], ["away_ah_0_closing_odds", "REAL"],
  ["home_ah_plus_1_closing_odds", "REAL"], ["away_ah_plus_1_closing_odds", "REAL"],
  ["home_ah_plus_1_5_closing_odds", "REAL"], ["away_ah_plus_1_5_closing_odds", "REAL"],
  ["btts_yes_closing_odds", "REAL"], ["btts_no_closing_odds", "REAL"],
  // Premier League only: corners & cards closing odds
  ["over_7_5_corners_ft_closing_odds", "REAL"], ["under_7_5_corners_ft_closing_odds", "REAL"],
  ["over_8_5_corners_ft_closing_odds", "REAL"], ["under_8_5_corners_ft_closing_odds", "REAL"],
  ["over_9_5_corners_ft_closing_odds", "REAL"], ["under_9_5_corners_ft_closing_odds", "REAL"],
  ["over_10_5_corners_ft_closing_odds", "REAL"], ["under_10_5_corners_ft_closing_odds", "REAL"],
  ["over_2_5_yellow_cards_ft_closing_odds", "REAL"], ["under_2_5_yellow_cards_ft_closing_odds", "REAL"],
  ["over_3_5_yellow_cards_ft_closing_odds", "REAL"], ["under_3_5_yellow_cards_ft_closing_odds", "REAL"],
  ["over_4_5_yellow_cards_ft_closing_odds", "REAL"], ["under_4_5_yellow_cards_ft_closing_odds", "REAL"],
  ["over_5_5_yellow_cards_ft_closing_odds", "REAL"], ["under_5_5_yellow_cards_ft_closing_odds", "REAL"],
];

db.exec(`CREATE TABLE matches (\n  ${cols.map(([n, t]) => `${n} ${t}`).join(",\n  ")}\n);`);
db.exec(`CREATE INDEX idx_league ON matches(league);`);
db.exec(`CREATE INDEX idx_datetime ON matches(start_datetime);`);
db.exec(`CREATE INDEX idx_home_team ON matches(home_team);`);
db.exec(`CREATE INDEX idx_away_team ON matches(away_team);`);
db.exec(`CREATE INDEX idx_referee ON matches(referee);`);

const insert = db.prepare(
  `INSERT INTO matches (${cols.map(([n]) => n).join(",")}) VALUES (${cols
    .map((c) => "@" + c[0])
    .join(",")})`
);

const toIso = (v) => {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString();
  return String(v);
};
const num = (v) => (v === null || v === undefined || v === "" ? null : Number(v));

const insertMany = db.transaction((rows) => {
  for (const row of rows) insert.run(row);
});

const rows = matches.map((m) => {
  const s = statsFtById.get(m.match_id) ?? {};
  const s1 = stats1hById.get(m.match_id) ?? {};
  const s2 = stats2hById.get(m.match_id) ?? {};
  const o = oddsById.get(m.match_id) ?? {};
  const co = cornersOddsById.get(m.match_id) ?? {};
  const ko = cardsOddsById.get(m.match_id) ?? {};

  const record = {
    match_id: m.match_id,
    start_datetime: toIso(m.start_datetime),
    competition_type: m.competition_type,
    country: m.country,
    league: m.league,
    league_id: m.league_id,
    season: m.season,
    home_team_id: m.home_team_id,
    home_team: m.home_team,
    away_team_id: m.away_team_id,
    away_team: m.away_team,
    referee_id: m.referee_id,
    referee: m.referee,
    referee_country: m.referee_country,
    neutral_venue: num(m.neutral_venue),
    home_goals_1h: num(m.home_goals_1h),
    away_goals_1h: num(m.away_goals_1h),
    result_1h: m.result_1h,
    home_goals_2h: num(m.home_goals_2h),
    away_goals_2h: num(m.away_goals_2h),
    result_2h: m.result_2h,
    home_goals_ft: num(m.home_goals_ft),
    away_goals_ft: num(m.away_goals_ft),
    result_ft: m.result_ft,
    total_goals_ft: num(m.home_goals_ft) + num(m.away_goals_ft),
  };

  for (const [n] of cols) {
    if (n in record) continue;
    if (n in s) record[n] = num(s[n]);
    else if (n in s1) record[n] = num(s1[n]);
    else if (n in s2) record[n] = num(s2[n]);
    else if (n in o) record[n] = num(o[n]);
    else if (n in co) record[n] = num(co[n]);
    else if (n in ko) record[n] = num(ko[n]);
    else record[n] = null;
  }
  record.total_corners_ft =
    record.home_corners_ft != null && record.away_corners_ft != null
      ? record.home_corners_ft + record.away_corners_ft
      : record.total_corners_ft ?? null;
  record.total_yellow_cards_ft =
    record.home_yellow_cards_ft != null && record.away_yellow_cards_ft != null
      ? record.home_yellow_cards_ft + record.away_yellow_cards_ft
      : record.total_yellow_cards_ft ?? null;
  record.total_red_cards_ft =
    record.home_red_cards_ft != null && record.away_red_cards_ft != null
      ? record.home_red_cards_ft + record.away_red_cards_ft
      : null;
  return record;
});

// --- Footiqo "4-workbook league export" sources (Scores / Corners & Cards /
// Attacking & Possession / Odds, joined on their shared `id`) ---
// Footiqo's `id` is a single global sequence across their whole database, so
// the exact same match carries the exact same id whether it comes from the
// Big Five free dataset, a Champions League export, or a per-league "Last
// Seasons" export. That makes de-duplication trivial: skip any row whose id
// was already inserted by an earlier source. The only source with an
// artificial offset is Champions League (900_000_000), applied when it was
// first imported before this was understood — left in place since renumbering
// it would just be churn.
function readSheet1(file) {
  return XLSX.utils.sheet_to_json(XLSX.readFile(file).Sheets.Sheet1, { defval: null });
}

// Source dates are text like "31-05-25 21:00" (DD-MM-YY HH:MM). These
// workbooks only ever cover 2015-onward seasons, so the 2-digit year always
// means 20YY.
function parseFootiqoDate(s) {
  if (!s) return null;
  const m = /^(\d{2})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/.exec(String(s).trim());
  if (!m) return null;
  const [, dd, mm, yy, hh, min] = m;
  return new Date(Date.UTC(2000 + Number(yy), Number(mm) - 1, Number(dd), Number(hh), Number(min))).toISOString();
}

// folder: directory containing the 4 "Database - <Kind> - <League> - LS.xlsx"
// files. leagueId/competitionType are assigned by us (Footiqo doesn't expose
// a stable league id); country/league/season come from the files themselves.
function loadFootiqoLeagueFolder(folder, { leagueId, competitionType, idOffset = 0 }) {
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

  return scoresRows.map((m) => {
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
}

const CL_ID_OFFSET = 900_000_000;
const clRows = loadFootiqoLeagueFolder(path.join(dataDir, "..", "..", "Champions League"), {
  leagueId: 6,
  competitionType: "Continental Cup",
  idOffset: CL_ID_OFFSET,
});

// Additional per-league folders dropped in as they're collected. `used` tracks
// every match_id already staged so re-fetched "Last Seasons" exports that
// overlap an already-imported current season (e.g. Premier League 2025/2026,
// already in `rows` from the Big Five file) are silently skipped rather than
// violating the primary key or double-counting matches.
const used = new Set([...rows.map((r) => r.match_id), ...clRows.map((r) => r.match_id)]);
const dedupe = (candidateRows) => {
  const fresh = [];
  let skipped = 0;
  for (const r of candidateRows) {
    if (used.has(r.match_id)) {
      skipped++;
      continue;
    }
    used.add(r.match_id);
    fresh.push(r);
  }
  return { fresh, skipped };
};

const sourceRoot = path.join(dataDir, "..", "..");
const leagueFolders = [
  { dir: "England/Premier League", leagueId: 2, competitionType: "Domestic Leagues" },
  { dir: "England/Championship", leagueId: 7, competitionType: "Domestic Leagues" },
  { dir: "Turkey", leagueId: 8, competitionType: "Domestic Leagues" },
  { dir: "Spain/La Liga", leagueId: 1, competitionType: "Domestic Leagues" },
  { dir: "Spain/La Liga 2", leagueId: 9, competitionType: "Domestic Leagues" },
  { dir: "Germany/Bundesliga", leagueId: 4, competitionType: "Domestic Leagues" },
  { dir: "Germany/2. Bundesliga", leagueId: 10, competitionType: "Domestic Leagues" },
  { dir: "Italy", leagueId: 3, competitionType: "Domestic Leagues" },
  { dir: "France", leagueId: 5, competitionType: "Domestic Leagues" },
  { dir: "Netherlands", leagueId: 11, competitionType: "Domestic Leagues" },
];

const extraRows = [];
for (const { dir, leagueId, competitionType } of leagueFolders) {
  const folder = path.join(sourceRoot, dir);
  if (!fs.existsSync(folder)) {
    console.warn(`Skipping missing folder: ${folder}`);
    continue;
  }
  const candidate = loadFootiqoLeagueFolder(folder, { leagueId, competitionType });
  const { fresh, skipped } = dedupe(candidate);
  console.log(`${dir}: ${fresh.length} new rows, ${skipped} already present (skipped)`);
  extraRows.push(...fresh);
}

insertMany(rows);
insertMany(clRows);
insertMany(extraRows);

console.log(
  `Inserted ${rows.length} Big Five + ${clRows.length} Champions League + ${extraRows.length} additional-league matches into ${dbPath}`
);
db.close();
