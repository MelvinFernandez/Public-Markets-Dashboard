"use client";

import { useState, useEffect } from "react";
// Removed framer-motion imports - no animations needed

interface SentimentCardProps {
  ticker: string;
  watchlist?: string[];
  className?: string;
}

interface SentimentData {
  ticker: string;
  score: number;
  breadth: number;
  count: number;
  publishers?: number;
  lowSample?: boolean;
  asOf: string;
  articles: Array<{
    title: string;
    publisher: string;
    time: number;
    compound: number;
    score: number;
    url: string;
  }>;
  articles_full?: Array<{
    title: string;
    publisher: string;
    time: number;
    compound: number;
    score: number;
    url: string;
  }>;
  error?: string;
  warning?: string;
}

interface PortfolioSentimentData {
  tickers: string[];
  combined_score: number;
  combined_breadth: number;
  total_articles: number;
  asOf: string;
  individual_scores: Array<{
    ticker: string;
    score: number;
    breadth: number;
    count: number;
    publishers: number;
    lowSample: boolean;
  }>;
  articles: Array<{
    title: string;
    publisher: string;
    time: number;
    compound: number;
    score: number;
    url: string;
    source_ticker: string;
  }>;
  articles_full?: Array<{
    title: string;
    publisher: string;
    time: number;
    compound: number;
    score: number;
    url: string;
    source_ticker: string;
  }>;
  error?: string;
}

export function SentimentCard({ ticker, watchlist = [], className = "" }: SentimentCardProps) {
  const [data, setData] = useState<SentimentData | null>(null);
  const [portfolioData, setPortfolioData] = useState<PortfolioSentimentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<'individual' | 'portfolio'>('individual');
  const [selectedTicker, setSelectedTicker] = useState<string>(ticker);
  const [showAllArticles, setShowAllArticles] = useState(false);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update selectedTicker when ticker prop changes
  useEffect(() => {
    setSelectedTicker(ticker);
    setShowAllArticles(false); // Reset expanded state when switching tickers
  }, [ticker]);

  // watchlistKey removed - no longer needed

  useEffect(() => {
    const fetchSentiment = async (retryCount = 0) => {
      // Prevent fetching if ticker is empty or invalid
      if (!selectedTicker || selectedTicker.trim() === '') {
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        // Reset data when ticker changes
        setData(null);
        setPortfolioData(null);
        
        // Fetch individual ticker sentiment
        console.log(`Fetching sentiment for ticker: ${selectedTicker} (attempt ${retryCount + 1})`);
        const individualResponse = await fetch(`/api/sentiment?ticker=${selectedTicker}&limit=30&force=true`);
        console.log(`Individual response status: ${individualResponse.status}`);
        
        if (!individualResponse.ok) {
          const errorText = await individualResponse.text();
          console.error(`Individual API error: ${errorText}`);
          
          // Retry once if it's a 500 error
          if (individualResponse.status === 500 && retryCount === 0) {
            console.log("Retrying individual sentiment fetch...");
            setTimeout(() => fetchSentiment(1), 1000);
            return;
          }
          
          throw new Error(`HTTP ${individualResponse.status}: ${individualResponse.statusText}`);
        }
        
        const individualResult = await individualResponse.json();
        console.log(`Individual result:`, individualResult);
        
        if (individualResult.error) {
          throw new Error(individualResult.error);
        }
        setData(individualResult);
        
        // Fetch portfolio sentiment if we have multiple tickers
        if (watchlist.length > 1) {
          console.log(`Fetching portfolio sentiment for: ${watchlist.join(',')}`);
          const portfolioResponse = await fetch(`/api/sentiment?tickers=${watchlist.join(',')}&limit=30&force=true`);
          console.log(`Portfolio response status: ${portfolioResponse.status}`);
          
          if (portfolioResponse.ok) {
            const portfolioResult = await portfolioResponse.json();
            console.log(`Portfolio result:`, portfolioResult);
            if (!portfolioResult.error) {
              setPortfolioData(portfolioResult);
            }
          } else {
            const errorText = await portfolioResponse.text();
            console.error(`Portfolio API error: ${errorText}`);
          }
        }
        
      } catch (err) {
        console.error("Sentiment fetch error:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    if (selectedTicker && mounted) {
      // Add a small delay to prevent rapid API calls
      const timeoutId = setTimeout(() => fetchSentiment(), 100);
      return () => clearTimeout(timeoutId);
    }
  }, [selectedTicker, watchlist, mounted]);

  const getSentimentColor = (score: number) => {
    if (score >= 60) return "text-green-400";
    if (score >= 40) return "text-yellow-400";
    return "text-red-400";
  };

  const getSentimentBadge = (compound: number) => {
    if (compound > 0.05) return { label: "Positive", color: "bg-green-500/20 text-green-400" };
    if (compound < -0.05) return { label: "Negative", color: "bg-red-500/20 text-red-400" };
    return { label: "Neutral", color: "bg-gray-500/20 text-gray-400" };
  };

  const getSentimentLabel = (score: number) => {
    if (score >= 70) return "Very Positive";
    if (score >= 60) return "Positive";
    if (score >= 50) return "Neutral";
    if (score >= 40) return "Negative";
    return "Very Negative";
  };

  if (!mounted) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-white/10 rounded mb-2"></div>
          <div className="h-32 bg-white/5 rounded mb-4"></div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-3 bg-white/5 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-4 bg-white/10 rounded w-24"></div>
            <div className="text-xs text-white/60">Updating sentiment...</div>
          </div>
          <div className="h-32 bg-white/5 rounded mb-4"></div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-3 bg-white/5 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || data?.error) {
    return (
      <div className={`p-4 text-center ${className}`}>
        <div className="text-red-400 text-sm">
          {error || data?.error || "Failed to load sentiment data"}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`p-4 text-center ${className}`}>
        <div className="text-white/60 text-sm">No sentiment data available</div>
      </div>
    );
  }

  const currentData = viewMode === 'portfolio' && portfolioData ? portfolioData : data;
  const currentScore = viewMode === 'portfolio' && portfolioData ? portfolioData.combined_score : data?.score || 0;
  const currentBreadth = viewMode === 'portfolio' && portfolioData ? portfolioData.combined_breadth : data?.breadth || 0;
  const currentCount = viewMode === 'portfolio' && portfolioData ? portfolioData.total_articles : data?.count || 0;
  const currentPublishers = viewMode === 'portfolio' && portfolioData && portfolioData.individual_scores ?
    Math.max(...portfolioData.individual_scores.map(s => s.publishers)) : (data?.publishers ?? 0);

  // Use articles_full if available, otherwise fall back to articles
  const articlesToShow = currentData?.articles_full || currentData?.articles || [];

  return (
    <div className={`p-4 ${className}`}>
      {/* View Mode Toggle */}
      {watchlist.length > 1 && (
        <div className="flex justify-center mb-4">
          <div className="bg-white/5 rounded-lg p-1 flex">
            <button
              onClick={() => setViewMode('individual')}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                viewMode === 'individual' 
                  ? 'bg-white/20 text-white' 
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Individual
            </button>
            <button
              onClick={() => setViewMode('portfolio')}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                viewMode === 'portfolio' 
                  ? 'bg-white/20 text-white' 
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Portfolio
            </button>
          </div>
        </div>
      )}

      {/* Individual Ticker Selector */}
      {viewMode === 'individual' && watchlist.length > 1 && (
        <div className="mb-4">
          <div className="text-xs text-white/60 mb-2 text-center">Select Ticker</div>
          <div className="flex flex-wrap gap-2 justify-center">
            {watchlist.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTicker(t)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  selectedTicker === t
                    ? 'bg-green-600 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sentiment Score */}
      <div className="flex items-center justify-center mb-4">
        <div className="relative w-20 h-20">
          <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="6"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              className={getSentimentColor(currentScore)}
              strokeDasharray={`${(currentScore / 100) * 283} 283`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-lg font-bold ${getSentimentColor(currentScore)}`}>
              {currentScore}
            </span>
          </div>
        </div>
      </div>

      {/* Sentiment Label */}
      <div className="text-center mb-4">
        <div className={`text-sm font-medium ${getSentimentColor(currentScore)}`}>
          {getSentimentLabel(currentScore)}
        </div>
        <div className="text-xs text-white/60 mt-1">
          {viewMode === 'portfolio' ? (
            `Portfolio: ${currentCount} articles from ${currentPublishers} sources`
          ) : (
            `${selectedTicker}: ${currentCount} articles from ${currentPublishers} sources`
          )}
        </div>
        {viewMode === 'individual' && data?.lowSample && (
          <div className="text-xs text-yellow-400 mt-1">⚠️ Low sample size</div>
        )}
      </div>

      {/* Individual Ticker Scores (Portfolio View) */}
      {viewMode === 'portfolio' && portfolioData && portfolioData.individual_scores && (
        <div className="mb-4">
          <div className="text-xs text-white/60 mb-2">Individual Scores</div>
          <div className="grid grid-cols-2 gap-2">
            {portfolioData.individual_scores.map((score) => (
              <div key={score.ticker} className="bg-white/5 rounded p-2">
                <div className="text-xs text-white/60">{score.ticker}</div>
                <div className={`text-sm font-medium ${getSentimentColor(score.score)}`}>
                  {score.score}
                </div>
                <div className="text-xs text-white/50">
                  {score.count} articles
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-center">
        <div>
          <div className="text-xs text-white/60 mb-1">Breadth</div>
          <div className={`text-sm font-medium ${getSentimentColor(currentBreadth)}`}>
            {currentBreadth}%
          </div>
        </div>
        <div>
          <div className="text-xs text-white/60 mb-1">Articles</div>
          <div className="text-sm font-medium text-white/90">
            {currentCount}
          </div>
        </div>
      </div>

      {/* Articles - Only show in individual view */}
      {viewMode === 'individual' && articlesToShow && articlesToShow.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-white/60">Recent Headlines</div>
            <div className="text-xs text-white/40">
              {showAllArticles ? articlesToShow.length : Math.min(4, articlesToShow.length)} of {articlesToShow.length}
            </div>
          </div>

          {/* Articles list with expand/collapse */}
          <div className="space-y-2">
            {articlesToShow.slice(0, showAllArticles ? articlesToShow.length : 4).map((article, index) => {
              const badge = getSentimentBadge(article.compound);
              const isExpanded = showAllArticles && index >= 4;
              return (
                <div
                  key={`${article.time}-${index}`}
                  className={`group cursor-pointer transition-all duration-300 ease-in-out ${
                    isExpanded ? 'animate-slideInUp' : ''
                  }`}
                  onClick={() => window.open(article.url, '_blank')}
                  style={{
                    animationDelay: isExpanded ? `${(index - 4) * 100}ms` : '0ms',
                    opacity: isExpanded ? 0 : 1,
                    animation: isExpanded ? 'slideInUp 0.4s ease-out forwards' : 'none',
                    transform: isExpanded ? 'translateY(10px)' : 'translateY(0)',
                    transition: 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out'
                  }}
                >
                  <div className="flex items-start gap-2 p-2 rounded-md hover:bg-white/5 transition-colors">
                    <div className={`px-1.5 py-0.5 rounded text-xs font-medium ${badge.color}`}>
                      {badge.label}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-white/90 line-clamp-2 group-hover:text-white transition-colors">
                        {article.title}
                      </div>
                      <div className="text-xs text-white/50 mt-1">
                        {article.publisher} • {new Date(article.time * 1000).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Show All / Show Less button */}
          {articlesToShow.length > 4 && (
            <div className="pt-2 border-t border-white/10 mt-3">
              <button
                onClick={() => setShowAllArticles(!showAllArticles)}
                className="w-full text-center text-xs text-green-400 hover:text-green-300 transition-all duration-300 py-2 flex items-center justify-center gap-2 hover:bg-white/5 rounded-md"
              >
                <span
                  className={`transform transition-transform duration-300 ${showAllArticles ? 'rotate-180' : 'rotate-0'}`}
                >
                  ▼
                </span>
                {showAllArticles ? 'Show Less' : `See ${articlesToShow.length - 4} More Articles`}
              </button>
            </div>
          )}
        </div>
      ) : viewMode === 'individual' ? (
        <div className="text-center text-white/60 text-sm">
          No recent news available
        </div>
      ) : null}
    </div>
  );
}
