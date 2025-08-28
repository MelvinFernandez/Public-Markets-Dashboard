import { NextRequest, NextResponse } from "next/server";
import { generateBigPicture } from "@/lib/marketNarrative/generate";

interface BigPictureData {
  asOf: string;
  tickers: Record<string, { last: number; prev: number; pct: number }>;
  sectors: Record<string, number>;
  sectorBreadth: { count: number; percentage: number; total: number };
  factors: {
    mega_vs_equal: number;
    small_vs_spx: number;
    creditTone: number;
    dollarMove: number;
    vixMove: number;
  };
  headlines: Array<{
    title: string;
    source: string;
    time: string;
    tags: string[];
  }>;
  policy: {
    label: string;
    tradeLabel: string;
    tradeDelta: number;
  };
  paragraphs: string[];
  text: string;
}

// Module-level cache for daily data
let dailyCache: {
  date: string;
  data: BigPictureData;
} | null = null;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';
    
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Check if we have cached data for today
    if (!force && dailyCache && dailyCache.date === today) {
      return NextResponse.json(dailyCache.data);
    }
    
    // Generate new data
    const data = await generateBigPicture();
    
    // Cache the result
    dailyCache = {
      date: today,
      data
    };
    
    return NextResponse.json(data);
  } catch (error) {
    console.error("Big Picture API error:", error);
    return NextResponse.json(
      { error: "Failed to generate big picture data" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';
    
    if (force) {
      // Clear cache and regenerate
      dailyCache = null;
    }
    
    const data = await generateBigPicture();
    
    // Cache the result
    const today = new Date().toISOString().split('T')[0];
    dailyCache = {
      date: today,
      data
    };
    
    return NextResponse.json(data);
  } catch (error) {
    console.error("Big Picture POST error:", error);
    return NextResponse.json(
      { error: "Failed to generate big picture data" },
      { status: 500 }
    );
  }
}

// Enable ISR with daily revalidation
export const revalidate = 86400; // 24 hours
