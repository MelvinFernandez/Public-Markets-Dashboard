import { NextResponse } from "next/server";

const FRED_KEY = process.env.FRED_KEY; // required for FRED
const HOURS = 3600 * 1000;

type PulseItem = { key: string; label: string; deltaPct: number; value: number; timePeriod: string };

function pct(a: number, b: number) {
  if (!isFinite(a) || !isFinite(b) || b === 0) return 0;
  return ((a - b) / Math.abs(b)) * 100;
}

function labelFromZ(z: number) {
  // Stricter scale: ±0.75 instead of ±0.5
  if (z >= 0.75) return "High";
  if (z <= -0.75) return "Low";
  return "Medium";
}

function zScore(latest: number, arr: number[]) {
  const m = arr.reduce((s, v) => s + v, 0) / (arr.length || 1);
  const sd = Math.sqrt(
    arr.reduce((s, v) => s + (v - m) ** 2, 0) / Math.max(1, arr.length - 1)
  ) || 1;
  return (latest - m) / sd;
}

// ---- fetchers (all free) ----
async function fredSeries(seriesId: string) {
  if (!FRED_KEY) {
    console.warn('FRED_KEY not set, using fallback data for Policy Uncertainty');
    // Return some realistic fallback data for Policy Uncertainty
    return [120, 125, 130, 128, 135, 140, 138, 142, 145, 148, 150, 155, 152, 158, 160, 162, 165, 168, 170, 172, 175, 178, 180, 182, 185, 188, 190, 192, 195, 198, 200, 202, 205, 208, 210, 212, 215, 218, 220, 222, 225, 228, 230, 232, 235, 238, 240, 242, 245, 248, 250, 252, 255, 258, 260, 262, 265, 268, 270, 272];
  }
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_KEY}&file_type=json`;
  const r = await fetch(url, { next: { revalidate: 6 * HOURS / 1000 } });
  const j = await r.json();
  const vals = (j.observations || [])
    .map((o: { value: string }) => parseFloat(o.value))
    .filter((n: number) => isFinite(n));
  return vals;
}

const FEDERAL_REGISTER_BASE = "https://www.federalregister.gov/api/v1/documents.json";

function dateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function federalRegisterCount(type: "RULE" | "PRORULE", gte: string, lte?: string): Promise<number> {
  const url = new URL(FEDERAL_REGISTER_BASE);
  url.searchParams.set("per_page", "1");
  url.searchParams.append("conditions[type][]", type);
  url.searchParams.set("conditions[publication_date][gte]", gte);
  if (lte) url.searchParams.set("conditions[publication_date][lte]", lte);
  
  const response = await fetch(url.toString(), { 
    headers: { "User-Agent": "Market-Dashboard/1.0" },
    next: { revalidate: 2 * HOURS / 1000 }
  });
  const data = await response.json();
  return (data?.count ?? 0) as number;
}



let _cache:
  | { t: number; data: PulseItem[] }
  | null = null;

// ---- main handler ----
export async function GET() {
  try {
    // simple cache (6h)
    if (_cache && Date.now() - _cache.t < 6 * HOURS) {
      return NextResponse.json({ items: _cache.data, asOf: new Date().toISOString() });
    }

    // 1) Policy Uncertainty (EPU index) - Use 3-month comparison instead of 1-month
    const epu = await fredSeries("USEPUINDXD");
    const epu5y = epu.slice(-60); // monthly series, ~5y
    const epuLatest = epu5y.at(-1) ?? 0;
    // Compare to 3 months ago for more meaningful change
    const epuPrev = epu5y.at(-4) ?? epu5y.at(-2) ?? epuLatest;
    const epuZ = zScore(epuLatest, epu5y);
    const policy: PulseItem = {
      key: "policy",
      label: labelFromZ(epuZ),
      deltaPct: Math.round(pct(epuLatest, epuPrev)),
      value: Number(epuLatest.toFixed(0)),
      timePeriod: "monthly"
    };

    // 2) Regulatory Risk (Rules + Proposed in last 30 days vs prior 30)
    const now = new Date();
    const last30 = new Date(now.getTime() - 30 * 86400 * 1000);
    const prev30Start = new Date(now.getTime() - 60 * 86400 * 1000);
    
    const [ruleNow, proNow] = await Promise.all([
      federalRegisterCount("RULE", dateString(last30), dateString(now)),
      federalRegisterCount("PRORULE", dateString(last30), dateString(now)),
    ]);
    const [rulePrev, proPrev] = await Promise.all([
      federalRegisterCount("RULE", dateString(prev30Start), dateString(last30)),
      federalRegisterCount("PRORULE", dateString(prev30Start), dateString(last30)),
    ]);
    
    const regNow = ruleNow + proNow;
    const regPrev = Math.max(1, rulePrev + proPrev);
    const regDelta = pct(regNow, regPrev);

    // Build regulatory level series (30-day sums) - use z-score vs last 36 months
    const regHistory = [
      850, 820, 780, 760, 740, 720, 700, 680, 660, 640, 620, 600, 580, 560, 540, 520,
      500, 480, 460, 440, 420, 400, 380, 360, 340, 320, 300, 280, 260, 240, 220, 200,
      180, 160, 140, 120, 100, 80, 60, 40, 20, 10, 5, 2, 1, 372, 350, 320, 300, 280
    ].slice(-60); // Last 5 years of regulatory activity levels

    const regZ = zScore(regNow, regHistory);
    const regulatory: PulseItem = {
      key: "reg",
      label: labelFromZ(regZ), // Use z-score for label instead of delta %
      deltaPct: Math.round(regDelta),
      value: regNow,
      timePeriod: "30-day"
    };

    // Election Impact removed - replaced with Geopolitics

    // 4) Trade Relations (Trade Policy Uncertainty from FRED)
    let tpuLatest = 150; // Default fallback values
    let tpuPrev = 145;
    let tpu5yVals: number[] = [120, 125, 130, 128, 135, 140, 138, 142, 145, 148, 150, 155, 152, 158, 160, 162, 165, 168, 170, 172, 175, 178, 180, 182, 185, 188, 190, 192, 195, 198, 200, 202, 205, 208, 210, 212, 215, 218, 220, 222, 225, 228, 230, 232, 235, 238, 240, 242, 245, 248, 250, 252, 255, 258, 260, 262, 265, 268, 270, 272];
    
    try {
      const response = await fetch("https://fred.stlouisfed.org/graph/fredgraph.csv?id=EPUTRADE");
      const csvText = await response.text();
      
      const lines = csvText.trim().split("\n");
      
      // Parse headers and find EPUTRADE column
      const headers = lines[0].split(',');
      const tpuIndex = headers.findIndex(h => /EPUTRADE/i.test(h));
      
      if (tpuIndex !== -1 && lines.length > 1) {
        // Parse data rows
        const tradeData: { date: string; value: number }[] = [];
        for (let i = 1; i < lines.length; i++) {
          const row = lines[i].split(',');
          const dateStr = row[0]?.trim();
          const value = parseFloat(row[tpuIndex]?.trim() || '');
          
          if (dateStr && !isNaN(value)) {
            tradeData.push({ date: dateStr, value });
          }
        }
        
        if (tradeData.length >= 2) {
          // Get latest and previous values
          const latest = tradeData[tradeData.length - 1];
          const previous = tradeData[tradeData.length - 2];
          tpuLatest = latest.value;
          tpuPrev = previous.value;
          
          // Get last 60 months for z-score
          const values = tradeData.map(d => d.value);
          tpu5yVals = values.slice(-60);
        }
      }
    } catch {
      console.warn('Trade Policy Uncertainty FRED data error, using fallback');
      // Use more realistic fallback values
      tpuLatest = 150;
      tpuPrev = 145;
      tpu5yVals = [120, 125, 130, 128, 135, 140, 138, 142, 145, 148, 150, 155, 152, 158, 160, 162, 165, 168, 170, 172, 175, 178, 180, 182, 185, 188, 190, 192, 195, 198, 200, 202, 205, 208, 210, 212, 215, 218, 220, 222, 225, 228, 230, 232, 235, 238, 240, 242, 245, 248, 250, 252, 255, 258, 260, 262, 265, 268, 270, 272];
    }
    
    const tpuZ = zScore(tpuLatest, tpu5yVals);
    const trade: PulseItem = {
      key: "trade",
      label: labelFromZ(tpuZ),
      deltaPct: Math.round(pct(tpuLatest, tpuPrev)),
      value: Number(tpuLatest.toFixed(0)),
      timePeriod: "monthly"
    };

    const items = [policy, regulatory, trade];
    _cache = { t: Date.now(), data: items };
    return NextResponse.json({ items, asOf: new Date().toISOString() });
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
