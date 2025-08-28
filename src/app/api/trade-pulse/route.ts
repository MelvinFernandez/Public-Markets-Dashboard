import { NextResponse } from "next/server";

const CSV_URL = "https://policyuncertainty.com/media/All_Daily_TPU_Data.csv";
const CACHE_HOURS = 24;

type TradeData = { date: string; value: number };

function ema7(values: number[]): number[] {
  if (values.length === 0) return [];
  const alpha = 2 / (7 + 1);
  const result = [values[0]];
  for (let i = 1; i < values.length; i++) {
    result.push(alpha * values[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
}

function zScore(value: number, arr: number[]): number {
  if (arr.length === 0) return 0;
  const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
  const variance = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length;
  const stdDev = Math.sqrt(variance) || 1;
  return (value - mean) / stdDev;
}

function getLabel(z: number): "Low" | "Medium" | "High" {
  if (z > 0.5) return "High";
  if (z < -0.5) return "Low";
  return "Medium";
}

let cache: { data: { key: string; label: string; deltaPct: number; value: number; asOf: string }; timestamp: number } | null = null;

export async function GET() {
  try {
    // Check cache
    if (cache && Date.now() - cache.timestamp < CACHE_HOURS * 3600 * 1000) {
      return NextResponse.json(cache.data);
    }

    // Fetch CSV (no Next.js cache due to large file size)
    const response = await fetch(CSV_URL, { 
      headers: { "User-Agent": "Market-Dashboard/1.0" }
    });
    
    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch trade data" }, { status: 502 });
    }

    const csvText = await response.text();
    const lines = csvText.trim().split('\n');
    
    if (lines.length < 2) {
      return NextResponse.json({ error: "Invalid CSV data" }, { status: 502 });
    }

    // Parse headers and find US column (daily_tpu_index is the US data)
    const headers = lines[0].split(',');
    let usIndex = headers.findIndex(h => /united states/i.test(h));
    
    // If no "United States" column, use daily_tpu_index (which is US data)
    if (usIndex === -1) {
      usIndex = headers.findIndex(h => /daily_tpu_index/i.test(h));
    }
    
    if (usIndex === -1) {
      return NextResponse.json({ error: "US column not found" }, { status: 502 });
    }

    // Parse data
    const tradeData: TradeData[] = [];
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',');
      const day = parseInt(row[0]?.trim() || '0');
      const month = parseInt(row[1]?.trim() || '0');
      const year = parseInt(row[2]?.trim() || '0');
      const value = parseFloat(row[usIndex]?.trim() || '');
      
      if (day && month && year && !isNaN(value)) {
        // Create YYYY-MM format
        const date = `${year}-${String(month).padStart(2, '0')}`;
        tradeData.push({ date, value });
      }
    }

    if (tradeData.length < 14) {
      // Fallback for insufficient data
      const latest = tradeData[tradeData.length - 1];
      const result = {
        key: "trade",
        label: "Medium" as const,
        deltaPct: 0,
        value: Math.round(latest?.value || 0),
        asOf: latest?.date || new Date().toISOString().split('T')[0]
      };
      cache = { data: result, timestamp: Date.now() };
      return NextResponse.json(result);
    }

    // Get last 30 days for EMA
    const last30Days = tradeData.slice(-30);
    const values = last30Days.map(d => d.value);
    const smoothed = ema7(values);
    const latestSmoothed = smoothed[smoothed.length - 1];

    // Calculate delta% (last 7d avg vs prior 7d avg)
    const last7Avg = values.slice(-7).reduce((s, v) => s + v, 0) / 7;
    const prior7Avg = values.slice(-14, -7).reduce((s, v) => s + v, 0) / 7;
    const deltaPct = Math.round(((last7Avg - prior7Avg) / prior7Avg) * 100);

    // Z-score vs last 60 months
    const last60Months = tradeData.slice(-1825); // ~60 months of daily data
    const historicalValues = last60Months.map(d => d.value);
    const z = zScore(latestSmoothed, historicalValues);

    const result = {
      key: "trade",
      label: getLabel(z),
      deltaPct,
      value: Math.round(latestSmoothed),
      asOf: last30Days[last30Days.length - 1].date
    };

    cache = { data: result, timestamp: Date.now() };
    return NextResponse.json(result);

  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 502 });
  }
}
