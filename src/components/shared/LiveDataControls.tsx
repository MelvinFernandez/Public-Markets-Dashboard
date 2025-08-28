"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Play, 
  Pause, 
  RefreshCw, 
  Settings, 
  Zap,
  Clock,
  TrendingUp,
  Newspaper,
  Brain
} from "lucide-react";
import type { LiveDataConfig } from "@/lib/hooks";

interface LiveDataControlsProps {
  config: LiveDataConfig;
  onConfigChange: (updates: Partial<LiveDataConfig>) => void;
  onToggle: () => void;
  onManualRefresh?: () => void;
}

export function LiveDataControls({ 
  config, 
  onConfigChange, 
  onToggle, 
  onManualRefresh
}: LiveDataControlsProps) {
  const [showSettings, setShowSettings] = useState(false);

  const presetIntervals = [
    { label: "Live", quotes: 5000, news: 30000, sentiment: 60000 },
    { label: "Fast", quotes: 15000, news: 60000, sentiment: 120000 },
    { label: "Normal", quotes: 30000, news: 120000, sentiment: 300000 },
    { label: "Slow", quotes: 60000, news: 300000, sentiment: 600000 },
  ];

  const applyPreset = (preset: typeof presetIntervals[0]) => {
    onConfigChange({
      quotesInterval: preset.quotes,
      newsInterval: preset.news,
      sentimentInterval: preset.sentiment,
    });
  };

  return (
    <Card className="bg-gray-900/50 border-gray-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-white/90 flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            Live Data
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge 
              variant={config.enabled ? "default" : "secondary"}
              className={config.enabled ? "bg-green-600 hover:bg-green-700" : "bg-gray-600"}
            >
              {config.enabled ? "ON" : "OFF"}
            </Badge>
            {onManualRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onManualRefresh}
                className="h-8 px-2 text-white/70 hover:text-white hover:bg-gray-800"
                title="Manual refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="h-8 px-2 text-white/70 hover:text-white hover:bg-gray-800"
            >
              {config.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="h-8 px-2 text-white/70 hover:text-white hover:bg-gray-800"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {showSettings && (
        <CardContent className="pt-0 space-y-4">
          <Separator className="bg-gray-700" />
          
          {/* Preset Intervals */}
          <div>
            <div className="text-xs text-white/60 mb-2">Quick Presets</div>
            <div className="flex flex-wrap gap-2">
              {presetIntervals.map((preset) => (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset(preset)}
                  className="h-7 px-2 text-xs border-gray-600 text-white/70 hover:text-white hover:border-gray-500"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Intervals */}
          <div className="space-y-3">
            <div className="text-xs text-white/60">Custom Intervals</div>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-white/70">
                  <TrendingUp className="w-3 h-3" />
                  Quotes
                </div>
                <select
                  value={config.quotesInterval}
                  onChange={(e) => onConfigChange({ quotesInterval: Number(e.target.value) })}
                  className="w-full text-xs bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white/90"
                >
                  <option value={5000}>5s</option>
                  <option value={15000}>15s</option>
                  <option value={30000}>30s</option>
                  <option value={60000}>1m</option>
                  <option value={120000}>2m</option>
                </select>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-white/70">
                  <Newspaper className="w-3 h-3" />
                  News
                </div>
                <select
                  value={config.newsInterval}
                  onChange={(e) => onConfigChange({ newsInterval: Number(e.target.value) })}
                  className="w-full text-xs bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white/90"
                >
                  <option value={30000}>30s</option>
                  <option value={60000}>1m</option>
                  <option value={120000}>2m</option>
                  <option value={300000}>5m</option>
                  <option value={600000}>10m</option>
                </select>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-white/70">
                  <Brain className="w-3 h-3" />
                  Sentiment
                </div>
                <select
                  value={config.sentimentInterval}
                  onChange={(e) => onConfigChange({ sentimentInterval: Number(e.target.value) })}
                  className="w-full text-xs bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white/90"
                >
                  <option value={60000}>1m</option>
                  <option value={120000}>2m</option>
                  <option value={300000}>5m</option>
                  <option value={600000}>10m</option>
                  <option value={900000}>15m</option>
                </select>
              </div>
            </div>
          </div>

          {/* Status Info */}
          <div className="text-xs text-white/50 space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3" />
              Next refresh: {config.enabled ? "Auto" : "Manual"}
            </div>
            <div className="flex items-center gap-2">
              <RefreshCw className="w-3 h-3" />
              Background updates: {config.enabled ? "Enabled" : "Disabled"}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
