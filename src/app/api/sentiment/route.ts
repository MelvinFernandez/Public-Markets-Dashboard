import { NextResponse } from "next/server";
import { SentimentAnalyzer } from "vader-sentiment";
import { LruCache } from "@/lib/cache";

const TEN_MINUTES = 10 * 60 * 1000;
const sentimentCache = new LruCache<unknown>(64);

// Initialize VADER sentiment analyzer
const analyzer = new SentimentAnalyzer();

// Sample news data for sentiment analysis (in production, you'd fetch real news)
const sampleNewsData = [
  {
    title: "Tech stocks surge on strong earnings reports",
    summary: "Technology companies reported better-than-expected quarterly results, driving market gains.",
    source: "Financial Times"
  },
  {
    title: "Federal Reserve signals potential rate cuts",
    summary: "Central bank officials suggest monetary policy easing may be on the horizon.",
    source: "Reuters"
  },
  {
    title: "Oil prices decline amid supply concerns",
    summary: "Crude oil futures fall as inventory levels rise above expectations.",
    source: "Bloomberg"
  },
  {
    title: "Retail sales show mixed results",
    summary: "Consumer spending patterns indicate economic uncertainty in certain sectors.",
    source: "CNBC"
  },
  {
    title: "Housing market shows signs of stabilization",
    summary: "Recent data suggests the real estate sector may be finding its footing.",
    source: "MarketWatch"
  }
];

// Function to analyze sentiment of text
function analyzeSentiment(text: string) {
  const result = analyzer.getSentiment(text);
  return {
    compound: result.compound,
    positive: result.positive,
    negative: result.negative,
    neutral: result.neutral
  };
}

// Function to calculate overall sentiment score (0-100)
function calculateSentimentScore(articles: Array<{ compound: number }>) {
  if (articles.length === 0) return 50;
  
  const avgCompound = articles.reduce((sum, article) => sum + article.compound, 0) / articles.length;
  
  // Convert compound score (-1 to 1) to 0-100 scale
  // -1 = 0, 0 = 50, 1 = 100
  const score = Math.round(((avgCompound + 1) / 2) * 100);
  
  return Math.max(0, Math.min(100, score)); // Clamp between 0-100
}

// Function to calculate sentiment breadth (percentage of positive articles)
function calculateSentimentBreadth(articles: Array<{ compound: number }>) {
  if (articles.length === 0) return 50;
  
  const positiveCount = articles.filter(article => article.compound > 0.05).length;
  const breadth = (positiveCount / articles.length) * 100;
  
  return Math.round(breadth);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker");
  const tickers = searchParams.get("tickers");
  const limit = parseInt(searchParams.get("limit") || "30");
  const force = searchParams.get("force") === "true";

  if (!ticker && !tickers) {
    return NextResponse.json({ error: "Missing ticker or tickers parameter" }, { status: 400 });
  }

  const cacheKey = `sentiment:${ticker || tickers}:${limit}`;
  
  if (!force) {
    const cached = sentimentCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }
  }

  try {
    if (tickers) {
      // Portfolio sentiment analysis
      const tickerList = tickers.split(',');
      
      // For portfolio analysis, we'll analyze sample news for each ticker
      const portfolioArticles = tickerList.map(t => ({
        title: `Sample news for ${t}`,
        summary: `Market analysis for ${t} shows mixed sentiment`,
        source: "Sample",
        compound: (Math.random() - 0.5) * 2, // Random sentiment for demo
        score: Math.random() * 100,
        url: `https://example.com/news/${t}`,
        source_ticker: t
      }));

      const combinedScore = calculateSentimentScore(portfolioArticles);
      const combinedBreadth = calculateSentimentBreadth(portfolioArticles);

      const result = {
        tickers: tickerList,
        combined_score: combinedScore,
        combined_breadth: combinedBreadth,
        total_articles: portfolioArticles.length,
        asOf: new Date().toISOString(),
        individual_scores: tickerList.map((t, i) => ({
          ticker: t,
          score: Math.round(portfolioArticles[i]?.score || 50),
          breadth: Math.round(Math.random() * 100),
          count: 1,
          publishers: 1,
          lowSample: true
        })),
        articles: portfolioArticles
      };

      sentimentCache.set(cacheKey, result, TEN_MINUTES);
      return NextResponse.json(result);
      
    } else {
      // Individual ticker sentiment analysis
      
      // Analyze sample news articles for the ticker
      const articles = sampleNewsData.map((news, index) => {
        const sentiment = analyzeSentiment(`${news.title} ${news.summary}`);
        return {
          title: news.title,
          publisher: news.source,
          time: Math.floor(Date.now() / 1000) - (index * 3600), // Staggered timestamps
          compound: sentiment.compound,
          score: Math.round(((sentiment.compound + 1) / 2) * 100),
          url: `https://example.com/news/${index + 1}`
        };
      });

      const overallScore = calculateSentimentScore(articles);
      const breadth = calculateSentimentBreadth(articles);

      const result = {
        ticker: ticker!,
        score: overallScore,
        breadth: breadth,
        count: articles.length,
        publishers: new Set(articles.map(a => a.publisher)).size,
        lowSample: articles.length < 10,
        asOf: new Date().toISOString(),
        articles: articles,
        articles_full: articles // Keep for backward compatibility
      };

      sentimentCache.set(cacheKey, result, TEN_MINUTES);
      return NextResponse.json(result);
    }
    
  } catch (error) {
    console.error("Sentiment analysis error:", error);
    
    // Return fallback data on error
    if (tickers) {
      const tickerList = tickers.split(',');
      return NextResponse.json({
        tickers: tickerList,
        combined_score: 50.0,
        combined_breadth: 50.0,
        total_articles: 0,
        asOf: new Date().toISOString(),
        individual_scores: tickerList.map(t => ({
          ticker: t,
          score: 50.0,
          breadth: 50.0,
          count: 0,
          publishers: 0,
          lowSample: true
        })),
        articles: [],
        error: "Sentiment analysis temporarily unavailable"
      });
    } else {
      return NextResponse.json({
        ticker: ticker!,
        score: 50.0,
        breadth: 50.0,
        count: 0,
        publishers: 0,
        lowSample: true,
        asOf: new Date().toISOString(),
        articles: [],
        articles_full: [],
        error: "Sentiment analysis temporarily unavailable"
      });
    }
  }
}


