# Big 5 Analytics

A local-first football analytics site: filter and analyze match results, corners, cards,
xG, possession, shots, fouls, and closing odds across Europe's top leagues — 2015/16
through the current season. Built to keep growing as more league data is collected.

Turkish is the UI language throughout (labels, buttons, filter names). Keep new UI text
in Turkish unless told otherwise.

## Stack

- Next.js 16 (App Router, Turbopack), React 19, TypeScript
- Tailwind CSS v4 (CSS-first config in `src/app/globals.css`, no `tailwind.config.js`)
- SQLite via `better-sqlite3` — one file, `data/football.db`, read by the API routes
- Recharts for the dashboard charts
- No auth, no external services besides the data pipeline below. Everything runs locally.

`node_modules/next/dist/docs/` is the source of truth for this Next.js version's APIs —
check it before assuming training-data knowledge still applies (see `AGENTS.md`, which
`next dev` regenerates on its own; don't remove it from diffs, just don't hand-edit it).

## Running it

```
npm run dev        # start the app — data/football.db must already exist (see below)
npm run build       # production build + typecheck (run this after any non-trivial change)
npm run lint         # eslint
```

better-sqlite3 opens the db in WAL mode, so `npm run dev` can stay running while you
rebuild or add to the database from another terminal — no need to stop it for data changes.

## Data pipeline

All match data comes from footiqo.com (per-league "Last Seasons" + free current-season
exports: Scores / Corners & Cards / Attacking & Possession / Odds — 4 Excel workbooks
per league, each row keyed by a **globally unique** `id` Footiqo assigns across their
entire database). That global-id property is what makes de-duplication trivial: the same
real match always carries the same id no matter which export it came from.

Raw source workbooks live **outside** `app/` at the repo root, one folder per country/league,
named to match footiqo.com's own naming (see whatever `Ülke/Lig/` folders currently exist
next to this `app/` directory — e.g. `England/Premier League/`, `Turkey/`). Each folder
holds exactly 4 files: `Database - Scores - ...`, `Database - Corners  Cards - ...`,
`Database - Attack  Poss - ...`, `Database - Odds - ...`. Countries with only one top
league skip the extra nesting (just `Turkey/`, not `Turkey/Super Lig/`).

Two scripts turn those workbooks into `app/data/football.db`:

- **`scripts/build-db.mjs`** — full rebuild from scratch. Reads the original Big Five
  2025/26 free dataset + Premier League corners/cards odds free dataset (`app/data/*.xlsx`),
  the Champions League folder, and every folder listed in its `leagueFolders` array, then
  writes a fresh `football.db`. Run this when the base schema changes or the db is missing.
  **Stop `npm run dev` first** — it deletes and recreates the file, which a running
  readonly connection can block.
- **`scripts/add-league.mjs "<folder>" <leagueId> [competitionType] [idOffset]`** —
  incremental. Reads just the 4 files in one folder and `INSERT OR IGNORE`s them into the
  *existing* db (SQLite's own PRIMARY KEY conflict on `match_id` handles de-dup). Safe to
  run **while `npm run dev` keeps running** — this is the normal way to add a league now.
  Example: `node scripts/add-league.mjs "../Spain/La Liga 2" 9`.

When you add a folder via `add-league.mjs`, also append it to `leagueFolders` in
`build-db.mjs` so a future full rebuild stays complete.

### Adding a brand-new league (not just more seasons of an existing one)

1. Run `add-league.mjs` (pick the next unused `leagueId` — check
   `SELECT DISTINCT league, league_id FROM matches` first).
2. Add the league to `LEAGUES` in `src/lib/schema.ts`.
3. Add a new `--league-N` color var in `src/app/globals.css` (both the `:root` block and
   the `@theme inline` block) — pick a hue visually distinct from the existing ones.
3. Add the league's entry to `LEAGUE_META` and `LEAGUE_HEX` in `src/lib/utils.ts`
   (short code, flag, country — country must match the `country` column in the db so the
   league filter groups it correctly; add a `COUNTRY_META` entry too if it's a new country).
4. `npm run build` to typecheck, then it's live (dev server hot-reloads the rest).

### Known data gaps (source limitations, not bugs)

- No referee data anywhere in this source (unlike the very first Big Five import, which
  had it for the 5 original leagues only — now unused/inconsistent, don't rely on it).
- xG only exists for the *current* season per league; historical seasons have `NULL` xG.
- Corner/card *odds* markets (O/U 7.5–11.5 corners, 2.5–5.5 cards) only exist for
  Premier League. Every other league has `NULL` there.
- Red cards, fouls, goalkeeper saves are missing for Champions League specifically.
- All of the above render as "—" in the UI already — don't add fallback/error handling
  for nulls, the components already treat them as normal.

## Database shape

Single denormalized `matches` table (see `scripts/build-db.mjs` for the full column list
and `src/lib/schema.ts` for the TS-side `Match` type). Key points:

- `match_id` is the Footiqo `id` directly for every source **except** Champions League,
  which was imported before the global-id property was understood and got an artificial
  `+900_000_000` offset. Harmless, just don't assume `match_id` ranges are meaningful.
- Columns follow `home_<stat>_<period>` / `away_<stat>_<period>` / `total_<stat>_<period>`
  naming, `period` ∈ `1h` / `2h` / `ft`. Odds columns end in `_closing_odds`.
- `src/lib/schema.ts` is the single source of truth for which columns are filterable
  (`NUMERIC_FIELDS`, grouped for the right-side filter panel), which are exposed as
  optional table columns (`ODDS_MARKETS`, `STAT_MARKETS` — each "market" is 1-2 columns,
  used by the two column-picker popovers), and what's globally sortable (`SORTABLE_COLS`).
  Add new filterable/sortable/table columns there, not ad hoc in components.

## App structure

- `src/app/api/matches/route.ts` — the main list endpoint. Builds a parameterized SQL
  query from query-string filters (league/season/team/referee/result/btts/date range,
  generic `min_<col>`/`max_<col>` for anything in `ALL_FILTERABLE_NUMERIC_COLS`), returns
  paginated rows + an `aggregate` object (averages, most-frequent scoreline, most-frequent
  HT/FT combo — all computed over the *whole* filtered set, not just the current page).
- `src/app/api/stats/route.ts` — dashboard aggregates (per-league averages, histograms,
  team leaderboard, odds-calibration curve).
- `src/app/api/meta/route.ts` — leagues/teams/referees/seasons lookup; currently unused by
  the frontend (the team/season/referee filters were removed from the UI) but left in
  place since it's cheap and may come back.
- `src/components/matches-view.tsx` — owns filter state, debounces `/api/matches` calls,
  owns the two column-visibility selections (persisted to localStorage).
- `src/components/filters-left.tsx` / `filters-right.tsx` — the two filter sidebars.
  Left = league picker (Champions League standalone + countries grouped alphabetically,
  collapsible; multi-league countries get their own expand/collapse) + quick toggles
  (result, BTTS, goal/corner/card Alt-Üst line buttons). Right = every `NUMERIC_FIELDS`
  group as min/tam/max range inputs — "tam" (exact) writes min=max=value, except for
  fields with a `tolerance` (closing odds: writes value±tolerance, since odds rarely land
  on the exact typed figure).
- `src/components/matches-table.tsx` — the table itself. Fixed columns (date, league,
  match, corners, cards) plus whatever's toggled on in the two column pickers. Row click
  opens `match-detail-dialog.tsx`. Has two independent "highlight most frequent
  score/HT-FT" toggles that tint matching rows.
- `src/components/dashboard.tsx` — the "Genel Bakış" tab's charts.
- `src/components/column-picker.tsx` — generic popover reused for both odds and stat
  column pickers (`ODDS_MARKETS`/`STAT_MARKETS` passed in as props).
- No page-level scroll anywhere in the app shell — the header and both sidebars are
  fixed; only the table body and the dashboard scroll internally. Keep it that way when
  adding UI; it was a deliberate fix for a "site feels cluttered" complaint.

## Conventions / things that bit us before

- Never re-run `build-db.mjs` (which deletes the db) while `npm run dev` is running —
  `EBUSY` on Windows. Stop the dev server first, or just use `add-league.mjs` instead,
  which doesn't need to.
- League colors are a fixed categorical palette (see the dataviz guidance baked into
  `globals.css` — validated CVD-safe hues). Don't auto-generate a color for a new league;
  pick the next slot deliberately and keep it visually distinct from its neighbors.
- Table columns use `table-layout: auto` (not `fixed`) deliberately — an earlier `fixed`
  attempt collapsed the match column to nothing once enough optional columns were on.
  Auto layout + a `min-w` on the match column + the table's own `overflow-x-auto` is the
  fallback that keeps team names legible even when a user turns on every column.
- `git remote` may not be configured — check before assuming a push target exists.
