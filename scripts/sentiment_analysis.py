#!/usr/bin/env python
import sys
import json
import time
import re
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Any, Optional
import yfinance as yf
from nltk.sentiment.vader import SentimentIntensityAnalyzer
import nltk

# --- Constants ---
HALFLIFE_HRS = 24
DUP_WINDOW_HRS = 2
DUP_PENALTY = 0.5
POS_THRESH = 0.05

# ---- Tunables for Progressive Lookback ----
MIN_ARTICLES = 5
TARGET_EFFECTIVE_N = 3.0
LOOKBACK_STEPS = [1, 3, 7]   # days

# Download VADER lexicon if not available
try:
    nltk.data.find('sentiment/vader_lexicon')
except LookupError:
    nltk.download('vader_lexicon')

# Initialize VADER sentiment analyzer
analyzer = SentimentIntensityAnalyzer()

# tiny in-process cache for news
_NEWS_CACHE: Dict[str, Dict[str, Any]] = {}

def get_news(ticker: str, ttl: int = 600) -> List[Dict[str, Any]]:
    now = time.time()
    hit = _NEWS_CACHE.get(ticker)
    if hit and now - hit["t"] < ttl:
        return hit["data"]
    
    all_news = []
    
    # Get news from the main ticker
    data = yf.Ticker(ticker).news or []
    all_news.extend(data)
    
    # Try to get additional news from related tickers or broader market
    # This helps get more diverse news coverage
    related_tickers = {
        'AAPL': ['SPY', 'QQQ'],  # Market indices that might have Apple news
        'MSFT': ['SPY', 'QQQ'],  # Market indices that might have Microsoft news
        'NVDA': ['SPY', 'QQQ'],  # Market indices that might have Nvidia news
        'GOOGL': ['SPY', 'QQQ'], # Market indices that might have Google news
        'AMZN': ['SPY', 'QQQ'],  # Market indices that might have Amazon news
        'META': ['SPY', 'QQQ'],  # Market indices that might have Meta news
        'TSLA': ['SPY', 'QQQ'],  # Market indices that might have Tesla news
        'TSM': ['SPY', 'QQQ', 'SMH'],  # Market indices that might have Taiwan Semi news
    }
    
    # Get additional news from related tickers
    related = related_tickers.get(ticker.upper(), [])
    for related_ticker in related:
        try:
            rt = yf.Ticker(related_ticker)
            related_news = rt.news or []
            # Filter to only include news that mentions our target ticker
            for article in related_news:
                title = ''
                if 'content' in article and 'title' in article['content']:
                    title = article['content']['title']
                elif 'title' in article:
                    title = article['title']
                
                if title and is_ticker_relevant(title, ticker):
                    all_news.append(article)
        except Exception as e:
            print(f"Error fetching related news for {related_ticker}: {e}", file=sys.stderr)
            continue
    
    # Remove duplicates based on title
    seen_titles = set()
    unique_news = []
    for article in all_news:
        title = ''
        if 'content' in article and 'title' in article['content']:
            title = article['content']['title']
        elif 'title' in article:
            title = article['title']
        
        if title and title not in seen_titles:
            seen_titles.add(title)
            unique_news.append(article)
    
    _NEWS_CACHE[ticker] = {"t": now, "data": unique_news}
    return unique_news

def to_epoch_seconds(x: Any, default_now: Optional[int] = None) -> int:
    if default_now is None:
        default_now = int(time.time())
    try:
        t = int(x)
        # handle ms inputs
        if t > 1_000_000_000_000:
            t //= 1000
        return max(0, t)
    except Exception:
        return default_now

def filtered_news(ticker: str, days: int) -> List[Dict[str, Any]]:
    """Filter news articles to only include those within the specified lookback window."""
    cutoff = int(time.time()) - days * 86400
    items = get_news(ticker)  # your cached yfinance fetch
    out = []
    for n in items:
        # Try multiple timestamp fields for yfinance news structure
        ts = None
        if "providerPublishTime" in n:
            ts = to_epoch_seconds(n.get("providerPublishTime"))
        elif "content" in n and "pubDate" in n["content"]:
            ts = to_epoch_seconds(n["content"]["pubDate"])
        elif "pubDate" in n:
            ts = to_epoch_seconds(n.get("pubDate"))
        
        if ts and ts >= cutoff:
            n["_ts"] = ts
            out.append(n)
    # most recent first
    return sorted(out, key=lambda x: x["_ts"], reverse=True)

def effective_sample(arts: List[Dict[str, Any]]) -> float:
    """Calculate effective sample size using time and duplicate weights."""
    return sum(a.get("time_weight", 1.0) * a.get("dup_weight", 1.0) for a in arts)

def sort_articles_by_impact_and_recency(articles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Sort articles by sentiment impact (non-neutral first) and then by recency (most recent first)."""
    def sort_key(article):
        compound = abs(article.get('compound', 0))
        time = article.get('time', 0)
        # Non-neutral articles (|compound| > 0.1) come first, then by recency
        impact_priority = 0 if compound > 0.1 else 1
        return (impact_priority, -time)  # Negative time for most recent first
    
    return sorted(articles, key=sort_key)

def clean_title(title: str) -> str:
    """Remove common boilerplate and ticker symbols from titles."""
    # Remove common prefixes
    prefixes = [
        r'\[Exclusive\]', r'\[Breaking\]', r'\[Update\]', r'\[News\]',
        r'Breaking:', r'Update:', r'News:', r'Exclusive:',
        r'BREAKING:', r'UPDATE:', r'NEWS:', r'EXCLUSIVE:'
    ]
    
    cleaned = title
    for prefix in prefixes:
        cleaned = re.sub(prefix, '', cleaned, flags=re.IGNORECASE)
    
    # Remove ticker symbols in brackets or parentheses
    cleaned = re.sub(r'\([A-Z]{1,5}\)', '', cleaned)
    cleaned = re.sub(r'\[[A-Z]{1,5}\]', '', cleaned)
    
    # Remove multiple spaces and trim
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    
    return cleaned

def get_company_info(ticker: str) -> Dict[str, Any]:
    """Fetch company information from yfinance to generate dynamic mappings."""
    try:
        t = yf.Ticker(ticker)
        info = t.info
        
        # Extract key company information
        company_name = info.get('longName', '') or info.get('shortName', '')
        business_summary = info.get('businessSummary', '')
        industry = info.get('industry', '')
        sector = info.get('sector', '')
        ceo = info.get('companyOfficers', [{}])[0].get('name', '') if info.get('companyOfficers') else ''
        
        return {
            'company_name': company_name,
            'business_summary': business_summary,
            'industry': industry,
            'sector': sector,
            'ceo': ceo
        }
    except Exception:
        return {}

def generate_dynamic_mappings(ticker: str) -> List[str]:
    """Generate dynamic keyword mappings for a ticker based on company info."""
    info = get_company_info(ticker)
    mappings = [ticker.lower()]
    
    # Add company name variations
    if info.get('company_name'):
        company_name = info['company_name'].lower()
        mappings.append(company_name)
        
        # Split company name into words and add significant ones
        words = company_name.split()
        for word in words:
            if len(word) > 3 and word not in ['inc', 'corp', 'ltd', 'llc', 'company', 'corporation']:
                mappings.append(word)
    
    # Add CEO name if available
    if info.get('ceo'):
        ceo_name = info['ceo'].lower()
        mappings.append(ceo_name)
        # Add first and last name separately
        ceo_parts = ceo_name.split()
        mappings.extend(ceo_parts)
    
    # Add industry/sector keywords
    if info.get('industry'):
        industry = info['industry'].lower()
        mappings.append(industry)
    
    if info.get('sector'):
        sector = info['sector'].lower()
        mappings.append(sector)
    
    # Extract key business terms from summary
    if info.get('business_summary'):
        summary = info['business_summary'].lower()
        # Look for key business terms (simple keyword extraction)
        business_terms = []
        common_business_words = ['platform', 'service', 'software', 'technology', 'app', 'application', 
                               'retail', 'ecommerce', 'streaming', 'social', 'media', 'gaming', 
                               'cloud', 'ai', 'artificial intelligence', 'automotive', 'energy', 
                               'healthcare', 'finance', 'banking', 'insurance', 'real estate']
        
        for term in common_business_words:
            if term in summary:
                business_terms.append(term)
        
        mappings.extend(business_terms)
    
    # Remove duplicates and filter out very short terms
    unique_mappings = list(set([m for m in mappings if len(m) > 2]))
    
    return unique_mappings

def is_ticker_relevant(title: str, ticker: str) -> bool:
    """Check if article title is relevant to the ticker"""
    if not title or not ticker:
        return False
    
    title_lower = title.lower()
    ticker_lower = ticker.lower()
    
    # Direct ticker mention
    if ticker_lower in title_lower:
        return True
    
    # Static company name mappings (for well-known companies with specific keywords)
    static_mappings = {
        'aapl': ['apple', 'iphone', 'ipad', 'mac', 'ios', 'app store'],
        'msft': ['microsoft', 'azure', 'office', 'windows', 'xbox'],
        'nvda': ['nvidia', 'gpu', 'ai', 'cuda', 'geforce'],
        'googl': ['google', 'alphabet', 'youtube', 'android', 'chrome'],
        'amzn': ['amazon', 'aws', 'prime', 'alexa'],
        'meta': ['facebook', 'instagram', 'whatsapp', 'metaverse', 'mark zuckerberg', 'zuckerberg'],
        'tsla': ['tesla', 'elon musk', 'model s', 'model 3', 'model x', 'model y'],
        'rblx': ['roblox', 'roblox corporation'],
        'netflix': ['netflix', 'streaming'],
        'uber': ['uber', 'rideshare'],
        'spotify': ['spotify', 'music streaming'],
        'vsco': ['vsco', 'vsco app', 'photo editing', 'photo sharing', 'visual supply company']
    }
    
    # Check static mappings first
    if ticker_lower in static_mappings:
        for keyword in static_mappings[ticker_lower]:
            if keyword in title_lower:
                return True
    
    # Generate dynamic mappings for unknown tickers
    dynamic_mappings = generate_dynamic_mappings(ticker)
    for keyword in dynamic_mappings:
        if keyword in title_lower:
            return True
    
    return False

def norm_title(s: str) -> str:
    """Normalize title for cross-publisher deduplication."""
    s = clean_title(s).lower()
    s = re.sub(r'[^a-z0-9\s]', ' ', s)  # strip punctuation
    s = re.sub(r'\s+', ' ', s).strip()
    return s

def calculate_time_weight(article_time: int, current_time: int) -> float:
    """Calculate time-based weight with configurable half-life."""
    hours = max(0, (current_time - (article_time or current_time)) / 3600)
    return 2 ** (-hours / HALFLIFE_HRS)

def soft_dedupe(articles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Down-weight near-duplicate titles seen within DUP_WINDOW_HRS."""
    seen: Dict[str, int] = {}  # norm_title -> last_time
    out = []
    for a in sorted(articles, key=lambda x: x.get('time', 0), reverse=True):  # newest->oldest
        key = norm_title(a.get('title', ''))
        t = a.get('time', 0) or 0
        last = seen.get(key)
        if last is not None and abs(t - last) < DUP_WINDOW_HRS * 3600:
            a['dup_weight'] = DUP_PENALTY
        else:
            a['dup_weight'] = 1.0
            seen[key] = t
        out.append(a)
    return out

def weighted_metrics(arts: List[Dict[str, Any]]) -> Dict[str, float]:
    """Return final score (0..100) and weighted breadth (%) using time and dup weights."""
    if not arts:
        return {"score": 50.0, "breadth": 0.0}
    num = 0.0
    den = 0.0
    pos_w = 0.0
    for a in arts:
        w = (a.get('time_weight', 1.0)) * (a.get('dup_weight', 1.0))
        den += w
        num += a['compound'] * w
        if a['compound'] > POS_THRESH:
            pos_w += w
    if den == 0:
        return {"score": 50.0, "breadth": 0.0}
    compound = num / den
    return {
        "score": round((compound + 1) * 50, 1),
        "breadth": round(100.0 * pos_w / den, 1),
    }

def analyze_sentiment(text: str) -> Dict[str, float]:
    """Analyze sentiment of text using VADER with financial context enhancement."""
    try:
        scores = analyzer.polarity_scores(text)
        
        # Enhance financial sentiment analysis
        text_lower = text.lower()
        
        # Financial negative indicators
        negative_financial = [
            'sold', 'selling', 'ditch', 'dump', 'crash', 'plunge', 'tank', 'collapse',
            'decline', 'fall', 'drop', 'bearish', 'downgrade', 'cut', 'reduce',
            'miss', 'missed', 'disappoint', 'disappointing', 'weak', 'struggle',
            'concern', 'worried', 'risk', 'risky', 'volatile', 'uncertainty',
            'one way to go', 'follow suit', 'insider selling', 'executive selling'
        ]
        
        # Financial positive indicators  
        positive_financial = [
            'buy', 'buying', 'bullish', 'upgrade', 'raise', 'increase', 'boost',
            'beat', 'exceed', 'strong', 'growth', 'gains', 'rally', 'surge',
            'outperform', 'outperforming', 'breakthrough', 'milestone', 'record',
            'insider buying', 'executive buying', 'confidence', 'optimistic'
        ]
        
        # Count financial sentiment indicators
        neg_count = sum(1 for word in negative_financial if word in text_lower)
        pos_count = sum(1 for word in positive_financial if word in text_lower)
        
        # Adjust compound score based on financial context
        if neg_count > pos_count:
            # Negative financial sentiment detected
            scores['compound'] = max(scores['compound'] - 0.3, -1.0)
            scores['neg'] = min(scores['neg'] + 0.2, 1.0)
            scores['pos'] = max(scores['pos'] - 0.1, 0.0)
        elif pos_count > neg_count:
            # Positive financial sentiment detected
            scores['compound'] = min(scores['compound'] + 0.3, 1.0)
            scores['pos'] = min(scores['pos'] + 0.2, 1.0)
            scores['neg'] = max(scores['neg'] - 0.1, 0.0)
        
        # Normalize scores
        total = scores['pos'] + scores['neg'] + scores['neu']
        if total > 0:
            scores['pos'] /= total
            scores['neg'] /= total
            scores['neu'] /= total
        
        return scores
    except Exception:
        # Fallback to neutral sentiment
        return {'neg': 0.0, 'neu': 1.0, 'pos': 0.0, 'compound': 0.0}

def fetch_ticker_sentiment(ticker: str, limit: int = 30) -> Dict[str, Any]:
    """Fetch and analyze sentiment for a single ticker with progressive lookback."""
    try:
        # 1) Progressive lookback - check relevant articles, not just raw articles
        used_days = None
        raw = []
        for d in LOOKBACK_STEPS:
            raw = filtered_news(ticker, d)
            
            # Count relevant articles in this window
            relevant_count = 0
            for article in raw[:limit]:
                title = ''
                if 'content' in article and 'title' in article['content']:
                    title = clean_title(article['content']['title'])
                elif 'title' in article:
                    title = clean_title(article['title'])
                
                if title and is_ticker_relevant(title, ticker):
                    relevant_count += 1
            
            if relevant_count >= MIN_ARTICLES:
                used_days = d
                break
        if used_days is None:
            # still take what we have (maybe 0–4); mark used_days to the last step
            used_days = LOOKBACK_STEPS[-1]

        # 2) Process + weight
        current_time = int(time.time())
        processed = []
        for article in raw[:limit]:
            # Handle new yfinance news structure
            title = ''
            if 'content' in article and 'title' in article['content']:
                title = clean_title(article['content']['title'])
            elif 'title' in article:
                title = clean_title(article['title'])
            
            if not title:
                continue
            
            # Filter out articles not relevant to the ticker
            if not is_ticker_relevant(title, ticker):
                continue
                
            # sentiment with gentle clamping to limit outliers
            sentiment_scores = analyze_sentiment(title)
            compound = max(-0.999, min(0.999, sentiment_scores['compound']))
            score_0_100 = round((compound + 1) * 50, 1)
            
            # Extract other fields from new structure
            publisher = ''
            if 'content' in article and 'provider' in article['content']:
                publisher = article['content']['provider'].get('displayName', '')
            elif 'publisher' in article:
                publisher = article['publisher']
            
            # Handle publish time
            article_time = current_time
            if 'content' in article and 'pubDate' in article['content']:
                try:
                    pub_date = article['content']['pubDate']
                    article_time = int(datetime.fromisoformat(pub_date.replace('Z', '+00:00')).timestamp())
                except:
                    article_time = current_time
            elif 'providerPublishTime' in article:
                article_time = to_epoch_seconds(article.get('providerPublishTime'))
            elif '_ts' in article:
                article_time = article['_ts']
            
            time_weight = calculate_time_weight(article_time, current_time)
            
            # Handle URL
            url = ''
            if 'content' in article and 'canonicalUrl' in article['content']:
                url = article['content']['canonicalUrl'].get('url', '')
            elif 'link' in article:
                url = article['link']
            
            processed.append({
                "title": title,
                "publisher": publisher,
                "time": article_time,
                "compound": compound,
                "score": score_0_100,
                "url": url,
                "time_weight": time_weight
            })

        processed = soft_dedupe(processed)
        processed = sort_articles_by_impact_and_recency(processed)
        metrics = weighted_metrics(processed)
        eff_n = effective_sample(processed)
        low_sample = len(processed) < MIN_ARTICLES and eff_n < TARGET_EFFECTIVE_N

        # Calculate unique publishers count
        publishers = len(set(article['publisher'] for article in processed if article['publisher']))

        return {
            "ticker": ticker,
            "score": metrics["score"],
            "breadth": metrics["breadth"],
            "count": len(processed),
            "publishers": publishers,
            "effectiveN": round(eff_n, 2),
            "windowDays": used_days,
            "lowSample": low_sample,
            "asOf": datetime.now(timezone.utc).replace(microsecond=0).isoformat() + "Z",
            "articles": processed[:5],
            "articles_full": processed
        }
    except Exception as e:
        return {
            "ticker": ticker,
            "score": 50.0,
            "breadth": 0.0,
            "count": 0,
            "publishers": 0,
            "effectiveN": 0.0,
            "windowDays": LOOKBACK_STEPS[0],
            "lowSample": True,
            "asOf": datetime.now(timezone.utc).isoformat()+"Z",
            "articles": [],
            "articles_full": [],
            "error": str(e)
        }

def fetch_multi_ticker_sentiment(tickers: List[str], limit: int = 30) -> Dict[str, Any]:
    """Fetch and analyze sentiment for multiple tickers, merging results."""
    if not tickers:
        return {"error": "No tickers provided"}
    
    # Use 10 articles per ticker for multi-ticker analysis
    articles_per_ticker = 10
    results = [fetch_ticker_sentiment(t, articles_per_ticker) for t in tickers]
    combined = []
    for r in results:
        for a in r.get("articles_full", []):
            a = dict(a)
            a["source_ticker"] = r["ticker"]
            combined.append(a)
    combined.sort(key=lambda x: x.get("time", 0), reverse=True)

    metrics = weighted_metrics(combined)
    return {
        "tickers": tickers,
        "combined_score": metrics["score"],
        "combined_breadth": metrics["breadth"],
        "total_articles": sum(r.get("count", 0) for r in results),
        "asOf": datetime.now(timezone.utc).replace(microsecond=0).isoformat() + "Z",
        "individual_scores": [
            {
                "ticker": r["ticker"], 
                "score": r.get("score", 50.0), 
                "breadth": r.get("breadth", 0.0), 
                "count": r.get("count", 0),
                "publishers": r.get("publishers", 0),
                "lowSample": r.get("lowSample", True)
            }
            for r in results
        ],
        "articles": combined[:5],
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python sentiment_analysis.py <ticker> [limit] or python sentiment_analysis.py --multi <ticker1,ticker2,...> [limit]"}))
        sys.exit(1)
    
    if sys.argv[1] == "--multi":
        if len(sys.argv) < 3:
            print(json.dumps({"error": "Usage: python sentiment_analysis.py --multi <ticker1,ticker2,...> [limit]"}))
            sys.exit(1)
        
        tickers = sys.argv[2].split(',')
        limit = int(sys.argv[3]) if len(sys.argv) > 3 else 30
        
        result = fetch_multi_ticker_sentiment(tickers, limit)
    else:
        ticker = sys.argv[1]
        limit = int(sys.argv[2]) if len(sys.argv) > 2 else 30
        
        result = fetch_ticker_sentiment(ticker, limit)
    
    print(json.dumps(result, indent=2))
    sys.exit(0)
