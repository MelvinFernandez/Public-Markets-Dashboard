interface SentimentGaugeProps {
  score: number;
}

export function SentimentGauge({ score }: SentimentGaugeProps) {
  const percentage = Math.min(Math.max(score, 0), 100);
  const color = percentage >= 60 ? "text-green-400" : percentage >= 40 ? "text-yellow-400" : "text-red-400";
  
  return (
    <div className="flex flex-col items-center justify-center h-48">
      <div className="relative w-32 h-32">
        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
          {/* Background circle */}
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            className={color}
            strokeDasharray={`${(percentage / 100) * 339.292} 339.292`}
            style={{
              strokeDasharray: `${(percentage / 100) * 339.292} 339.292`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-3xl font-bold ${color}`}>{score}</span>
        </div>
      </div>
      <div className="mt-4 text-center">
        <div className="text-sm text-white/60">Sentiment Score</div>
        <div className="text-xs text-white/40">0-100 scale</div>
      </div>
    </div>
  );
}
