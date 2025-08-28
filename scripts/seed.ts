import { devFileCache } from "../src/lib/cache";

function write(name: string, data: unknown) {
  devFileCache.write(name, data);
  console.log(`wrote tmp/${name}`);
}

const now = Date.now();

write("news:latest.json", {
  data: [
    { title: "Markets mixed as tech leads", url: "https://example.com/1", source: "Sample", summary: "Tech outperforms while energy lags.", polarity: 0.2 },
    { title: "Fed signals hold", url: "https://example.com/2", source: "Sample", summary: "Policy steady amid inflation cool-down.", polarity: 0.1 },
    { title: "Oil slides on supply glut", url: "https://example.com/3", source: "Sample", summary: "Crude falls as inventories build.", polarity: -0.1 },
  ],
  updatedAt: now,
});

write("quotes:AAPL,AMZN,GOOGL,MSFT,NVDA.json", {
  data: ["AAPL","MSFT","NVDA","AMZN","GOOGL"].map((s) => ({
    symbol: s,
    price: 100 + Math.random() * 50,
    change: (Math.random() - 0.5) * 2,
    changePercent: (Math.random() - 0.5) * 2,
    history: Array.from({ length: 30 }, () => 100 + Math.random() * 10),
    updatedAt: now,
  })),
  updatedAt: now,
});

write("deals:2024-01-01:2099-12-31.json", {
  data: [
    { announcedDate: "2025-01-15", acquirer: "Acquirer A", target: "Target A", valueUSD: 2500000000, offerType: "Cash", premiumPercent: 18, sector: "Tech", status: "Announced", sources: ["https://example.com"] },
    { announcedDate: "2025-02-20", acquirer: "Acquirer B", target: "Target B", valueUSD: 900000000, offerType: "Stock", premiumPercent: 10, sector: "Health", status: "Announced", sources: ["https://example.com"] },
  ],
  updatedAt: now,
});

write("form4:latest.json", {
  data: Array.from({ length: 8 }).map((_, i) => ({
    company: `Company ${i + 1}`,
    symbol: ["AAPL", "MSFT", "AMZN", "NVDA"][i % 4],
    ownerName: `Officer ${i + 1}`,
    ownerRole: ["CEO", "CFO", "Director"][i % 3],
    transactionCode: ["P", "S"][i % 2],
    shares: 1000 + i * 50,
    price: 100 + i,
    filingUrl: "https://www.sec.gov/",
    filingDate: new Date().toISOString().slice(0, 10),
  })),
  updatedAt: now,
});

write("sentiment:now.json", {
  data: { score: 55, inputs: { newsPolarity: 0.1, sectorBreadth: 0.6, advDeclRatio: null, putCallRatio: null }, updatedAt: now },
  updatedAt: now,
});


