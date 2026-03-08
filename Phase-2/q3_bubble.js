// Map 3: Financial Stress Bubble Map
// - Texas county outlines
// - Zoom with semantic zoom (hex clusters at overview, individual bubbles on zoom-in)
// - Category legend with click-to-select for cross-map syncing
// - Color legend for financial stability + size legend for churn
(async function () {
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const width = 800;
    const height = 500;

    d3.select('#q3-bubble').html('');

    const container = d3.select('#q3-bubble');

    const svgOuter = container
        .append('svg')
        .attr('width', '100%')
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('cursor', 'grab');

    svgOuter.append('defs').append('clipPath')
        .attr('id', 'clip-bubble')
        .append('rect')
        .attr('width', width)
        .attr('height', height);

    const clipG = svgOuter.append('g')
        .attr('clip-path', 'url(#clip-bubble)');

    const svg = clipG.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const data = q3Data;

    data.forEach((d, i) => {
        d.financial_stability_index = +d.financial_stability_index;
        d.churn_rate = +d.churn_rate;
        d.avg_days_tenure = +d.avg_days_tenure;
        d.latitude  = +d.latitude;
        d.longitude = +d.longitude;
        d.count = +d.count;
        d._idx = i;
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

    const color = d3.scaleSequential(d3.interpolateRdYlGn)
        .domain([0, 1]);

    // Classify financial stability into 3 bins for the clickable legend
    function getStressLevel(fsi) {
        if (fsi < 0.33) return 'high-stress';
        if (fsi < 0.66) return 'medium-stress';
        return 'low-stress';
    }

    // ---- Individual bubbles layer ----
    const bubblesG = svg.append('g').attr('class', 'bubbles-layer');

    const bubbles = bubblesG.selectAll('circle')
        .data(data.sort((a, b) => a.churn_rate - b.churn_rate))
        .enter()
        .append('circle')
        .attr('cx', d => projection([d.longitude, d.latitude])[0])
        .attr('cy', d => projection([d.longitude, d.latitude])[1])
        .attr('r', d => 3 + Math.sqrt(d.count / 5000) + (d.churn_rate > 0.15 ? 3 : 0))
        .attr('fill', d => color(d.financial_stability_index))
        .attr('stroke', d => d.churn_rate > 0.15 ? '#fff' : 'none')
        .attr('stroke-width', 1)
        .attr('opacity', 0.8)
        .on('mouseover', function (event, d) {
            const usInfo = q3MapData;
            const states = topojson.feature(usInfo, usInfo.objects.states);
            const texas = states.features.find(s => s.properties.name === "Texas");
            const miniWidth = 80, miniHeight = 80;
            const miniProj = d3.geoMercator().fitSize([miniWidth, miniHeight], texas);
            const miniPath = d3.geoPath().projection(miniProj);
            const texasPathData = miniPath(texas);
            const dotPos = miniProj([+d.longitude, +d.latitude]);
            const dotColor = d.churn_rate > 0.15 ? '#ff4444' : '#44ff44';

            const miniMapSVG = `
                <svg width="${miniWidth}" height="${miniHeight}" style="display: block; margin: 5px auto;">
                    <path d="${texasPathData}" fill="none" stroke="#666" stroke-width="1.5"/>
                    <circle cx="${dotPos[0]}" cy="${dotPos[1]}" r="4" fill="${dotColor}" stroke="white" stroke-width="1"/>
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
                        <div>Stability Index: ${d.financial_stability_index.toFixed(2)}</div>
                        <div>Stress Level: ${getStressLevel(d.financial_stability_index).replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
                        <div>Churn Rate: ${(d.churn_rate * 100).toFixed(1)}%</div>
                    </div>
                `);
        })
        .on('mouseout', function () {
            d3.select('.tooltip').style('opacity', 0);
        });

    // ---- Hexbin cluster layer ----
    const hexbinG = svg.append('g').attr('class', 'hex-cluster-layer');

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

    hexbinG.selectAll('path')
        .data(bins)
        .enter().append('path')
        .attr('d', d => hexbin.hexagon(hexRadius(d.length)))
        .attr('transform', d => `translate(${d.x},${d.y})`)
        .attr('fill', d => color(d3.mean(d, p => p.financial_stability_index)))
        .attr('stroke', '#333')
        .attr('stroke-width', 0.5)
        .attr('opacity', 0.8);

    // Start in clustered mode
    bubblesG.style('display', 'none');

    // ---- Zoom behavior ----
    const zoomThreshold = 2.5;

    const zoom = d3.zoom()
        .scaleExtent([1, 15])
        .on('zoom', (event) => {
            const t = event.transform;
            svg.attr('transform', `translate(${t.x + margin.left}, ${t.y + margin.top}) scale(${t.k})`);

            if (t.k >= zoomThreshold) {
                hexbinG.style('display', 'none');
                bubblesG.style('display', null);
                bubbles.attr('r', d => (3 + Math.sqrt(d.count / 5000) + (d.churn_rate > 0.15 ? 3 : 0)) / t.k)
                    .attr('stroke-width', 1 / t.k);
            } else {
                hexbinG.style('display', null);
                bubblesG.style('display', 'none');
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
        .on('click', () => {
            svgOuter.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
            // Also reset syncing
            q3EventBus.emit('highlight-customers', null);
        });

    // ---- Legends ----
    const legendContainer = container.append('div')
        .style('display', 'flex')
        .style('justify-content', 'center')
        .style('gap', '30px')
        .style('flex-wrap', 'wrap');

    // Color legend
    drawGradientLegend(legendContainer, color, {
        title: 'Financial Stability',
        width: 180,
        ticks: 4,
        format: '.2f'
    });

    // Size legend
    const sizeLegend = legendContainer.append('div')
        .attr('class', 'q3-legend')
        .style('display', 'flex')
        .style('flex-direction', 'column')
        .style('align-items', 'center')
        .style('margin-top', '10px');

    sizeLegend.append('div')
        .style('color', '#ccc')
        .style('font-size', '11px')
        .style('margin-bottom', '4px')
        .style('font-weight', '600')
        .text('Churn Status');

    const szSvg = sizeLegend.append('svg').attr('width', 150).attr('height', 30);
    szSvg.append('circle').attr('cx', 20).attr('cy', 15).attr('r', 4)
        .attr('fill', '#66bb66').attr('opacity', 0.8);
    szSvg.append('text').attr('x', 28).attr('y', 18).attr('fill', '#aaa')
        .attr('font-size', '9px').text('Low Churn (<15%)');
    szSvg.append('circle').attr('cx', 90).attr('cy', 15).attr('r', 8)
        .attr('fill', '#cc4444').attr('opacity', 0.8).attr('stroke', '#fff').attr('stroke-width', 1);
    szSvg.append('text').attr('x', 104).attr('y', 18).attr('fill', '#aaa')
        .attr('font-size', '9px').text('High Churn');

    // ---- Clickable category legend for syncing ----
    drawCategoryLegend(container, [
        { key: 'high-stress', value: 0.15, label: 'High Stress (0–0.33)' },
        { key: 'medium-stress', value: 0.5, label: 'Medium (0.33–0.66)' },
        { key: 'low-stress', value: 0.85, label: 'Low Stress (0.66–1.0)' },
    ], (val) => color(val), {
        title: '🔗 Click to sync with Map 2 — Select Stress Level:',
        onClick: (selectedKey) => {
            if (!selectedKey) {
                // Deselect: reset both maps
                bubbles.attr('opacity', 0.8)
                    .attr('stroke', d => d.churn_rate > 0.15 ? '#fff' : 'none')
                    .attr('stroke-width', 1);
                q3EventBus.emit('highlight-customers', null);
                return;
            }

            // Find matching customers
            const selectedIndices = data
                .filter(d => getStressLevel(d.financial_stability_index) === selectedKey)
                .map(d => d._idx);

            const idxSet = new Set(selectedIndices);

            // Highlight in this map
            bubbles
                .attr('opacity', d => idxSet.has(d._idx) ? 1 : 0.07)
                .attr('stroke', d => idxSet.has(d._idx) ? '#fff' : 'none')
                .attr('stroke-width', d => idxSet.has(d._idx) ? 2 : 0);
            // Hex clusters also dim
            hexbinG.selectAll('path')
                .attr('opacity', d => {
                    const matchCount = d.filter(p => idxSet.has(p._idx)).length;
                    return matchCount > 0 ? 0.9 : 0.1;
                });

            // Sync with Map 2
            q3EventBus.emit('highlight-customers', selectedIndices);

            // Switch to individual bubbles if in hex view
            if (bubblesG.style('display') === 'none') {
                hexbinG.style('display', 'none');
                bubblesG.style('display', null);
            }
        }
    });

    // Description
    container.append('div')
        .style('text-align', 'center')
        .style('margin-top', '10px')
        .style('color', '#aaa')
        .style('font-size', '11px')
        .style('font-style', 'italic')
        .html(`
            Financial stability distribution and its relationship to customer churn. Scroll to zoom.<br>
            Color: Red (unstable) → Yellow → Green (stable) | Size: Larger = churned customer<br>
            <strong>Click a stress level above to highlight those customers in both maps.</strong>
        `);

    container.append('div')
        .style('text-align', 'center')
        .style('margin-top', '8px')
        .style('color', '#aaa')
        .style('font-size', '11px')
        .style('font-style', 'italic')
        .text('Insight: Determines if geographic churn is driven by regional economic stress');

})();
