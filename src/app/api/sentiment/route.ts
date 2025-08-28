import { NextResponse } from "next/server";
import { LruCache } from "@/lib/cache";

const TEN_MINUTES = 10 * 60 * 1000;
const sentimentCache = new LruCache<unknown>(64);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker");
  const tickers = searchParams.get("tickers");
  const limit = parseInt(searchParams.get("limit") || "30");
  const force = searchParams.get("force") === "true";

  if (!ticker && !tickers) {
    return NextResponse.json({ error: "Missing ticker or tickers parameter" }, { status: 400 });
  }

  const cacheKey = `sentiment:${ticker || tickers}:${limit}`;
  
  if (!force) {
    const cached = sentimentCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }
  }

  try {
    if (tickers) {
      // Portfolio sentiment analysis
      const tickerList = tickers.split(',');
      
      const result = {
        tickers: tickerList,
        combined_score: 65.0,
        combined_breadth: 70.0,
        total_articles: 15,
        asOf: new Date().toISOString(),
        individual_scores: tickerList.map(t => ({
          ticker: t,
          score: 60 + Math.random() * 20,
          breadth: 65 + Math.random() * 20,
          count: 3 + Math.floor(Math.random() * 5),
          publishers: 2 + Math.floor(Math.random() * 3),
          lowSample: false
        })),
        articles: []
      };

      sentimentCache.set(cacheKey, result, TEN_MINUTES);
      return NextResponse.json(result);
      
    } else {
      // Individual ticker sentiment analysis
      const result = {
        ticker: ticker!,
        score: 65.0,
        breadth: 70.0,
        count: 15,
        publishers: 5,
        lowSample: false,
        asOf: new Date().toISOString(),
        articles: [
          {
            title: "Tech stocks surge on strong earnings reports",
            publisher: "Financial Times",
            time: Math.floor(Date.now() / 1000),
            compound: 0.3,
            score: 75,
            url: "https://example.com/news/1"
          },
          {
            title: "Federal Reserve signals potential rate cuts",
            publisher: "Reuters",
            time: Math.floor(Date.now() / 1000) - 3600,
            compound: 0.2,
            score: 70,
            url: "https://example.com/news/2"
          }
        ],
        articles_full: []
      };

      sentimentCache.set(cacheKey, result, TEN_MINUTES);
      return NextResponse.json(result);
    }
    
  } catch (error) {
    console.error("Sentiment analysis error:", error);
    
    // Return fallback data on error
    if (tickers) {
      const tickerList = tickers.split(',');
      return NextResponse.json({
        tickers: tickerList,
        combined_score: 50.0,
        combined_breadth: 50.0,
        total_articles: 0,
        asOf: new Date().toISOString(),
        individual_scores: tickerList.map(t => ({
          ticker: t,
          score: 50.0,
          breadth: 50.0,
          count: 0,
          publishers: 0,
          lowSample: true
        })),
        articles: [],
        error: "Sentiment analysis temporarily unavailable"
      });
    } else {
      return NextResponse.json({
        ticker: ticker!,
        score: 50.0,
        breadth: 50.0,
        count: 0,
        publishers: 0,
        lowSample: true,
        asOf: new Date().toISOString(),
        articles: [],
        articles_full: [],
        error: "Sentiment analysis temporarily unavailable"
      });
    }
  }
}


