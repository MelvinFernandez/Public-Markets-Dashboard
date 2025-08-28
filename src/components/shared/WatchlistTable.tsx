"use client";

import { useEffect, useState } from "react";
import { useQuotes } from "@/lib/hooks";
import { MiniSparkline } from "./MiniSparkline";
import { COMPANY_NAMES } from "@/lib/companyNames";

interface WatchlistTableProps {
  symbols: string[];
  onChange?: (symbols: string[]) => void;
}

interface QuoteData {
  symbol: string;
  price?: number;
  change?: number;
  changePercent?: number;
  history?: number[];
}

export function WatchlistTable({ symbols, onChange }: WatchlistTableProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [companyNames, setCompanyNames] = useState<Record<string, string>>(COMPANY_NAMES);
  const quotes = useQuotes(symbols);
  const quoteData: QuoteData[] = (quotes.data as { data?: QuoteData[] } | undefined)?.data ?? symbols.map((s) => ({ symbol: s }));
  useEffect(() => { try { localStorage.setItem("watchlist", JSON.stringify(symbols)); } catch {} }, [symbols]);
  
  // Fetch company names for new symbols
  useEffect(() => {
    symbols.forEach(symbol => {
      if (!companyNames[symbol]) {
        fetchCompanyName(symbol);
      }
    });
  }, [symbols, companyNames]);
  
  // Function to fetch company name for unknown tickers
  const fetchCompanyName = async (symbol: string) => {
    try {
      const response = await fetch(`/api/company-name?symbol=${symbol}`);
      if (response.ok) {
        const data = await response.json();
        if (data.name) {
          setCompanyNames(prev => ({ ...prev, [symbol]: data.name }));
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch company name for ${symbol}:`, error);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await quotes.refetch();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="text-xs text-white/60 hover:text-white transition-colors"
        >
          {isLoading ? "Refreshing..." : "Refresh"}
        </button>
      </div>
      
      <div className="space-y-2">
        {quoteData.map((quote, idx) => (
          <div key={`${quote.symbol}-${idx}`} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
            <div className="flex items-center gap-3">
              <span className="font-medium text-white">{quote.symbol}</span>
              {companyNames[quote.symbol] && (
                <span className="text-xs text-white/60">{companyNames[quote.symbol]}</span>
              )}
              <span className="text-sm text-white/70">${quote.price?.toFixed(2) ?? "0.00"}</span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className={`text-sm ${(quote.change ?? 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {(quote.change ?? 0) >= 0 ? "+" : ""}{(quote.change ?? 0).toFixed(2)}
                </div>
                <div className="text-xs text-white/60">
                  {(quote.changePercent ?? 0) >= 0 ? "+" : ""}{(quote.changePercent ?? 0).toFixed(2)}%
                </div>
              </div>
              
              <div className="w-20 h-8">
                <MiniSparkline data={quote.history ?? []} />
              </div>
              {onChange && (
                <button onClick={() => onChange(symbols.filter(s => s !== quote.symbol))} className="text-xs text-white/50 hover:text-white">Remove</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
