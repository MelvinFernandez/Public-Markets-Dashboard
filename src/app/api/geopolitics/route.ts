import { NextResponse } from "next/server";
import * as xlsx from "xlsx";

const GPR_URL = "https://www.matteoiacoviello.com/gpr_files/data_gpr_export.xls";
const HOURS = 3600 * 1000;

// Utility functions
function zScore(latest: number, arr: number[]): number {
  const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
  const sd = Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(1, arr.length - 1)) || 1;
  return (latest - mean) / sd;
}

function pct(a: number, b: number): number {
  if (!isFinite(a) || !isFinite(b) || b === 0) return 0;
  return ((a - b) / Math.abs(b)) * 100;
}

function labelFromZ(z: number): "Low" | "Medium" | "High" {
  // Stricter scale: ±0.75 instead of ±0.5
  if (z >= 0.75) return "High";
  if (z <= -0.75) return "Low";
  return "Medium";
}

function parseDate(dateStr: string | number): string | null {
  try {
    // Handle Excel serial dates (numbers)
    if (typeof dateStr === 'number') {
      // Excel serial date: days since 1900-01-01 (with leap year bug)
      const excelEpoch = new Date(1900, 0, 1);
      const date = new Date(excelEpoch.getTime() + (dateStr - 2) * 24 * 60 * 60 * 1000);
      if (isNaN(date.getTime())) return null;
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return `${year}-${month}`;
    }
    
    // Handle string dates
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    
    // Return YYYY-MM format
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  } catch {
    return null;
  }
}

function findSheet(wb: xlsx.WorkBook): xlsx.WorkSheet | null {
  const sheetNames = ["GPR", "Monthly", "Data"];
  
  // Try preferred sheet names first
  for (const name of sheetNames) {
    if (wb.SheetNames.includes(name)) {
      return wb.Sheets[name];
    }
  }
  
  // Fall back to first sheet
  return wb.Sheets[wb.SheetNames[0]] || null;
}

function findDateColumn(headers: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i].toLowerCase();
    if (/date|month|time/.test(header)) {
      return i;
    }
  }
  return 0; // Default to first column
}

function findGprColumn(headers: string[]): number {
  // Prefer US GPR (GPRC_USA)
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i].toLowerCase();
    if (/gprc_usa|gpr.*usa|usa.*gpr/.test(header)) {
      return i;
    }
  }
  
  // Fall back to main GPR column (column 1)
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i].toLowerCase();
    if (header === 'gpr' && i === 1) {
      return i;
    }
  }
  
  // Fall back to any GPR column
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i].toLowerCase();
    if (/^gpr$/.test(header)) {
      return i;
    }
  }
  
  // Default to first numeric column (skip date column)
  return 1;
}

// Module-level cache
let _cache: { t: number; data: { items: Array<{ key: string; label: string; deltaPct: number; value: number; timePeriod: string }>; asOf: string } } | null = null;

export async function GET() {
  try {
    // Check cache (24h)
    if (_cache && Date.now() - _cache.t < 24 * HOURS) {
      return NextResponse.json(_cache.data);
    }

    // Fetch Excel file (no Next.js cache due to 2MB+ size limit)
    const response = await fetch(GPR_URL);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch GPR data: ${response.status}`);
    }
    
    const buffer = await response.arrayBuffer();
    const workbook = xlsx.read(buffer, { type: "buffer" });
    
    // Find the appropriate sheet
    const sheet = findSheet(workbook);
    if (!sheet) {
      throw new Error("No suitable sheet found");
    }
    
    // Convert to JSON
    const jsonData = xlsx.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];
    
    if (jsonData.length < 2) {
      throw new Error("Insufficient data in sheet");
    }
    
    // Find header row (first non-empty row)
    let headerRow = 0;
    for (let i = 0; i < jsonData.length; i++) {
      if (jsonData[i] && jsonData[i].length > 0 && jsonData[i].some(cell => cell && String(cell).trim())) {
        headerRow = i;
        break;
      }
    }
    
    const headers = jsonData[headerRow].map((h: unknown) => String(h || "").trim());
    const dateCol = findDateColumn(headers);
    const gprCol = findGprColumn(headers);
    
    // Parse data rows
    const timeSeries: { date: string; value: number }[] = [];
    
    for (let i = headerRow + 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || row.length <= Math.max(dateCol, gprCol)) continue;
      
      const dateValue = row[dateCol];
      const valueValue = row[gprCol];
      
      if (dateValue === undefined || dateValue === null || valueValue === undefined || valueValue === null) continue;
      
      const date = parseDate(dateValue as string | number);
      const value = typeof valueValue === 'number' ? valueValue : parseFloat(String(valueValue));
      
      if (date && isFinite(value)) {
        timeSeries.push({ date, value });
      }
    }
    
    if (timeSeries.length < 2) {
      throw new Error("Insufficient valid data points");
    }
    
    // Sort by date
    timeSeries.sort((a, b) => a.date.localeCompare(b.date));
    
    // Get latest and previous values
    const latest = timeSeries[timeSeries.length - 1];
    const previous = timeSeries[timeSeries.length - 2];
    
    // Calculate delta percentage
    const deltaPct = Math.round(pct(latest.value, previous.value));
    
    // Calculate z-score using last 60 months (or all available if < 60)
    const values = timeSeries.map(d => d.value);
    const zScoreWindow = values.slice(-60);
    const z = zScore(latest.value, zScoreWindow);
    
    // Generate response
    const result = {
      key: "geopolitics",
      label: labelFromZ(z),
      deltaPct,
      value: Math.round(latest.value),
      timePeriod: "monthly",
      asOf: latest.date
    };
    
    // Cache result
    _cache = { t: Date.now(), data: { items: [result], asOf: new Date().toISOString() } };
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error("Geopolitics API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch geopolitics data";
    return NextResponse.json(
      { error: errorMessage },
      { status: 502 }
    );
  }
}
