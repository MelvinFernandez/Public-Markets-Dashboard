import yahooFinance from 'yahoo-finance2';

// Percent & Arrow helpers
export function percent(last?: number, prev?: number): number {
  if (!Number.isFinite(last) || !Number.isFinite(prev) || !prev || last === undefined) return 0;
  return Math.round(((last - prev) / Math.abs(prev)) * 1000) / 10; // one decimal
}

export function arrow(pct: number, assetType: 'index' | 'vix' | 'commodity' = 'index'): string {
  let threshold = 0.2;
  if (assetType === 'vix') threshold = 3;
  if (assetType === 'commodity') threshold = 0.5;
  
  if (pct > threshold) return '<span class="text-green-400">▲</span>';
  if (pct < -threshold) return '<span class="text-red-400">▼</span>';
  return "";
}

export function bps(currYield: number, prevYield: number): number {
  if (!Number.isFinite(currYield) || !Number.isFinite(prevYield)) return 0;
  return Math.round((currYield - prevYield) * 100);
}

export function label(entity: string, pct: number, assetType: 'index' | 'vix' | 'commodity' | 'yield' = 'index'): string {
  const name = INDEX_NAMES[entity] || entity;
  
  if (assetType === 'yield') {
    const bpsChange = bps(pct, 0); // Assuming we have prev yield separately
    const sign = bpsChange >= 0 ? '+' : '';
    return `${name} (${sign}${bpsChange} bps)`;
  }
  
  const arrowSymbol = arrow(pct, assetType);
  const sign = pct >= 0 ? '+' : '';
  const formattedPct = `${sign}${pct.toFixed(1)}%`;
  
  if (arrowSymbol) {
    return `${arrowSymbol} ${name} (${formattedPct})`;
  } else {
    return `${name} (${formattedPct})`;
  }
}

// Sector mapping
export const SECTOR_MAP: Record<string, string> = {
  'XLE': 'Energy',
  'XLK': 'Technology',
  'XLF': 'Financials',
  'XLY': 'Consumer Discretionary',
  'XLV': 'Health Care',
  'XLI': 'Industrials',
  'XLB': 'Materials',
  'XLU': 'Utilities',
  'XLRE': 'Real Estate',
  'XLC': 'Communication Services'
};

export function sectorNameFromETF(symbol: string): string {
  return SECTOR_MAP[symbol] ?? symbol;
}

// Index name mapping
export const INDEX_NAMES: Record<string, string> = {
  '^GSPC': 'S&P 500',
  '^IXIC': 'Nasdaq Composite',
  '^DJI': 'Dow Jones Industrial Average',
  '^RUT': 'Russell 2000',
  '^STOXX50E': 'Euro Stoxx 50',
  '^FTSE': 'FTSE 100',
  '^GDAXI': 'DAX',
  '^N225': 'Nikkei 225',
  '^HSI': 'Hang Seng Index',
  '^VIX': 'VIX Volatility Index',
  '^TNX': '10-Year Treasury Yield',
  'DX-Y.NYB': 'U.S. Dollar Index',
  'GC=F': 'Gold Futures',
  'CL=F': 'WTI Crude Oil'
};

// Memoized name cache to avoid repeated API calls
const nameCache = new Map<string, string>();

export async function displayName(symbol: string): Promise<string> {
  // Check cache first
  if (nameCache.has(symbol)) {
    return nameCache.get(symbol)!;
  }

  // Check static mappings first
  if (INDEX_NAMES[symbol]) {
    const name = INDEX_NAMES[symbol];
    nameCache.set(symbol, name);
    return name;
  }

  // Try to fetch from Yahoo Finance
  try {
    const quote = await yahooFinance.quote(symbol);
    const name = quote.longName || (quote as { displayName?: string }).displayName || quote.shortName || symbol;
    const finalName = name.toString();

    // Cache the result
    nameCache.set(symbol, finalName);
    return finalName;
  } catch (error) {
    console.warn(`Failed to get name for ${symbol}:`, error);
    // Cache the symbol as fallback
    nameCache.set(symbol, symbol);
    return symbol;
  }
}

// Calculate sector breadth (percentage of sectors with positive returns)
export function calculateSectorBreadth(sectors: Record<string, number>): { count: number; percentage: number; total: number } {
  const sectorEntries = Object.values(sectors);
  const positiveCount = sectorEntries.filter(pct => pct > 0).length;
  const total = sectorEntries.length;
  const percentage = Math.round((positiveCount / total) * 100);

  return { count: positiveCount, percentage, total };
}

// Format market movement description
export function describeMovement(pct: number): string {
  if (pct > 1.5) return 'surging strongly';
  if (pct > 0.8) return 'climbing steadily';
  if (pct > 0.2) return 'edging higher';
  if (pct < -1.5) return 'plunging sharply';
  if (pct < -0.8) return 'falling steadily';
  if (pct < -0.2) return 'slipping lower';
  return 'little changed';
}

// Get tone description for market
export function getMarketTone(spxPct: number): string {
  if (spxPct >= 1.5) return 'charging ahead with strong momentum';
  if (spxPct >= 0.8) return 'showing solid upward movement';
  if (spxPct >= 0.2) return 'gaining modest ground';
  if (spxPct <= -1.5) return 'under significant pressure';
  if (spxPct <= -0.8) return 'facing notable headwinds';
  if (spxPct <= -0.2) return 'experiencing mild weakness';
  return 'holding steady in a balanced market';
}

// News tagging system
export interface NewsItem {
  title: string;
  source: string;
  time: string;
  tags: string[];
}

const NEWS_TAG_PATTERNS = {
  FED: /(fed|fomc|powell|rate|dot plot|hike|cut)/i,
  INFLATION: /(cpi|ppi|inflation|prices)/i,
  JOBS: /(nonfarm|payrolls|unemployment|jobless claims)/i,
  OIL: /(opec|saudi|inventory|barrel|crude|oil)/i,
  AI: /(ai|chip|semiconductor|nvda|nvidia|tsmc|amd|arm)/i,
  CHINA: /(china|beijing|tariff)/i,
  POLITICS: /(white house|congress|tariff|election|sanction|geopolitical|ukraine|gaza|iran)/i
};

export function tagHeadline(title: string): string[] {
  const tags: string[] = [];
  const lowerTitle = title.toLowerCase();
  
  for (const [tag, pattern] of Object.entries(NEWS_TAG_PATTERNS)) {
    if (pattern.test(lowerTitle)) {
      tags.push(tag);
    }
  }
  
  return tags;
}

export function scoreTags(headlines: NewsItem[]): Record<string, number> {
  const tagScores: Record<string, number> = {};
  const now = Date.now();
  const halfLife = 24 * 60 * 60 * 1000; // 24 hours in ms
  
  for (const headline of headlines) {
    const age = now - new Date(headline.time).getTime();
    const recencyWeight = Math.exp(-age / halfLife);
    
    for (const tag of headline.tags) {
      tagScores[tag] = (tagScores[tag] || 0) + recencyWeight;
    }
  }
  
  return tagScores;
}

export function getTopTags(tagScores: Record<string, number>, limit: number = 3): string[] {
  return Object.entries(tagScores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([tag]) => tag);
}

export function generateWhyClause(topTags: string[]): string {
  const tagPhrases: Record<string, string> = {
    FED: 'Fed-cut hopes after soft CPI',
    INFLATION: 'inflation data driving sentiment',
    JOBS: 'jobs data supporting rate outlook',
    OIL: 'oil drops on inventory build',
    AI: 'chip optimism into Nvidia earnings',
    CHINA: 'China growth jitters',
    POLITICS: 'tariff headlines'
  };
  
  const phrases = topTags.map(tag => tagPhrases[tag] || tag.toLowerCase()).slice(0, 2);
  return phrases.join(', ');
}
