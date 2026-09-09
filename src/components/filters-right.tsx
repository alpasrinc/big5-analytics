"use client";

import { useMemo, useState } from "react";
import { ListFilter, X } from "lucide-react";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { exactValueFromRange, NUMERIC_FIELDS } from "@/lib/schema";
import type { NumericField } from "@/lib/schema";
import type { FilterState } from "@/lib/api-types";

const round2 = (n: number) => Math.round(n * 100) / 100;

export function FiltersRight({
  filters,
  onChange,
}: {
  filters: FilterState;
  onChange: (f: FilterState) => void;
}) {
  const groups = useMemo(() => {
    const g = new Map<string, typeof NUMERIC_FIELDS>();
    for (const f of NUMERIC_FIELDS) {
      if (!g.has(f.group)) g.set(f.group, []);
      g.get(f.group)!.push(f);
    }
    return g;
  }, []);

  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(["Korner", "Kart"]));
  const toggleGroup = (group: string) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });

  const setNumeric = (col: string, part: "min" | "max", value: string) => {
    const num = value === "" ? undefined : Number(value);
    const next = { ...filters.numeric, [col]: { ...filters.numeric[col], [part]: num } };
    if (next[col].min === undefined && next[col].max === undefined) delete next[col];
    onChange({ ...filters, numeric: next, page: 1 });
  };

  // "Tam" writes min and max together. For fields with a tolerance (closing
  // odds — they rarely land on the exact typed figure) it writes a
  // value±tolerance band instead of a literal equality. It only shows a
  // value back when min/max still match that same shape, so it clears
  // itself the moment either side is edited into a different range.
  const setExact = (field: NumericField, value: string) => {
    const num = value === "" ? undefined : Number(value);
    const next = { ...filters.numeric };
    if (num === undefined) {
      delete next[field.col];
    } else if (field.tolerance) {
      next[field.col] = { min: round2(num - field.tolerance), max: round2(num + field.tolerance) };
    } else {
      next[field.col] = { min: num, max: num };
    }
    onChange({ ...filters, numeric: next, page: 1 });
  };

  // Lets pasting several odds copied side-by-side off a betting site (e.g.
  // "1.85  3.40  4.20") into one "tam" box fan them out across it and the
  // following fields in the same group (1 -> MS1, X -> MSX, 2 -> MS2) instead
  // of dumping the whole clipboard string into a single input. A single
  // pasted number falls through to the browser's normal paste.
  const handleTamPaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    fields: NumericField[],
    startIndex: number
  ) => {
    const tokens = e.clipboardData.getData("text").match(/-?\d+(?:[.,]\d+)?/g);
    if (!tokens || tokens.length < 2) return;
    e.preventDefault();
    const next = { ...filters.numeric };
    tokens.forEach((tok, i) => {
      const field = fields[startIndex + i];
      if (!field) return;
      const num = Number(tok.replace(",", "."));
      if (Number.isNaN(num)) return;
      next[field.col] = field.tolerance
        ? { min: round2(num - field.tolerance), max: round2(num + field.tolerance) }
        : { min: num, max: num };
    });
    onChange({ ...filters, numeric: next, page: 1 });
  };

  const numericCount = Object.keys(filters.numeric).length;

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col gap-3 overflow-y-auto border-l border-border bg-surface/40 px-5 py-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-semibold">
          <ListFilter className="h-4 w-4 text-accent" />
          İstatistik ve Oran Aralıkları
          {numericCount > 0 && (
            <Badge tone="accent" className="ml-1">
              {numericCount}
            </Badge>
          )}
        </div>
        {numericCount > 0 && (
          <button
            onClick={() => onChange({ ...filters, numeric: {}, page: 1 })}
            className="flex items-center gap-1 text-xs text-muted hover:text-away"
          >
            <X className="h-3 w-3" /> Temizle
          </button>
        )}
      </div>

      {Array.from(groups.entries()).map(([group, fields]) => {
        const groupActiveCount = fields.filter((f) => filters.numeric[f.col]).length;
        const open = openGroups.has(group);
        return (
          <div key={group} className="rounded-lg border border-border bg-surface-2/40">
            <button
              onClick={() => toggleGroup(group)}
              className="flex w-full items-center justify-between px-3 py-2.5 text-xs font-semibold text-foreground"
            >
              <span className="flex items-center gap-1.5">
                {group}
                {groupActiveCount > 0 && (
                  <Badge tone="accent" className="h-4 min-w-4 px-1">
                    {groupActiveCount}
                  </Badge>
                )}
              </span>
              <span className="text-muted-2">{open ? "−" : "+"}</span>
            </button>
            {open && (
              <div className="flex flex-col gap-3 px-3 pb-3">
                {fields.map((f) => {
                  const range = filters.numeric[f.col];
                  const exactValue = exactValueFromRange(f, range) ?? "";
                  return (
                    <div key={f.col}>
                      <p className="mb-1 text-[11px] text-muted">{f.label}</p>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          step={f.step ?? 1}
                          placeholder="min"
                          value={range?.min ?? ""}
                          onChange={(e) => setNumeric(f.col, "min", e.target.value)}
                          className="h-7 min-w-0 px-1.5 text-xs"
                        />
                        <Input
                          type="number"
                          step={f.step ?? 1}
                          placeholder="tam"
                          value={exactValue}
                          onChange={(e) => setExact(f, e.target.value)}
                          onPaste={(e) => handleTamPaste(e, fields, fields.indexOf(f))}
                          title={
                            f.tolerance
                              ? `Girilen değerin ±${f.tolerance} aralığını gösterir (örn. 1.50 → 1.45–1.55). Yan yana birden fazla oran yapıştırırsan bu ve sonraki kutulara sırayla dağıtılır.${
                                  f.mirrorCol ? " Hangi taraf kapandığına bakılmaksızın tersi de otomatik hesaplanır." : ""
                                }`
                              : "Tam eşleşen değer (min ve max'ı aynı anda ayarlar)"
                          }
                          className="h-7 min-w-0 px-1.5 text-xs text-accent placeholder:text-accent/50"
                        />
                        <Input
                          type="number"
                          step={f.step ?? 1}
                          placeholder="max"
                          value={range?.max ?? ""}
                          onChange={(e) => setNumeric(f.col, "max", e.target.value)}
                          className="h-7 min-w-0 px-1.5 text-xs"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </aside>
  );
}
