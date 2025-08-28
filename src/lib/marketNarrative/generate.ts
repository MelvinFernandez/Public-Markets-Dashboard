import yahooFinance from 'yahoo-finance2';
import { 
  percent, 
  label,
  sectorNameFromETF, 
  calculateSectorBreadth, 
  NewsItem,
  scoreTags,
  getTopTags,
  generateWhyClause,
  INDEX_NAMES
} from './helpers';

// Thresholds for different asset types
const THRESH = {
  INDEX: 0.1,      // was 0.2 — color small moves
  SECTOR: 0.3,
  STOCK: 0.5,
  COMMODITY: 0.5,
  FX: 0.2,
  VOL: 3.0,        // VIX
  BOND_BPS: 2      // Treasuries, in basis points
} as const;

// Helper functions for formatting numbers
const pct = (last?: number, prev?: number) =>
  (Number.isFinite(last) && Number.isFinite(prev) && prev)
    ? Math.round(((last! - prev!) / Math.abs(prev!)) * 1000) / 10
    : 0;

const fmtPct = (p: number) => `${p >= 0 ? "+" : ""}${p.toFixed(1)}%`;

const bps = (curr?: number, prev?: number) =>
  (Number.isFinite(curr) && Number.isFinite(prev))
    ? Math.round((curr! - prev!) * 100)
    : 0;

const fmtBps = (b: number) => `${b >= 0 ? "+" : ""}${b} bps`;

const sentimentFor = (kind: keyof typeof THRESH, p: number) => {
  const t = THRESH[kind];
  return p >= t ? "UP" : p <= -t ? "DOWN" : "FLAT";   // inclusive
};

const token = (kind: keyof typeof THRESH, sym: string, label: string, p: number) =>
  `[[${sentimentFor(kind, p)}:${kind}:${sym}|${label}|${fmtPct(p)}]]`;

interface TickerData {
  last: number;
  prev: number;
  pct: number;
}

interface PolicyContext {
  label: string;
  tradeLabel: string;
  tradeDelta: number;
}

interface PolicyItem {
  key: string;
  label: string;
}

interface PoliticalData {
  items?: PolicyItem[];
}

interface TradeData {
  label?: string;
  deltaPct?: number;
}

interface StockMover {
  symbol: string;
  marketCap: number;
}

interface YahooFinanceQuote {
  regularMarketPrice?: number;
  postMarketPrice?: number;
  preMarketPrice?: number;
  regularMarketPreviousClose?: number;
}

interface BigPictureResult {
  asOf: string;
  tickers: Record<string, TickerData>;
  sectors: Record<string, number>;
  sectorBreadth: { count: number; percentage: number; total: number };
  factors: {
    mega_vs_equal: number;
    small_vs_spx: number;
    creditTone: number;
    dollarMove: number;
    vixMove: number;
  };
  headlines: NewsItem[];
  policy: PolicyContext;
  paragraphs: string[];
  text: string;
}

export async function generateBigPicture(): Promise<BigPictureResult> {
  const results: BigPictureResult = {
    asOf: new Date().toISOString(),
    tickers: {},
    sectors: {},
    sectorBreadth: { count: 0, percentage: 0, total: 0 },
    factors: {
      mega_vs_equal: 0,
      small_vs_spx: 0,
      creditTone: 0,
      dollarMove: 0,
      vixMove: 0
    },
    headlines: [],
    policy: { label: 'Medium', tradeLabel: 'Medium', tradeDelta: 0 },
    paragraphs: [],
    text: ''
  };

  // Define tickers to fetch
  const tickers = [
    // US indices
    '^GSPC', '^IXIC', '^DJI', '^RUT', 'RSP', 'SPY',
    // Sector ETFs
    'XLE', 'XLK', 'XLF', 'XLY', 'XLV', 'XLI', 'XLB', 'XLU', 'XLRE', 'XLC',
    // Global indices
    '^STOXX50E', '^FTSE', '^GDAXI', '^N225', '^HSI',
    // Vol/Rates/Credit proxy
    '^VIX', '^TNX', 'HYG', 'LQD',
    // FX & Commodities
    'DX-Y.NYB', 'GC=F', 'CL=F', 'NG=F', 'HG=F'
  ];

  // Fetch all ticker data in parallel
  const tickerPromises = tickers.map(async (ticker) => {
    try {
      const quote = await yahooFinance.quote(ticker);
      const last = quote.regularMarketPrice || quote.postMarketPrice || quote.preMarketPrice || 0;
      const prev = quote.regularMarketPreviousClose || last;
      const pct = percent(last, prev);
      
      return { ticker, data: { last, prev, pct } };
    } catch (error) {
      console.warn(`Failed to fetch ${ticker}:`, error);
      return null;
    }
  });

  const tickerResults = await Promise.allSettled(tickerPromises);
  
  // Process successful results
  tickerResults.forEach((result) => {
    if (result.status === 'fulfilled' && result.value) {
      const { ticker, data } = result.value;
      results.tickers[ticker] = data;
    }
  });

  // Get sector data
  const sectorETFs = ['XLE', 'XLK', 'XLF', 'XLY', 'XLV', 'XLI', 'XLB', 'XLU', 'XLRE', 'XLC'];
  sectorETFs.forEach(etf => {
    if (results.tickers[etf]) {
      results.sectors[etf] = results.tickers[etf].pct;
    }
  });

  // Calculate sector breadth
  results.sectorBreadth = calculateSectorBreadth(results.sectors);

  // Fetch headlines and policy context
  await Promise.allSettled([
    fetchHeadlines(results),
    fetchPolicyContext(results)
  ]);

  // Calculate factor metrics
  const spyData = results.tickers['SPY'];
  const rspData = results.tickers['RSP'];
  const rutData = results.tickers['^RUT'];
  const spxData = results.tickers['^GSPC'];
  const hygData = results.tickers['HYG'];
  const lqdData = results.tickers['LQD'];
  const dollarData = results.tickers['DX-Y.NYB'];
  const vixData = results.tickers['^VIX'];
  const tnxData = results.tickers['^TNX'];

  if (spyData && rspData) {
    results.factors.mega_vs_equal = spyData.pct - rspData.pct;
  }
  if (rutData && spxData) {
    results.factors.small_vs_spx = rutData.pct - spxData.pct;
  }
  if (hygData && lqdData) {
    results.factors.creditTone = hygData.pct - lqdData.pct;
  }
  if (dollarData) {
    results.factors.dollarMove = dollarData.pct;
  }
  if (vixData) {
    results.factors.vixMove = vixData.pct;
  }

  // Get movers from screeners
  try {
    const [mostActives, dayGainers, dayLosers] = await Promise.allSettled([
      yahooFinance.screener({ scrIds: 'most_actives' }),
      yahooFinance.screener({ scrIds: 'day_gainers' }),
      yahooFinance.screener({ scrIds: 'day_losers' })
    ]);

    const allMovers: StockMover[] = [];
    
    [mostActives, dayGainers, dayLosers].forEach((result) => {
      if (result.status === 'fulfilled' && result.value?.quotes) {
        allMovers.push(...result.value.quotes.map((quote: { symbol?: string; marketCap?: number }) => ({
          symbol: quote.symbol || '',
          marketCap: quote.marketCap || 0
        })));
      }
    });

    // Filter to US equities and get top movers by market cap
    const usMovers = allMovers
      .filter((stock: StockMover) => stock.symbol && !stock.symbol.includes('=') && !stock.symbol.startsWith('^'))
      .filter((stock: StockMover) => stock.marketCap && stock.marketCap > 10000000000) // > $10B market cap
      .sort((a: StockMover, b: StockMover) => (b.marketCap || 0) - (a.marketCap || 0))
      .slice(0, 10); // Top 10 by market cap

    // Fetch detailed data for movers
    const moverPromises = usMovers.map(async (stock: StockMover) => {
      try {
        const quote = await yahooFinance.quote(stock.symbol) as YahooFinanceQuote;
        const last = quote.regularMarketPrice || quote.postMarketPrice || quote.preMarketPrice || 0;
        const prev = quote.regularMarketPreviousClose || last;
        const pct = percent(last, prev);
        
        return { 
          symbol: stock.symbol, 
          data: { last, prev, pct },
          marketCap: stock.marketCap 
        };
      } catch {
        return null;
      }
    });

    const moverResults = await Promise.allSettled(moverPromises);
    moverResults.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        const { symbol, data } = result.value;
        results.tickers[symbol] = data;
      }
    });
  } catch {
    console.warn('Failed to fetch movers');
  }

  // Generate paragraphs with tokenized names
  const paragraphs: string[] = [];

  // P1: US tone with numbers (force tokens for indices)
  if (spxData) {
    const nasdaqData = results.tickers['^IXIC'];
    const marketTone = spxData.pct >= 0.4 ? 'edging higher' : spxData.pct <= -0.4 ? 'under pressure' : 'mixed';

    const spxP = pct(spxData.last, spxData.prev);
    const ixicP = nasdaqData ? pct(nasdaqData.last, nasdaqData.prev) : 0;

    const spxTok = token('INDEX', '^GSPC', 'S&P 500', spxP);
    const ixicTok = nasdaqData ? token('INDEX', '^IXIC', 'Nasdaq Composite', ixicP) : '';

    const verb = (spx: number, ixic: number) => {
      if (spx >= 0.1 || ixic >= 0.1) return 'up';
      if (spx <= -0.1 || ixic <= -0.1) return 'down';
      return 'little changed';
    };

    const usSentence = nasdaqData 
      ? `U.S. benchmarks like ${spxTok} and ${ixicTok} are ${verb(spxP, ixicP)}, with ${results.sectorBreadth.count}/10 sectors higher`
      : `U.S. benchmarks like ${spxTok} are ${spxP >= 0.1 ? 'up' : spxP <= -0.1 ? 'down' : 'little changed'}, with ${results.sectorBreadth.count}/10 sectors higher`;

    paragraphs.push(`The market is ${marketTone}. ${usSentence}.`);
  }

  // P2: Factor & global analysis
  const factorParagraphs: string[] = [];
  
  // Size factor analysis
  if (Math.abs(results.factors.mega_vs_equal) >= 0.3 || Math.abs(results.factors.small_vs_spx) >= 0.3) {
    if (rutData && spxData) {
      const rutPct = pct(rutData.last, rutData.prev);
      const spxPct = pct(spxData.last, spxData.prev);
      
      const rutToken = token('INDEX', '^RUT', 'Russell 2000', rutPct);
      const spxToken = token('INDEX', '^GSPC', 'S&P 500', spxPct);
      
      const leadership = results.factors.mega_vs_equal > 0 ? 'mega-caps' : 'equal-weight/SMID';
      factorParagraphs.push(`Leadership tilts toward ${leadership}; ${rutToken} vs ${spxToken}.`);
    }
  }

  // Global comparison
  const europeIndices = ['^STOXX50E', '^FTSE', '^GDAXI'].map(ticker => results.tickers[ticker]).filter(Boolean);
  const asiaIndices = ['^N225', '^HSI'].map(ticker => results.tickers[ticker]).filter(Boolean);

  if (europeIndices.length > 0 || asiaIndices.length > 0) {
    const europeAvg = europeIndices.reduce((sum, idx) => sum + idx.pct, 0) / europeIndices.length;
    const asiaAvg = asiaIndices.reduce((sum, idx) => sum + idx.pct, 0) / asiaIndices.length;

    // Compare absolute moves to decide which region to highlight
    if (Math.abs(europeAvg) > Math.abs(asiaAvg) && europeIndices.length > 0) {
      const topEurope = europeIndices.reduce((prev, current) => Math.abs(current.pct) > Math.abs(prev.pct) ? current : prev);
      const europeSymbol = topEurope === results.tickers['^STOXX50E'] ? '^STOXX50E' :
                          topEurope === results.tickers['^FTSE'] ? '^FTSE' : '^GDAXI';
      const europePct = pct(topEurope.last, topEurope.prev);
      const europeToken = token('INDEX', europeSymbol, INDEX_NAMES[europeSymbol] || europeSymbol, europePct);
      factorParagraphs.push(`Overseas, ${europeToken}`);
    } else if (asiaIndices.length > 0) {
      const topAsia = asiaIndices.reduce((prev, current) => Math.abs(current.pct) > Math.abs(prev.pct) ? current : prev);
      const asiaSymbol = topAsia === results.tickers['^N225'] ? '^N225' : '^HSI';
      const asiaPct = pct(topAsia.last, topAsia.prev);
      const asiaToken = token('INDEX', asiaSymbol, INDEX_NAMES[asiaSymbol] || asiaSymbol, asiaPct);
      factorParagraphs.push(`Overseas, ${asiaToken}`);
    }
  }

  if (factorParagraphs.length > 0) {
    paragraphs.push(factorParagraphs.join(' '));
  }

  // P3: Sector leaders/laggards with tokenized sector names
  const sectorEntries = Object.entries(results.sectors)
    .filter(([, pct]) => Math.abs(pct) >= 0.5)
    .sort(([, a], [, b]) => b - a);

  if (sectorEntries.length >= 2) {
    const leaders = sectorEntries.slice(0, 2);
    const laggards = sectorEntries.slice(-2).reverse();

    // Ensure no overlap between leaders and laggards
    const leaderEtfs = leaders.map(([etf]) => etf);
    const filteredLaggards = laggards.filter(([etf]) => !leaderEtfs.includes(etf));

    if (filteredLaggards.length > 0 || leaders.length > 0) {
      let sectorText = '';

      if (leaders.length > 0) {
        const leaderText = leaders.map(([etf]) => {
          const sectorName = sectorNameFromETF(etf);
          const sectorPct = pct(results.tickers[etf].last, results.tickers[etf].prev);
          const sectorToken = token('SECTOR', etf, sectorName, sectorPct);
          return sectorToken;
        }).join(', ');
        sectorText += `Strongest groups: ${leaderText}`;
      }

      if (filteredLaggards.length > 0) {
        const laggardText = filteredLaggards.map(([etf]) => {
          const sectorName = sectorNameFromETF(etf);
          const sectorPct = pct(results.tickers[etf].last, results.tickers[etf].prev);
          const sectorToken = token('SECTOR', etf, sectorName, sectorPct);
          return sectorToken;
        }).join(', ');
        sectorText += `${leaders.length > 0 ? '. Laggards: ' : 'Laggards: '}${laggardText}`;
      }

      paragraphs.push(`${sectorText}.`);
    }
  }

  // P4: Macro analysis (VIX, rates, credit, dollar)
  const macroParts: string[] = [];

  // VIX analysis
  if (Math.abs(results.factors.vixMove) >= 3) {
    const vixPct = pct(vixData?.last, vixData?.prev);
    const vixToken = token('VOL', '^VIX', 'VIX', vixPct);
    const vixVerb = results.factors.vixMove > 0 ? 'rose' : 'fell';
    macroParts.push(`volatility ${vixVerb} with ${vixToken}`);
  }

  // Rates analysis
  if (tnxData) {
    const tnxBps = bps(tnxData.last, tnxData.prev);
    if (Math.abs(tnxBps) >= 2) {
      // For yields, we need to handle the bps formatting manually since token() expects percentage
      const tnxMeta = fmtBps(tnxBps);
      const tnxSentiment = tnxBps > 0 ? 'UP' : tnxBps < 0 ? 'DOWN' : 'FLAT';
      const tnxToken = `[[${tnxSentiment}:BOND:^TNX|U.S. 10Y Treasury|${tnxMeta}]]`;
      macroParts.push(`Rates ${tnxBps > 0 ? 'rose' : 'fell'} as ${tnxToken}`);
    }
  }

  // Dollar analysis
  if (Math.abs(results.factors.dollarMove) >= 0.2) {
    const dollarPct = pct(dollarData?.last, dollarData?.prev);
    const dollarToken = token('FX', 'DX-Y.NYB', 'U.S. Dollar Index', dollarPct);
    const dollarTone = results.factors.dollarMove > 0 ? 'firmer' : 'softer';
    macroParts.push(`The ${dollarToken} suggests a ${dollarTone} dollar`);
  }

  if (macroParts.length > 0) {
    paragraphs.push(macroParts.join('. ') + '.');
  }

  // P5: Commodities with numbers
  const commodityData = [
    { symbol: 'CL=F', name: 'WTI Crude Oil' },
    { symbol: 'GC=F', name: 'Gold' },
    { symbol: 'HG=F', name: 'Copper' },
    { symbol: 'NG=F', name: 'U.S. Natural Gas' }
  ];

  const commodityParts: string[] = [];
  
  commodityData.forEach(({ symbol, name }) => {
    const data = results.tickers[symbol];
    if (data && Math.abs(data.pct) >= 0.5) {
      const commodityPct = pct(data.last, data.prev);
      const commodityToken = token('COMMODITY', symbol, name, commodityPct);
      commodityParts.push(commodityToken);
    }
  });

  if (commodityParts.length > 0) {
    paragraphs.push(commodityParts.join(', ') + '.');
  }

  // P6: Why (headline-driven)
  if (results.headlines.length > 0) {
    const tagScores = scoreTags(results.headlines);
    const topTags = getTopTags(tagScores, 2);
    const whyClause = generateWhyClause(topTags);
    
    if (whyClause) {
      paragraphs.push(`Drivers today: ${whyClause}.`);
    }
  }

  // P7 removed - no longer including policy backdrop

  results.paragraphs = paragraphs;
  results.text = paragraphs.join('\n\n');

  // Debug logging to verify tokenization
  console.log('=== BIG PICTURE DEBUG ===');
  console.log('P1:', paragraphs[0]);
  console.log('P2:', paragraphs[1]);
  console.log('P3:', paragraphs[2]);
  console.log('P4:', paragraphs[3]);
  console.log('P5:', paragraphs[4]);
  console.log('P6:', paragraphs[5]);
  console.log('========================');
  
  // Quick sanity check: before rendering, log a paragraph and confirm you see
  // [[UP:INDEX:^GSPC|S&P 500|+0.2%]] etc. If you see plain names, you're not emitting tokens.
  if (paragraphs[0]) {
    console.log('TOKEN CHECK - P1 contains tokens:', paragraphs[0].includes('[['));
    console.log('SAMPLE TOKENS:', paragraphs[0].match(/\[\[[^\]]+\]\]/g));
  }

  return results;
}

async function fetchHeadlines(results: BigPictureResult): Promise<void> {
  try {
    // For now, use mock headlines since news API is not available
    // TODO: Implement proper news fetching when API is available
    const mockHeadlines: NewsItem[] = [
      {
        title: "Fed signals potential rate cuts amid inflation concerns",
        source: "Reuters",
        time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        tags: ['FED', 'INFLATION']
      },
      {
        title: "Oil prices drop on inventory build and demand worries",
        source: "Bloomberg",
        time: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
        tags: ['OIL']
      },
      {
        title: "Nvidia earnings beat expectations, AI chip demand strong",
        source: "CNBC",
        time: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        tags: ['AI']
      }
    ];
    
    const allHeadlines = [...mockHeadlines];
    
    // Dedupe by title (case-insensitive)
    const seen = new Set<string>();
    const uniqueHeadlines = allHeadlines.filter(headline => {
      const key = headline.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    // Sort by recency and take most recent
    uniqueHeadlines.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    results.headlines = uniqueHeadlines.slice(0, 50);
    
  } catch {
    console.warn('Failed to fetch headlines');
    results.headlines = [];
  }
}

async function fetchPolicyContext(results: BigPictureResult): Promise<void> {
  try {
    const [politicalResponse, tradeResponse] = await Promise.allSettled([
      fetch('http://localhost:3000/api/political-pulse'),
      fetch('http://localhost:3000/api/trade-pulse')
    ]);
    
    let policyLabel = 'Medium';
    let tradeLabel = 'Medium';
    let tradeDelta = 0;
    
    if (politicalResponse.status === 'fulfilled' && politicalResponse.value.ok) {
      const politicalData = await politicalResponse.value.json() as PoliticalData;
      const policyItem = politicalData.items?.find((item: PolicyItem) => item.key === 'policy');
      if (policyItem) {
        policyLabel = policyItem.label;
      }
    }
    
    if (tradeResponse.status === 'fulfilled' && tradeResponse.value.ok) {
      const tradeData = await tradeResponse.value.json() as TradeData;
      tradeLabel = tradeData.label || 'Medium';
      tradeDelta = tradeData.deltaPct || 0;
    }
    
    results.policy = { label: policyLabel, tradeLabel, tradeDelta };
    
  } catch {
    console.warn('Failed to fetch policy context');
    results.policy = { label: 'Medium', tradeLabel: 'Medium', tradeDelta: 0 };
  }
}
