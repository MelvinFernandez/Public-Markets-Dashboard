interface MiniSparklineProps {
  data: number[];
  width?: number;
  height?: number;
}

export function MiniSparkline({ data, width = 64, height = 32 }: MiniSparklineProps) {
  if (!data || data.length < 2) {
    return (
      <div 
        className="bg-white/10 rounded" 
        style={{ width, height }}
      />
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-white/60"
        points={points}
      />
    </svg>
  );
}
