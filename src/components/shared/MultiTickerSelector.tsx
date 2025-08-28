"use client";

import { useEffect, useMemo, useRef, useState } from "react";


interface Props {
  value: string[];
  onChange: (tickers: string[]) => void;
  placeholder?: string;
}

export function MultiTickerSelector({ value, onChange, placeholder = "Add ticker..." }: Props) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const chips = useMemo(() => value, [value]);

  useEffect(() => {
    try {
      localStorage.setItem("tickers:selected", JSON.stringify(value));
    } catch {}
  }, [value]);

  const add = (raw: string) => {
    const sym = raw.trim().toUpperCase();
    if (!sym) return;
    if (value.includes(sym)) return;
    onChange([...value, sym]);
    setInput("");
  };

  const remove = (sym: string) => {
    onChange(value.filter(v => v !== sym));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      add(input);
    } else if (e.key === "Backspace" && input === "" && value.length > 0) {
      // quick remove last chip
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="w-full rounded-lg bg-white/5 border border-white/10 px-2 py-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
                 {chips.map(sym => (
           <span 
             key={sym}
             className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs bg-white/10 hover:bg-white/20 text-white/90"
           >
             {sym}
             <button onClick={() => remove(sym)} className="opacity-70 hover:opacity-100">×</button>
           </span>
         ))}
        <input
          ref={inputRef}
          className="flex-1 min-w-[120px] bg-transparent outline-none text-sm text-white placeholder-white/40 px-1 py-1"
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
        />
        {input && (
          <button onClick={() => add(input)} className="text-xs px-2 py-1 rounded-md bg-white/10 hover:bg-white/20">
            Add
          </button>
        )}
      </div>
    </div>
  );
}


