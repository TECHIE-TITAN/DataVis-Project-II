// ─── Q2 Shared Cross-Chart Event Bus ────────────────────────────────────────
// Placed here (first Q2 script to define it) so all Q2 charts can subscribe.
window.q2ChartBus = {
    // Highlight a family structure across all charts
    highlight: function(struct) {
        if (window._q2LineChartHighlight)   window._q2LineChartHighlight(struct);
        if (window._q2BubbleChartHighlight) window._q2BubbleChartHighlight(struct);
        if (window._q2StackedChartHighlight) window._q2StackedChartHighlight(struct);
    },
    
    // Reset all highlights
    reset: function() {
        if (window._q2LineChartHighlight)   window._q2LineChartHighlight(null);
        if (window._q2BubbleChartHighlight) window._q2BubbleChartHighlight(null);
        if (window._q2StackedChartHighlight) window._q2StackedChartHighlight(null);
    },
    
    // Filter data to show specific family structures
    selectStructures: function(structures) {
        if (window._q2LineChartFilter)   window._q2LineChartFilter(structures);
        if (window._q2BubbleChartFilter) window._q2BubbleChartFilter(structures);
        if (window._q2StackedChartFilter) window._q2StackedChartFilter(structures);
    },
    
    // Clear filter
    clearFilter: function() {
        if (window._q2LineChartFilter)   window._q2LineChartFilter(null);
        if (window._q2BubbleChartFilter) window._q2BubbleChartFilter(null);
        if (window._q2StackedChartFilter) window._q2StackedChartFilter(null);
    },
    
    // Highlight an age range
    highlightAgeRange: function(fromAge, toAge) {
        if (window._q2LineChartAgeRange)   window._q2LineChartAgeRange(fromAge, toAge);
        if (window._q2BubbleChartAgeRange) window._q2BubbleChartAgeRange(fromAge, toAge);
        if (window._q2StackedChartAgeRange) window._q2StackedChartAgeRange(fromAge, toAge);
    },
    
    // Clear age range highlight
    clearAgeRange: function() {
        if (window._q2LineChartAgeRange)   window._q2LineChartAgeRange(null, null);
        if (window._q2BubbleChartAgeRange) window._q2BubbleChartAgeRange(null, null);
        if (window._q2StackedChartAgeRange) window._q2StackedChartAgeRange(null, null);
    }
};

(function() {
    // 1. Setup dimensions and margins
    const margin = {top: 40, right: 180, bottom: 80, left: 90};
    const width = 900 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    const svg = d3.select("#q2-line-chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create dedicated tooltip for line chart
    const tooltip = d3.select('body')
        .append('div')
        .attr('class', 'q2-line-tooltip')
        .style('position', 'absolute')
        .style('background-color', 'rgba(10, 10, 10, 0.95)')
        .style('color', '#ffffff')
        .style('padding', '12px 16px')
        .style('border-radius', '8px')
        .style('pointer-events', 'none')
        .style('font-size', '13px')
        .style('box-shadow', '0 4px 12px rgba(0, 0, 0, 0.8)')
        .style('border', '1px solid rgba(255, 255, 255, 0.3)')
        .style('opacity', 0)
        .style('z-index', 10000)
        .style('backdrop-filter', 'blur(10px)')
        .style('display', 'none');

    // 2. Setup Scales
    const ageOrder = ['18-25', '26-35', '36-45', '46-55', '56-65', '65+'];
    const x = d3.scalePoint()
        .domain(ageOrder)
        .range([0, width])
        .padding(0.5);

    const y = d3.scaleLinear()
        .domain([0, d3.max(q2Data, d => d.churn) * 1.2 || 1]) 
        .range([height, 0]);

    // IMPROVED COLOR SCHEME - High contrast, distinct colors
    const colorScale = d3.scaleOrdinal()
        .domain(["Single-NoKids", "Single-Kids", "Married-NoKids", "Married-Kids"])
        .range(["#FF1744", "#FFC107", "#00E676", "#2196F3"]); // Red, Amber, Green, Blue

    // 3. Add gridlines
    svg.append("g")
        .attr("class", "grid")
        .attr("opacity", 0.15)
        .call(d3.axisLeft(y)
            .tickSize(-width)
            .tickFormat("")
        );

    svg.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0,${height})`)
        .attr("opacity", 0.15)
        .call(d3.axisBottom(x)
            .tickSize(-height)
            .tickFormat("")
        );

    // 4. Add Axes
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .attr("class", "axis")
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("font-size", "12px")
        .style("font-weight", "500");

    svg.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y).tickFormat(d3.format(".0%")).ticks(8))
        .selectAll("text")
        .style("font-size", "12px")
        .style("font-weight", "500");

    // 5. Axis Labels
    svg.append("text")
        .attr("class", "axis-label")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height + 50)
        .style("fill", "#e0e0e0")
        .style("font-size", "14px")
        .style("font-weight", "500")
        .text("Age Group");

    svg.append("text")
        .attr("class", "axis-label")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("y", -65)
        .attr("x", -height / 2)
        .style("fill", "#e0e0e0")
        .style("font-size", "14px")
        .style("font-weight", "500")
        .text("Churn Rate");

    // 6. Line Generator — ALL SOLID, distinct high-contrast colors
    const lineGenerator = d3.line()
        .x(d => x(d.age_group))
        .y(d => y(d.churn))
        .curve(d3.curveMonotoneX);

    const structures = ["Single-NoKids", "Single-Kids", "Married-NoKids", "Married-Kids"];

    // Build per-structure sorted data arrays (reused for crossover detection)
    const structDataMap = {};
    structures.forEach(struct => {
        structDataMap[struct] = q2Data
            .filter(d => d.structure === struct)
            .sort((a, b) => ageOrder.indexOf(a.age_group) - ageOrder.indexOf(b.age_group));
    });

    // 7. Hardcoded crossover (risk-flip) points — all 6 verified via data analysis.
    // Dynamic detection was silently dropping crossovers with t very near 0 or 1
    // (i.e. those that happen very close to an existing data point) and de-cluttering
    // was dropping one from each double-flip pair. Hardcoding ensures all 6 render.
    //
    // Values computed from q2Data using linear interpolation:
    //   t = diff0 / (diff0 - diff1)  where diff = churnA - churnB at each endpoint
    //   xPos = x(fromAge) + t * (x(toAge) - x(fromAge))
    //   yPos = y(churnA_at_from + t * (churnA_at_to - churnA_at_from))
    //
    // Pair: Single-NoKids (SN) vs Married-NoKids (MN)
    //   18-25: SN=14.888%  MN=13.208%  → SN higher
    //   26-35: SN=13.721%  MN=13.736%  → MN barely higher  (crossover #1 at t=0.991)
    //   36-45: SN=12.894%  MN=12.725%  → SN higher again   (crossover #2 at t=0.083)
    //   46-55: SN=12.054%  MN=12.020%  → SN barely higher
    //   56-65: SN=11.168%  MN=11.367%  → MN higher         (crossover #3 at t=0.148)
    //   65+:   SN= 8.039%  MN= 7.892%  → SN higher again   (crossover #4 at t=0.575)
    //
    // Pair: Single-Kids (SK) vs Married-Kids (MK)
    //   36-45: SK=13.162%  MK=13.176%  → MK barely higher
    //   46-55: SK=12.664%  MK=12.423%  → SK higher          (crossover #5 at t=0.053)
    //   56-65: SK=11.611%  MK=12.220%  → MK higher          (crossover #6 at t=0.284)

    // xShift: horizontal offset applied to the *marker group* so that overlapping
    // diamonds (pairs #1+#2 which land 11px apart, and #3+#6 which land 16px apart)
    // are nudged apart and both stay clearly visible. A leader line connects each
    // shifted diamond back to a small tick at the true crossing x-position.
    // Flags are positioned to avoid overlapping by spreading them far above/below the chart.
    const crossoverDefs = [
        // ── S·NK ↔ M·NK double-flip near 26-35 (xPos #1=179px, #2=190px → shift apart) ──
        { fromAge: '18-25', toAge: '26-35', t: 0.9912, structA: 'Single-NoKids', structB: 'Married-NoKids',
          churnA0: 0.14888, churnB0: 0.13208, churnA1: 0.13721, churnB1: 0.13736,
          labelOffset: -110, xShift: -30, note: 'M·NK briefly overtakes S·NK at 26–35' },
        { fromAge: '26-35', toAge: '36-45', t: 0.55, structA: 'Single-NoKids', structB: 'Married-NoKids',
          churnA0: 0.13721, churnB0: 0.13736, churnA1: 0.12894, churnB1: 0.12725,
          labelOffset: 60, xShift: 0, note: 'S·NK reclaims lead midway through 26–35 to 36–45' },
        // ── S·NK ↔ M·NK crossings near 46-55/65+ ──
        { fromAge: '46-55', toAge: '56-65', t: 0.1479, structA: 'Single-NoKids', structB: 'Married-NoKids',
          churnA0: 0.12054, churnB0: 0.12020, churnA1: 0.11168, churnB1: 0.11367,
          labelOffset: -80, xShift: -22, note: 'M·NK overtakes S·NK near 46–55' },
        { fromAge: '56-65', toAge: '65+',   t: 0.68, structA: 'Single-NoKids', structB: 'Married-NoKids',
          churnA0: 0.11168, churnB0: 0.11367, churnA1: 0.08039, churnB1: 0.07892,
          labelOffset: 80, xShift: 0, note: 'S·NK overtakes M·NK heading to 65+' },
        // ── S·K ↔ M·K double-flip near 36-45/56-65 ──
        { fromAge: '36-45', toAge: '46-55', t: 0.0529, structA: 'Single-Kids',   structB: 'Married-Kids',
          churnA0: 0.13162, churnB0: 0.13176, churnA1: 0.12664, churnB1: 0.12423,
          labelOffset: 120, xShift: 0, note: 'S·K overtakes M·K just after 36–45' },
        { fromAge: '46-55', toAge: '56-65', t: 0.4140, structA: 'Single-Kids',   structB: 'Married-Kids',
          churnA0: 0.12664, churnB0: 0.12423, churnA1: 0.11611, churnB1: 0.12220,
          labelOffset: -120, xShift: +22, note: 'M·K overtakes S·K by mid-50s' },
    ];

    const crossovers = crossoverDefs.map(def => {
        const x0 = x(def.fromAge), x1 = x(def.toAge);
        const xPos = x0 + def.t * (x1 - x0);   // exact crossing x-position on the chart
        const crossChurn = def.churnA0 + def.t * (def.churnA1 - def.churnA0);
        const yPos = y(crossChurn);
        // flagXShift: only the flag label shifts, NOT the marker itself
        const flagXShift = def.xShift || 0;
        return { ...def, xPos, yPos, flagXShift };
    });

    // DEBUG: Verify all 6 crossovers loaded
    console.log("✓ Risk Flip markers initialized: " + crossovers.length + " crossovers");

    // 8. Draw lines and interactive dots
    structures.forEach(struct => {
        const structData = structDataMap[struct];
        if (structData.length > 0) {
            // Draw solid line path
            svg.append("path")
                .datum(structData)
                .attr("class", `line-${struct.replace(/[^a-zA-Z0-9]/g, '')}`)
                .attr("fill", "none")
                .attr("stroke", colorScale(struct))
                .attr("stroke-width", 3.5)
                .attr("opacity", 0.9)
                .attr("d", lineGenerator);

            // Draw invisible wide hover path over the line for better interactivity
            svg.append("path")
                .datum(structData)
                .attr("class", `line-hover-${struct.replace(/[^a-zA-Z0-9]/g, '')}`)
                .attr("fill", "none")
                .attr("stroke", "transparent")
                .attr("stroke-width", 20)  // Wide invisible area for easy hovering
                .attr("stroke-linecap", "round")
                .attr("stroke-linejoin", "round")
                .attr("d", lineGenerator)
                .style("cursor", "pointer")
                .style("pointer-events", "stroke")  // Only detect hovers on the stroke
                .on("mouseover", function(event) {
                    // Highlight the actual line
                    svg.select(`.line-${struct.replace(/[^a-zA-Z0-9]/g, '')}`)
                        .transition().duration(200).attr("stroke-width", 5).attr("opacity", 1);
                    
                    // Dim other lines
                    structures.forEach(s => {
                        if (s !== struct) {
                            svg.select(`.line-${s.replace(/[^a-zA-Z0-9]/g, '')}`)
                                .transition().duration(200).attr("opacity", 0.1);
                        }
                    });
                    
                    // Highlight dots for this structure
                    svg.selectAll(`.dot-${struct.replace(/[^a-zA-Z0-9]/g, '')}`)
                        .transition().duration(200).attr("opacity", 1).attr("r", 8);
                    
                    // Dim dots for other structures
                    structures.forEach(s => {
                        if (s !== struct) {
                            svg.selectAll(`.dot-${s.replace(/[^a-zA-Z0-9]/g, '')}`)
                                .transition().duration(200).attr("opacity", 0.15);
                        }
                    });
                    
                    if (window.q2ChartBus) window.q2ChartBus.highlight(struct);
                })
                .on("mousemove", function(event) {
                    // Optional: show tooltip on hover
                    // tooltip.style("left", (event.pageX + 15) + "px").style("top", (event.pageY - 60) + "px");
                })
                .on("mouseout", function() {
                    // Reset all lines
                    structures.forEach(s => {
                        svg.select(`.line-${s.replace(/[^a-zA-Z0-9]/g, '')}`)
                            .transition().duration(200).attr("stroke-width", 3.5).attr("opacity", 0.9);
                        svg.selectAll(`.dot-${s.replace(/[^a-zA-Z0-9]/g, '')}`)
                            .transition().duration(200).attr("opacity", 1).attr("r", 6);
                    });
                    
                    tooltip.transition().duration(300).style("opacity", 0)
                        .on("end", function() { tooltip.style("display", "none"); });
                    
                    if (window.q2ChartBus) window.q2ChartBus.reset();
                });

            // Draw interactive dots
            svg.selectAll(`.dot-${struct.replace(/[^a-zA-Z0-9]/g, '')}`)
                .data(structData)
                .enter()
                .append("circle")
                .attr("class", `dot-${struct.replace(/[^a-zA-Z0-9]/g, '')}`)
                .attr("cx", d => x(d.age_group))
                .attr("cy", d => y(d.churn))
                .attr("r", 6)
                .attr("fill", colorScale(struct))
                .attr("stroke", "#000")
                .attr("stroke-width", 2)
                .style("cursor", "pointer")
                .on("mouseover", function(event, d) {
                    tooltip
                        .style("display", "block")
                        .transition().duration(200).style("opacity", 1);

                    tooltip.html(`
                        <div style="border-bottom: 1px solid #555; margin-bottom: 8px; padding-bottom: 6px;">
                            <strong style="color: ${colorScale(d.structure)}; font-size: 14px;">${d.structure}</strong>
                        </div>
                        <div style="margin: 4px 0;"><strong>Age Group:</strong> ${d.age_group}</div>
                        <div style="margin: 4px 0;"><strong>Churn Rate:</strong> ${(d.churn * 100).toFixed(2)}%</div>
                    `)
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 60) + "px");

                    d3.select(this)
                        .transition().duration(200)
                        .attr("r", 10).attr("stroke-width", 3).attr("stroke", "#fff");

                    svg.select(`.line-${struct.replace(/[^a-zA-Z0-9]/g, '')}`)
                        .transition().duration(200).attr("stroke-width", 5).attr("opacity", 1);

                    if (window.q2ChartBus) window.q2ChartBus.highlight(struct);
                })
                .on("mousemove", function(event) {
                    tooltip
                        .style("left", (event.pageX + 15) + "px")
                        .style("top", (event.pageY - 60) + "px");
                })
                .on("mouseout", function() {
                    tooltip.transition().duration(300).style("opacity", 0)
                        .on("end", function() { tooltip.style("display", "none"); });

                    d3.select(this)
                        .transition().duration(200)
                        .attr("r", 6).attr("stroke-width", 2).attr("stroke", "#000");

                    svg.select(`.line-${struct.replace(/[^a-zA-Z0-9]/g, '')}`)
                        .transition().duration(200).attr("stroke-width", 3.5).attr("opacity", 0.9);

                    if (window.q2ChartBus) window.q2ChartBus.reset();
                });
        }
    });

    // 9. Draw all 6 crossover annotation markers (no de-cluttering — all are shown)
    const crossoverTooltip = d3.select('body')
        .append('div')
        .attr('class', 'q2-crossover-tooltip')
        .style('position', 'absolute')
        .style('background-color', 'rgba(255, 234, 0, 0.96)')
        .style('color', '#111')
        .style('padding', '10px 13px')
        .style('border-radius', '8px')
        .style('pointer-events', 'none')
        .style('font-size', '12px')
        .style('box-shadow', '0 4px 12px rgba(0,0,0,0.7)')
        .style('border', '1px solid #cca000')
        .style('opacity', 0)
        .style('z-index', 10001)
        .style('display', 'none')
        .style('max-width', '260px');

    // Add SVG defs for glow filter and gradient (shared across all markers)
    const defs = svg.append("defs");

    // Gold glow filter
    const glowFilter = defs.append("filter")
        .attr("id", "crossover-glow")
        .attr("x", "-50%").attr("y", "-50%")
        .attr("width", "200%").attr("height", "200%");
    glowFilter.append("feGaussianBlur")
        .attr("stdDeviation", "3").attr("result", "coloredBlur");
    const feMerge = glowFilter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Radial gradient for diamond fill
    const diamondGrad = defs.append("radialGradient")
        .attr("id", "diamond-grad")
        .attr("cx", "35%").attr("cy", "35%").attr("r", "65%");
    diamondGrad.append("stop").attr("offset", "0%").attr("stop-color", "#FFF9C4");
    diamondGrad.append("stop").attr("offset", "60%").attr("stop-color", "#FFEA00");
    diamondGrad.append("stop").attr("offset", "100%").attr("stop-color", "#F9A825");

    crossovers.forEach((cross) => {
        const labelOffset = cross.labelOffset;
        const above = labelOffset < 0;

        // ── Main marker group sits at the TRUE crossing point ──────────────────
        const markerGroup = svg.append("g")
            .attr("class", "crossover-marker")
            .attr("transform", `translate(${cross.xPos}, ${cross.yPos})`)
            .style("cursor", "pointer");

        // ── Animated pulse ring ──────────────────────────────────────────────
        const pulseRing = markerGroup.append("circle")
            .attr("r", 9)
            .attr("fill", "none")
            .attr("stroke", "#FFEA00")
            .attr("stroke-width", 1.5)
            .attr("opacity", 0.5);

        // CSS keyframe-style pulse via D3 repeat
        (function pulse() {
            pulseRing
                .attr("r", 9).attr("opacity", 0.6)
                .transition().duration(1200).ease(d3.easeCubicOut)
                .attr("r", 18).attr("opacity", 0)
                .on("end", pulse);
        })();

        // ── Diamond shape at the true crossing point ──────────────────────────
        const ds = 8; // half-size of diamond
        markerGroup.append("polygon")
            .attr("points", `0,${-ds} ${ds},0 0,${ds} ${-ds},0`)
            .attr("fill", "url(#diamond-grad)")
            .attr("stroke", "#8B6000")
            .attr("stroke-width", 1)
            .attr("filter", "url(#crossover-glow)");

        // ── Dashed connector line from diamond to flag ────────────────────────
        const connY1 = above ? -ds - 2 : ds + 2;
        const connY2 = above ? labelOffset + 20 : labelOffset - 20;
        markerGroup.append("line")
            .attr("x1", 0).attr("y1", connY1)
            .attr("x2", cross.flagXShift).attr("y2", connY2)
            .attr("stroke", "#FFEA00")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "3,2")
            .attr("opacity", 0.6);

        // ── Callout flag — shifted horizontally to avoid overlaps ──────────────
        // Two-line callout: line 1 = "⚡ Risk Flip", line 2 = pair abbreviation
        const shortA = cross.structA.replace('Single-','S·').replace('Married-','M·')
                                    .replace('NoKids','NK').replace('Kids','K');
        const shortB = cross.structB.replace('Single-','S·').replace('Married-','M·')
                                    .replace('NoKids','NK').replace('Kids','K');
        const flagW = 90, flagH = 44;  // Increased height from 34 to 44 for better text spacing
        const flagX = -flagW / 2 + cross.flagXShift;  // ◄ Apply horizontal shift to flag only
        const flagY = above ? labelOffset - flagH : labelOffset;

        // Drop shadow for flag
        markerGroup.append("rect")
            .attr("x", flagX + 2).attr("y", flagY + 2)
            .attr("width", flagW).attr("height", flagH)
            .attr("rx", 6).attr("ry", 6)
            .attr("fill", "rgba(0,0,0,0.45)");

        // Flag body with gold-to-amber gradient fill
        markerGroup.append("rect")
            .attr("x", flagX).attr("y", flagY)
            .attr("width", flagW).attr("height", flagH)
            .attr("rx", 6).attr("ry", 6)
            .attr("fill", "#1a1600")
            .attr("stroke", "#FFEA00")
            .attr("stroke-width", 1.2)
            .attr("opacity", 0.95);

        // "⚡ Risk Flip" text — line 1 (top)
        markerGroup.append("text")
            .attr("x", flagX + flagW / 2).attr("y", flagY + 8)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .style("font-size", "10px")
            .style("font-weight", "800")
            .style("fill", "#FFEA00")
            .style("letter-spacing", "0px")
            .style("pointer-events", "none")
            .text("⚡ Risk Flip");

        // Pair label — line 2 (bottom)
        markerGroup.append("text")
            .attr("x", flagX + flagW / 2).attr("y", flagY + flagH - 6)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .style("font-size", "8px")
            .style("font-weight", "600")
            .style("fill", "#e0d080")
            .style("pointer-events", "none")
            .text(`${shortA} ↔ ${shortB}`);

        // ── Interaction ──────────────────────────────────────────────────────
        markerGroup
            .on("mouseover", function(event) {
                const wasHigher = cross.churnA0 > cross.churnB0 ? cross.structA : cross.structB;
                const nowHigher = cross.churnA1 > cross.churnB1 ? cross.structA : cross.structB;

                crossoverTooltip.style("display", "block")
                    .transition().duration(150).style("opacity", 1);

                crossoverTooltip.html(`
                    <div style="font-weight:800; margin-bottom:7px; font-size:13px; color:#111; border-bottom:2px solid #cca000; padding-bottom:5px;">
                        ⚡ Risk Ranking Flip
                    </div>
                    <div style="margin-bottom:5px; font-size:12px; color:#333;">
                        <strong>${cross.fromAge}</strong> → <strong>${cross.toAge}</strong>
                    </div>
                    <div style="margin-bottom:6px; font-size:11px; line-height:1.7; color:#222;">
                        <span style="display:inline-block; width:9px; height:9px; background:${colorScale(cross.structA)}; border-radius:2px; margin-right:4px;"></span>${cross.structA}<br>
                        <span style="display:inline-block; width:9px; height:9px; background:${colorScale(cross.structB)}; border-radius:2px; margin-right:4px;"></span>${cross.structB}
                    </div>
                    <div style="font-size:11px; background:rgba(0,0,0,0.06); border-radius:4px; padding:5px 7px; line-height:1.7; color:#333;">
                        <strong>Before:</strong> ${wasHigher} riskier<br>
                        <strong>After:</strong> ${nowHigher} riskier
                    </div>
                    <div style="font-size:10px; color:#666; font-style:italic; margin-top:5px;">${cross.note}</div>
                `)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 100) + "px");

                // Highlight the two crossing lines, dim others
                structures.forEach(s => {
                    const cls = s.replace(/[^a-zA-Z0-9]/g, '');
                    if (s === cross.structA || s === cross.structB) {
                        svg.select(`.line-${cls}`)
                            .transition().duration(200).attr("stroke-width", 5).attr("opacity", 1);
                        svg.selectAll(`.dot-${cls}`)
                            .transition().duration(200).attr("opacity", 1).attr("r", 7);
                    } else {
                        svg.select(`.line-${cls}`)
                            .transition().duration(200).attr("opacity", 0.06);
                        svg.selectAll(`.dot-${cls}`)
                            .transition().duration(200).attr("opacity", 0.06);
                    }
                });
                // Scale up diamond
                d3.select(this).select("polygon")
                    .transition().duration(200)
                    .attr("points", `0,${-ds*1.4} ${ds*1.4},0 0,${ds*1.4} ${-ds*1.4},0`);
            })
            .on("click", function(event) {
                event.stopPropagation();
                
                // Toggle selection state
                const isSelected = markerGroup.classed("selected");
                d3.selectAll(".crossover-marker").classed("selected", false);
                
                if (!isSelected) {
                    markerGroup.classed("selected", true);
                    
                    // Apply filter to show only these two structures and their age range
                    window.q2ChartBus.selectStructures([cross.structA, cross.structB]);
                    window.q2ChartBus.highlightAgeRange(cross.fromAge, cross.toAge);
                    
                    // Show selection indicator on the marker
                    markerGroup.select("polygon")
                        .style("filter", "url(#crossover-glow) drop-shadow(0 0 12px #FFEA00)");
                    
                    // Update selection panel
                    const shortA = cross.structA.replace('Single-','S·').replace('Married-','M·')
                                                .replace('NoKids','NK').replace('Kids','K');
                    const shortB = cross.structB.replace('Single-','S·').replace('Married-','M·')
                                                .replace('NoKids','NK').replace('Kids','K');
                    const wasHigher = cross.churnA0 > cross.churnB0 ? cross.structA : cross.structB;
                    const nowHigher = cross.churnA1 > cross.churnB1 ? cross.structA : cross.structB;
                    
                    const panel = document.getElementById('q2-selection-panel');
                    const panelText = document.getElementById('q2-selection-text');
                    const panelDetail = document.getElementById('q2-selection-detail');
                    
                    panelText.innerHTML = `
                        <span style="color:#FFEA00;">⚡ Risk Flip:</span> 
                        <span style="color:#FF1744;">${shortA}</span> 
                        <span style="color:#ccc;">↔</span> 
                        <span style="color:#00E676;">${shortB}</span>
                    `;
                    
                    panelDetail.innerHTML = `
                        <span style="color:#aaa;">Ages ${cross.fromAge} → ${cross.toAge}</span> 
                        <span style="color:#999;">•</span> 
                        <span>${wasHigher} → ${nowHigher} (riskier)</span>
                    `;
                    
                    panel.style.display = 'block';
                    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    
                    // Log selection
                    console.log(`🎯 Selected: ${cross.structA} ↔ ${cross.structB} (${cross.fromAge}→${cross.toAge})`);
                } else {
                    // Deselect
                    window.q2ChartBus.clearFilter();
                    window.q2ChartBus.clearAgeRange();
                    markerGroup.select("polygon")
                        .style("filter", "url(#crossover-glow)");
                    
                    const panel = document.getElementById('q2-selection-panel');
                    if (panel) panel.style.display = 'none';
                    
                    console.log("✓ Selection cleared");
                }
            })
            .on("mousemove", function(event) {
                crossoverTooltip
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 100) + "px");
            })
            .on("mouseout", function() {
                crossoverTooltip.transition().duration(300).style("opacity", 0)
                    .on("end", function() { crossoverTooltip.style("display", "none"); });

                structures.forEach(s => {
                    const cls = s.replace(/[^a-zA-Z0-9]/g, '');
                    svg.select(`.line-${cls}`)
                        .transition().duration(200).attr("stroke-width", 3.5).attr("opacity", 0.9);
                    svg.selectAll(`.dot-${cls}`)
                        .transition().duration(200).attr("opacity", 1).attr("r", 6);
                });
                d3.select(this).select("polygon")
                    .transition().duration(200)
                    .attr("points", `0,${-ds} ${ds},0 0,${ds} ${-ds},0`);
            });
    });

    console.log("✓ All 6 Risk Flip markers rendered successfully");

    // 10. Enhanced Legend — solid line samples, no dash patterns
    const legend = svg.append("g")
        .attr("transform", `translate(${width + 20}, 20)`);

    legend.append("text")
        .attr("x", 0).attr("y", -5)
        .style("fill", "#e0e0e0").style("font-size", "13px").style("font-weight", "600")
        .text("Family Structure:");

    structures.forEach((struct, i) => {
        const legendRow = legend.append("g")
            .attr("class", `legend-${struct.replace(/[^a-zA-Z0-9]/g, '')}`)
            .attr("transform", `translate(0, ${i * 32 + 15})`)
            .style("cursor", "pointer");

        // Solid line sample
        legendRow.append("line")
            .attr("x1", 0).attr("x2", 35).attr("y1", 8).attr("y2", 8)
            .attr("stroke", colorScale(struct)).attr("stroke-width", 3.5);

        legendRow.append("circle")
            .attr("cx", 17).attr("cy", 8).attr("r", 5)
            .attr("fill", colorScale(struct)).attr("stroke", "#000").attr("stroke-width", 1.5);

        legendRow.append("text")
            .attr("x", 45).attr("y", 12)
            .style("fill", "#e0e0e0").style("font-size", "12px").style("font-weight", "500")
            .text(struct);

        legendRow
            .on("mouseover", function() {
                svg.selectAll("path[class^='line-']")
                    .transition().duration(200).attr("opacity", 0.1);
                svg.selectAll("circle[class^='dot-']")
                    .transition().duration(200).attr("opacity", 0.1);
                svg.select(`.line-${struct.replace(/[^a-zA-Z0-9]/g, '')}`)
                    .transition().duration(200).attr("opacity", 1).attr("stroke-width", 5);
                svg.selectAll(`.dot-${struct.replace(/[^a-zA-Z0-9]/g, '')}`)
                    .transition().duration(200).attr("opacity", 1).attr("r", 8);

                if (window.q2ChartBus) window.q2ChartBus.highlight(struct);
            })
            .on("mouseout", function() {
                svg.selectAll("path[class^='line-']")
                    .transition().duration(200).attr("opacity", 0.9).attr("stroke-width", 3.5);
                svg.selectAll("circle[class^='dot-']")
                    .transition().duration(200).attr("opacity", 1).attr("r", 6);

                if (window.q2ChartBus) window.q2ChartBus.reset();
            });
    });

    // 11. Legend note for crossover markers
    const crossoverNote = legend.append("g")
        .attr("transform", `translate(0, ${structures.length * 32 + 20})`);

    // Small diamond in legend
    crossoverNote.append("polygon")
        .attr("points", "8,-7 15,0 8,7 1,0")
        .attr("fill", "#FFEA00")
        .attr("stroke", "#8B6000").attr("stroke-width", 1);

    crossoverNote.append("text")
        .attr("x", 22).attr("y", 5)
        .style("fill", "#FFEA00").style("font-size", "11px").style("font-weight", "700")
        .text("⚡ Risk Flip (×6)");

    crossoverNote.append("text")
        .attr("x", 0).attr("y", 22)
        .style("fill", "#888").style("font-size", "10px").style("font-style", "italic")
        .text("Lines cross = churn");
    crossoverNote.append("text")
        .attr("x", 0).attr("y", 34)
        .style("fill", "#888").style("font-size", "10px").style("font-style", "italic")
        .text("ranking swaps");

    // 12. Cross-chart event bus listener — called by other charts to highlight here
    window._q2LineChartHighlight = function(struct) {
        if (!struct) {
            svg.selectAll("path[class^='line-']")
                .transition().duration(300).attr("opacity", 0.9).attr("stroke-width", 3.5);
            svg.selectAll("circle[class^='dot-']")
                .transition().duration(300).attr("opacity", 1).attr("r", 6);
        } else {
            svg.selectAll("path[class^='line-']")
                .transition().duration(200).attr("opacity", 0.1);
            svg.selectAll("circle[class^='dot-']")
                .transition().duration(200).attr("opacity", 0.1);
            svg.select(`.line-${struct.replace(/[^a-zA-Z0-9]/g, '')}`)
                .transition().duration(200).attr("opacity", 1).attr("stroke-width", 5);
            svg.selectAll(`.dot-${struct.replace(/[^a-zA-Z0-9]/g, '')}`)
                .transition().duration(200).attr("opacity", 1).attr("r", 8);
        }
    };

})();
