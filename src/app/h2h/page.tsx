"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowLeftRight, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select";
import { LEAGUE_META, fmtDateShort, fmtNum } from "@/lib/utils";

interface MetaResponse {
  teams: { team: string; league: string }[];
}

interface H2HMatch {
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

interface H2HResponse {
  team1: string;
  team2: string;
  matches: H2HMatch[];
  summary: {
    n: number;
    team1Wins: number;
    team2Wins: number;
    draws: number;
    avg_goals: number;
    avg_corners: number | null;
    avg_cards: number | null;
    btts_pct: number;
    over25_pct: number;
  } | null;
}

// A single-select wrapper around MultiSelect: the diff between the previous
// and next selection array is always the just-clicked team, so we can
// collapse it back down to one value instead of building a whole separate
// combobox component for this one page.
function TeamSelect({
  options,
  value,
  onChange,
  placeholder,
}: {
  options: MultiSelectOption[];
  value: string;
  onChange: (team: string) => void;
  placeholder: string;
}) {
  return (
    <MultiSelect
      options={options}
      selected={value ? [value] : []}
      onChange={(values) => {
        if (values.length === 0) {
          onChange("");
          return;
        }
        const added = values.find((v) => v !== value);
        onChange(added ?? values[0]);
      }}
      placeholder={placeholder}
      triggerLabel={value}
      className="w-64"
    />
  );
}

function H2HPageInner() {
  const searchParams = useSearchParams();
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [team1, setTeam1] = useState(searchParams.get("team1") ?? "");
  const [team2, setTeam2] = useState(searchParams.get("team2") ?? "");
  const [data, setData] = useState<H2HResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/meta")
      .then((r) => r.json())
      .then(setMeta);
  }, []);

  useEffect(() => {
    if (!team1 || !team2 || team1 === team2) return;
    // Deferred to a microtask so the loading flag isn't set synchronously in
    // the effect body (same pattern as usePersistedColumns in matches-view.tsx).
    Promise.resolve().then(() => setLoading(true));
    fetch(`/api/h2h?team1=${encodeURIComponent(team1)}&team2=${encodeURIComponent(team2)}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, [team1, team2]);

  // A team can show up once per league it's played in (e.g. relegated/
  // promoted between LaLiga/LaLiga2, or a Champions League entry alongside
  // its domestic league) — dedupe by name since H2H matches on team name
  // alone, and duplicate option values would break MultiSelect's rendering.
  const options: MultiSelectOption[] = useMemo(() => {
    const seen = new Map<string, MultiSelectOption>();
    for (const t of meta?.teams ?? []) {
      if (!seen.has(t.team)) seen.set(t.team, { value: t.team, label: t.team, hint: LEAGUE_META[t.league]?.short });
    }
    return Array.from(seen.values()).sort((a, b) => a.label.localeCompare(b.label, "tr"));
  }, [meta]);

  // Guard against rendering a stale response after the team selection has
  // moved on (e.g. cleared, or changed before the previous fetch resolved) —
  // simpler than resetting `data` synchronously inside the effect above.
  const current = data && data.team1 === team1 && data.team2 === team2 ? data : null;
  const summary = current?.summary ?? null;

  return (
    <div className="mx-auto flex h-full min-h-0 max-w-4xl flex-col gap-5 overflow-y-auto px-6 py-6">
      <Link href="/" className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Ana Sayfa
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Karşılaşma Geçmişi (H2H)</h1>
        <p className="mt-1 text-sm text-muted">İki takımın birbirine karşı geçmiş tüm maçlarını karşılaştırın.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <TeamSelect options={options} value={team1} onChange={setTeam1} placeholder="1. Takım" />
        <button
          onClick={() => {
            setTeam1(team2);
            setTeam2(team1);
          }}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 text-muted hover:text-foreground"
          title="Takımları yer değiştir"
        >
          <ArrowLeftRight className="h-4 w-4" />
        </button>
        <TeamSelect options={options} value={team2} onChange={setTeam2} placeholder="2. Takım" />
      </div>

      {team1 && team2 && team1 === team2 && (
        <p className="text-sm text-away">Lütfen iki farklı takım seçin.</p>
      )}

      {loading && (
        <div className="flex flex-1 items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      )}

      {!loading && current && !summary && (
        <p className="text-sm text-muted-2">Bu iki takım arasında kayıtlı bir maç bulunamadı.</p>
      )}

      {!loading && summary && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi label={`${team1} Galibiyet`} value={String(summary.team1Wins)} color="var(--home)" />
            <Kpi label="Beraberlik" value={String(summary.draws)} color="var(--draw)" />
            <Kpi label={`${team2} Galibiyet`} value={String(summary.team2Wins)} color="var(--away)" />
            <Kpi label="Toplam Maç" value={String(summary.n)} color="var(--foreground)" />
            <Kpi label="Maç Başı Ort. Gol" value={fmtNum(summary.avg_goals, 2)} color="var(--accent)" />
            <Kpi label="Maç Başı Ort. Korner" value={fmtNum(summary.avg_corners, 2)} color="var(--corner)" />
            <Kpi label="Maç Başı Ort. Kart" value={fmtNum(summary.avg_cards, 2)} color="var(--card-yellow)" />
            <Kpi label="KG Var / 2.5 Üst" value={`${fmtNum(summary.btts_pct, 0)}% / ${fmtNum(summary.over25_pct, 0)}%`} color="var(--odds)" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Tüm Karşılaşmalar</CardTitle>
              <CardDescription>Tarihe göre azalan, {summary.n} maç</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
                    <th className="pb-2 font-medium">Tarih</th>
                    <th className="pb-2 font-medium">Lig</th>
                    <th className="pb-2 font-medium">Maç</th>
                    <th className="pb-2 text-right font-medium">Korner</th>
                    <th className="pb-2 text-right font-medium">Kart</th>
                  </tr>
                </thead>
                <tbody>
                  {current!.matches.map((m) => (
                    <tr key={m.match_id} className="border-t border-border-soft">
                      <td className="py-2 font-mono text-xs text-muted">{fmtDateShort(m.start_datetime)}</td>
                      <td className="py-2 text-xs text-muted">
                        {LEAGUE_META[m.league]?.flag} {LEAGUE_META[m.league]?.short ?? m.league}
                      </td>
                      <td className="py-2 font-medium">
                        {m.home_team}{" "}
                        <span className="font-mono text-xs text-muted-2">
                          {m.home_goals_ft}–{m.away_goals_ft}
                        </span>{" "}
                        {m.away_team}
                      </td>
                      <td className="py-2 text-right font-mono text-xs text-corner">
                        {m.total_corners_ft ?? "—"}{" "}
                        <span className="text-muted-2">
                          {m.home_corners_ft}-{m.away_corners_ft}
                        </span>
                      </td>
                      <td className="py-2 text-right font-mono text-xs text-card-yellow">
                        {m.total_yellow_cards_ft ?? "—"}{" "}
                        <span className="text-muted-2">
                          {m.home_yellow_cards_ft}-{m.away_yellow_cards_ft}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
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

export default function H2HPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      }
    >
      <H2HPageInner />
    </Suspense>
  );
}
