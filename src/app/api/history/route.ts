import { NextResponse } from "next/server";
import yahooFinance from "yahoo-finance2";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const symbol = (url.searchParams.get("symbol") || "").trim().toUpperCase();
  const days = parseInt(url.searchParams.get("days") || "60");
  
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  try {
    console.log(`Fetching ${days} days of history for ${symbol}`);
    
    // Calculate the start date based on days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    
    const result = await yahooFinance.historical(symbol, {
      period1: startDate,
      period2: endDate,
      interval: "1d",
    });

    if (!result || result.length === 0) {
      throw new Error("No historical data returned from Yahoo Finance");
    }

    // Transform the data to match our expected format
    const data = result.map((item: { date: Date; open?: number; high?: number; low?: number; close?: number; volume?: number }) => ({
      timestamp: Math.floor(new Date(item.date).getTime() / 1000), // Convert to Unix timestamp
      open: item.open || 0,
      high: item.high || 0,
      low: item.low || 0,
      close: item.close || 0,
      volume: item.volume || 0,
    }));

    return NextResponse.json({ data, updatedAt: Date.now() });
    
  } catch (error) {
    console.error("Yahoo Finance history API error:", error);
    return NextResponse.json({ 
      error: `Failed to fetch historical data: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}


