import { NextResponse } from "next/server";
import yahooFinance from "yahoo-finance2";
import { LruCache, devFileCache } from "@/lib/cache";

const cache = new LruCache<{ data: Array<{ t: number; o: number; h: number; l: number; c: number; v: number }>; updatedAt: number; marketClosed: boolean }>(100);

function keyFor(params: URLSearchParams) {
  return `ohlc:${params.get("ticker")}:${params.get("range")}:${params.get("interval")}`;
}

// Map range to yahoo-finance2 query options
function getQueryOptions(range: string, interval: string) {
  const now = new Date();
  let period: string;
  let intervalStr: string;
  
  switch (range) {
    case "1d":
      period = "1d";
      intervalStr = interval === "5m" ? "5m" : "1m";
      break;
    case "5d":
      period = "5d";
      intervalStr = interval === "1h" ? "1h" : "5m";
      break;
    case "7d":
      period = "7d";
      intervalStr = interval === "1h" ? "1h" : "5m";
      break;
    case "1mo":
      period = "1mo";
      intervalStr = "1d";
      break;
    case "1y":
      period = "1y";
      intervalStr = "1wk";
      break;
    case "365d":
      period = "1y";
      intervalStr = "1d";
      break;
    default:
      period = "1mo";
      intervalStr = "1d";
  }
  
  return { period, interval: intervalStr };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const ticker = (url.searchParams.get("ticker") || "").trim().toUpperCase();
  const range = (url.searchParams.get("range") || "1mo").toLowerCase();
  const interval = (url.searchParams.get("interval") || (range === "1d" ? "5m" : "1d")).toLowerCase();
  const force = url.searchParams.get("force") === "true";
  
  if (!ticker) return NextResponse.json({ error: "ticker required" }, { status: 400 });

  // Cache: 15s for intraday (1d), 30s for hourly, 60s for daily+ (more aggressive refresh)
  const ttl = interval.endsWith("m") ? (range === "1d" ? 15_000 : 30_000) : 60_000;
  const cacheKey = keyFor(url.searchParams);
  
  if (!force) {
    const mem = cache.get(cacheKey);
    if (mem) return NextResponse.json(mem);
    const file = devFileCache.read<{ data: Array<{ t: number; o: number; h: number; l: number; c: number; v: number }>; updatedAt: number; marketClosed: boolean }>(cacheKey);
    if (file) {
      cache.set(cacheKey, file, ttl);
      return NextResponse.json(file);
    }
  }

  try {
    const { period, interval: intervalStr } = getQueryOptions(range, interval);
    
    console.log(`Fetching ${ticker} data: period=${period}, interval=${intervalStr}`);
    
    const result = await yahooFinance.historical(ticker, {
      period1: period,
      interval: intervalStr as any,
    });

    if (!result || result.length === 0) {
      throw new Error("No data returned from Yahoo Finance");
    }

    // Transform the data to match our expected format
    const data = result.map((item: any) => ({
      t: Math.floor(new Date(item.date).getTime() / 1000), // Convert to Unix timestamp
      o: item.open || 0,
      h: item.high || 0,
      l: item.low || 0,
      c: item.close || 0,
      v: item.volume || 0,
    }));

    const payload = { data, updatedAt: Date.now(), marketClosed: false };
    cache.set(cacheKey, payload, ttl);
    devFileCache.write(cacheKey, payload);
    
    return NextResponse.json(payload);
    
  } catch (error) {
    console.error("Yahoo Finance API error:", error);
    return NextResponse.json({ 
      error: `Failed to fetch data from Yahoo Finance: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}


