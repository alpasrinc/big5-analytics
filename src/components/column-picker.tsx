"use client";

import { useMemo } from "react";
import { Columns3, RotateCcw } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Checkbox } from "./ui/checkbox";
import { Badge } from "./ui/badge";
import type { OddsMarket } from "@/lib/schema";

export function ColumnPicker({
  title,
  markets,
  defaultVisible,
  visible,
  onChange,
}: {
  title: string;
  markets: OddsMarket[];
  defaultVisible: string[];
  visible: string[];
  onChange: (ids: string[]) => void;
}) {
  const groups = useMemo(() => {
    const g = new Map<string, OddsMarket[]>();
    for (const m of markets) {
      if (!g.has(m.group)) g.set(m.group, []);
      g.get(m.group)!.push(m);
    }
    return g;
  }, [markets]);

  const toggle = (id: string) =>
    onChange(visible.includes(id) ? visible.filter((v) => v !== id) : [...visible, id]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 text-sm text-foreground hover:border-muted-2 transition-colors"
        >
          <Columns3 className="h-3.5 w-3.5 text-muted" />
          {title}
          <Badge tone="accent">{visible.length}</Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="text-xs font-semibold text-foreground">Listede gösterilecek sütunlar</p>
          <button
            onClick={() => onChange(defaultVisible)}
            className="flex items-center gap-1 text-[11px] text-muted hover:text-accent"
          >
            <RotateCcw className="h-3 w-3" /> Varsayılan
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto p-2">
          {Array.from(groups.entries()).map(([group, groupMarkets]) => (
            <div key={group} className="mb-2 last:mb-0">
              <p className="px-1.5 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-2">
                {group}
              </p>
              {groupMarkets.map((m) => (
                <label
                  key={m.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 text-xs hover:bg-surface-2"
                >
                  <Checkbox checked={visible.includes(m.id)} onCheckedChange={() => toggle(m.id)} />
                  <span className="flex-1">{m.label}</span>
                </label>
              ))}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
