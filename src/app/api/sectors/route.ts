import { NextResponse } from "next/server";
import yahooFinance from "yahoo-finance2";

const SECTORS = ["XLK", "XLF", "XLY", "XLE", "XLV", "XLI", "XLU", "XLB", "XLRE", "XLC"];

export async function GET() {
  try {
    console.log("Fetching sector ETF prices...");
    
    // Fetch current prices for all sector ETFs
    const sectorPromises = SECTORS.map(async (symbol) => {
      try {
        const quote = await yahooFinance.quote(symbol);
        return {
          symbol,
          date: new Date().toISOString().slice(0, 10),
          close: quote.regularMarketPrice || 0,
          change: quote.regularMarketChange || 0,
          changePercent: quote.regularMarketChangePercent || 0,
          volume: quote.regularMarketVolume || 0
        };
      } catch (error) {
        console.error(`Failed to fetch ${symbol}:`, error);
        return {
          symbol,
          date: new Date().toISOString().slice(0, 10),
          close: 0,
          change: 0,
          changePercent: 0,
          volume: 0,
          error: `Failed to fetch ${symbol}`
        };
      }
    });

    const sectorData = await Promise.all(sectorPromises);
    const validData = sectorData.filter(item => !item.error);
    
    return NextResponse.json({ data: validData, updatedAt: Date.now() });
    
  } catch (error) {
    console.error("Sectors API error:", error);
    return NextResponse.json({ 
      error: `Failed to fetch sector data: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}


