import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmtNum(v: number | null | undefined, digits = 0) {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return v.toLocaleString("tr-TR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function fmtOdds(v: number | null | undefined) {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return v.toFixed(2);
}

export function fmtStat(v: number | null | undefined, decimals = 0, suffix = "") {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return v.toFixed(decimals) + suffix;
}

export function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Compact dd.mm.yy for narrow table columns.
export function fmtDateShort(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

export function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Fixed categorical order — validated for CVD-safe adjacent contrast on the
// dark chart surface (see dataviz skill palette). Never reassign per-view.
// `country` matches the `country` column in the DB (used to group leagues by
// country in the league filter); Champions League has no country group.
export const LEAGUE_META: Record<
  string,
  { short: string; color: string; flag: string; country: string | null }
> = {
  "Premier League": { short: "PL", color: "var(--league-1)", flag: "🏴", country: "England" },
  LaLiga: { short: "LL", color: "var(--league-2)", flag: "🇪🇸", country: "Spain" },
  "Serie A": { short: "SA", color: "var(--league-3)", flag: "🇮🇹", country: "Italy" },
  Bundesliga: { short: "BL", color: "var(--league-4)", flag: "🇩🇪", country: "Germany" },
  "Ligue 1": { short: "L1", color: "var(--league-5)", flag: "🇫🇷", country: "France" },
  "Champions League": { short: "UCL", color: "var(--league-6)", flag: "🏆", country: null },
  Championship: { short: "CHA", color: "var(--league-7)", flag: "🏴", country: "England" },
  "Super Lig": { short: "TSL", color: "var(--league-8)", flag: "🇹🇷", country: "Turkey" },
  LaLiga2: { short: "LL2", color: "var(--league-9)", flag: "🇪🇸", country: "Spain" },
  "2. Bundesliga": { short: "BL2", color: "var(--league-10)", flag: "🇩🇪", country: "Germany" },
  Eredivisie: { short: "ERE", color: "var(--league-11)", flag: "🇳🇱", country: "Netherlands" },
};

// Turkish display name + flag for each country the league filter groups by,
// sorted alphabetically by `tr` wherever this is iterated.
export const COUNTRY_META: Record<string, { tr: string; flag: string }> = {
  England: { tr: "İngiltere", flag: "🏴" },
  Spain: { tr: "İspanya", flag: "🇪🇸" },
  Italy: { tr: "İtalya", flag: "🇮🇹" },
  Germany: { tr: "Almanya", flag: "🇩🇪" },
  France: { tr: "Fransa", flag: "🇫🇷" },
  Turkey: { tr: "Türkiye", flag: "🇹🇷" },
  Netherlands: { tr: "Hollanda", flag: "🇳🇱" },
};

export const LEAGUE_HEX: Record<string, string> = {
  "Premier League": "#3987e5",
  LaLiga: "#d95926",
  "Serie A": "#199e70",
  Bundesliga: "#c98500",
  "Ligue 1": "#d55181",
  "Champions League": "#008300",
  Championship: "#9085e9",
  "Super Lig": "#e66767",
  LaLiga2: "#22b8cf",
  "2. Bundesliga": "#f08c00",
  Eredivisie: "#f06595",
};
