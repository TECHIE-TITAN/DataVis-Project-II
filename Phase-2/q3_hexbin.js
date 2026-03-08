// Map 1: Spatial Churn Hotspot (Hexbin) — Bivariate Scale
// - Texas county outlines as base layer
// - 3×3 bivariate color grid: X-axis = churn rate, Y-axis = customer count
// - Uniform hexagon size (no size encoding) to eliminate competition
// - Bivariate legend
(async function () {
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const width = 800;
    const height = 500;

    d3.select('#q3-hexbin').html('');

    const container = d3.select('#q3-hexbin');

    const svgOuter = container
        .append('svg')
        .attr('width', '100%')
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`);

    const svg = svgOuter
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const data = q3Data;

    data.forEach(d => {
        d.latitude  = +d.latitude;
        d.longitude = +d.longitude;
        // Aggregated field: churn_rate replaces per-row Churn
        d.churn_rate = +d.churn_rate;
        d.avg_days_tenure = +d.avg_days_tenure;
        d.financial_stability_index = +d.financial_stability_index;
        d.count = +d.count;
    });

    const pointsGeoJSON = {
        type: "MultiPoint",
        coordinates: data.map(d => [d.longitude, d.latitude])
    };

    const projection = d3.geoMercator()
        .fitSize([width - margin.left - margin.right, height - margin.top - margin.bottom], pointsGeoJSON);

    const path = d3.geoPath().projection(projection);

    // Load and draw Texas county outlines as base layer
    await loadTexasCounties();
    drawTexasBase(svg, path);

    // Hexbin generator — uniform size
    const hexbin = d3.hexbin()
        .x(d => projection([d.longitude, d.latitude])[0])
        .y(d => projection([d.longitude, d.latitude])[1])
        .radius(12)
        .extent([[0, 0], [width, height]]);

    const validPoints = data.filter(d => {
        const p = projection([d.longitude, d.latitude]);
        return p && !isNaN(p[0]) && !isNaN(p[1]);
    });

    const bins = hexbin(validPoints);

    // ---- 3×3 Bivariate Color Scale ----
    // X-axis: Churn Rate (low → high)  
    // Y-axis: Customer Count (low → high)
    // Colors blend from:
    //   low-count/low-churn (light gray) → low-count/high-churn (red)
    //   high-count/low-churn (blue) → high-count/high-churn (dark purple)
    const bivariateColors = [
        // Row 0: low count  [low churn,    mid churn,    high churn]
        ['#e8e8e8', '#e4acac', '#c85a5a'],
        // Row 1: mid count
        ['#b0d5df', '#ad9ea5', '#985356'],
        // Row 2: high count
        ['#64acbe', '#627f8c', '#574249']
    ];

    const maxCount = d3.max(bins, d => d3.sum(d, p => p.count)) || 1;

    // Quantize into 3 bins (0, 1, 2)
    function getChurnBin(churnRate) {
        if (churnRate < 0.33) return 0;
        if (churnRate < 0.66) return 1;
        return 2;
    }

    function getCountBin(count) {
        const third = maxCount / 3;
        if (count <= third) return 0;
        if (count <= third * 2) return 1;
        return 2;
    }

    function getBivariateColor(churnRate, count) {
        const cx = getChurnBin(churnRate);
        const cy = getCountBin(count);
        return bivariateColors[cy][cx];
    }

    svg.append('g')
        .attr('class', 'hexbins')
        .selectAll('path')
        .data(bins)
        .enter().append('path')
        .attr('d', d => hexbin.hexagon(hexbin.radius())) // Uniform size!
        .attr('transform', d => `translate(${d.x},${d.y})`)
        .attr('fill', d => getBivariateColor(d3.mean(d, p => p.churn_rate), d3.sum(d, p => p.count)))
        .attr('stroke', '#222')
        .attr('stroke-width', '0.5px')
        .attr('opacity', 0.85)
        .on('mouseover', function (event, d) {
            const churnRate = d3.mean(d, p => p.churn_rate);
            const totalCustomers = d3.sum(d, p => p.count);
            const cities = [...new Set(d.map(p => p.city))];
            const locationText = cities.length <= 3
                ? cities.join(', ')
                : `${cities.slice(0, 2).join(', ')} +${cities.length - 2} more`;

            const hexCenterLon = d3.mean(d, p => p.longitude);
            const hexCenterLat = d3.mean(d, p => p.latitude);

            // Mini Texas map
            const usInfo = q3MapData;
            const states = topojson.feature(usInfo, usInfo.objects.states);
            const texas = states.features.find(s => s.properties.name === "Texas");
            const miniWidth = 80, miniHeight = 80;
            const miniProj = d3.geoMercator().fitSize([miniWidth, miniHeight], texas);
            const miniPath = d3.geoPath().projection(miniProj);
            const texasPathData = miniPath(texas);
            const dotPos = miniProj([hexCenterLon, hexCenterLat]);

            const miniMapSVG = `
                 <svg width="${miniWidth}" height="${miniHeight}" style="display: block; margin: 5px auto;">
                     <path d="${texasPathData}" fill="none" stroke="#666" stroke-width="1.5"/>
                     <circle cx="${dotPos[0]}" cy="${dotPos[1]}" r="4" fill="#ff4444" stroke="white" stroke-width="1"/>
                 </svg>
                 <div style="text-align: center; font-size: 9px; color: #888; margin-top: -3px;">Texas</div>
             `;

            d3.select('.tooltip').style('opacity', 1)
                .style('left', (event.pageX + 15) + 'px')
                .style('top', (event.pageY - 15) + 'px')
                .html(`
                     <div style="background: rgba(0,0,0,0.95); padding: 8px; border-radius: 5px; color: white;">
                         ${miniMapSVG}
                         <div style="margin-top: 5px;"><strong>Location:</strong> ${locationText}</div>
                         <div>Customers: ${totalCustomers.toLocaleString()}</div>
                         <div>Churn Rate: ${(churnRate * 100).toFixed(1)}%</div>
                         <div style="margin-top: 4px; padding: 3px 6px; border-radius: 3px; background: ${getBivariateColor(churnRate, totalCustomers)}; display: inline-block;">
                             ${getCountBin(totalCustomers) === 0 ? 'Low' : getCountBin(totalCustomers) === 1 ? 'Mid' : 'High'} Count, 
                             ${getChurnBin(churnRate) === 0 ? 'Low' : getChurnBin(churnRate) === 1 ? 'Mid' : 'High'} Churn
                         </div>
                     </div>
                 `);
            d3.select(this).attr('stroke', '#fff').attr('stroke-width', '2px');
        })
        .on('mouseout', function () {
            d3.select('.tooltip').style('opacity', 0);
            d3.select(this).attr('stroke', '#222').attr('stroke-width', '0.5px');
        });

    // ---- Bivariate Legend (3×3 grid) ----
    const legendSize = 90;
    const cellSize = legendSize / 3;

    const legendDiv = container.append('div')
        .style('display', 'flex')
        .style('justify-content', 'center')
        .style('margin-top', '12px');

    const legendSvg = legendDiv.append('svg')
        .attr('width', legendSize + 130)
        .attr('height', legendSize + 60);

    const legendG = legendSvg.append('g')
        .attr('transform', `translate(50, 15)`);

    // Draw 3×3 grid cells
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            legendG.append('rect')
                .attr('x', col * cellSize)
                .attr('y', (2 - row) * cellSize) // Flip so high count is at top
                .attr('width', cellSize)
                .attr('height', cellSize)
                .attr('fill', bivariateColors[row][col])
                .attr('stroke', '#333')
                .attr('stroke-width', 0.5);
        }
    }

    // X-axis label (Churn Rate →)
    legendG.append('text')
        .attr('x', legendSize / 2)
        .attr('y', legendSize + 16)
        .attr('text-anchor', 'middle')
        .attr('fill', '#aaa')
        .attr('font-size', '10px')
        .text('Churn Rate →');

    // Y-axis label (Customer Count →)
    legendG.append('text')
        .attr('transform', `rotate(-90)`)
        .attr('x', -legendSize / 2)
        .attr('y', -12)
        .attr('text-anchor', 'middle')
        .attr('fill', '#aaa')
        .attr('font-size', '10px')
        .text('Customer Count →');

    // Corner labels
    legendG.append('text').attr('x', -4).attr('y', legendSize + 14)
        .attr('text-anchor', 'end').attr('fill', '#777').attr('font-size', '8px').text('Low');
    legendG.append('text').attr('x', legendSize + 4).attr('y', legendSize + 14)
        .attr('text-anchor', 'start').attr('fill', '#777').attr('font-size', '8px').text('High');
    legendG.append('text').attr('x', -4).attr('y', legendSize + 2)
        .attr('text-anchor', 'end').attr('fill', '#777').attr('font-size', '8px').text('Low');
    legendG.append('text').attr('x', -4).attr('y', 8)
        .attr('text-anchor', 'end').attr('fill', '#777').attr('font-size', '8px').text('High');

    // Key color callouts
    const callouts = [
        { color: bivariateColors[0][2], label: '⚠ Few customers, high churn — critical risk' },
        { color: bivariateColors[2][0], label: '● Many customers, low churn — healthy cluster' },
        { color: bivariateColors[2][2], label: '◆ Many customers, high churn — urgent hotspot' },
    ];

    const calloutG = legendDiv.append('div')
        .style('display', 'flex')
        .style('flex-direction', 'column')
        .style('gap', '5px')
        .style('margin-left', '20px')
        .style('justify-content', 'center');

    callouts.forEach(c => {
        const item = calloutG.append('div')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('gap', '6px');

        item.append('div')
            .style('width', '14px')
            .style('height', '14px')
            .style('border-radius', '3px')
            .style('background', c.color)
            .style('border', '1px solid #555')
            .style('flex-shrink', '0');

        item.append('span')
            .style('color', '#bbb')
            .style('font-size', '10px')
            .text(c.label);
    });

    // Description
    container.append('div')
        .style('text-align', 'center')
        .style('margin-top', '10px')
        .style('color', '#aaa')
        .style('font-size', '11px')
        .style('font-style', 'italic')
        .html(`
            Bivariate hexbin map: color encodes <strong>both</strong> customer count and churn rate simultaneously.<br>
            Red tones = high churn | Blue tones = many customers | Purple = high-count AND high-churn hotspots
        `);

    container.append('div')
        .style('text-align', 'center')
        .style('margin-top', '8px')
        .style('color', '#aaa')
        .style('font-size', '11px')
        .style('font-style', 'italic')
        .text('Insight: Eliminates size-vs-color competition — small high-churn clusters are no longer hidden');

})();
