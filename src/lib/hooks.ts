"use client";

import { useQuery } from "@tanstack/react-query";
import { useUiStore } from "@/lib/store/ui";
import type {
  Quote,
  NewsItem,
  Sentiment,
  EarningsCalendarItem,
  EpsSurprise,
  Form4,
  DealItem,
  SectorPrice,
} from "@/lib/schemas";
import type { ApiResponse } from "@/lib/schemas";
import { useLastUpdatedStore } from "@/lib/store/lastUpdated";
import { useEffect, useState } from "react";
// FMP client removed; quotes now come from /api/quotes backed by yfinance

// Live data configuration
export interface LiveDataConfig {
  enabled: boolean;
  refreshInterval: number; // in milliseconds
  quotesInterval: number;
  newsInterval: number;
  sentimentInterval: number;
}

// Default live data configuration
export const defaultLiveConfig: LiveDataConfig = {
  enabled: true,
  refreshInterval: 30000, // 30 seconds
  quotesInterval: 15000,  // 15 seconds for quotes (more frequent)
  newsInterval: 60000,    // 1 minute for news
  sentimentInterval: 120000, // 2 minutes for sentiment
};

// Hook for managing live data configuration
export function useLiveDataConfig() {
  const [config, setConfig] = useState<LiveDataConfig>(defaultLiveConfig);
  
  const updateConfig = (updates: Partial<LiveDataConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };
  
  const toggleLiveData = () => {
    setConfig(prev => ({ ...prev, enabled: !prev.enabled }));
  };
  
  return { config, updateConfig, toggleLiveData };
}

async function json<T>(url: string): Promise<T> {
  const sep = url.includes("?") ? "&" : "?";
  const res = await fetch(`${url}${sep}_=${Date.now()}` as string, { cache: "no-store" });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return (await res.json()) as T;
}

export function useQuotes(symbols: string[], liveConfig?: LiveDataConfig) {
  const demo = useUiStore((s) => s.demoMode);
  const setUpdated = useLastUpdatedStore((s) => s.setUpdated);
  const config = liveConfig || defaultLiveConfig;
  const joined = (symbols || []).map((s) => s.trim().toUpperCase()).filter(Boolean).join(",");
  
  const q = useQuery<ApiResponse<Quote[]>>({
    queryKey: ["quotes", joined, demo],
    queryFn: () => json<ApiResponse<Quote[]>>(`/api/quotes?symbols=${joined}${demo ? "&demo=1" : ""}`),
    enabled: joined.length > 0,
    refetchInterval: config.enabled ? config.quotesInterval : false,
    refetchIntervalInBackground: true,
    staleTime: 0, // Always consider data stale to enable refetching
  });
  
  useEffect(() => {
    const ts = q.data?.updatedAt;
    if (ts) setUpdated("quotes", ts);
  }, [q.data, setUpdated]);
  
  return q;
}

export function useNews(liveConfig?: LiveDataConfig) {
  const demo = useUiStore((s) => s.demoMode);
  const setUpdated = useLastUpdatedStore((s) => s.setUpdated);
  const config = liveConfig || defaultLiveConfig;
  
  const q = useQuery<ApiResponse<NewsItem[]>>({ 
    queryKey: ["news", demo], 
    queryFn: () => json<ApiResponse<NewsItem[]>>(`/api/news${demo ? "?demo=1" : ""}`),
    refetchInterval: config.enabled ? config.newsInterval : false,
    refetchIntervalInBackground: true,
    staleTime: 0,
  });
  
  useEffect(() => {
    const ts = q.data?.updatedAt;
    if (ts) setUpdated("news", ts);
  }, [q.data, setUpdated]);
  
  return q;
}

export function useSentiment(liveConfig?: LiveDataConfig) {
  const demo = useUiStore((s) => s.demoMode);
  const setUpdated = useLastUpdatedStore((s) => s.setUpdated);
  const config = liveConfig || defaultLiveConfig;
  
  const q = useQuery<ApiResponse<Sentiment>>({ 
    queryKey: ["sentiment", demo], 
    queryFn: () => json<ApiResponse<Sentiment>>(`/api/sentiment${demo ? "?demo=1" : ""}`),
    refetchInterval: config.enabled ? config.sentimentInterval : false,
    refetchIntervalInBackground: true,
    staleTime: 0,
  });
  
  useEffect(() => {
    const ts = q.data?.updatedAt;
    if (ts) setUpdated("sentiment", ts);
  }, [q.data, setUpdated]);
  
  return q;
}

export function useEarningsCalendar(from: string, to: string) {
  const demo = useUiStore((s) => s.demoMode);
  const setUpdated = useLastUpdatedStore((s) => s.setUpdated);
  const q = useQuery<ApiResponse<EarningsCalendarItem[]>>({ queryKey: ["earnings", from, to, demo], queryFn: () => json<ApiResponse<EarningsCalendarItem[]>>(`/api/earnings?from=${from}&to=${to}${demo ? "&demo=1" : ""}`) });
  useEffect(() => {
    const ts = q.data?.updatedAt;
    if (ts) setUpdated("earnings", ts);
  }, [q.data, setUpdated]);
  return q;
}

export function useEps(symbol: string) {
  const demo = useUiStore((s) => s.demoMode);
  const setUpdated = useLastUpdatedStore((s) => s.setUpdated);
  const q = useQuery<ApiResponse<EpsSurprise[]>>({ queryKey: ["eps", symbol, demo], queryFn: () => json<ApiResponse<EpsSurprise[]>>(`/api/earnings?symbol=${symbol}${demo ? "&demo=1" : ""}`), enabled: !!symbol });
  useEffect(() => {
    const ts = q.data?.updatedAt;
    if (ts) setUpdated("eps", ts);
  }, [q.data, setUpdated]);
  return q;
}

export function useInsiders() {
  const demo = useUiStore((s) => s.demoMode);
  const setUpdated = useLastUpdatedStore((s) => s.setUpdated);
  const q = useQuery<ApiResponse<Form4[]>>({ queryKey: ["insiders", demo], queryFn: () => json<ApiResponse<Form4[]>>(`/api/insiders${demo ? "?demo=1" : ""}`) });
  useEffect(() => {
    const ts = q.data?.updatedAt;
    if (ts) setUpdated("insiders", ts);
  }, [q.data, setUpdated]);
  return q;
}

export function useDeals(from: string, to: string) {
  const demo = useUiStore((s) => s.demoMode);
  const setUpdated = useLastUpdatedStore((s) => s.setUpdated);
  const q = useQuery<ApiResponse<DealItem[]>>({ queryKey: ["deals", from, to, demo], queryFn: () => json<ApiResponse<DealItem[]>>(`/api/deals?from=${from}&to=${to}${demo ? "&demo=1" : ""}`) });
  useEffect(() => {
    const ts = q.data?.updatedAt;
    if (ts) setUpdated("deals", ts);
  }, [q.data, setUpdated]);
  return q;
}

export function useSectors() {
  const demo = useUiStore((s) => s.demoMode);
  const setUpdated = useLastUpdatedStore((s) => s.setUpdated);
  const q = useQuery<ApiResponse<SectorPrice[]>>({ queryKey: ["sectors", demo], queryFn: () => json<ApiResponse<SectorPrice[]>>(`/api/sectors${demo ? "?demo=1" : ""}`) });
  useEffect(() => {
    const ts = q.data?.updatedAt;
    if (ts) setUpdated("sectors", ts);
  }, [q.data, setUpdated]);
  return q;
}

// Hook for generating sample financial data
export function useSampleFinancialData() {
  const generateSampleData = (symbol: string, basePrice: number, volatility: number = 0.02) => {
    const now = Date.now();
    const data = [];
    let currentPrice = basePrice;
    
    // Generate 30 days of data
    for (let i = 29; i >= 0; i--) {
      const timestamp = now - (i * 24 * 60 * 60 * 1000);
      
      // Random price movement
      const change = (Math.random() - 0.5) * volatility * currentPrice;
      currentPrice = Math.max(currentPrice + change, basePrice * 0.5); // Prevent going below 50% of base
      
      const open = currentPrice - (Math.random() * volatility * currentPrice);
      const close = currentPrice;
      const high = Math.max(open, close) + (Math.random() * volatility * currentPrice);
      const low = Math.min(open, close) - (Math.random() * volatility * currentPrice);
      const volume = Math.floor(Math.random() * 10000000) + 1000000; // 1M to 11M
      
      data.push({
        timestamp,
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        volume
      });
    }
    
    return data;
  };

  const marketIndices = [
    {
      symbol: "SPY",
      name: "S&P 500 ETF",
      basePrice: 450.00,
      volatility: 0.015
    },
    {
      symbol: "QQQ",
      name: "NASDAQ-100 ETF",
      basePrice: 380.00,
      volatility: 0.020
    },
    {
      symbol: "IWM",
      name: "Russell 2000 ETF",
      basePrice: 180.00,
      volatility: 0.025
    },
    {
      symbol: "DIA",
      name: "Dow Jones ETF",
      basePrice: 350.00,
      volatility: 0.012
    },
    {
      symbol: "VTI",
      name: "Total Stock Market ETF",
      basePrice: 220.00,
      volatility: 0.018
    }
  ];

  const sectorETFs = [
    {
      symbol: "XLK",
      name: "Technology Select Sector",
      basePrice: 180.00,
      volatility: 0.025,
      sector: "Technology",
      weight: 0.28
    },
    {
      symbol: "XLF",
      name: "Financial Select Sector",
      basePrice: 35.00,
      volatility: 0.020,
      sector: "Financials",
      weight: 0.13
    },
    {
      symbol: "XLE",
      name: "Energy Select Sector",
      basePrice: 85.00,
      volatility: 0.030,
      sector: "Energy",
      weight: 0.04
    },
    {
      symbol: "XLV",
      name: "Healthcare Select Sector",
      basePrice: 130.00,
      volatility: 0.018,
      sector: "Healthcare",
      weight: 0.15
    },
    {
      symbol: "XLI",
      name: "Industrial Select Sector",
      basePrice: 110.00,
      volatility: 0.022,
      sector: "Industrials",
      weight: 0.09
    },
    {
      symbol: "XLP",
      name: "Consumer Staples Select Sector",
      basePrice: 70.00,
      volatility: 0.015,
      sector: "Consumer Staples",
      weight: 0.06
    },
    {
      symbol: "XLY",
      name: "Consumer Discretionary Select Sector",
      basePrice: 160.00,
      volatility: 0.025,
      sector: "Consumer Discretionary",
      weight: 0.12
    },
    {
      symbol: "XLU",
      name: "Utilities Select Sector",
      basePrice: 65.00,
      volatility: 0.018,
      sector: "Utilities",
      weight: 0.03
    },
    {
      symbol: "XLB",
      name: "Materials Select Sector",
      basePrice: 75.00,
      volatility: 0.022,
      sector: "Materials",
      weight: 0.02
    },
    {
      symbol: "XLRE",
      name: "Real Estate Select Sector",
      basePrice: 40.00,
      volatility: 0.020,
      sector: "Real Estate",
      weight: 0.03
    }
  ];

  const generateMarketData = () => {
    return marketIndices.map(index => {
      const data = generateSampleData(index.symbol, index.basePrice, index.volatility);
      const latest = data[data.length - 1];
      const previous = data[data.length - 2];
      const change = latest.close - previous.close;
      const changePercent = (change / previous.close) * 100;
      
      return {
        symbol: index.symbol,
        name: index.name,
        price: latest.close,
        change,
        changePercent,
        volume: latest.volume,
        data: data.map(d => ({ timestamp: d.timestamp, close: d.close }))
      };
    });
  };

  const generateSectorData = () => {
    return sectorETFs.map(etf => {
      const data = generateSampleData(etf.symbol, etf.basePrice, etf.volatility);
      const latest = data[data.length - 1];
      const previous = data[data.length - 2];
      const change = latest.close - previous.close;
      const changePercent = (change / previous.close) * 100;
      const marketCap = latest.close * (Math.random() * 1000000000 + 50000000000); // 50B to 1T
      
      return {
        symbol: etf.symbol,
        name: etf.name,
        price: latest.close,
        change,
        changePercent,
        volume: latest.volume,
        marketCap,
        data: data.map(d => ({ timestamp: d.timestamp, close: d.close })),
        sector: etf.sector,
        weight: etf.weight
      };
    });
  };

  return {
    generateMarketData,
    generateSectorData,
    generateSampleData
  };
}

// FMP-specific hooks removed; live data now provided by yfinance-backed routes where needed

// Utility functions removed - no longer used


