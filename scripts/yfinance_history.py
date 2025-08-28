#!/usr/bin/env python
import sys
import json
import yfinance as yf

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps([]))
        sys.exit(0)
    symbol = sys.argv[1]
    days = int(sys.argv[2]) if len(sys.argv) > 2 else 60
    try:
        t = yf.Ticker(symbol)
        # Choose interval/period based on requested days
        if days <= 1:
            period = "1d"
            interval = "5m"  # Use 5m for better intraday resolution
        elif days <= 7:
            period = "7d"
            interval = "60m"
        elif days <= 30:
            period = f"{days}d"
            interval = "1d"
        else:
            period = f"{min(days, 365)}d"
            interval = "1d"

        # Use prepost=True to include pre/post market data for better coverage
        df = t.history(period=period, interval=interval, auto_adjust=True, prepost=True)
        if df is None or df.empty:
            # Fallbacks
            if interval != "1d":
                df = t.history(period="7d", interval="60m", auto_adjust=True, prepost=True)
            if df is None or df.empty:
                df = t.history(period="3mo", interval="1d", auto_adjust=True, prepost=True)
        out = []
        reset_df = df.reset_index()
        for idx, row in reset_df.iterrows():
            # Index label may be 'Datetime' (intraday) or 'Date' (daily)
            key = 'Datetime' if 'Datetime' in reset_df.columns else 'Date'
            try:
                dt = row[key].to_pydatetime()
                ts = int(dt.timestamp() * 1000)
                
                # For 1-day data, filter to regular trading hours (9:30 AM - 4:00 PM ET)
                if days <= 1 and 'Datetime' in reset_df.columns:
                    # Convert to ET timezone for trading hours check
                    import pytz
                    et = pytz.timezone('US/Eastern')
                    dt_et = dt.astimezone(et)
                    hour = dt_et.hour
                    minute = dt_et.minute
                    time_minutes = hour * 60 + minute
                    
                    # Trading hours: 9:30 AM (570 minutes) to 4:00 PM (960 minutes)
                    if time_minutes < 570 or time_minutes > 960:
                        continue
                        
            except Exception:
                ts = int(idx)
            out.append({
                "timestamp": ts,
                "open": float(row.get('Open', 0.0)),
                "high": float(row.get('High', 0.0)),
                "low": float(row.get('Low', 0.0)),
                "close": float(row.get('Close', 0.0)),
                "volume": int(row.get('Volume', 0)),
            })
        out.sort(key=lambda x: x["timestamp"])  # ensure ascending for chart
        print(json.dumps(out))
        sys.exit(0)
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


