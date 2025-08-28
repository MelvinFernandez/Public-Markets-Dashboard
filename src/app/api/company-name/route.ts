import { NextRequest, NextResponse } from "next/server";
import yahooFinance from 'yahoo-finance2';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    
    if (!symbol) {
      return NextResponse.json({ error: 'Symbol parameter is required' }, { status: 400 });
    }

    // Fetch company info from Yahoo Finance
    const quote = await yahooFinance.quote(symbol);
    
    if (!quote) {
      return NextResponse.json({ error: 'Symbol not found' }, { status: 404 });
    }

    // Extract company name from various possible fields
    const companyName = quote.longName || quote.shortName || quote.displayName || symbol;
    
    return NextResponse.json({ 
      symbol: symbol.toUpperCase(),
      name: companyName 
    });

  } catch (error) {
    console.error('Error fetching company name:', error);
    return NextResponse.json({ error: 'Failed to fetch company name' }, { status: 500 });
  }
}
