"use client";

type Sentiment = "up" | "down" | "flat";

export function InlineBadge({
  label,
  meta,         // e.g., "+0.6%" or "-7 bps" (already formatted)
  sentiment
}: { label: string; meta?: string; sentiment: Sentiment }) {
  if (sentiment === "flat") {
    return (
      <span className="inline">
        <span className="text-white/85">{label}</span>
        {meta ? <span className="text-white/60"> ({meta})</span> : null}
      </span>
    );
  }
  const up = sentiment === "up";
  const color = up ? "text-green-300" : "text-red-300";
  const arrow = up ? "▲" : "▼";
  return (
    <span className="inline">
      <span className={`${color} inline-flex items-center gap-1`}>
        <span aria-hidden>{arrow}</span>
        <span>{label}</span>
        {meta ? <span className={color}> ({meta})</span> : null}
      </span>
    </span>
  );
}