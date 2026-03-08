"""
aggregate_q2.py — Q2 Lifecycle & Family Pre-aggregation
========================================================
Question 2: How does family life-cycle stage moderate the relationship
            between age and churn risk, and how does tenure affect the
            composition of churners by family structure?

Input : ../Phase-1_Docs/autoinsurance_churn.csv  (1,680,909 rows)
Output: Prints the JavaScript assignments that make up q2_data_loader.js

Three arrays are produced:

1. q2Data  (24 rows)
   — 6 age groups × 4 family structures → mean churn rate
   — Age groups: 18-25 | 26-35 | 36-45 | 46-55 | 56-65 | 65+
   — Structures: Married-Kids | Married-NoKids | Single-Kids | Single-NoKids

2. q2BubbleData  (one row per exact age_in_years × family structure)
   — Fields: age_in_years, structure, churn (mean), income (mean)

3. q2StackedData  (5 rows)
   — Tenure groups: 0-1yr | 1-2yr | 2-3yr | 3-4yr | 4yr+
   — For rows where Churn==1: percentage breakdown by family structure
   — Fields: tenure_group, Married-Kids%, Married-NoKids%, Single-Kids%, Single-NoKids%, total_churners

Family structure derivation:
  marital_status == 'Married'  AND  has_children == 1  →  Married-Kids
  marital_status == 'Married'  AND  has_children == 0  →  Married-NoKids
  marital_status == 'Single'   AND  has_children == 1  →  Single-Kids
  marital_status == 'Single'   AND  has_children == 0  →  Single-NoKids
"""

import csv
import json
import os
import sys
from collections import defaultdict

# ── Path ──────────────────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH   = os.path.join(SCRIPT_DIR, '..', 'Phase-1_Docs', 'autoinsurance_churn.csv')

# ── Bucket helpers ────────────────────────────────────────────────────────────
STRUCTURES = ['Married-Kids', 'Married-NoKids', 'Single-Kids', 'Single-NoKids']

AGE_GROUPS = [
    ('18-25', 18, 25),
    ('26-35', 26, 35),
    ('36-45', 36, 45),
    ('46-55', 46, 55),
    ('56-65', 56, 65),
    ('65+',   66, 999),
]

TENURE_GROUPS = [
    ('0-1yr', 0,     365.25),
    ('1-2yr', 365.25,  730.5),
    ('2-3yr', 730.5,  1095.75),
    ('3-4yr', 1095.75, 1461.0),
    ('4yr+',  1461.0, 1e9),
]

def age_group(age):
    for label, lo, hi in AGE_GROUPS:
        if lo <= age <= hi:
            return label
    return None

def tenure_group(days):
    for label, lo, hi in TENURE_GROUPS:
        if lo <= days < hi:
            return label
    return None

def family_structure(marital, has_children):
    m = 'Married' if marital == 'Married' else 'Single'
    k = 'Kids' if has_children == 1 else 'NoKids'
    return f"{m}-{k}"

# ── Accumulators ──────────────────────────────────────────────────────────────
# 1) q2Data: (age_group, structure) → {churn_sum, n}
q2_acc = defaultdict(lambda: {'churn_sum': 0.0, 'n': 0})

# 2) q2BubbleData: (age_in_years, structure) → {churn_sum, income_sum, n}
bubble_acc = defaultdict(lambda: {'churn_sum': 0.0, 'income_sum': 0.0, 'n': 0})

# 3) q2StackedData: tenure_group → {structure → churner count, total}
stacked_acc = defaultdict(lambda: {s: 0 for s in STRUCTURES} | {'total': 0})

# ── Stream ────────────────────────────────────────────────────────────────────
print("Reading CSV …", file=sys.stderr)
rows_read = rows_skipped = 0

with open(CSV_PATH, newline='', encoding='utf-8') as fh:
    reader = csv.DictReader(fh)
    for row in reader:
        try:
            age   = int(float(row['age_in_years']))
            days  = float(row['days_tenure'])
            churn = int(row['Churn'])
            inc   = float(row['income'])
            has_k = int(float(row['has_children']))
            mstat = row['marital_status'].strip()
        except (ValueError, KeyError):
            rows_skipped += 1
            continue

        ag  = age_group(age)
        tg  = tenure_group(days)
        st  = family_structure(mstat, has_k)

        if ag is None or tg is None:
            rows_skipped += 1
            continue

        rows_read += 1

        # 1) q2Data
        key1 = (ag, st)
        q2_acc[key1]['churn_sum'] += churn
        q2_acc[key1]['n']         += 1

        # 2) Bubble
        key2 = (age, st)
        bubble_acc[key2]['churn_sum']  += churn
        bubble_acc[key2]['income_sum'] += inc
        bubble_acc[key2]['n']          += 1

        # 3) Stacked (only churners)
        if churn == 1:
            stacked_acc[tg][st]    += 1
            stacked_acc[tg]['total'] += 1

print(f"  Rows processed : {rows_read:,}", file=sys.stderr)
print(f"  Rows skipped   : {rows_skipped:,}", file=sys.stderr)

# ── Build q2Data ──────────────────────────────────────────────────────────────
q2Data = []
for ag_label, _, __ in AGE_GROUPS:
    for st in STRUCTURES:
        acc = q2_acc[(ag_label, st)]
        n = acc['n']
        q2Data.append({
            'age_group': ag_label,
            'structure': st,
            'churn':     round(acc['churn_sum'] / n, 10) if n else 0.0,
        })

# ── Build q2BubbleData ────────────────────────────────────────────────────────
q2BubbleData = []
for (age_yr, st), acc in sorted(bubble_acc.items()):
    n = acc['n']
    q2BubbleData.append({
        'age_in_years': age_yr,
        'structure':    st,
        'churn':        round(acc['churn_sum']  / n, 10) if n else 0.0,
        'income':       round(acc['income_sum'] / n, 10) if n else 0.0,
    })

# ── Build q2StackedData ───────────────────────────────────────────────────────
q2StackedData = []
for tg_label, _, __ in TENURE_GROUPS:
    acc   = stacked_acc[tg_label]
    total = acc['total']
    row   = {'tenure_group': tg_label, 'total_churners': total}
    for st in STRUCTURES:
        row[st] = round(acc[st] / total * 100, 12) if total else 0.0
    q2StackedData.append(row)

# ── Print JS ──────────────────────────────────────────────────────────────────
def js_array(name, data):
    return f"const {name} = {json.dumps(data, separators=(',', ':'))};"

print("// Q2 data — pre-aggregated from autoinsurance_churn.csv")
print(f"// Rows processed: {rows_read:,}")
print(js_array('q2Data',        q2Data))
print(js_array('q2BubbleData',  q2BubbleData))
print(js_array('q2StackedData', q2StackedData))
