"use client";

import { useState } from "react";
import { Search } from "lucide-react";

interface TickerSearchProps {
  onSelect: (symbol: string) => void;
}

export function TickerSearch({ onSelect }: TickerSearchProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSelect(query.trim().toUpperCase());
      setQuery("");
    }
  };

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search ticker..."
            className="w-full pl-10 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-colors"
        >
          Add
        </button>
      </form>
    </div>
  );
}
