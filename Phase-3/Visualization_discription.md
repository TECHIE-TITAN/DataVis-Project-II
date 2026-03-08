# Project Phase-3: Visualization Description (Phase 3 Update)

## Overview
This document describes the visualization designs for analyzing customer churn patterns in the Chubb Insurance auto-insurance dataset. Phase 3 incorporates TA feedback by adding linked hovering across heatmaps, annotation markers for risk-flip intersections, absolute churner count labels, a fully connected Q2 cross-chart event bus, Texas county base layers on all maps, a bivariate hexbin color scale, semantic zoom with cluster-to-point transitions, and cross-map syncing between Map 2 and Map 3.

---

## Question 1: Financial Churn Analysis
**Research Question**: Was customer churning driven by financial instability, low loyalty, or loss of interest?

### Visualization Suite: Aligned Heatmaps (4 visualizations)

**Phase 3 Interactivity — Linked Hovering (`heatmap_bus.js`)**
A shared `window.heatmapBus` event bus synchronizes all four heatmaps. Hovering over any cell (e.g., "0–1yr / <25K") simultaneously highlights the corresponding cell in all other three heatmaps (opacity dimmed to 0.25 on non-hovered cells, white stroke on the highlighted cell) and pops a single combined tooltip showing Churn Rate, Homeownership %, Good Credit %, and Avg Home Value for that segment — eliminating the need for the user to mentally cross-reference four separate charts.

---

**1. Churn Density Map**
| Attribute | Detail |
|---|---|
| **Type** | Heatmap |
| **Marks** | Rectangles + embedded percentage text |
| **Channels** | X: tenure bucket, Y: income bracket, Color: churn rate (diverging green→red) |
| **Questions Answered** | Which tenure–income segments churn most/least? Does churn drop with tenure? |
| **Insights** | Hotspots isolate high-risk customer segments; acts as a baseline for diagnosing causes. |
| **Why Better** | 2D segmentation for instant pattern spotting; avoids scatter overplotting and table-heavy reading. |

**2. Home Ownership Map**
| Attribute | Detail |
|---|---|
| **Type** | Heatmap |
| **Marks** | Rectangles + embedded percentage text |
| **Channels** | Same tenure×income grid; Color: homeownership % (sequential) |
| **Questions Answered** | Does high churn align with low homeownership? Which segments are economically insecure? |
| **Insights** | High churn + low ownership = instability-driven churn; high churn + high ownership = non-financial churn. |
| **Why Better** | Aligned grid enables direct causality check vs Heatmap 1 without cluttering one chart. |

**3. Credit Quality Map**
| Attribute | Detail |
|---|---|
| **Type** | Heatmap |
| **Marks** | Rectangles + embedded percentage text |
| **Channels** | Same tenure×income grid; Color: good credit % (sequential) |
| **Questions Answered** | Are churn hotspots linked to poor credit, or is churn happening even with good credit? |
| **Insights** | Separates stress-driven churn (low credit) from competitor/service churn (high credit). |
| **Why Better** | Keeps credit as an independent diagnostic variable; alignment supports fast cross-referencing. |

**4. Home Market Value Map**
| Attribute | Detail |
|---|---|
| **Type** | Heatmap |
| **Marks** | Rectangles + embedded dollar-value text |
| **Channels** | Same tenure×income grid; Color: average home value (sequential) |
| **Questions Answered** | Are some "low income" churners actually asset-rich? Does wealth reduce churn? |
| **Insights** | Exposes asset-based stability; flags churn that is not explained by income alone. |
| **Why Better** | Captures wealth beyond income; completes financial diagnosis without breaking the heatmap workflow. |

---

## Question 2: Demographic Volatility Analysis
**Research Question**: Which demographic profiles (age, marital status, family size) are most volatile, and does family reduce churn risk?

### Visualization Suite: Multi-dimensional Comparison (3 visualizations)

**Phase 3 Interactivity — Shared `q2ChartBus`**
A `window.q2ChartBus` event bus ties all three Q2 visualizations together. Highlighting or hovering on a family structure in any one chart (line, bubble, or stacked bar) propagates to the other two — dimming unselected lines/bubbles/bars and brightening the chosen profile. Clicking a ⚡ Risk Flip marker further filters the bubble chart and stacked bar to show only the two involved structures across the relevant age range, with a summary panel updating to describe the flip.

---

**Chart 1 — Lifecycle Volatility Curve (Multi-line)**
| Attribute | Detail |
|---|---|
| **Type** | Multi-line chart |
| **Marks** | Lines (solid, high-contrast) + interactive data-point circles + animated ⚡ Risk Flip diamond markers |
| **Channels** | X: age group, Y: churn rate, Color: family structure (Red/Amber/Green/Blue — all solid lines, no dashes) |
| **Phase 3 Additions** | 6 annotated ⚡ "Risk Flip" markers at all line-crossing intersections (gold diamond + animated pulse ring + dashed connector to a callout flag). Hovering a marker shows which structure was riskier before vs after the crossing; clicking it filters all Q2 charts to that pair and age range. All lines changed to solid with distinct high-contrast colors to improve readability. |
| **Questions Answered** | How does churn change across life stages? Which family type churns most at each age? Where does the ranking "flip"? |
| **Insights** | Reveals 6 life-stage churn-risk flips; marriage and kids stabilize churn but the effect reverses at certain ages. |
| **Why Better** | Lines emphasize trends + intersections; solid high-contrast colors eliminate reading difficulty from dashes. |

**Chart 2 — Financial Stability & Age Bubble Chart**
| Attribute | Detail |
|---|---|
| **Type** | Bubble chart |
| **Marks** | Bubbles (customers), color-coded by family structure |
| **Channels** | X: age (years), Y: churn rate, Color: family structure, Bubble size: income proxy |
| **Phase 3 Additions** | Subscribes to `q2ChartBus`; hovering/clicking legend or Risk Flip marker dims non-selected bubbles and highlights the chosen family structure across all three charts simultaneously. |
| **Questions Answered** | Who dominates churn at early vs late tenure? Do families churn late or early? |
| **Insights** | Tracks churner composition shift over loyalty stages; highlights persistent risk groups. |

**Chart 3 — Risk Composition Evolution (100% Stacked Bar)**
| Attribute | Detail |
|---|---|
| **Type** | 100% stacked bar chart |
| **Marks** | Stacked bars + absolute count labels (number of churners per tenure stage shown inside or above each segment) |
| **Channels** | X: customer tenure stage, Y: % of churners, Color: family structure; Numerical Text: absolute churner count per bar |
| **Phase 3 Additions** | Absolute count labels prevent small-sample trends from appearing as large signals. Subscribes to `q2ChartBus` for cross-chart highlighting. |
| **Questions Answered** | Who dominates churn at early vs late tenure? Does small sample size inflate a particular group's apparent share? |
| **Insights** | 100% stacking isolates composition changes independent of churn volume; better than pie/grouped bars. |

---

## Question 3: Geographic Churn Patterns
**Research Question**: Are there geographic churn hotspots, and do they persist after controlling for tenure and financial status?

### Visualization Suite: Spatial Analysis (3 visualizations)

**Phase 3 Shared Infrastructure (`q3_shared.js`)**
- **Texas County Base Layer**: All three maps asynchronously load Texas county boundaries from the US Atlas CDN (FIPS prefix 48) via `loadTexasCounties()` and render subtle county outlines (`drawTexasBase()`) as a geographic reference, with major cities labeled (Houston, Dallas, Austin, San Antonio, El Paso).
- **Event Bus (`q3EventBus`)**: A pub/sub bus that carries `highlight-customers` events (arrays of customer indices). When a stress-level cluster is selected in Map 3, it emits selected indices; Map 2 listens and highlights those exact customers, showing whether "stressed" customers are also "new" customers.
- **Shared Legend Utilities**: `drawGradientLegend()`, `drawSizeLegend()`, and `drawCategoryLegend()` ensure a consistent legend style across all three maps.

---

**Map 1 — Spatial Churn Hotspot (Hexbin)**
| Attribute | Detail |
|---|---|
| **Type** | Hexbin map |
| **Marks** | Uniform-size hexagonal bins |
| **Channels** | Position: lat/long projection; Color: **bivariate** (3×3 grid encoding both churn rate and customer count simultaneously) |
| **Phase 3 Additions** | **(a) Texas county outline base layer.** **(b) Bivariate color scale** — a 3×3 grid replacing single-variable color. Column = churn tier (low/mid/high); Row = customer count tier (low/mid/high). Light gray = few customers + low churn; Red = few customers + high churn (critical risk); Blue = many customers + low churn (healthy cluster); Dark purple = many customers + high churn (urgent hotspot). Uniform hexbin size eliminates the size-vs-color competition problem. **(c) Bivariate legend** — 3×3 color grid with axis labels (Churn Rate →, Customer Count ↑) plus three corner callout descriptors. |
| **Questions Answered** | Where are churn clusters? Which zones have the highest churn? How dense are clusters? |
| **Insights** | Small, dark hexbins (high-churn, small groups) are now equally visible as large light hexbins; eliminates misleading size dominance. |
| **Why Better** | Bivariate color removes the size-vs-color competition; both dimensions are readable at a glance. |

**Map 2 — Geographic Tenure-Churn Gradient**
| Attribute | Detail |
|---|---|
| **Type** | Scatter map with semantic zoom |
| **Marks** | Individual customer circles (at high zoom) / hexbin clusters (at overview) |
| **Channels** | Position: geography; Color: tenure (sequential Blues, light = new → dark = long-tenure); Opacity: churn status (higher opacity = churned) |
| **Phase 3 Additions** | **(a) Texas county outline base layer.** **(b) Semantic zoom** — at zoom ≥ 2.5×, hexbin clusters dissolve into individual customer points; zooming out reverts to hexbins. Zoom controls (Zoom In, Zoom Out, Reset) provided. **(c) Legends** — gradient legend for tenure (days) and an opacity legend for churn status. **(d) Event bus subscriber** — when Map 3 emits a stress-level selection, Map 2 highlights those customers (enlarging radius, adding white stroke, dimming others), proving whether financially stressed customers are also new (low-tenure) ones. |
| **Questions Answered** | Are hotspots mostly new churners or long-tenure churners? Does low loyalty concentrate in specific regions? |
| **Insights** | Separates "new customer churn" from "long-term churn" geographically; cross-map sync answers whether stress-driven regions are also low-loyalty regions. |

**Map 3 — Financial Stress Bubble Map**
| Attribute | Detail |
|---|---|
| **Type** | Bubble/scatter map with semantic zoom |
| **Marks** | Individual customer bubbles (at high zoom) / hexbin clusters (at overview) |
| **Channels** | Position: geography; Color: financial stability index (RdYlGn diverging: red = stressed → green = stable); Size: churn status (larger = churned) |
| **Phase 3 Additions** | **(a) Texas county outline base layer.** **(b) Semantic zoom** — same zoom threshold as Map 2 (≥ 2.5×), transitioning from hexbin cluster overview to individual bubbles. **(c) Multiple legends** — gradient color legend (Financial Stability 0–1), size legend (Active vs Churned customer), and a clickable category legend. **(d) Clickable stress-level category legend** — "High Stress / Medium / Low Stress" buttons. Clicking a tier highlights matching customers in this map AND emits a `q3EventBus` event to synchronize Map 2, directly linking financial stress geography to tenure geography. |
| **Questions Answered** | Is churn concentrated in financially stressed regions? Do stable customers churn in some areas anyway? |
| **Insights** | Distinguishes stress-driven churn (red clusters) from non-financial churn (green churners); cross-map sync confirms or refutes whether stressed customers are also new customers. |

---

## Design Rationale

**Why Multiple Visualizations?**
- Churn is multidimensional — no single view captures financial, demographic, temporal, and spatial factors simultaneously.
- Aligned encodings (consistent axes across heatmaps; shared event buses across Q2 and Q3 charts) enable direct comparison without re-reading axes.
- Different chart types suit different analytical tasks: heatmaps for density patterns, lines for lifecycle trends, maps for spatial clusters.

**Phase 3 Design Principles Applied**
- **Linked hovering (Q1)**: Reduces cognitive load from cross-referencing 4 separate heatmaps.
- **Annotation markers (Q2)**: Make the most interesting intersections (line crossings) explicit and clickable rather than requiring users to spot them manually.
- **Solid lines + high-contrast palette (Q2)**: Improves readability over dashed lines; each family structure is immediately distinguishable.
- **Absolute count labels (Q2)**: Prevents small sample sizes from appearing as large trends in percentage charts.
- **Bivariate hexbin (Q3)**: Eliminates the competing-encoding problem (large, light = many & low churn ≠ danger; now only dark-red = danger).
- **Semantic zoom (Q3)**: Manages overplotting — cluster view at overview, individual data points on zoom-in.
- **Cross-map sync (Q3)**: Clicking a financial stress tier in Map 3 propagates selection to Map 2, directly testing the hypothesis that stressed customers are also new (low-tenure) customers.

**Target Users**
Insurance data analysts, CRM teams, pricing/underwriting teams, regional managers, business strategists.

**Key Analytical Tasks Supported**
Cluster discovery, dependency comparison, correlation assessment, trend analysis, spatial pattern detection, causal chain verification (stress → tenure → churn).

---

*Contributions: Visualizations — Vansh Goyal (Q1), Arushi Tandon (Q2), Poojitha J (Q3) | Report — Poojitha J*
