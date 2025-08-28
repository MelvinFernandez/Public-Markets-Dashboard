"use client";

import { useState, useEffect } from "react";

interface RefreshTimerProps {
  lastUpdated?: number;
  className?: string;
}

export function RefreshTimer({ lastUpdated, className = "" }: RefreshTimerProps) {
  const [timeElapsed, setTimeElapsed] = useState<string>("");

  useEffect(() => {
    if (!lastUpdated) {
      setTimeElapsed("");
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const diff = now - lastUpdated;
      
      if (diff < 60000) { // Less than 1 minute
        setTimeElapsed(`${Math.floor(diff / 1000)}s ago`);
      } else if (diff < 3600000) { // Less than 1 hour
        setTimeElapsed(`${Math.floor(diff / 60000)}m ago`);
      } else { // More than 1 hour
        setTimeElapsed(`${Math.floor(diff / 3600000)}h ago`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [lastUpdated]);

  if (!timeElapsed) return null;

  return (
    <div className={`text-xs text-white/40 ${className}`}>
      Last updated: {timeElapsed}
    </div>
  );
}
