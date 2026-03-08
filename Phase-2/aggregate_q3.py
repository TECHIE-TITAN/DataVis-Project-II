"""
aggregate_q3.py — Q3 Geographic Map Pre-aggregation
====================================================
Question 3: How does geographic location within Texas interact with
            financial stress to predict churn risk?

Input : ../Phase-1_Docs/autoinsurance_churn.csv  (1,680,909 rows total;
                                                   ~1,427,190 TX rows)
Output: Prints the JavaScript assignment for q3_data_loader.js

Strategy
--------
All 1,427,190 Texas rows are processed. Individual-point rendering in a
browser becomes impractical at that scale, so rows are aggregated to
city × county level (~99 groups). Each output record represents one
city and carries:

  latitude              – mean of individual customer latitudes
  longitude             – mean of individual customer longitudes
  city                  – city name
  county                – county name
  state                 – always "TX"
  churn_rate            – mean(Churn)   [0–1]
  avg_days_tenure       – mean(days_tenure)
  financial_stability_index – mean of (home_owner + good_credit + college_degree) / 3
  count                 – number of customers in this city

financial_stability_index (FSI) derivation:
  home_owner, good_credit, college_degree are 0/1 columns.
  FSI = (home_owner + good_credit + college_degree) / 3  ∈ [0, 1]

The JS charts use: latitude, longitude, city, county, churn_rate,
avg_days_tenure, financial_stability_index, count.
"""

import csv
import json
import os
import sys
from collections import defaultdict

# ── Path ──────────────────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH   = os.path.join(SCRIPT_DIR, '..', 'Phase-1_Docs', 'autoinsurance_churn.csv')

# ── Accumulator ───────────────────────────────────────────────────────────────
# key: (city, county)
acc = defaultdict(lambda: {
    'lat_sum': 0.0, 'lon_sum': 0.0,
    'churn_sum': 0.0, 'tenure_sum': 0.0, 'fsi_sum': 0.0,
    'n': 0,
    'city': '', 'county': '', 'state': 'TX'
})

# ── Stream ────────────────────────────────────────────────────────────────────
print("Reading CSV …", file=sys.stderr)
rows_read = rows_skipped = rows_non_tx = 0

with open(CSV_PATH, newline='', encoding='utf-8') as fh:
    reader = csv.DictReader(fh)
    for row in reader:
        # Texas only
        if row['state'].strip() != 'TX':
            rows_non_tx += 1
            continue

        try:
            lat   = float(row['latitude'])
            lon   = float(row['longitude'])
            churn = float(row['Churn'])
            days  = float(row['days_tenure'])
            ho    = float(row['home_owner'])
            gc    = float(row['good_credit'])
            cd    = float(row['college_degree'])
        except (ValueError, KeyError):
            rows_skipped += 1
            continue

        city   = row['city'].strip()
        county = row['county'].strip()

        fsi = (ho + gc + cd) / 3.0

        key = (city, county)
        a   = acc[key]
        a['lat_sum']    += lat
        a['lon_sum']    += lon
        a['churn_sum']  += churn
        a['tenure_sum'] += days
        a['fsi_sum']    += fsi
        a['n']          += 1
        a['city']        = city
        a['county']      = county

        rows_read += 1

print(f"  TX rows processed  : {rows_read:,}", file=sys.stderr)
print(f"  Non-TX rows skipped: {rows_non_tx:,}", file=sys.stderr)
print(f"  Malformed skipped  : {rows_skipped:,}", file=sys.stderr)
print(f"  City groups        : {len(acc)}", file=sys.stderr)

# ── Build output records ──────────────────────────────────────────────────────
records = []
for (city, county), a in sorted(acc.items(), key=lambda x: -x[1]['n']):
    n = a['n']
    if n == 0:
        continue
    records.append({
        'latitude':                   round(a['lat_sum']    / n, 6),
        'longitude':                  round(a['lon_sum']    / n, 6),
        'city':                       a['city'],
        'county':                     a['county'],
        'state':                      'TX',
        'churn_rate':                 round(a['churn_sum']  / n, 6),
        'avg_days_tenure':            round(a['tenure_sum'] / n, 2),
        'financial_stability_index':  round(a['fsi_sum']    / n, 6),
        'count':                      n,
    })

# ── Print JS ──────────────────────────────────────────────────────────────────
payload = json.dumps(records, separators=(',', ':'))
print(
    f"// Q3 geographic data — pre-aggregated from autoinsurance_churn.csv\n"
    f"// All {rows_read:,} Texas rows aggregated into {len(records)} city-level records.\n"
    f"// Fields: latitude, longitude, city, county, state,\n"
    f"//         churn_rate, avg_days_tenure, financial_stability_index, count\n"
    f"// financial_stability_index = mean(home_owner + good_credit + college_degree) / 3\n"
    f"const q3Data = {payload};"
)
