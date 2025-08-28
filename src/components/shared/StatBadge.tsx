import { Badge } from "@/components/ui/badge";

interface StatBadgeProps {
  label: string;
  value: string | number;
}

export function StatBadge({ label, value }: StatBadgeProps) {
  return (
    <div className="flex items-center gap-2">
      <Badge variant="secondary" className="bg-white/10 text-white">
        {label}
      </Badge>
      <span className="text-sm text-white/80">{value}</span>
    </div>
  );
}
