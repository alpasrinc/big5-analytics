import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Shuffle, Table2 } from "lucide-react";
import { getTeamSummary, type TeamSplit } from "@/lib/team-summary";
import { LEAGUE_META, fmtDateShort, fmtNum } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function TeamPage(props: PageProps<"/takim/[team]">) {
  const { team: encoded } = await props.params;
  const team = decodeURIComponent(encoded);
  const summary = getTeamSummary(team);
  if (!summary) notFound();

  return (
    <div className="mx-auto flex h-full min-h-0 max-w-5xl flex-col gap-5 overflow-y-auto px-6 py-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Ana Sayfa
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/?team=${encodeURIComponent(team)}`}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs text-foreground hover:border-muted-2"
          >
            <Table2 className="h-3.5 w-3.5" /> Maçları Gör
          </Link>
          <Link
            href={`/h2h?team1=${encodeURIComponent(team)}`}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs text-foreground hover:border-muted-2"
          >
            <Shuffle className="h-3.5 w-3.5" /> Karşılaştır (H2H)
          </Link>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{team}</h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {summary.leagues.map((l) => (
            <span
              key={l}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 px-1.5 py-0.5 text-[11px] text-muted"
            >
              {LEAGUE_META[l]?.flag} {l}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SplitCard title="Genel" split={summary.overall} />
        <SplitCard title="İç Saha" split={summary.home} />
        <SplitCard title="Deplasman" split={summary.away} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Son Maçlar</CardTitle>
          <CardDescription>En son 20 maç, tarihe göre azalan</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="pb-2 font-medium">Tarih</th>
                <th className="pb-2 font-medium">Lig</th>
                <th className="pb-2 font-medium">Saha</th>
                <th className="pb-2 font-medium">Rakip</th>
                <th className="pb-2 text-center font-medium">Skor</th>
                <th className="pb-2 text-center font-medium">S</th>
                <th className="pb-2 text-right font-medium">Korner</th>
                <th className="pb-2 text-right font-medium">Kart</th>
              </tr>
            </thead>
            <tbody>
              {summary.recentMatches.map((m) => (
                <tr key={m.match_id} className="border-t border-border-soft">
                  <td className="py-2 font-mono text-xs text-muted">{fmtDateShort(m.start_datetime)}</td>
                  <td className="py-2 text-xs text-muted">
                    {LEAGUE_META[m.league]?.flag} {LEAGUE_META[m.league]?.short ?? m.league}
                  </td>
                  <td className="py-2 text-xs text-muted">{m.venue === "home" ? "İç" : "Dep"}</td>
                  <td className="py-2 font-medium">
                    <Link href={`/takim/${encodeURIComponent(m.opponent)}`} className="hover:text-accent hover:underline">
                      {m.opponent}
                    </Link>
                  </td>
                  <td className="py-2 text-center font-mono text-xs">
                    {m.goals_for}–{m.goals_against}
                  </td>
                  <td className="py-2 text-center">
                    <Badge tone={m.outcome === "W" ? "home" : m.outcome === "L" ? "away" : "draw"}>
                      {m.outcome}
                    </Badge>
                  </td>
                  <td className="py-2 text-right font-mono text-xs text-corner">
                    {m.corners_for ?? "—"}-{m.corners_against ?? "—"}
                  </td>
                  <td className="py-2 text-right font-mono text-xs text-card-yellow">
                    {m.cards_for ?? "—"}-{m.cards_against ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function SplitCard({ title, split }: { title: string; split: TeamSplit }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {split.played} maç — {split.w}G {split.d}B {split.l}M
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <Stat label="Ort. Gol (Lehte)" value={fmtNum(split.avg_goals_for, 2)} />
        <Stat label="Ort. Gol (Aleyhte)" value={fmtNum(split.avg_goals_against, 2)} />
        <Stat label="Ort. Korner (Lehte)" value={fmtNum(split.avg_corners_for, 2)} color="var(--corner)" />
        <Stat label="Ort. Korner (Aleyhte)" value={fmtNum(split.avg_corners_against, 2)} color="var(--corner)" />
        <Stat label="Ort. Kart (Lehte)" value={fmtNum(split.avg_cards_for, 2)} color="var(--card-yellow)" />
        <Stat label="Ort. Kart (Aleyhte)" value={fmtNum(split.avg_cards_against, 2)} color="var(--card-yellow)" />
        <Stat label="KG Var %" value={split.btts_pct === null ? "—" : `${fmtNum(split.btts_pct, 0)}%`} />
        <Stat label="2.5 Üst %" value={split.over25_pct === null ? "—" : `${fmtNum(split.over25_pct, 0)}%`} />
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-2">{label}</span>
      <span className="font-mono font-semibold" style={{ color: color ?? "var(--foreground)" }}>
        {value}
      </span>
    </div>
  );
}
