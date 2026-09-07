"use client";

import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { Badge } from "./ui/badge";
import type { Match } from "@/lib/schema";
import { fmtDateTime, fmtOdds, LEAGUE_META } from "@/lib/utils";

export function MatchDetailDialog({
  match,
  onOpenChange,
}: {
  match: Match | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={!!match} onOpenChange={onOpenChange}>
      {match && (
        <DialogContent>
          <div className="border-b border-border px-6 py-5">
            <div className="flex items-center gap-2 text-xs text-muted">
              <span>
                {LEAGUE_META[match.league]?.flag} {match.league}
              </span>
              <span>·</span>
              <span>{fmtDateTime(match.start_datetime)}</span>
              {match.referee && (
                <>
                  <span>·</span>
                  <span>Hakem: {match.referee}</span>
                </>
              )}
            </div>
            <DialogTitle asChild>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-4 text-lg font-semibold">
                  <span>{match.home_team}</span>
                  <span className="rounded-lg bg-surface-2 px-3 py-1 font-mono text-xl text-foreground">
                    {match.home_goals_ft}–{match.away_goals_ft}
                  </span>
                  <span>{match.away_team}</span>
                </div>
                <Badge
                  tone={match.result_ft === "H" ? "home" : match.result_ft === "A" ? "away" : "draw"}
                >
                  {match.result_ft === "H" ? "MS1" : match.result_ft === "A" ? "MS2" : "MSX"}
                </Badge>
              </div>
            </DialogTitle>
            <div className="mt-1.5 flex gap-3 text-xs text-muted-2">
              <span>İY: {match.home_goals_1h}–{match.away_goals_1h}</span>
              <span>2Y: {match.home_goals_2h}–{match.away_goals_2h}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">
            <PeriodStats title="İlk Yarı" match={match} suffix="1h" />
            <PeriodStats title="İkinci Yarı" match={match} suffix="2h" />
            <PeriodStats title="Maç Sonu (FT)" match={match} suffix="ft" full />
            <OddsPanel match={match} />
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}

function StatRow({
  label,
  home,
  away,
  unit,
}: {
  label: string;
  home: number | null;
  away: number | null;
  unit?: string;
}) {
  const h = home ?? 0;
  const a = away ?? 0;
  const total = h + a || 1;
  return (
    <div className="mb-2">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-mono font-medium">{home ?? "—"}{unit}</span>
        <span className="text-muted-2">{label}</span>
        <span className="font-mono font-medium">{away ?? "—"}{unit}</span>
      </div>
      <div className="flex h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className="bg-home" style={{ width: `${(h / total) * 100}%` }} />
        <div className="bg-away" style={{ width: `${(a / total) * 100}%` }} />
      </div>
    </div>
  );
}

function PeriodStats({
  title,
  match,
  suffix,
  full,
}: {
  title: string;
  match: Match;
  suffix: "1h" | "2h" | "ft";
  full?: boolean;
}) {
  const g = (base: string) => match[`${base}_${suffix}`] as number | null;
  return (
    <div className="rounded-lg border border-border bg-surface-2/40 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
      <StatRow label="Korner" home={g("home_corners")} away={g("away_corners")} />
      <StatRow label="Sarı Kart" home={g("home_yellow_cards")} away={g("away_yellow_cards")} />
      {full && <StatRow label="Kırmızı Kart" home={g("home_red_cards")} away={g("away_red_cards")} />}
      <StatRow label="xG" home={g("home_xg")} away={g("away_xg")} />
      <StatRow label="Top Hakimiyeti" home={g("home_ball_possession")} away={g("away_ball_possession")} unit="%" />
      <StatRow label="Toplam Şut" home={g("home_total_shots")} away={g("away_total_shots")} />
      {full && (
        <StatRow
          label="İsabetli Şut"
          home={g("home_shots_on_target")}
          away={g("away_shots_on_target")}
        />
      )}
      <StatRow label="Faul" home={g("home_fouls")} away={g("away_fouls")} />
      {full && (
        <StatRow
          label="Kaleci Kurtarışı"
          home={g("home_goalkeeper_saves")}
          away={g("away_goalkeeper_saves")}
        />
      )}
    </div>
  );
}

function OddsGroup({ title, items }: { title: string; items: [string, number | null][] }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-medium text-muted-2">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map(([label, val]) => (
          <div
            key={label}
            className="flex flex-col items-center rounded-md border border-border bg-surface-2 px-2.5 py-1.5 min-w-[52px]"
          >
            <span className="text-[10px] text-muted-2">{label}</span>
            <span className="font-mono text-xs font-semibold text-odds">{fmtOdds(val)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OddsPanel({ match }: { match: Match }) {
  const g = (k: string) => match[k] as number | null;
  const hasCornerCardOdds = g("over_9_5_corners_ft_closing_odds") !== null;
  return (
    <div className="rounded-lg border border-border bg-surface-2/40 p-4 md:col-span-2">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
        Kapanış Oranları
      </p>
      <div className="flex flex-col gap-4">
        <OddsGroup
          title="1X2"
          items={[
            ["MS1", g("home_win_closing_odds")],
            ["MSX", g("draw_closing_odds")],
            ["MS2", g("away_win_closing_odds")],
          ]}
        />
        <OddsGroup
          title="Toplam Gol"
          items={[
            ["Ü0.5", g("over_0_5_goals_closing_odds")],
            ["A0.5", g("under_0_5_goals_closing_odds")],
            ["Ü1.5", g("over_1_5_goals_closing_odds")],
            ["A1.5", g("under_1_5_goals_closing_odds")],
            ["Ü2.5", g("over_2_5_goals_closing_odds")],
            ["A2.5", g("under_2_5_goals_closing_odds")],
            ["Ü3.5", g("over_3_5_goals_closing_odds")],
            ["A3.5", g("under_3_5_goals_closing_odds")],
          ]}
        />
        <OddsGroup
          title="Karşılıklı Gol"
          items={[
            ["Var", g("btts_yes_closing_odds")],
            ["Yok", g("btts_no_closing_odds")],
          ]}
        />
        <OddsGroup
          title="Asya Handikap"
          items={[
            ["Ev -1.5", g("home_ah_minus_1_5_closing_odds")],
            ["Dep -1.5", g("away_ah_minus_1_5_closing_odds")],
            ["Ev -1", g("home_ah_minus_1_closing_odds")],
            ["Dep -1", g("away_ah_minus_1_closing_odds")],
            ["Ev 0", g("home_ah_0_closing_odds")],
            ["Dep 0", g("away_ah_0_closing_odds")],
            ["Ev +1", g("home_ah_plus_1_closing_odds")],
            ["Dep +1", g("away_ah_plus_1_closing_odds")],
          ]}
        />
        {hasCornerCardOdds && (
          <>
            <OddsGroup
              title="Korner Alt/Üst (Premier League)"
              items={[
                ["Ü7.5", g("over_7_5_corners_ft_closing_odds")],
                ["A7.5", g("under_7_5_corners_ft_closing_odds")],
                ["Ü8.5", g("over_8_5_corners_ft_closing_odds")],
                ["A8.5", g("under_8_5_corners_ft_closing_odds")],
                ["Ü9.5", g("over_9_5_corners_ft_closing_odds")],
                ["A9.5", g("under_9_5_corners_ft_closing_odds")],
                ["Ü10.5", g("over_10_5_corners_ft_closing_odds")],
                ["A10.5", g("under_10_5_corners_ft_closing_odds")],
              ]}
            />
            <OddsGroup
              title="Kart Alt/Üst (Premier League)"
              items={[
                ["Ü2.5", g("over_2_5_yellow_cards_ft_closing_odds")],
                ["A2.5", g("under_2_5_yellow_cards_ft_closing_odds")],
                ["Ü3.5", g("over_3_5_yellow_cards_ft_closing_odds")],
                ["A3.5", g("under_3_5_yellow_cards_ft_closing_odds")],
                ["Ü4.5", g("over_4_5_yellow_cards_ft_closing_odds")],
                ["A4.5", g("under_4_5_yellow_cards_ft_closing_odds")],
                ["Ü5.5", g("over_5_5_yellow_cards_ft_closing_odds")],
                ["A5.5", g("under_5_5_yellow_cards_ft_closing_odds")],
              ]}
            />
          </>
        )}
      </div>
    </div>
  );
}
