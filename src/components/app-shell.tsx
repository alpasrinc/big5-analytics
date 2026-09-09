"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { BarChart3, Shuffle, Table2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Dashboard } from "./dashboard";
import { MatchesView } from "./matches-view";
import { LiveOddsPanel } from "./live-odds-panel";
import { SavedMatchesPanel } from "./saved-matches-panel";

export function AppShell({
  initialSearch,
}: {
  initialSearch?: Record<string, string | string[] | undefined>;
}) {
  const [tab, setTab] = useState("matches");
  const applyLiveOddsRef = useRef<((values: Record<string, number>) => void) | null>(null);
  const clearOddsColumnsRef = useRef<((columns: string[]) => void) | null>(null);

  return (
    <Tabs value={tab} onValueChange={setTab} className="flex h-dvh min-h-0 flex-col">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-3.5">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-accent-foreground text-sm font-bold">
              5
            </span>
            Big 5 Analytics
          </h1>
          <p className="text-xs text-muted">
            Premier League · LaLiga · Serie A · Bundesliga · Ligue 1 · Şampiyonlar Ligi — 2015/16&apos;dan günümüze
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SavedMatchesPanel
            onApply={(values) => applyLiveOddsRef.current?.(values)}
            onClear={(columns) => clearOddsColumnsRef.current?.(columns)}
          />
          <LiveOddsPanel
            onApply={(values) => applyLiveOddsRef.current?.(values)}
            onClear={(columns) => clearOddsColumnsRef.current?.(columns)}
          />
          <TabsList>
            <TabsTrigger value="matches" className="flex items-center gap-1.5">
              <Table2 className="h-3.5 w-3.5" /> Maç Verileri
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" /> Genel Bakış
            </TabsTrigger>
          </TabsList>
          <Link
            href="/h2h"
            className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 text-sm text-foreground hover:border-muted-2 transition-colors"
          >
            <Shuffle className="h-3.5 w-3.5 text-muted" /> Karşılaştır
          </Link>
        </div>
      </header>

      <TabsContent
        forceMount
        value="matches"
        className="flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
      >
        <MatchesView
          initialSearch={initialSearch}
          applyLiveOddsRef={applyLiveOddsRef}
          clearOddsColumnsRef={clearOddsColumnsRef}
        />
      </TabsContent>
      <TabsContent
        forceMount
        value="dashboard"
        className="min-h-0 flex-1 overflow-y-auto px-6 py-5 data-[state=inactive]:hidden"
      >
        <Dashboard />
      </TabsContent>
    </Tabs>
  );
}
