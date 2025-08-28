"use client";

import { useState, useMemo } from "react";
import { DataCard } from "./DataCard";
import { FinancialChart } from "./FinancialChart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";
import { BarChart3, List, Award } from "lucide-react";

interface SectorData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  data: Array<{
    timestamp: number;
    close: number;
  }>;
  sector: string;
  weight: number;
}

interface SectorTooltipPayload {
  payload: {
    name: string;
    performance: number;
    volume: number;
    marketCap: number;
  };
}

interface SectorPerformanceProps {
  sectors: SectorData[];
  className?: string;
}

export function SectorPerformance({ sectors, className }: SectorPerformanceProps) {
  const [viewMode, setViewMode] = useState<'charts' | 'bars' | 'ranking'>('charts');

  const formatPrice = (value: number) => `$${value.toFixed(2)}`;
  const formatChange = (change: number) => change >= 0 ? `+${change.toFixed(2)}` : change.toFixed(2);
  const formatVolume = (value: number) => {
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return value.toString();
  };

  const formatMarketCap = (value: number) => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    return `$${value.toFixed(0)}`;
  };

  // Sort sectors by performance
  const sortedSectors = useMemo(() => {
    return [...sectors].sort((a, b) => b.changePercent - a.changePercent);
  }, [sectors]);

  // Prepare data for bar chart
  const barChartData = useMemo(() => {
    return sortedSectors.map(sector => ({
      name: sector.symbol,
      performance: sector.changePercent,
      volume: sector.volume / 1e6, // Convert to millions
      marketCap: sector.marketCap / 1e9, // Convert to billions
    }));
  }, [sortedSectors]);

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: SectorTooltipPayload[]; label?: string }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg">
          <div className="text-white font-medium">{label}</div>
          <div className="text-gray-300 text-sm space-y-1">
            <div>Performance: {data.performance.toFixed(2)}%</div>
            <div>Volume: {data.volume.toFixed(1)}M</div>
            <div>Market Cap: ${data.marketCap.toFixed(1)}B</div>
          </div>
        </div>
      );
    }
    return null;
  };

  const getPerformanceColor = (changePercent: number) => {
    if (changePercent >= 2) return "#10B981"; // Green
    if (changePercent >= 0) return "#F59E0B"; // Yellow
    if (changePercent >= -2) return "#EF4444"; // Red
    return "#6B7280"; // Gray
  };

  return (
    <DataCard title="Sector Performance" className={className}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'charts' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('charts')}
            className="h-8 px-3"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Charts
          </Button>
          <Button
            variant={viewMode === 'bars' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('bars')}
            className="h-8 px-3"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Bars
          </Button>
          <Button
            variant={viewMode === 'ranking' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('ranking')}
            className="h-8 px-3"
          >
            <List className="w-4 h-4 mr-2" />
            Ranking
          </Button>
        </div>
      </div>

      {viewMode === 'charts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedSectors.slice(0, 8).map((sector, index) => (
            <div key={sector.symbol} className="bg-gray-800/30 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {index < 3 && (
                    <Award className={`w-4 h-4 ${
                      index === 0 ? 'text-yellow-400' : 
                      index === 1 ? 'text-gray-400' : 'text-amber-600'
                    }`} />
                  )}
                  <span className="text-sm font-medium text-white">{sector.symbol}</span>
                </div>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${
                    sector.changePercent >= 0 ? 'border-green-500/20 text-green-400' : 'border-red-500/20 text-red-400'
                  }`}
                >
                  {sector.changePercent >= 0 ? '+' : ''}{sector.changePercent.toFixed(2)}%
                </Badge>
              </div>
              
              <FinancialChart
                data={sector.data}
                height={60}
              />
              
              <div className="mt-2 text-center text-xs text-gray-400">
                {formatPrice(sector.price)} • Vol: {formatVolume(sector.volume)}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewMode === 'bars' && (
        <div className="space-y-4">
          <div className="bg-gray-800/30 rounded-lg p-4" style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis 
                  dataKey="name" 
                  stroke="#9CA3AF" 
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  stroke="#9CA3AF" 
                  fontSize={12}
                  tickFormatter={(value) => `${value.toFixed(1)}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                
                <Bar dataKey="performance" radius={[4, 4, 0, 0]}>
                  {barChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getPerformanceColor(entry.performance)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="text-xs text-gray-400 text-center">
            Performance by Sector (Top 8)
          </div>
        </div>
      )}

      {viewMode === 'ranking' && (
        <div className="space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 text-gray-400">Rank</th>
                  <th className="text-left py-2 text-gray-400">Sector</th>
                  <th className="text-right py-2 text-gray-400">Price</th>
                  <th className="text-right py-2 text-gray-400">Change</th>
                  <th className="text-right py-2 text-gray-400">%</th>
                  <th className="text-right py-2 text-gray-400">Market Cap</th>
                </tr>
              </thead>
              <tbody>
                {sortedSectors.map((sector, index) => (
                  <tr key={sector.symbol} className="border-b border-gray-700/30 hover:bg-gray-800/30">
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        {index < 3 && (
                          <Award className={`w-4 h-4 ${
                            index === 0 ? 'text-yellow-400' : 
                            index === 1 ? 'text-gray-400' : 'text-amber-600'
                          }`} />
                        )}
                        <span className="text-gray-400">#{index + 1}</span>
                      </div>
                    </td>
                    <td className="py-2">
                      <div>
                        <div className="font-medium text-white">{sector.symbol}</div>
                        <div className="text-xs text-gray-400">{sector.name}</div>
                      </div>
                    </td>
                    <td className="text-right py-2 text-white font-medium">
                      {formatPrice(sector.price)}
                    </td>
                    <td className="text-right py-2">
                      <span className={sector.change >= 0 ? "text-green-400" : "text-red-400"}>
                        {formatChange(sector.change)}
                      </span>
                    </td>
                    <td className="text-right py-2">
                      <span className={sector.change >= 0 ? "text-green-400" : "text-red-400"}>
                        {sector.changePercent >= 0 ? '+' : ''}{sector.changePercent.toFixed(2)}%
                      </span>
                    </td>
                    <td className="text-right py-2 text-gray-400">
                      {formatMarketCap(sector.marketCap)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DataCard>
  );
}

// Sector heatmap component
export function SectorHeatmap({ sectors }: { sectors: SectorData[] }) {
  const sortedSectors = useMemo(() => {
    return [...sectors].sort((a, b) => b.changePercent - a.changePercent);
  }, [sectors]);

  const getHeatmapColor = (changePercent: number) => {
    if (changePercent >= 3) return "bg-green-600";
    if (changePercent >= 1) return "bg-green-500";
    if (changePercent >= 0) return "bg-green-400";
    if (changePercent >= -1) return "bg-red-400";
    if (changePercent >= -3) return "bg-red-500";
    return "bg-red-600";
  };

  return (
    <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
      {sortedSectors.map((sector) => (
        <div
          key={sector.symbol}
          className={`${getHeatmapColor(sector.changePercent)} rounded p-2 text-center transition-all hover:scale-105`}
        >
          <div className="text-xs font-medium text-white">{sector.symbol}</div>
          <div className="text-lg font-bold text-white">
            {sector.changePercent >= 0 ? '+' : ''}{sector.changePercent.toFixed(1)}%
          </div>
          <div className="text-xs text-white/80">{sector.name}</div>
        </div>
      ))}
    </div>
  );
}
