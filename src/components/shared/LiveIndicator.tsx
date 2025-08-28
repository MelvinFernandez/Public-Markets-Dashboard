"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  AlertCircle,
  Clock
} from "lucide-react";

interface LiveIndicatorProps {
  isLive: boolean;
  lastUpdated?: string;
  isRefetching?: boolean;
  error?: boolean;
  className?: string;
}

export function LiveIndicator({ 
  isLive, 
  lastUpdated, 
  isRefetching, 
  error, 
  className 
}: LiveIndicatorProps) {
  const [timeAgo, setTimeAgo] = useState<string>("");

  useEffect(() => {
    if (!lastUpdated) return;

    const updateTimeAgo = () => {
      const now = new Date();
      const updated = new Date(lastUpdated);
      const diffMs = now.getTime() - updated.getTime();
      
      if (diffMs < 1000) {
        setTimeAgo("Just now");
      } else if (diffMs < 60000) {
        setTimeAgo(`${Math.floor(diffMs / 1000)}s ago`);
      } else if (diffMs < 3600000) {
        setTimeAgo(`${Math.floor(diffMs / 60000)}m ago`);
      } else {
        setTimeAgo(`${Math.floor(diffMs / 3600000)}h ago`);
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  const getStatusIcon = () => {
    if (error) return <AlertCircle className="w-3 h-3 text-red-400" />;
    if (isRefetching) return <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" />;
    if (isLive) return <Wifi className="w-3 h-3 text-green-400" />;
    return <WifiOff className="w-3 h-3 text-gray-400" />;
  };

  const getStatusText = () => {
    if (error) return "Error";
    if (isRefetching) return "Updating";
    if (isLive) return "Live";
    return "Offline";
  };

  const getStatusColor = () => {
    if (error) return "border-red-500/20 bg-red-500/10 text-red-400";
    if (isRefetching) return "border-blue-500/20 bg-blue-500/10 text-blue-400";
    if (isLive) return "border-green-500/20 bg-green-500/10 text-green-400";
    return "border-gray-500/20 bg-gray-500/10 text-gray-400";
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Badge 
        variant="outline" 
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 text-xs font-medium",
          getStatusColor()
        )}
      >
        {getStatusIcon()}
        {getStatusText()}
      </Badge>
      
      {lastUpdated && (
        <div className="flex items-center gap-1 text-xs text-white/60">
          <Clock className="w-3 h-3" />
          {timeAgo}
        </div>
      )}
    </div>
  );
}

// Pulse animation component for live data
export function LivePulse({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <div className="absolute inset-0 rounded-full bg-green-400/20 animate-ping" />
      <div className="relative w-2 h-2 rounded-full bg-green-400" />
    </div>
  );
}

// Live data status bar
export function LiveStatusBar({ 
  isLive, 
  lastUpdated, 
  isRefetching, 
  error 
}: LiveIndicatorProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-900/30 border-t border-gray-700">
      <div className="flex items-center gap-4">
        <LiveIndicator 
          isLive={isLive} 
          lastUpdated={lastUpdated} 
          isRefetching={isRefetching} 
          error={error} 
        />
      </div>
      
      {isLive && (
        <div className="flex items-center gap-2 text-xs text-white/50">
          <LivePulse />
          <span>Auto-refresh active</span>
        </div>
      )}
    </div>
  );
}
