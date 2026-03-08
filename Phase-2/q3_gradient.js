// Map 2: Tenure-Churn Gradient
// - Texas county outlines
// - Zoom with semantic zoom (clusters at low zoom, individual circles at high zoom)
// - Color legend for tenure + opacity legend
// - Subscribes to event bus for cross-map syncing
(async function () {
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const width = 800;
    const height = 500;

    d3.select('#q3-gradient').html('');

    const container = d3.select('#q3-gradient');

    const svgOuter = container
        .append('svg')
        .attr('width', '100%')
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('cursor', 'grab');

    // Clip path to prevent overflow during zoom
    svgOuter.append('defs').append('clipPath')
        .attr('id', 'clip-gradient')
        .append('rect')
        .attr('width', width)
        .attr('height', height);

    const clipG = svgOuter.append('g')
        .attr('clip-path', 'url(#clip-gradient)');

    const svg = clipG.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const data = q3Data;
    data.forEach((d, i) => {
        d.latitude  = +d.latitude;
        d.longitude = +d.longitude;
        d.avg_days_tenure = +d.avg_days_tenure;
        d.churn_rate = +d.churn_rate;
        d.financial_stability_index = +d.financial_stability_index;
        d.count = +d.count;
        d._idx = i; // Index for syncing
    });

    const pointsGeoJSON = {
        type: "MultiPoint",
        coordinates: data.map(d => [d.longitude, d.latitude])
    };

    const projection = d3.geoMercator()
        .fitSize([width - margin.left - margin.right, height - margin.top - margin.bottom], pointsGeoJSON);

    const path = d3.geoPath().projection(projection);

    // Load and draw Texas counties
    await loadTexasCounties();
    drawTexasBase(svg, path);

    const tenureColor = d3.scaleSequential(d3.interpolateBlues)
        .domain([0, d3.max(data, d => d.avg_days_tenure)]);

    // ---- Individual circles layer (visible at zoom) ----
    const circlesG = svg.append('g').attr('class', 'circles-layer');

    const circles = circlesG.selectAll('circle')
        .data(data)
        .enter()
        .append('circle')
        .attr('cx', d => projection([d.longitude, d.latitude])[0])
        .attr('cy', d => projection([d.longitude, d.latitude])[1])
        .attr('r', d => 4 + Math.sqrt(d.count / 1000))
        .attr('fill', d => tenureColor(d.avg_days_tenure))
        .attr('opacity', d => 0.4 + (d.churn_rate * 0.5))
        .attr('stroke', 'none')
        .attr('stroke-width', 0)
        .on('mouseover', function (event, d) {
            const usInfo = q3MapData;
            const states = topojson.feature(usInfo, usInfo.objects.states);
            const texas = states.features.find(s => s.properties.name === "Texas");
            const miniWidth = 80, miniHeight = 80;
            const miniProj = d3.geoMercator().fitSize([miniWidth, miniHeight], texas);
            const miniPath = d3.geoPath().projection(miniProj);
            const texasPathData = miniPath(texas);
            const dotPos = miniProj([+d.longitude, +d.latitude]);

            const miniMapSVG = `
                <svg width="${miniWidth}" height="${miniHeight}" style="display: block; margin: 5px auto;">
                    <path d="${texasPathData}" fill="none" stroke="#666" stroke-width="1.5"/>
                    <circle cx="${dotPos[0]}" cy="${dotPos[1]}" r="4" fill="#4488ff" stroke="white" stroke-width="1"/>
                </svg>
                <div style="text-align: center; font-size: 9px; color: #888; margin-top: -3px;">Texas</div>
            `;

            d3.select('.tooltip').style('opacity', 1)
                .style('left', (event.pageX + 15) + 'px')
                .style('top', (event.pageY - 15) + 'px')
                .html(`
                    <div style="background: rgba(0,0,0,0.95); padding: 8px; border-radius: 5px; color: white;">
                        ${miniMapSVG}
                        <div style="margin-top: 5px;"><strong>${d.city}</strong>, ${d.county} County</div>
                        <div>Customers: ${d.count.toLocaleString()}</div>
                        <div>Avg Tenure: ${Math.round(d.avg_days_tenure).toLocaleString()} days</div>
                        <div>Churn Rate: ${(d.churn_rate * 100).toFixed(1)}%</div>
                    </div>
                `);
        })
        .on('mouseout', function () {
            d3.select('.tooltip').style('opacity', 0);
        });

    // ---- Hexbin cluster layer (visible at default zoom) ----
    const hexbinG = svg.append('g').attr('class', 'hexbin-layer');

    const hexbin = d3.hexbin()
        .x(d => projection([d.longitude, d.latitude])[0])
        .y(d => projection([d.longitude, d.latitude])[1])
        .radius(14)
        .extent([[0, 0], [width, height]]);

    const validPoints = data.filter(d => {
        const p = projection([d.longitude, d.latitude]);
        return p && !isNaN(p[0]) && !isNaN(p[1]);
    });

    const bins = hexbin(validPoints);
    const maxCount = d3.max(bins, d => d.length) || 1;
    const hexRadius = d3.scaleSqrt().domain([0, maxCount]).range([4, hexbin.radius()]);

    // Color for hex clusters based on avg tenure
    const maxTenure = d3.max(data, d => d.avg_days_tenure);

    hexbinG.selectAll('path')
        .data(bins)
        .enter().append('path')
        .attr('d', d => hexbin.hexagon(hexRadius(d.length)))
        .attr('transform', d => `translate(${d.x},${d.y})`)
        .attr('fill', d => tenureColor(d3.mean(d, p => p.avg_days_tenure)))
        .attr('stroke', '#333')
        .attr('stroke-width', 0.5)
        .attr('opacity', 0.8);

    // Start in clustered mode
    circlesG.style('display', 'none');

    // ---- Zoom behavior ----
    const zoomThreshold = 2.5;

    const zoom = d3.zoom()
        .scaleExtent([1, 15])
        .on('zoom', (event) => {
            const t = event.transform;
            svg.attr('transform', `translate(${t.x + margin.left}, ${t.y + margin.top}) scale(${t.k})`);

            // Semantic zoom: switch between hexbin and individual views
            if (t.k >= zoomThreshold) {
                hexbinG.style('display', 'none');
                circlesG.style('display', null);
                // Scale down circle radius to keep visual size constant
                circles.attr('r', 4 / t.k);
            } else {
                hexbinG.style('display', null);
                circlesG.style('display', 'none');
            }
        });

    svgOuter.call(zoom);

    // Zoom controls
    const zoomControls = container.append('div')
        .style('display', 'flex')
        .style('justify-content', 'center')
        .style('gap', '8px')
        .style('margin-top', '6px');

    zoomControls.append('button')
        .text('🔍+ Zoom In')
        .style('background', '#1a1a1a').style('color', '#ccc').style('border', '1px solid #333')
        .style('padding', '4px 10px').style('border-radius', '4px').style('cursor', 'pointer')
        .style('font-size', '11px')
        .on('click', () => svgOuter.transition().duration(300).call(zoom.scaleBy, 1.5));

    zoomControls.append('button')
        .text('🔍− Zoom Out')
        .style('background', '#1a1a1a').style('color', '#ccc').style('border', '1px solid #333')
        .style('padding', '4px 10px').style('border-radius', '4px').style('cursor', 'pointer')
        .style('font-size', '11px')
        .on('click', () => svgOuter.transition().duration(300).call(zoom.scaleBy, 0.67));

    zoomControls.append('button')
        .text('⟲ Reset')
        .style('background', '#1a1a1a').style('color', '#ccc').style('border', '1px solid #333')
        .style('padding', '4px 10px').style('border-radius', '4px').style('cursor', 'pointer')
        .style('font-size', '11px')
        .on('click', () => svgOuter.transition().duration(500).call(zoom.transform, d3.zoomIdentity));

    // ---- Subscribe to event bus for syncing ----
    q3EventBus.on('highlight-customers', (selectedIndices) => {
        if (!selectedIndices) {
            // Reset all
            circles.attr('opacity', d => 0.4 + (d.churn_rate * 0.5))
                .attr('stroke', 'none')
                .attr('stroke-width', 0)
                .attr('r', 4);
            hexbinG.selectAll('path').attr('opacity', 0.8);
            return;
        }

        const idxSet = new Set(selectedIndices);
        circles
            .attr('opacity', d => idxSet.has(d._idx) ? 1 : 0.07)
            .attr('stroke', d => idxSet.has(d._idx) ? '#fff' : 'none')
            .attr('stroke-width', d => idxSet.has(d._idx) ? 2 : 0)
            .attr('r', d => idxSet.has(d._idx) ? 6 : 3);

        // If currently in hex mode, switch to circles so highlights are visible
        if (circlesG.style('display') === 'none') {
            hexbinG.style('display', 'none');
            circlesG.style('display', null);
        }
    });

    // ---- Legends ----
    const legendContainer = container.append('div')
        .style('display', 'flex')
        .style('justify-content', 'center')
        .style('gap', '40px')
        .style('flex-wrap', 'wrap');

    drawGradientLegend(legendContainer, tenureColor, {
        title: 'Customer Tenure (days)',
        width: 180,
        ticks: 4,
        format: '.0f'
    });

    // Opacity legend
    const opacityLegend = legendContainer.append('div')
        .attr('class', 'q3-legend')
        .style('display', 'flex')
        .style('flex-direction', 'column')
        .style('align-items', 'center')
        .style('margin-top', '10px');

    opacityLegend.append('div')
        .style('color', '#ccc')
        .style('font-size', '11px')
        .style('margin-bottom', '4px')
        .style('font-weight', '600')
        .text('Churn Status');

    const opSvg = opacityLegend.append('svg').attr('width', 120).attr('height', 30);
    opSvg.append('circle').attr('cx', 20).attr('cy', 15).attr('r', 6)
        .attr('fill', '#4488cc').attr('opacity', 0.4);
    opSvg.append('text').attr('x', 32).attr('y', 18).attr('fill', '#aaa')
        .attr('font-size', '9px').text('Active');
    opSvg.append('circle').attr('cx', 75).attr('cy', 15).attr('r', 6)
        .attr('fill', '#4488cc').attr('opacity', 1);
    opSvg.append('text').attr('x', 87).attr('y', 18).attr('fill', '#aaa')
        .attr('font-size', '9px').text('Churned');

    // Description
    container.append('div')
        .style('text-align', 'center')
        .style('margin-top', '10px')
        .style('color', '#aaa')
        .style('font-size', '11px')
        .style('font-style', 'italic')
        .html(`
            Customer tenure patterns across geographic regions. Scroll to zoom; clusters at overview, points on zoom-in.<br>
            Color: Light blue (new) → Dark blue (long tenure) | Opacity: Higher = churned
        `);

    container.append('div')
        .style('text-align', 'center')
        .style('margin-top', '8px')
        .style('color', '#aaa')
        .style('font-size', '11px')
        .style('font-style', 'italic')
        .text('Insight: Distinguishes between low-loyalty churn vs persistent regional issues');

})();
