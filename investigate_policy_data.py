#!/usr/bin/env python
import requests
import json
from datetime import datetime, timedelta

# Test Political Pulse
r = requests.get('http://localhost:3000/api/political-pulse')
print(f'Status: {r.status_code}')
if r.status_code == 200:
    data = r.json()
    print('Current Political Pulse items:')
    for item in data['items']:
        print(f'- {item["key"]}: {item["value"]} (delta: {item["deltaPct"]}%)')
    print(f'As of: {data["asOf"]}')
else:
    print(f'Error: {r.text}')

print('\n' + '='*50)

# Check FRED data directly for Policy Uncertainty
print('Checking FRED Policy Uncertainty data directly...')
fred_url = "https://api.stlouisfed.org/fred/series/observations?series_id=USEPUINDXD&api_key=demo&file_type=json&limit=10&sort_order=desc"
try:
    response = requests.get(fred_url)
    print(f'FRED API Status: {response.status_code}')
    if response.status_code == 200:
        data = response.json()
        print('Latest Policy Uncertainty observations:')
        for obs in data['observations'][:5]:
            date = obs['date']
            value = obs['value']
            print(f'  {date}: {value}')
except Exception as e:
    print(f'FRED API error: {e}')

# Check Regulatory data sources
print('\nChecking Federal Register API...')
fed_reg_url = "https://www.federalregister.gov/api/v1/documents.json?per_page=1&conditions[type][]=RULE"
try:
    response = requests.get(fed_reg_url)
    print(f'Federal Register API Status: {response.status_code}')
    if response.status_code == 200:
        data = response.json()
        print(f'Federal Register total RULE documents: {data["count"]}')
except Exception as e:
    print(f'Federal Register API error: {e}')

# Check Trade data (FRED)
print('\nChecking Trade Policy Uncertainty (FRED)...')
trade_url = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=EPUTRADE"
try:
    response = requests.get(trade_url)
    print(f'FRED Trade Data Status: {response.status_code}')
    if response.status_code == 200:
        lines = response.text.strip().split('\n')
        print(f'Total lines: {len(lines)}')
        print('Latest Trade data:')
        for line in lines[-3:]:
            print(f'  {line}')
except Exception as e:
    print(f'FRED Trade API error: {e}')

# Check Geopolitics data
print('\nChecking Geopolitical Risk data...')
gpr_url = "https://www.matteoiacoviello.com/gpr_files/data_gpr_export.xls"
try:
    response = requests.get(gpr_url)
    print(f'GPR Excel Status: {response.status_code}')
    print(f'GPR Excel Content-Length: {len(response.content)} bytes')
except Exception as e:
    print(f'GPR Excel error: {e}')
