import { NextResponse } from "next/server";
import { z } from "zod";
import yahooFinance from "yahoo-finance2";

const QuerySchema = z.object({ symbols: z.string().transform((s) => s.split(",").filter(Boolean)) });

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({ symbols: url.searchParams.get("symbols") ?? "" });
  if (!parsed.success) return NextResponse.json({ error: "Invalid query" }, { status: 400 });

  const symbols = parsed.data.symbols;
  if (!symbols.length) return NextResponse.json({ data: [], updatedAt: Date.now() });

  try {
    console.log(`Fetching quotes for symbols: ${symbols.join(', ')}`);
    
    // Fetch quotes for all symbols in parallel
    const quotePromises = symbols.map(async (symbol) => {
      try {
        const quote = await yahooFinance.quote(symbol);
        return {
          symbol: symbol.toUpperCase(),
          price: quote.regularMarketPrice || 0,
          change: quote.regularMarketChange || 0,
          changePercent: quote.regularMarketChangePercent || 0,
          volume: quote.regularMarketVolume || 0,
          marketCap: quote.marketCap || 0,
          pe: quote.trailingPE || 0,
          dividendYield: quote.dividendYield || 0,
          updatedAt: Date.now(),
        };
      } catch (error) {
        console.error(`Failed to fetch quote for ${symbol}:`, error);
        return {
          symbol: symbol.toUpperCase(),
          price: 0,
          change: 0,
          changePercent: 0,
          volume: 0,
          marketCap: 0,
          pe: 0,
          dividendYield: 0,
          updatedAt: Date.now(),
          error: `Failed to fetch data for ${symbol}`,
        };
      }
    });

    const quotes = await Promise.all(quotePromises);
    const data = quotes.filter(quote => !quote.error); // Filter out failed quotes
    
    return NextResponse.json({ data, updatedAt: Date.now() });
    
  } catch (error) {
    console.error("Quotes API error:", error);
    return NextResponse.json({ 
      error: `Failed to fetch quotes: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}


