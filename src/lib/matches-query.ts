import { ALL_FILTERABLE_NUMERIC_COLS, MIRROR_COLS, SORTABLE_COLS } from "@/lib/schema";

// Shared WHERE/params/sort builder for the matches list and export endpoints,
// so the two never drift out of sync on which filters are supported.
export function buildMatchesFilter(sp: URLSearchParams) {
  const where: string[] = [];
  const params: Record<string, unknown> = {};

  const leagues = sp.getAll("league").filter(Boolean);
  if (leagues.length) {
    where.push(`league IN (${leagues.map((_, i) => `@league${i}`).join(",")})`);
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
  // Collected per-column first (rather than pushed straight into `where`)
  // because any column with a mirrorCol (MS1 <-> MS2) always matches against
  // "col in [min,max] OR mirrorCol in [min,max]" as one OR'd group — e.g.
  // "find matches where either side closed around 1.80" regardless of which
  // team was favoured, since that's the only way this filter gets used.
  const numericSpecs = new Map<string, { min?: number; max?: number }>();
  for (const [key, value] of sp.entries()) {
    if (value === "" || value === null) continue;
    let col: string | null = null;
    let kind: "min" | "max" | null = null;
    if (key.startsWith("min_")) {
      col = key.slice(4);
      kind = "min";
    } else if (key.startsWith("max_")) {
      col = key.slice(4);
      kind = "max";
    }
    if (!col || !kind) continue;
    if (!ALL_FILTERABLE_NUMERIC_COLS.has(col)) continue;
    const num = Number(value);
    if (Number.isNaN(num)) continue;
    const spec = numericSpecs.get(col) ?? {};
    spec[kind] = num;
    numericSpecs.set(col, spec);
  }

  let mirrorParamSeq = 0;
  for (const [col, spec] of numericSpecs) {
    const sideCondition = (column: string) => {
      const parts: string[] = [];
      if (spec.min !== undefined) {
        const k = `nf${mirrorParamSeq++}`;
        parts.push(`${column} >= @${k}`);
        params[k] = spec.min;
      }
      if (spec.max !== undefined) {
        const k = `nf${mirrorParamSeq++}`;
        parts.push(`${column} <= @${k}`);
        params[k] = spec.max;
      }
      return parts.join(" AND ");
    };

    if (spec.min === undefined && spec.max === undefined) continue;

    const mirrorCol = MIRROR_COLS[col];
    if (mirrorCol) {
      where.push(`((${sideCondition(col)}) OR (${sideCondition(mirrorCol)}))`);
    } else {
      where.push(sideCondition(col));
    }
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  let sort = sp.get("sort") || "start_datetime";
  if (!SORTABLE_COLS.has(sort)) sort = "start_datetime";
  const dir = sp.get("dir") === "asc" ? "ASC" : "DESC";

  return { whereSql, params, sort, dir };
}
