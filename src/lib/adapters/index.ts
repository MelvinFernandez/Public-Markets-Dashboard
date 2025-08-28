import { LruCache, devFileCache } from "@/lib/cache";
import {
  DealItem,
  DealItemSchema,
  EarningsCalendarItem,
  EarningsCalendarItemSchema,
  EpsSurprise,
  EpsSurpriseSchema,
  Form4,
  Form4Schema,
  NewsItem,
  NewsItemSchema,
  Quote,
  QuoteSchema,
  SectorPrice,
  SectorPriceSchema,
  Sentiment,
  SentimentSchema,
} from "@/lib/schemas";

const FIVE_MINUTES = 5 * 60 * 1000;
const lru = new LruCache<unknown>(128);

const isDev = process.env.NODE_ENV !== "production";

// Utility to get cache with optional dev file store
async function getCached<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const mem = lru.get(key) as T | null;
  if (mem) return mem;
  if (isDev) {
    const file = devFileCache.read<unknown>(`${key}.json`);
    if (file) {
      const value = (file && typeof file === "object" && file !== null && "data" in (file as Record<string, unknown>))
        ? (file as Record<string, unknown>).data as T
        : (file as T);
      lru.set(key, value, FIVE_MINUTES);
      return value;
    }
  }
  const data = await loader();
  lru.set(key, data, FIVE_MINUTES);
  if (isDev) devFileCache.write(`${key}.json`, data);
  return data;
}

// Quotes & Prices (placeholder Yahoo/AlphaVantage)
export async function fetchQuotes(symbols: string[]): Promise<Quote[]> {
  return getCached<Quote[]>(`quotes:${symbols.sort().join(",")}`, async () => {
    // Placeholder: return synthetic data in dev
    const now = Date.now();
    return symbols.map((s) =>
      QuoteSchema.parse({
        symbol: s.toUpperCase(),
        price: 100 + Math.random() * 50,
        change: (Math.random() - 0.5) * 2,
        changePercent: (Math.random() - 0.5) * 2,
        history: Array.from({ length: 30 }, () => 100 + Math.random() * 10),
        updatedAt: now,
      })
    );
  });
}

// Earnings calendar & EPS
export async function fetchEarningsCalendar(from: string, to: string): Promise<EarningsCalendarItem[]> {
  return getCached(`earnings:${from}:${to}`, async () => {
    const sample: EarningsCalendarItem[] = [
      EarningsCalendarItemSchema.parse({ symbol: "AAPL", date: from, time: "amc" }),
      EarningsCalendarItemSchema.parse({ symbol: "MSFT", date: to, time: "bmo" }),
    ];
    return sample;
  });
}

export async function fetchEpsSurprises(symbol: string): Promise<EpsSurprise[]> {
  return getCached(`eps:${symbol}`, async () => {
    const seq = Array.from({ length: 8 }, (_, i) => i).map((i) => {
      const estimate = 1 + Math.random();
      const actual = estimate + (Math.random() - 0.5) * 0.2;
      return EpsSurpriseSchema.parse({ period: `Q${i + 1} 2023`, estimate, actual, surprise: actual - estimate });
    });
    return seq;
  });
}

// SEC Form 4
export async function fetchForm4Latest(): Promise<Form4[]> {
  return getCached("form4:latest", async () => {
    const rows: Form4[] = Array.from({ length: 10 }).map((_, i) =>
      Form4Schema.parse({
        company: `Company ${i + 1}`,
        symbol: ["AAPL", "MSFT", "AMZN", "NVDA"][i % 4],
        ownerName: `Officer ${i + 1}`,
        ownerRole: ["CEO", "CFO", "Director"][i % 3],
        transactionCode: ["P", "S"][i % 2],
        shares: 1000 + i * 50,
        price: 100 + i,
        filingUrl: "https://www.sec.gov/",
        filingDate: new Date().toISOString().slice(0, 10),
      })
    );
    return rows;
  });
}

// M&A Deals
export async function fetchDeals(from: string, to: string): Promise<DealItem[]> {
  return getCached(`deals:${from}:${to}`, async () => {
    return [
      DealItemSchema.parse({
        announcedDate: from,
        acquirer: "Acquirer A",
        target: "Target A",
        valueUSD: 2500000000,
        offerType: "Cash",
        premiumPercent: 18,
        sector: "Tech",
        status: "Announced",
        sources: ["https://www.example.com"],
      }),
    ];
  });
}

// Sector ETF prices
export async function fetchSectorPrices(symbols: string[]): Promise<SectorPrice[]> {
  return getCached(`sectors:${symbols.join(",")}`, async () => {
    const today = new Date();
    const series: SectorPrice[] = [];
    for (const s of symbols) {
      for (let i = 60; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        series.push(SectorPriceSchema.parse({ symbol: s, date: d.toISOString().slice(0, 10), close: 50 + Math.random() * 50 }));
      }
    }
    return series;
  });
}

// News
export async function fetchNews(): Promise<NewsItem[]> {
  return getCached("news:latest", async () => {
    return [
      NewsItemSchema.parse({ title: "Markets mixed as tech leads", url: "https://news.example.com/1", source: "Sample", summary: "Tech outperforms while energy lags.", polarity: 0.2 }),
      NewsItemSchema.parse({ title: "Fed hints at rate hold", url: "https://news.example.com/2", source: "Sample", summary: "Policy steady amid inflation cool-down.", polarity: 0.1 }),
      NewsItemSchema.parse({ title: "Oil slides on supply glut", url: "https://news.example.com/3", source: "Sample", summary: "Crude falls as inventories build.", polarity: -0.1 }),
    ];
  });
}

// Sentiment computation (simple)
export async function computeSentiment(): Promise<Sentiment> {
  return getCached("sentiment:now", async () => {
    const news = await fetchNews();
    const newsPolarity = news.reduce((a, n) => a + (n.polarity ?? 0), 0) / Math.max(1, news.length);
    const sectors = await fetchSectorPrices(["XLK", "XLF", "XLY", "XLE", "XLV", "XLI", "XLU", "XLB", "XLRE", "XLC"]);
    // compute sector breadth as fraction of sectors above 20-day avg
    const bySymbol = new Map<string, number[]>();
    for (const r of sectors) {
      const arr = bySymbol.get(r.symbol) ?? [];
      arr.push(r.close);
      bySymbol.set(r.symbol, arr);
    }
    let breadthCount = 0;
    for (const prices of bySymbol.values()) {
      const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
      const last = prices[prices.length - 1];
      if (last >= avg) breadthCount += 1;
    }
    const sectorBreadth = breadthCount / bySymbol.size; // 0..1
    const score = Math.round(((newsPolarity + 1) / 2) * 50 + sectorBreadth * 50);
    return SentimentSchema.parse({ score, inputs: { newsPolarity, sectorBreadth, advDeclRatio: null, putCallRatio: null }, updatedAt: Date.now() });
  });
}


