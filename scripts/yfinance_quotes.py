#!/usr/bin/env python
import sys
import json
import yfinance as yf
import time

def fetch_quotes(symbols):
    data = []
    for sym in symbols:
        try:
            t = yf.Ticker(sym)
            
            # Get live quote data with multiple fallbacks
            info = t.fast_info if hasattr(t, 'fast_info') else {}
            
            # Try multiple sources for current price
            price = 0.0
            if info.get('last_price'):
                price = float(info.get('last_price'))
            elif info.get('lastPrice'):
                price = float(info.get('lastPrice'))
            else:
                # Fallback: get latest from today's intraday data
                try:
                    hist = t.history(period="1d", interval="1m", prepost=True, auto_adjust=True)
                    if hist is not None and not hist.empty:
                        price = float(hist['Close'].iloc[-1])
                except:
                    pass
            
            # Get previous close
            previous_close = 0.0
            if info.get('previous_close'):
                previous_close = float(info.get('previous_close'))
            elif info.get('previousClose'):
                previous_close = float(info.get('previousClose'))
            else:
                # Fallback: get from yesterday's data
                try:
                    hist = t.history(period="2d", interval="1d", auto_adjust=True)
                    if hist is not None and not hist.empty and len(hist) >= 2:
                        previous_close = float(hist['Close'].iloc[-2])  # Second to last day
                except:
                    pass
            
            change = price - previous_close if previous_close else 0.0
            change_percent = (change / previous_close * 100.0) if previous_close else 0.0
            
            # 1 month daily closes for sparkline (include today)
            hist = t.history(period="1mo", interval="1d", auto_adjust=True, prepost=True)
            closes = []
            if hist is not None and not hist.empty:
                closes = [float(c) for c in hist['Close'].tolist()[-30:]]
            
            data.append({
                "symbol": sym.upper(),
                "price": round(price, 2),
                "change": round(change, 2),
                "changePercent": round(change_percent, 5),
                "history": closes,
                "prevClose": round(previous_close, 2),
                "updatedAt": int(time.time() * 1000),
            })
        except Exception as e:
            data.append({
                "symbol": sym.upper(),
                "error": str(e),
                "price": 0,
                "change": 0,
                "changePercent": 0,
                "history": [],
                "updatedAt": int(time.time() * 1000),
            })
    return data

if __name__ == "__main__":
    symbols = sys.argv[1:]
    if not symbols:
        print(json.dumps([]))
        sys.exit(0)
    quotes = fetch_quotes(symbols)
    print(json.dumps(quotes))
    sys.exit(0)


