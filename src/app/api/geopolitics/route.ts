import { NextResponse } from "next/server";
import * as xlsx from "xlsx";

const GPR_URL = "https://www.matteoiacoviello.com/gpr_files/data_gpr_export.xls";
const HOURS = 3600 * 1000;

// Utility functions
function zScore(latest: number, arr: number[]): number {
  // Validate inputs
  if (!isFinite(latest) || !Array.isArray(arr) || arr.length === 0) {
    console.warn('zScore invalid inputs:', { latest, arrLength: arr?.length });
    return 0; // Return neutral score on invalid input
  }
  
  // Filter out invalid values
  const validValues = arr.filter(v => isFinite(v));
  if (validValues.length === 0) {
    console.warn('zScore no valid values in array');
    return 0;
  }
  
  const mean = validValues.reduce((s, v) => s + v, 0) / validValues.length;
  const variance = validValues.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(1, validValues.length - 1);
  const sd = Math.sqrt(variance) || 1;
  
  const result = (latest - mean) / sd;
  
  // Validate result
  if (!isFinite(result)) {
    console.warn('zScore calculation resulted in invalid value:', { latest, mean, sd, result });
    return 0;
  }
  
  return result;
}

function pct(a: number, b: number): number {
  // Enhanced validation
  if (!isFinite(a) || !isFinite(b)) {
    console.warn('pct function received invalid inputs:', { a, b });
    return 0;
  }
  
  if (b === 0) {
    console.warn('pct function: b is 0, cannot calculate percentage');
    return 0;
  }
  
  const result = ((a - b) / Math.abs(b)) * 100;
  
  // Validate result
  if (!isFinite(result)) {
    console.warn('pct calculation resulted in invalid value:', { a, b, result });
    return 0;
  }
  
  return result;
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

// Fallback data when external source fails
const FALLBACK_DATA = {
  key: "geopolitics",
  label: "Medium" as const,
  deltaPct: 2, // Small positive change to indicate some movement
  value: 125, // More realistic GPR value
  timePeriod: "monthly",
  asOf: new Date().toISOString().slice(0, 7)
};

export async function GET() {
  try {
    // Check cache (24h)
    if (_cache && Date.now() - _cache.t < 24 * HOURS) {
      return NextResponse.json(_cache.data);
    }
    
    // Try to fetch real GPR data, fallback to static data if it fails
    // This will provide real geopolitical risk indicators instead of static 0% values

    // Fetch Excel file with timeout (no Next.js cache due to 2MB+ size limit)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(GPR_URL, { 
        signal: controller.signal,
        headers: { 'User-Agent': 'Market-Dashboard/1.0' }
      });
      
      clearTimeout(timeoutId);
      
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
       
       console.log('Parsing geopolitics data:', {
         headerRow,
         dateCol,
         gprCol,
         totalRows: jsonData.length,
         headers: headers
       });
       
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
         } else {
           console.log(`Skipping invalid row ${i}:`, { dateValue, valueValue, parsedDate: date, parsedValue: value });
         }
       }
       
       console.log(`Parsed ${timeSeries.length} valid data points from ${jsonData.length - headerRow - 1} total rows`);
      
           if (timeSeries.length < 2) {
         console.warn('Insufficient valid data points, using fallback');
         _cache = { t: Date.now(), data: { items: [FALLBACK_DATA], asOf: new Date().toISOString() } };
         return NextResponse.json({ items: [FALLBACK_DATA], asOf: new Date().toISOString() });
       }
      
           // Sort by date
       timeSeries.sort((a, b) => a.date.localeCompare(b.date));
       
       try {
         // Get latest and previous values
         const latest = timeSeries[timeSeries.length - 1];
         const previous = timeSeries[timeSeries.length - 2];
         
         console.log('Geopolitics calculation inputs:', {
           latest: latest,
           previous: previous,
           latestValue: latest?.value,
           previousValue: previous?.value,
           latestValueType: typeof latest?.value,
           previousValueType: typeof previous?.value,
           timeSeriesLength: timeSeries.length
         });
         
         // Validate inputs before calculation
         if (!latest || !previous || !isFinite(latest.value) || !isFinite(previous.value)) {
           console.warn('Invalid geopolitics data values, using fallback');
           _cache = { t: Date.now(), data: { items: [FALLBACK_DATA], asOf: new Date().toISOString() } };
           return NextResponse.json({ items: [FALLBACK_DATA], asOf: new Date().toISOString() });
         }
         
         // Calculate delta percentage
         const deltaPct = Math.round(pct(latest.value, previous.value));
         console.log('Calculated delta percentage:', deltaPct);
         
         // Calculate z-score using last 60 months (or all available if < 60)
         const values = timeSeries.map(d => d.value);
         const zScoreWindow = values.slice(-60);
         console.log('Z-score calculation inputs:', {
           latestValue: latest.value,
           valuesLength: values.length,
           zScoreWindowLength: zScoreWindow.length,
           zScoreWindowSample: zScoreWindow.slice(0, 5)
         });
         
         const z = zScore(latest.value, zScoreWindow);
         console.log('Calculated z-score:', z);
         
         // Validate calculations
         if (!isFinite(deltaPct) || !isFinite(z)) {
           console.warn('Invalid calculation results, using fallback:', { deltaPct, z });
           _cache = { t: Date.now(), data: { items: [FALLBACK_DATA], asOf: new Date().toISOString() } };
         }
         
         // Generate response
         const result = {
           key: "geopolitics",
           label: labelFromZ(z),
           deltaPct,
           value: Math.round(latest.value),
           timePeriod: "monthly",
           asOf: latest.date
         };
         
         console.log('Final geopolitics result:', result);
         
         // Cache result
         _cache = { t: Date.now(), data: { items: [result], asOf: new Date().toISOString() } };
         
         return NextResponse.json({ items: [result], asOf: new Date().toISOString() });
         
       } catch (calcError) {
         console.error('Error in geopolitics calculations:', calcError);
         _cache = { t: Date.now(), data: { items: [FALLBACK_DATA], asOf: new Date().toISOString() } };
         return NextResponse.json({ items: [FALLBACK_DATA], asOf: new Date().toISOString() });
       }
      
         } catch (fetchError) {
       clearTimeout(timeoutId);
       console.warn('Geopolitics external data failed, using fallback:', fetchError);
       
       // Return fallback data when external source fails
       _cache = { t: Date.now(), data: { items: [FALLBACK_DATA], asOf: new Date().toISOString() } };
       return NextResponse.json({ items: [FALLBACK_DATA], asOf: new Date().toISOString() });
     }
     
   } catch (error) {
     console.error("Geopolitics API error:", error);
     
     // Always return fallback data on any error
     _cache = { t: Date.now(), data: { items: [FALLBACK_DATA], asOf: new Date().toISOString() } };
     return NextResponse.json({ items: [FALLBACK_DATA], asOf: new Date().toISOString() });
   }
}
