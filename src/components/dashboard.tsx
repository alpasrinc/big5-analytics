"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LineChart,
  Line,
  ReferenceLine,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { LEAGUE_HEX, fmtNum } from "@/lib/utils";
import { Loader2, X } from "lucide-react";

interface PerLeague {
  league: string;
  matches: number;
  avg_goals: number;
  avg_corners: number;
  avg_cards: number;
  avg_red_cards: number;
  home_win_pct: number;
  draw_pct: number;
  away_win_pct: number;
  btts_pct: number;
  over25_pct: number;
}

interface StatsResponse {
  perLeague: PerLeague[];
  cornersHistogram: { bucket: number; count: number }[];
  cardsHistogram: { bucket: number; count: number }[];
  goalsHistogram: { bucket: number; count: number }[];
  oddsCalibration: { implied_pct: number; actual_pct: number; n: number }[];
  teams: {
    team: string;
    league: string;
    played: number;
    avg_corners_for: number;
    avg_corners_against: number;
    avg_cards_for: number;
    avg_cards_against: number;
    avg_goals_for: number;
    ppg: number;
  }[];
}

const GRID = "var(--chart-grid)";
const AXIS_TICK = { fill: "var(--muted)", fontSize: 11 };

interface TooltipEntry {
  dataKey: string;
  name: string;
  value: number;
  color?: string;
  fill?: string;
}

function ChartTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
  unit?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-xl shadow-black/40">
      <p className="mb-1 font-medium text-foreground">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-1.5" style={{ color: p.color || p.fill }}>
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-muted">{p.name}:</span>
          <span className="font-mono font-semibold">{fmtNum(p.value, 1)}{unit ?? ""}</span>
        </p>
      ))}
    </div>
  );
}

export function Dashboard() {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [teamSort, setTeamSort] = useState<
    "avg_cards_for" | "avg_cards_against" | "avg_corners_for" | "avg_corners_against" | "ppg"
  >("avg_cards_for");
  // Drill-down: clicking a league's bar in the per-league comparison charts
  // scopes the histograms, team leaderboard, and odds calibration below to
  // just that league. The per-league comparison bars themselves always show
  // every league regardless — only what's fetched from /api/stats changes.
  const [selectedLeague, setSelectedLeague] = useState<string | null>(null);

  useEffect(() => {
    const qs = selectedLeague ? `?league=${encodeURIComponent(selectedLeague)}` : "";
    fetch(`/api/stats${qs}`)
      .then((r) => r.json())
      .then(setData);
  }, [selectedLeague]);

  if (!data) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  // KPI row reflects the drill-down when one's active (perLeague itself
  // always covers every league, so we just pick that league's row out of it
  // instead of a second query).
  const scopedLeague = selectedLeague ? data.perLeague.find((l) => l.league === selectedLeague) : null;
  const totalMatches = scopedLeague ? scopedLeague.matches : data.perLeague.reduce((s, l) => s + l.matches, 0);
  const overallGoals = scopedLeague
    ? scopedLeague.avg_goals
    : data.perLeague.reduce((s, l) => s + l.avg_goals * l.matches, 0) / totalMatches;
  const overallCorners = scopedLeague
    ? scopedLeague.avg_corners
    : data.perLeague.reduce((s, l) => s + l.avg_corners * l.matches, 0) / totalMatches;
  const overallCards = scopedLeague
    ? scopedLeague.avg_cards
    : data.perLeague.reduce((s, l) => s + l.avg_cards * l.matches, 0) / totalMatches;

  // Require a minimum sample size so teams with only a handful of Champions
  // League group-stage matches don't dominate a per-match-average ranking.
  // Drilled into a single league, that same handful of CL group matches can
  // BE the whole sample for smaller leagues, so relax the floor.
  const MIN_PLAYED = selectedLeague ? 3 : 10;
  const topTeams = [...data.teams]
    .filter((t) => t.played >= MIN_PLAYED)
    .sort((a, b) => b[teamSort] - a[teamSort])
    .slice(0, 10);

  return (
    <div className="flex flex-col gap-5 pb-10">
      {selectedLeague && (
        <div className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm">
          <span className="text-muted">Detaya inildi:</span>
          <span className="font-semibold" style={{ color: LEAGUE_HEX[selectedLeague] }}>
            {selectedLeague}
          </span>
          <button
            onClick={() => setSelectedLeague(null)}
            className="ml-auto flex items-center gap-1 text-xs text-muted hover:text-away"
          >
            <X className="h-3 w-3" /> Tüm ligler
          </button>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Toplam Maç" value={totalMatches.toLocaleString("tr-TR")} color="var(--foreground)" />
        <Kpi label="Maç Başı Ort. Gol" value={fmtNum(overallGoals, 2)} color="var(--accent)" />
        <Kpi label="Maç Başı Ort. Korner" value={fmtNum(overallCorners, 2)} color="var(--corner)" />
        <Kpi label="Maç Başı Ort. Sarı Kart" value={fmtNum(overallCards, 2)} color="var(--card-yellow)" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Lige Göre Ortalama Korner</CardTitle>
            <CardDescription>
              Maç başına toplam korner sayısı (ev + deplasman) — bir lige tıklayarak detaya inebilirsiniz
            </CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.perLeague} margin={{ left: -12 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="league" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID }} />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={30} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar
                  dataKey="avg_corners"
                  name="Ort. Korner"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                  className="cursor-pointer"
                  onClick={(d: { payload?: PerLeague }) => d.payload && setSelectedLeague((prev) => (prev === d.payload!.league ? null : d.payload!.league))}
                >
                  {data.perLeague.map((l) => (
                    <Cell
                      key={l.league}
                      fill={LEAGUE_HEX[l.league]}
                      opacity={selectedLeague && selectedLeague !== l.league ? 0.35 : 1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lige Göre Ortalama Sarı Kart</CardTitle>
            <CardDescription>
              Maç başına toplam sarı kart sayısı — bir lige tıklayarak detaya inebilirsiniz
            </CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.perLeague} margin={{ left: -12 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="league" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID }} />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={30} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar
                  dataKey="avg_cards"
                  name="Ort. Sarı Kart"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                  className="cursor-pointer"
                  onClick={(d: { payload?: PerLeague }) => d.payload && setSelectedLeague((prev) => (prev === d.payload!.league ? null : d.payload!.league))}
                >
                  {data.perLeague.map((l) => (
                    <Cell
                      key={l.league}
                      fill={LEAGUE_HEX[l.league]}
                      opacity={selectedLeague && selectedLeague !== l.league ? 0.35 : 1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Maç Sonucu Dağılımı</CardTitle>
            <CardDescription>Lige göre ev sahibi / beraberlik / deplasman oranı (%)</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.perLeague} margin={{ left: -4 }} stackOffset="expand" barCategoryGap="20%">
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="league" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID }} />
                <YAxis
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                  tickFormatter={(v) => `${Math.round(v * 100)}%`}
                />
                <Tooltip content={<ChartTooltip unit="%" />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Legend
                  formatter={(v) => <span className="text-xs text-muted">{v}</span>}
                  iconType="circle"
                  iconSize={8}
                />
                <Bar dataKey="home_win_pct" name="Ev Sahibi" stackId="r" fill="var(--home)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="draw_pct" name="Beraberlik" stackId="r" fill="var(--draw)" />
                <Bar
                  dataKey="away_win_pct"
                  name="Deplasman"
                  stackId="r"
                  fill="var(--away)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kapanış Oranı Kalibrasyonu (MS1)</CardTitle>
            <CardDescription>
              Kapanış oranından çıkan zımni olasılık, gerçek ev sahibi galibiyet oranıyla ne kadar örtüşüyor
            </CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.oddsCalibration} margin={{ left: -4 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis
                  dataKey="implied_pct"
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={{ stroke: GRID }}
                  tickFormatter={(v) => `${v}%`}
                  type="number"
                  domain={[0, 100]}
                />
                <YAxis
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                  tickFormatter={(v) => `${v}%`}
                  domain={[0, 100]}
                />
                <Tooltip content={<ChartTooltip unit="%" />} />
                <ReferenceLine
                  segment={[{ x: 0, y: 0 }, { x: 100, y: 100 }]}
                  stroke="var(--muted-2)"
                  strokeDasharray="4 4"
                  ifOverflow="extendDomain"
                />
                <Line
                  type="monotone"
                  dataKey="actual_pct"
                  name="Gerçekleşen MS1 Oranı"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "var(--accent)" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Takım Liderlik Tablosu</CardTitle>
            <CardDescription>
              Maç başına ortalamalar (ev + deplasman toplamı) — en az {MIN_PLAYED} maç oynayan takımlar
              {selectedLeague ? ` — ${selectedLeague}` : ""}
            </CardDescription>
          </div>
          <div className="flex flex-wrap justify-end gap-1">
            {(
              [
                ["avg_cards_for", "Sarı Kart (Lehte)"],
                ["avg_cards_against", "Sarı Kart (Aleyhte)"],
                ["avg_corners_for", "Korner (Lehte)"],
                ["avg_corners_against", "Korner (Aleyhte)"],
                ["ppg", "Puan/Maç"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTeamSort(key)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  teamSort === key ? "bg-accent text-accent-foreground" : "bg-surface-2 text-muted hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="pb-2 font-medium">#</th>
                  <th className="pb-2 font-medium">Takım</th>
                  <th className="pb-2 font-medium">Lig</th>
                  <th className="pb-2 text-right font-medium">Maç</th>
                  <th className="pb-2 text-right font-medium">Kart (Lehte/Aleyhte)</th>
                  <th className="pb-2 text-right font-medium">Korner (Lehte/Aleyhte)</th>
                  <th className="pb-2 text-right font-medium">Puan/Maç</th>
                </tr>
              </thead>
              <tbody>
                {topTeams.map((t, i) => (
                  <tr key={t.team} className="border-t border-border-soft">
                    <td className="py-2 text-muted-2">{i + 1}</td>
                    <td className="py-2 font-medium">
                      <Link href={`/takim/${encodeURIComponent(t.team)}`} className="hover:text-accent hover:underline">
                        {t.team}
                      </Link>
                    </td>
                    <td className="py-2 text-xs text-muted">{t.league}</td>
                    <td className="py-2 text-right font-mono text-xs text-muted">{t.played}</td>
                    <td className="py-2 text-right font-mono text-xs text-card-yellow">
                      {fmtNum(t.avg_cards_for, 2)}
                      <span className="text-muted-2">/{fmtNum(t.avg_cards_against, 2)}</span>
                    </td>
                    <td className="py-2 text-right font-mono text-xs text-corner">
                      {fmtNum(t.avg_corners_for, 2)}
                      <span className="text-muted-2">/{fmtNum(t.avg_corners_against, 2)}</span>
                    </td>
                    <td className="py-2 text-right font-mono text-xs text-accent">{fmtNum(t.ppg, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-2">{label}</p>
        <p className="mt-1 font-mono text-2xl font-semibold" style={{ color }}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
