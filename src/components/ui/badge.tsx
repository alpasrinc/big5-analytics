import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

const tones = {
  neutral: "bg-surface-2 text-muted border-border",
  home: "bg-[color-mix(in_srgb,var(--home)_16%,transparent)] text-home border-[color-mix(in_srgb,var(--home)_35%,transparent)]",
  draw: "bg-[color-mix(in_srgb,var(--draw)_16%,transparent)] text-draw border-[color-mix(in_srgb,var(--draw)_35%,transparent)]",
  away: "bg-[color-mix(in_srgb,var(--away)_16%,transparent)] text-away border-[color-mix(in_srgb,var(--away)_35%,transparent)]",
  accent: "bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-accent border-[color-mix(in_srgb,var(--accent)_35%,transparent)]",
} as const;

export function Badge({
  className,
  tone = "neutral",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof tones }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md border px-1.5 py-0.5 text-[11px] font-semibold leading-none",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
