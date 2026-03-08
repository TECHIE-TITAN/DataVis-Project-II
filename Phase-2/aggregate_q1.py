"""
aggregate_q1.py — Q1 Heatmap Pre-aggregation
=============================================
Question 1: How do tenure and income jointly predict churn risk,
            home-ownership, credit quality, and home market value?

Input : ../Phase-1_Docs/autoinsurance_churn.csv  (1,680,909 rows)
Output: Prints the JavaScript assignment that should replace the
        window.heatmapData block at the top of heatmap_bus.js

Aggregation dimensions:
  - Rows   : 5 tenure buckets  — 0-1yr | 1-2yr | 2-4yr | 4-8yr | 8+yr
  - Columns: 6 income buckets  — <25K | 25-50K | 50-75K | 75-100K | 100-150K | 150K+

Per cell we compute:
  churn     — mean(Churn)            (0–1)
  homeowner — mean(home_owner)       (0–1)
  credit    — mean(good_credit)      (0–1)
  homevalue — mean(home_market_value)(dollars)
  count     — number of rows
"""

import csv
import json
import os
import sys

# ── Paths ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH   = os.path.join(SCRIPT_DIR, '..', 'Phase-1_Docs', 'autoinsurance_churn.csv')
OUT_JS     = os.path.join(SCRIPT_DIR, 'heatmap_bus.js')   # we'll only update the data block

# ── Bucket definitions ────────────────────────────────────────────────────────
TENURE_BUCKETS = ['0-1yr', '1-2yr', '2-4yr', '4-8yr', '8+yr']
INCOME_BUCKETS = ['<25K', '25-50K', '50-75K', '75-100K', '100-150K', '150K+']

def tenure_bucket(days):
    """Map days_tenure (float) → bucket label."""
    y = days / 365.25
    if   y <  1: return '0-1yr'
    elif y <  2: return '1-2yr'
    elif y <  4: return '2-4yr'
    elif y <  8: return '4-8yr'
    else:        return '8+yr'

def income_bucket(inc):
    """Map annual income (float) → bucket label."""
    if   inc <  25_000: return '<25K'
    elif inc <  50_000: return '25-50K'
    elif inc <  75_000: return '50-75K'
    elif inc < 100_000: return '75-100K'
    elif inc < 150_000: return '100-150K'
    else:               return '150K+'

# ── Accumulators ──────────────────────────────────────────────────────────────
# keyed by (tenure_bucket, income_bucket)
sums   = {(t, i): {'churn': 0.0, 'homeowner': 0.0, 'credit': 0.0, 'homevalue': 0.0, 'n': 0}
          for t in TENURE_BUCKETS for i in INCOME_BUCKETS}

# ── Stream through CSV ─────────────────────────────────────────────────────────
print(f"Reading {CSV_PATH} …", file=sys.stderr)
rows_read = 0
rows_skipped = 0

with open(CSV_PATH, newline='', encoding='utf-8') as fh:
    reader = csv.DictReader(fh)
    for row in reader:
        try:
            days = float(row['days_tenure'])
            inc  = float(row['income'])
            churn  = float(row['Churn'])
            ho     = float(row['home_owner'])
            gc     = float(row['good_credit'])
            hmv    = float(row['home_market_value'])
        except (ValueError, KeyError):
            rows_skipped += 1
            continue

        key = (tenure_bucket(days), income_bucket(inc))
        acc = sums[key]
        acc['churn']     += churn
        acc['homeowner'] += ho
        acc['credit']    += gc
        acc['homevalue'] += hmv
        acc['n']         += 1
        rows_read += 1

print(f"  Rows processed : {rows_read:,}", file=sys.stderr)
print(f"  Rows skipped   : {rows_skipped:,}", file=sys.stderr)

# ── Build output cells ────────────────────────────────────────────────────────
cells = []
for t in TENURE_BUCKETS:
    for i in INCOME_BUCKETS:
        acc = sums[(t, i)]
        n   = acc['n']
        if n == 0:
            continue
        cells.append({
            'tenure':    t,
            'income':    i,
            'churn':     round(acc['churn']     / n, 4),
            'homeowner': round(acc['homeowner'] / n, 4),
            'credit':    round(acc['credit']    / n, 4),
            'homevalue': round(acc['homevalue'] / n),
            'count':     n,
        })

# ── Print JS assignment ───────────────────────────────────────────────────────
payload = json.dumps({'cells': cells}, separators=(',', ':'))
print("// ─── Real aggregated data from autoinsurance_churn.csv ───────────────────────")
print("// Pre-computed with Python: {:,} rows → {:,} cells (5 tenure × 6 income).".format(rows_read, len(cells)))
print("// Fields per cell:")
print("//   churn     – churn rate            (0–1, avg of Churn column)")
print("//   homeowner – home-ownership rate   (0–1, avg of home_owner column)")
print("//   credit    – good-credit rate      (0–1, avg of good_credit column)")
print("//   homevalue – avg home market value (dollars)")
print("//   count     – number of customers in this cell")
print(f"window.heatmapData = {payload};")
print(f"\n// Total rows processed: {rows_read:,}  |  cells: {len(cells)}", file=sys.stderr)
