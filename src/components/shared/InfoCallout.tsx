import { Info } from "lucide-react";

interface InfoCalloutProps {
  children: React.ReactNode;
  className?: string;
}

export function InfoCallout({ children, className }: InfoCalloutProps) {
  return (
    <div className={`flex items-start gap-2 p-3 bg-white/5 border border-white/10 rounded-lg ${className}`}>
      <Info size={16} className="mt-0.5 text-white/70 flex-shrink-0" />
      <div className="text-sm text-white/80">{children}</div>
    </div>
  );
}
