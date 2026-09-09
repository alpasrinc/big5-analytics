import { NextRequest, NextResponse } from "next/server";
import { fetchOddsmathMarket, type OddsmathMarket, type OddsmathMarketResult } from "@/lib/oddsmath";

// Odds on the source site update roughly once a minute; this just avoids
// re-hitting it on every re-render if the panel is left open.
const CACHE_TTL_MS = 15_000;
const cache = new Map<string, { at: number; data: OddsmathMarketResult }>();

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const url = sp.get("url");
  const market = sp.get("market");

  if (!url) {
    return NextResponse.json({ error: "url parametresi gerekli" }, { status: 400 });
  }
  if (market !== "1x2" && market !== "ou25") {
    return NextResponse.json({ error: "Geçersiz market" }, { status: 400 });
  }

  const cacheKey = `${market}::${url}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  try {
    const data = await fetchOddsmathMarket(url, market as OddsmathMarket);
    cache.set(cacheKey, { at: Date.now(), data });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Oranlar alınamadı" },
      { status: 502 }
    );
  }
}
