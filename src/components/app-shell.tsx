"use client";

import { useState } from "react";
import { BarChart3, Table2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Dashboard } from "./dashboard";
import { MatchesView } from "./matches-view";

export function AppShell() {
  const [tab, setTab] = useState("matches");

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
        <TabsList>
          <TabsTrigger value="matches" className="flex items-center gap-1.5">
            <Table2 className="h-3.5 w-3.5" /> Maç Verileri
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" /> Genel Bakış
          </TabsTrigger>
        </TabsList>
      </header>

      <TabsContent
        forceMount
        value="matches"
        className="flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
      >
        <MatchesView />
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
