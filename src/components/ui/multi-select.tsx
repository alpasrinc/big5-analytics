"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Checkbox } from "./checkbox";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  value: string;
  label: string;
  hint?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Seçin",
  searchable = true,
  className,
}: {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  searchable?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const toggle = (value: string) => {
    if (selected.includes(value)) onChange(selected.filter((v) => v !== value));
    else onChange([...selected, value]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface-2 px-3 text-sm text-foreground hover:border-muted-2 transition-colors",
            className
          )}
        >
          <span className={cn("truncate text-left", !selected.length && "text-muted-2")}>
            {selected.length ? `${selected.length} seçili` : placeholder}
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0">
        {searchable && (
          <div className="flex items-center gap-2 border-b border-border px-2.5 py-2">
            <Search className="h-3.5 w-3.5 text-muted-2 shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ara..."
              className="w-full bg-transparent text-xs outline-none placeholder:text-muted-2"
            />
          </div>
        )}
        <div className="max-h-64 overflow-y-auto p-1">
          {filtered.length === 0 && (
            <p className="px-2 py-3 text-center text-xs text-muted-2">Sonuç yok</p>
          )}
          {filtered.map((o) => (
            <label
              key={o.value}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-surface-2"
            >
              <Checkbox
                checked={selected.includes(o.value)}
                onCheckedChange={() => toggle(o.value)}
              />
              <span className="flex-1 truncate">{o.label}</span>
              {o.hint && <span className="text-muted-2">{o.hint}</span>}
            </label>
          ))}
        </div>
        {selected.length > 0 && (
          <div className="flex items-center justify-between border-t border-border px-2.5 py-1.5">
            <span className="text-[11px] text-muted">{selected.length} seçili</span>
            <button
              onClick={() => onChange([])}
              className="flex items-center gap-1 text-[11px] text-muted hover:text-away"
            >
              <X className="h-3 w-3" /> Temizle
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
