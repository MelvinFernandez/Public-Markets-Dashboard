interface PoliticalBubbleProps {
  title?: string;
  items: {
    label: string;
    value: string;
    change?: string;
    trend?: 'up' | 'down' | 'neutral';
  }[];
}

export function PoliticalBubble({ items }: PoliticalBubbleProps) {
  return (
    <div className="h-[140px] flex flex-col justify-between">
      <div className="space-y-1">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between p-1 rounded-md bg-white/5 border border-white/10">
            <div className="flex-1">
              <div className="text-xs text-white/60 mb-0.5">{item.label}</div>
              <div className="text-sm font-medium text-white">{item.value}</div>
            </div>
            {item.change && (
              <div className={`text-xs font-medium ${
                item.trend === 'up' ? 'text-green-400' : 
                item.trend === 'down' ? 'text-red-400' : 
                'text-white/60'
              }`}>
                {item.change}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
