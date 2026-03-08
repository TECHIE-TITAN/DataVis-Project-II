# Project Phase-2: Visualization Description

## Overview
This document describes the visualization designs for analyzing customer churn patterns in the Chubb Insurance auto-insurance dataset.

---

## Question 1: Financial Churn Analysis
**Research Question**: Was customer churning driven by financial instability, low loyalty, or loss of interest?

### Visualization Suite: Aligned Heatmaps (4 visualizations)

**1. Churn Density Map**
- **Type**: Heatmap
- **Purpose**: Identify concentrated churn hotspots
- **Encoding**: Tenure (X-axis) × Income (Y-axis), Color gradient (Green→Red) represents churn density
- **Insight**: Reveals where churn is most concentrated across financial-temporal dimensions

**2. Home Ownership Map**
- **Type**: Heatmap  
- **Purpose**: Correlate churn with economic security indicators
- **Encoding**: Tenure (X-axis) × Income (Y-axis), Color intensity shows % homeownership
- **Insight**: Determines if high-churn regions correspond to economically vulnerable customers

**3. Credit Quality Map**
- **Type**: Heatmap
- **Purpose**: Distinguish stress-driven vs interest-driven churn
- **Encoding**: Tenure (X-axis) × Income (Y-axis), Color intensity shows % good credit
- **Insight**: Low credit in high-churn cells = stress-driven; High credit = interest-driven churn

**4. Home Market Value Map**
- **Type**: Heatmap
- **Purpose**: Assess wealth beyond reported income
- **Encoding**: Tenure (X-axis) × Income (Y-axis), Color intensity shows average home value
- **Insight**: Reveals true financial stability considering asset wealth

---

## Question 2: Demographic Volatility Analysis
**Research Question**: Which demographic profiles (age, marital status, family size) are most volatile, and does family reduce churn risk?

### Visualization Suite: Multi-dimensional Comparison (3 visualizations)

**1. Lifecycle Volatility Curve**
- **Type**: Multi-line chart
- **Purpose**: Compare churn trajectories across family structures
- **Encoding**: Age groups (X-axis) × Churn rate (Y-axis), 4 colored lines (Single-NoKids, Single-Kids, Married-NoKids, Married-Kids)
- **Insight**: Shows how churn risk evolves through life stages for different family compositions

**2. Financial Stability & Age Bubble Chart**
- **Type**: Bubble chart
- **Purpose**: Correlate income with churn across age demographics
- **Encoding**: Age (X-axis) × Churn rate (Y-axis), Bubble size = income, Color = marital status
- **Insight**: Reveals whether financial stability mitigates churn at different life stages

**3. Risk Composition Evolution**
- **Type**: Stacked bar chart
- **Purpose**: Track demographic shifts in churner population over tenure
- **Encoding**: Tenure stages (X-axis) × % of churners (Y-axis), Color-coded family structure segments
- **Insight**: Shows which demographics dominate churn at different loyalty stages

---

## Question 3: Geographic Churn Patterns
**Research Question**: Are there geographic churn hotspots, and do they persist after controlling for tenure and financial status?

### Visualization Suite: Spatial Analysis (3 visualizations)

**1. Spatial Churn Hotspot Map**
- **Type**: Hexbin map
- **Purpose**: Detect dense geographic churn concentrations without overplotting
- **Encoding**: Lat/Long position, Color = churn rate, Size = customer count per hexbin
- **Insight**: Identifies specific geographic regions with elevated churn

**2. Geographic Tenure-Churn Gradient Map**
- **Type**: Gradient map (choropleth with transparency)
- **Purpose**: Assess whether churn hotspots persist after controlling for customer loyalty
- **Encoding**: Regional position, Color = average tenure, Opacity = churn rate
- **Insight**: Distinguishes between low-loyalty churn vs persistent regional issues

**3. Financial Stress vs Geography Bubble Map**
- **Type**: Bubble map
- **Purpose**: Link geographic churn to financial instability
- **Encoding**: Regional position, Bubble size = churn rate, Color = composite stability index (income + homeownership + credit)
- **Insight**: Determines if geographic churn is driven by regional economic stress

---

## Design Rationale

**Why Multiple Visualizations?**
- Churn is multidimensional—no single view captures financial, demographic, temporal, and spatial factors simultaneously
- Aligned encodings (consistent axes across heatmaps) enable direct comparison
- Different chart types suit different analytical tasks: heatmaps for density, lines for trends, maps for spatial patterns

**Target Users**
- Insurance data analysts, CRM teams, pricing/underwriting teams, regional managers, business strategists

**Key Analytical Tasks Supported**
- Cluster discovery, dependency comparison, correlation assessment, trend analysis, spatial pattern detection