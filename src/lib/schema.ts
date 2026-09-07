// Single source of truth for which columns exist, which are numeric/filterable,
// and how they're labeled in the UI. Keeping this centralized is what lets the
// filter panel, the API route, and the table stay in sync as columns are added.

export const LEAGUES = [
  "Premier League",
  "LaLiga",
  "Serie A",
  "Bundesliga",
  "Ligue 1",
  "Champions League",
  "Championship",
  "Super Lig",
  "LaLiga2",
  "2. Bundesliga",
  "Eredivisie",
] as const;

export type League = (typeof LEAGUES)[number];

export interface NumericField {
  col: string;
  label: string;
  group: string;
  step?: number;
  suffix?: string;
  // When set, the right panel's "tam" (exact) input writes value±tolerance
  // to min/max instead of value===value — closing odds rarely land on the
  // exact figure typed, so a small band around it is far more useful.
  tolerance?: number;
}

export const NUMERIC_FIELDS: NumericField[] = [
  // Goals
  { col: "total_goals_ft", label: "Toplam Gol", group: "Gol" },
  { col: "home_goals_ft", label: "Ev Sahibi Gol", group: "Gol" },
  { col: "away_goals_ft", label: "Deplasman Gol", group: "Gol" },
  // Corners
  { col: "total_corners_ft", label: "Toplam Korner", group: "Korner" },
  { col: "home_corners_ft", label: "Ev Sahibi Korner", group: "Korner" },
  { col: "away_corners_ft", label: "Deplasman Korner", group: "Korner" },
  // Cards
  { col: "total_yellow_cards_ft", label: "Toplam Sarı Kart", group: "Kart" },
  { col: "home_yellow_cards_ft", label: "Ev Sahibi Sarı Kart", group: "Kart" },
  { col: "away_yellow_cards_ft", label: "Deplasman Sarı Kart", group: "Kart" },
  { col: "total_red_cards_ft", label: "Toplam Kırmızı Kart", group: "Kart" },
  // xG
  { col: "home_xg_ft", label: "Ev Sahibi xG", group: "xG", step: 0.1 },
  { col: "away_xg_ft", label: "Deplasman xG", group: "xG", step: 0.1 },
  // Possession
  { col: "home_ball_possession_ft", label: "Ev Sahibi Top Hakimiyeti", group: "Diğer İstatistikler", suffix: "%" },
  { col: "away_ball_possession_ft", label: "Deplasman Top Hakimiyeti", group: "Diğer İstatistikler", suffix: "%" },
  // Shots
  { col: "home_total_shots_ft", label: "Ev Sahibi Şut", group: "Diğer İstatistikler" },
  { col: "away_total_shots_ft", label: "Deplasman Şut", group: "Diğer İstatistikler" },
  { col: "home_shots_on_target_ft", label: "Ev Sahibi İsabetli Şut", group: "Diğer İstatistikler" },
  { col: "away_shots_on_target_ft", label: "Deplasman İsabetli Şut", group: "Diğer İstatistikler" },
  { col: "home_fouls_ft", label: "Ev Sahibi Faul", group: "Diğer İstatistikler" },
  { col: "away_fouls_ft", label: "Deplasman Faul", group: "Diğer İstatistikler" },
  // Odds — "tam" applies a ±0.05 band (see NumericField.tolerance) since
  // closing odds almost never land on the exact typed figure.
  { col: "home_win_closing_odds", label: "MS 1 Kapanış Oranı", group: "Kapanış Oranları (1X2)", step: 0.01, tolerance: 0.05 },
  { col: "draw_closing_odds", label: "MS X Kapanış Oranı", group: "Kapanış Oranları (1X2)", step: 0.01, tolerance: 0.05 },
  { col: "away_win_closing_odds", label: "MS 2 Kapanış Oranı", group: "Kapanış Oranları (1X2)", step: 0.01, tolerance: 0.05 },
  { col: "over_2_5_goals_closing_odds", label: "2.5 Üst Kapanış Oranı", group: "Kapanış Oranları (Gol)", step: 0.01, tolerance: 0.05 },
  { col: "under_2_5_goals_closing_odds", label: "2.5 Alt Kapanış Oranı", group: "Kapanış Oranları (Gol)", step: 0.01, tolerance: 0.05 },
  { col: "btts_yes_closing_odds", label: "KG Var Kapanış Oranı", group: "Kapanış Oranları (Gol)", step: 0.01, tolerance: 0.05 },
  { col: "btts_no_closing_odds", label: "KG Yok Kapanış Oranı", group: "Kapanış Oranları (Gol)", step: 0.01, tolerance: 0.05 },
  { col: "over_9_5_corners_ft_closing_odds", label: "9.5 Üst Korner Oranı (Premier)", group: "Kapanış Oranları (Korner)", step: 0.01, tolerance: 0.05 },
  { col: "under_9_5_corners_ft_closing_odds", label: "9.5 Alt Korner Oranı (Premier)", group: "Kapanış Oranları (Korner)", step: 0.01, tolerance: 0.05 },
  { col: "over_3_5_yellow_cards_ft_closing_odds", label: "3.5 Üst Kart Oranı (Premier)", group: "Kapanış Oranları (Kart)", step: 0.01, tolerance: 0.05 },
  { col: "under_3_5_yellow_cards_ft_closing_odds", label: "3.5 Alt Kart Oranı (Premier)", group: "Kapanış Oranları (Kart)", step: 0.01, tolerance: 0.05 },
];

export const NUMERIC_COLS = new Set(NUMERIC_FIELDS.map((f) => f.col));

// Extra numeric columns that exist in the DB and are safe to sort/filter on
// via generic min_/max_ query params, even if not surfaced as quick-filter sliders.
export const ALL_FILTERABLE_NUMERIC_COLS = new Set<string>([
  ...NUMERIC_COLS,
  "home_goals_1h", "away_goals_1h", "home_goals_2h", "away_goals_2h",
  "home_corners_1h", "away_corners_1h", "home_corners_2h", "away_corners_2h",
  "home_yellow_cards_1h", "away_yellow_cards_1h", "home_yellow_cards_2h", "away_yellow_cards_2h",
  "home_red_cards_ft", "away_red_cards_ft",
  "home_shots_off_target_ft", "away_shots_off_target_ft",
  "home_goalkeeper_saves_ft", "away_goalkeeper_saves_ft",
  "home_ah_0_closing_odds", "away_ah_0_closing_odds",
  "over_1_5_goals_closing_odds", "under_1_5_goals_closing_odds",
  "over_3_5_goals_closing_odds", "under_3_5_goals_closing_odds",
  "over_7_5_corners_ft_closing_odds", "under_7_5_corners_ft_closing_odds",
  "over_8_5_corners_ft_closing_odds", "under_8_5_corners_ft_closing_odds",
  "over_10_5_corners_ft_closing_odds", "under_10_5_corners_ft_closing_odds",
  "over_2_5_yellow_cards_ft_closing_odds", "under_2_5_yellow_cards_ft_closing_odds",
  "over_4_5_yellow_cards_ft_closing_odds", "under_4_5_yellow_cards_ft_closing_odds",
  "over_5_5_yellow_cards_ft_closing_odds", "under_5_5_yellow_cards_ft_closing_odds",
]);

export const SORTABLE_COLS = new Set<string>([
  "start_datetime",
  "league",
  "home_team",
  "away_team",
  "total_goals_ft",
  "total_corners_ft",
  "total_yellow_cards_ft",
  "home_win_closing_odds",
  "draw_closing_odds",
  "away_win_closing_odds",
  ...ALL_FILTERABLE_NUMERIC_COLS,
]);

// Optional odds columns for the matches table, toggled by the user via the
// column picker. Each "market" adds one or two narrow columns (e.g. an
// Alt/Üst line adds both sides at once) so the picker stays a manageable
// list of markets rather than 30+ individual columns.
export interface OddsTableColumn {
  key: string;
  header: string;
  decimals?: number;
  suffix?: string;
}
export interface OddsMarket {
  id: string;
  label: string;
  group: string;
  defaultVisible: boolean;
  columns: OddsTableColumn[];
}

export const ODDS_MARKETS: OddsMarket[] = [
  { id: "ms1", label: "MS 1", group: "Maç Sonucu (1X2)", defaultVisible: true, columns: [{ key: "home_win_closing_odds", header: "1" }] },
  { id: "msx", label: "MS X", group: "Maç Sonucu (1X2)", defaultVisible: true, columns: [{ key: "draw_closing_odds", header: "X" }] },
  { id: "ms2", label: "MS 2", group: "Maç Sonucu (1X2)", defaultVisible: true, columns: [{ key: "away_win_closing_odds", header: "2" }] },
  {
    id: "goals_0_5", label: "0.5 Alt/Üst", group: "Toplam Gol", defaultVisible: false,
    columns: [{ key: "over_0_5_goals_closing_odds", header: "Ü0.5" }, { key: "under_0_5_goals_closing_odds", header: "A0.5" }],
  },
  {
    id: "goals_1_5", label: "1.5 Alt/Üst", group: "Toplam Gol", defaultVisible: false,
    columns: [{ key: "over_1_5_goals_closing_odds", header: "Ü1.5" }, { key: "under_1_5_goals_closing_odds", header: "A1.5" }],
  },
  {
    id: "goals_2_5", label: "2.5 Alt/Üst", group: "Toplam Gol", defaultVisible: true,
    columns: [{ key: "over_2_5_goals_closing_odds", header: "Ü2.5" }, { key: "under_2_5_goals_closing_odds", header: "A2.5" }],
  },
  {
    id: "goals_3_5", label: "3.5 Alt/Üst", group: "Toplam Gol", defaultVisible: false,
    columns: [{ key: "over_3_5_goals_closing_odds", header: "Ü3.5" }, { key: "under_3_5_goals_closing_odds", header: "A3.5" }],
  },
  {
    id: "goals_4_5", label: "4.5 Alt/Üst", group: "Toplam Gol", defaultVisible: false,
    columns: [{ key: "over_4_5_goals_closing_odds", header: "Ü4.5" }, { key: "under_4_5_goals_closing_odds", header: "A4.5" }],
  },
  {
    id: "btts", label: "Karşılıklı Gol (Var/Yok)", group: "Toplam Gol", defaultVisible: true,
    columns: [{ key: "btts_yes_closing_odds", header: "KGV" }, { key: "btts_no_closing_odds", header: "KGY" }],
  },
  {
    id: "ah_0", label: "Handikap 0 (DNB)", group: "Asya Handikap", defaultVisible: false,
    columns: [{ key: "home_ah_0_closing_odds", header: "Ev H.0" }, { key: "away_ah_0_closing_odds", header: "Dep H.0" }],
  },
  {
    id: "corners_9_5", label: "9.5 Korner Alt/Üst", group: "Korner (Premier League)", defaultVisible: false,
    columns: [{ key: "over_9_5_corners_ft_closing_odds", header: "Ü9.5K" }, { key: "under_9_5_corners_ft_closing_odds", header: "A9.5K" }],
  },
  {
    id: "cards_3_5", label: "3.5 Kart Alt/Üst", group: "Kart (Premier League)", defaultVisible: false,
    columns: [{ key: "over_3_5_yellow_cards_ft_closing_odds", header: "Ü3.5C" }, { key: "under_3_5_yellow_cards_ft_closing_odds", header: "A3.5C" }],
  },
];

export const DEFAULT_VISIBLE_MARKETS = ODDS_MARKETS.filter((m) => m.defaultVisible).map((m) => m.id);

// Optional FT match-stat columns for the table (Korner/Kart totals are
// always shown; these are the rest — xG, possession, shots, fouls, saves).
export const STAT_MARKETS: OddsMarket[] = [
  {
    id: "xg", label: "xG (Beklenen Gol)", group: "Genel", defaultVisible: false,
    columns: [
      { key: "home_xg_ft", header: "Ev xG", decimals: 2 },
      { key: "away_xg_ft", header: "Dep xG", decimals: 2 },
    ],
  },
  {
    id: "possession", label: "Top Hakimiyeti", group: "Genel", defaultVisible: false,
    columns: [
      { key: "home_ball_possession_ft", header: "Ev %", suffix: "%" },
      { key: "away_ball_possession_ft", header: "Dep %", suffix: "%" },
    ],
  },
  {
    id: "shots", label: "Toplam Şut", group: "Şut", defaultVisible: false,
    columns: [
      { key: "home_total_shots_ft", header: "Ev Şut" },
      { key: "away_total_shots_ft", header: "Dep Şut" },
    ],
  },
  {
    id: "shots_on_target", label: "İsabetli Şut", group: "Şut", defaultVisible: false,
    columns: [
      { key: "home_shots_on_target_ft", header: "Ev İS" },
      { key: "away_shots_on_target_ft", header: "Dep İS" },
    ],
  },
  {
    id: "shots_off_target", label: "İsabetsiz Şut", group: "Şut", defaultVisible: false,
    columns: [
      { key: "home_shots_off_target_ft", header: "Ev İZ" },
      { key: "away_shots_off_target_ft", header: "Dep İZ" },
    ],
  },
  {
    id: "fouls", label: "Faul", group: "Diğer", defaultVisible: false,
    columns: [
      { key: "home_fouls_ft", header: "Ev Faul" },
      { key: "away_fouls_ft", header: "Dep Faul" },
    ],
  },
  {
    id: "saves", label: "Kaleci Kurtarışı", group: "Diğer", defaultVisible: false,
    columns: [
      { key: "home_goalkeeper_saves_ft", header: "Ev Kur." },
      { key: "away_goalkeeper_saves_ft", header: "Dep Kur." },
    ],
  },
  {
    id: "red_cards", label: "Kırmızı Kart", group: "Diğer", defaultVisible: false,
    columns: [
      { key: "home_red_cards_ft", header: "Ev KK" },
      { key: "away_red_cards_ft", header: "Dep KK" },
    ],
  },
];

export const DEFAULT_VISIBLE_STATS = STAT_MARKETS.filter((m) => m.defaultVisible).map((m) => m.id);

export interface Match {
  match_id: number;
  start_datetime: string;
  competition_type: string;
  country: string;
  league: string;
  season: string;
  home_team: string;
  away_team: string;
  referee: string | null;
  referee_country: string | null;
  neutral_venue: number;
  result_ft: string;
  home_goals_ft: number;
  away_goals_ft: number;
  total_goals_ft: number;
  [key: string]: string | number | null;
}
