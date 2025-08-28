"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { DataCard } from "@/components/shared/DataCard";
import { SentimentCard } from "@/components/shared/SentimentCard";
import { FinancialChart } from "@/components/shared/FinancialChart";
import { PoliticalPulse } from "@/components/shared/PoliticalPulse";
import { WatchlistTable } from "@/components/shared/WatchlistTable";
import { TickerSearch } from "@/components/shared/TickerSearch";
import { MultiTickerSelector } from "@/components/shared/MultiTickerSelector";
import { MultiSeriesChart } from "@/components/shared/MultiSeriesChart";
import { BigPictureCard } from "@/components/shared/BigPictureCard";
// Live controls removed per request
import { PageTransition } from "@/components/shared/PageTransition";

export default function HomePage() {
  const defaultList = (process.env.NEXT_PUBLIC_DEFAULT_WATCHLIST ?? "AAPL,MSFT,NVDA,AMZN").split(",").map(s => s.trim()).filter(Boolean);
  const [watchlist, setWatchlist] = useState<string[]>(defaultList);

  // Live data configuration - commented out for now
  // const { config: liveConfig } = useLiveDataConfig();
  const [selectedStock, setSelectedStock] = useState<string>("AAPL");
  const [history, setHistory] = useState<{ timestamp: number; close: number }[]>([]);
  const [multiSeries, setMultiSeries] = useState<{ symbol: string; points: { ts: number; y: number }[] }[]>([]);
  const [range, setRange] = useState<"1D"|"1W"|"1M"|"1Y">("1M");

  const [isLoadingCharts, setIsLoadingCharts] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);
  
  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Load watchlist from localStorage after hydration
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("watchlist") || "null");
      if (Array.isArray(saved) && saved.every((s) => typeof s === 'string') && saved.length > 0) {
        setWatchlist(saved);
      }
    } catch {}
  }, []);

  // Sync selectedStock with watchlist after hydration
  useEffect(() => {
    if (watchlist.length > 0 && !watchlist.includes(selectedStock)) {
      setSelectedStock(watchlist[0]);
    }
  }, [watchlist, selectedStock]);
  
  // Memoize the range configuration to prevent recreation
  const rangeConfig = useMemo(() => {
    const map: Record<string,{r:string;i:string;days:number}> = { 
      "1D": { r: "1d", i: "5m", days: 1 }, 
      "1W": { r: "7d", i: "1h", days: 7 }, 
      "1M": { r: "30d", i: "1d", days: 30 }, 
      "1Y": { r: "365d", i: "1d", days: 365 } 
    };
    return map[range];
  }, [range]);

  // Fetch data function with stable dependencies
  const fetchChartData = useCallback(async () => {
    if (!rangeConfig) return;
    
    setIsLoadingCharts(true);
    try {
      // Fetch single stock data - force refresh for all ranges to get current data
      const forceParam = "&force=true";
      const res = await fetch(`/api/ohlc?ticker=${selectedStock}&range=${rangeConfig.r}&interval=${rangeConfig.i}${forceParam}`, { cache: "no-store" });
      const json = await res.json();
      const rows = (json.data || []).map((d: { t: number; c: number }) => ({ timestamp: d.t, close: Number(d.c.toFixed(2)) }));
      setHistory(rows);
      
      // Fetch multi-series data for watchlist - force refresh for all ranges
      const all = await Promise.all(
        watchlist.map(async (sym) => {
          const r = await fetch(`/api/ohlc?ticker=${sym}&range=${rangeConfig.r}&interval=${rangeConfig.i}${forceParam}`, { cache: "no-store" });
          const j = await r.json();
          const pts = (j.data || []).map((d: { t: number; c: number }) => ({ ts: d.t, y: Number(d.c.toFixed(2)) }));
          return { symbol: sym, points: pts };
        })
      );
      setMultiSeries(all);

    } catch (e) {
      console.error('Failed to fetch chart data:', e);
      setHistory([]);
      setMultiSeries([]);
    } finally {
      setIsLoadingCharts(false);
    }
  }, [selectedStock, rangeConfig, watchlist]);

  useEffect(() => {
    const timeoutId = setTimeout(fetchChartData, 300); // 300ms debounce to prevent rapid calls
    return () => clearTimeout(timeoutId);
  }, [fetchChartData]);
  
  // FMP hooks removed; using yfinance-backed quotes and our existing news/sentiment
  
  // Data hooks with live configuration - commented out for now
  // const news = useNews(liveConfig);
  // const sentiment = useSentiment(liveConfig);
  // const quotes = useQuotes(watchlist, liveConfig);

  // Removed FMP polling effects

  // Memoized handlers to prevent unnecessary re-renders
  const handleWatchlistChange = useCallback((arr: string[]) => {
    // Prevent empty watchlist
    if (arr.length === 0) {
      return;
    }
    
    setWatchlist(arr);
    
    // Only update selectedStock if current selection is not in the new list
    if (!arr.includes(selectedStock)) {
      setSelectedStock(arr[0]);
    }
  }, [selectedStock]);

  const handleTickerSelect = useCallback((s: string) => {
    const sym = s.toUpperCase();
    setWatchlist((w) => Array.from(new Set([...w, sym])));
    setSelectedStock(sym);
  }, []);

  const handleReset = useCallback(() => {
    setWatchlist(defaultList);
    setSelectedStock(defaultList[0] || "AAPL");
  }, [defaultList]);

  const handleWatchlistTableChange = useCallback((arr: string[]) => {
    setWatchlist(arr);
  }, []);





  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-pulse text-white/60">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container-page no-top-gap">
      <PageTransition>
        {/* Live controls removed */}

        {/* Quick Market Stats removed with FMP hooks */}

        <div className="grid grid-cols-1 xl:grid-cols-16 gap-4 auto-rows-max">
          {/* Left column: chart + watchlist */}
          <div className="xl:col-span-8 space-y-4">
            <DataCard title="Performance" className="">
              <div className="mb-3 flex items-center justify-between">
                <MultiTickerSelector value={watchlist} onChange={handleWatchlistChange} />

              </div>
              
              {/* Chart Range Buttons */}
              <div className="mb-3 flex items-center gap-1">
                {(["1D", "1W", "1M", "1Y"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                      range === r
                        ? "bg-blue-600 text-white shadow-lg"
                        : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white/90"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              
              {isLoadingCharts ? (
                <div className="flex items-center justify-center h-[280px] text-white/60">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="ml-2">Loading chart data...</span>
                </div>
              ) : multiSeries.length > 1 ? (
                <MultiSeriesChart series={multiSeries} range={range} />
              ) : multiSeries.length === 1 ? (
                <FinancialChart data={multiSeries[0].points.map(p => ({ timestamp: p.ts, close: p.y }))} height={280} range={range} />
              ) : (
                <FinancialChart data={history} height={280} range={range} />
              )}
            </DataCard>
            {/* Watchlist */}
            <DataCard 
              title="Watchlist" 
              className=""
            >
              <div className="flex items-center justify-between mb-3">
                <TickerSearch onSelect={handleTickerSelect} />
                <button className="text-xs text-white/60 hover:text-white" onClick={handleReset}>Reset</button>
              </div>
              <WatchlistTable symbols={watchlist} onChange={handleWatchlistTableChange} />
              
            </DataCard>
          </div>

          {/* Middle column: sentiment and news */}
          <div className="xl:col-span-4 space-y-4">
            {/* Sentiment */}
            <DataCard 
              title="Sentiment" 
              className="min-h-[280px]"
            >
              <SentimentCard ticker={selectedStock} watchlist={watchlist} />
            </DataCard>

            {/* News - Hidden for now */}
            {/* <DataCard 
              title="Top News" 
              className=""
            >
              {newsItems.length > 0 ? (
                <NewsList items={newsItems} />
              ) : (
                <div className="p-4 text-center text-white/60">No news available</div>
              )}
              
              
            </DataCard> */}
          </div>

          {/* Right column: big picture and political */}
          <div className="xl:col-span-4 space-y-4">

            {/* Political Pulse */}
            <DataCard className="min-h-[280px]">
              <PoliticalPulse />
            </DataCard>

            {/* Big Picture */}
            <DataCard className="min-h-[280px]">
              <BigPictureCard className="" />
            </DataCard>
          </div>
        </div>
      </PageTransition>
    </div>
  );
}


