"use client";

import { useState } from "react";
import { DataCard } from "./DataCard";
import { FinancialChart } from "./FinancialChart";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, BarChart3, LineChart, PieChart } from "lucide-react";

interface MarketIndex {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  data: Array<{
    timestamp: number;
    close: number;
  }>;
}

interface MarketOverviewProps {
  indices: MarketIndex[];
  className?: string;
}

export function MarketOverview({ indices, className }: MarketOverviewProps) {
  const [viewMode, setViewMode] = useState<'charts' | 'table' | 'summary'>('charts');

  const formatPrice = (value: number) => `$${value.toFixed(2)}`;
  const formatChange = (change: number) => change >= 0 ? `+${change.toFixed(2)}` : change.toFixed(2);
  const formatVolume = (value: number) => {
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return value.toString();
  };

  const getMarketSentiment = () => {
    const positiveCount = indices.filter(index => index.change >= 0).length;
    const totalCount = indices.length;
    const sentiment = (positiveCount / totalCount) * 100;
    
    if (sentiment >= 70) return { label: "Bullish", color: "text-green-400", bg: "bg-green-400/20" };
    if (sentiment >= 40) return { label: "Neutral", color: "text-yellow-400", bg: "bg-yellow-400/20" };
    return { label: "Bearish", color: "text-red-400", bg: "bg-red-400/20" };
  };

  const marketSentiment = getMarketSentiment();

  return (
    <DataCard title="Market Overview" className={className}>
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'charts' | 'table' | 'summary')} className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="grid w-full grid-cols-3 bg-gray-800">
            <TabsTrigger value="charts" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Charts
            </TabsTrigger>
            <TabsTrigger value="table" className="flex items-center gap-2">
              <LineChart className="w-4 h-4" />
              Table
            </TabsTrigger>
            <TabsTrigger value="summary" className="flex items-center gap-2">
              <PieChart className="w-4 h-4" />
              Summary
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="charts" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {indices.map((index) => (
              <div key={index.symbol} className="bg-gray-800/30 rounded-lg p-3">
                <FinancialChart
                  data={index.data}
                  height={80}
                />
                <div className="mt-2 text-center">
                  <div className="text-sm font-medium text-white">{index.name}</div>
                  <div className="text-xs text-gray-400">{formatPrice(index.price)}</div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="table" className="space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 text-gray-400">Index</th>
                  <th className="text-right py-2 text-gray-400">Price</th>
                  <th className="text-right py-2 text-gray-400">Change</th>
                  <th className="text-right py-2 text-gray-400">%</th>
                  <th className="text-right py-2 text-gray-400">Volume</th>
                </tr>
              </thead>
              <tbody>
                {indices.map((index) => (
                  <tr key={index.symbol} className="border-b border-gray-700/30 hover:bg-gray-800/30">
                    <td className="py-2">
                      <div>
                        <div className="font-medium text-white">{index.symbol}</div>
                        <div className="text-xs text-gray-400">{index.name}</div>
                      </div>
                    </td>
                    <td className="text-right py-2 text-white font-medium">
                      {formatPrice(index.price)}
                    </td>
                    <td className="text-right py-2">
                      <span className={index.change >= 0 ? "text-green-400" : "text-red-400"}>
                        {formatChange(index.change)}
                      </span>
                    </td>
                    <td className="text-right py-2">
                      <span className={index.change >= 0 ? "text-green-400" : "text-red-400"}>
                        {index.change >= 0 ? '+' : ''}{index.changePercent.toFixed(2)}%
                      </span>
                    </td>
                    <td className="text-right py-2 text-gray-400">
                      {formatVolume(index.volume)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          {/* Market Sentiment */}
          <div className="bg-gray-800/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-white">Market Sentiment</h4>
              <Badge className={`${marketSentiment.bg} ${marketSentiment.color} border-0`}>
                {marketSentiment.label}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-400">
                  {indices.filter(i => i.change >= 0).length}
                </div>
                <div className="text-xs text-gray-400">Gainers</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-400">
                  {indices.filter(i => i.change < 0).length}
                </div>
                <div className="text-xs text-gray-400">Losers</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-400">
                  {indices.filter(i => i.change === 0).length}
                </div>
                <div className="text-xs text-gray-400">Unchanged</div>
              </div>
            </div>
          </div>

          {/* Performance Summary */}
          <div className="bg-gray-800/30 rounded-lg p-4">
            <h4 className="text-sm font-medium text-white mb-3">Performance Summary</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Best Performer</span>
                <span className="text-white">
                  {indices.reduce((best, current) => 
                    current.changePercent > best.changePercent ? current : best
                  ).symbol} ({indices.reduce((best, current) => 
                    current.changePercent > best.changePercent ? current : best
                  ).changePercent.toFixed(2)}%)
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Worst Performer</span>
                <span className="text-white">
                  {indices.reduce((worst, current) => 
                    current.changePercent < worst.changePercent ? current : worst
                  ).symbol} ({indices.reduce((worst, current) => 
                    current.changePercent < worst.changePercent ? current : worst
                  ).changePercent.toFixed(2)}%)
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Total Volume</span>
                <span className="text-white">
                  {formatVolume(indices.reduce((sum, index) => sum + index.volume, 0))}
                </span>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </DataCard>
  );
}

// Quick market stats component
export function QuickMarketStats({ indices }: { indices: MarketIndex[] }) {
  const totalChange = indices.reduce((sum, index) => sum + index.change, 0);
  const avgChangePercent = indices.reduce((sum, index) => sum + index.changePercent, 0) / indices.length;
  const isPositive = totalChange >= 0;

  return (
    <div className="flex items-center gap-4 p-3 bg-gray-800/30 rounded-lg">
      <div className="flex items-center gap-2">
        {isPositive ? (
          <TrendingUp className="w-5 h-5 text-green-400" />
        ) : (
          <TrendingDown className="w-5 h-5 text-red-400" />
        )}
        <span className="text-sm font-medium text-white">Market</span>
      </div>
      
      <div className="text-sm">
        <span className={isPositive ? "text-green-400" : "text-red-400"}>
          {isPositive ? '+' : ''}{totalChange.toFixed(2)}
        </span>
        <span className="text-gray-400 ml-1">
          ({isPositive ? '+' : ''}{avgChangePercent.toFixed(2)}%)
        </span>
      </div>
      
      <div className="text-xs text-gray-400">
        {indices.filter(i => i.change >= 0).length}/{indices.length} up
      </div>
    </div>
  );
}
