// Map 3: Financial Stress Bubble Map
(function () {
    const margin = { top: 20, right: 20, bottom: 80, left: 20 };
    const width = 800;
    const height = 500;

    d3.select('#q3-bubble').html('');

    const svg = d3.select('#q3-bubble')
        .append('svg')
        .attr('width', '100%')
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const data = q3Data;

    data.forEach(d => {
        d.financial_stability_index = +d.financial_stability_index;
        d.Churn = +d.Churn;
    });

    const pointsGeoJSON = {
        type: "MultiPoint",
        coordinates: data.map(d => [d.longitude, d.latitude])
    };

    const projection = d3.geoMercator()
        .fitSize([width, height - margin.bottom], pointsGeoJSON);

    const path = d3.geoPath().projection(projection);

    // Add graticule
    const graticule = d3.geoGraticule()
        .step([0.5, 0.5]);

    svg.append("path")
        .datum(graticule)
        .attr("d", path)
        .attr("fill", "none")
        .attr("stroke", "#666")
        .attr("stroke-width", 0.5)
        .attr("opacity", 0.5);

    const color = d3.scaleSequential(d3.interpolateRdYlGn)
        .domain([0, 1]);

    svg.selectAll('circle')
        .data(data.sort((a, b) => a.Churn - b.Churn))
        .enter()
        .append('circle')
        .attr('cx', d => projection([+d.longitude, +d.latitude])[0])
        .attr('cy', d => projection([+d.longitude, +d.latitude])[1])
        .attr('r', d => d.Churn ? 6 : 3)
        .attr('fill', d => color(d.financial_stability_index))
        .attr('stroke', d => d.Churn ? '#fff' : 'none')
        .attr('stroke-width', 1)
        .attr('opacity', 0.8)
        .on('mouseover', function (event, d) {
            // Create mini Texas map
            const usInfo = q3MapData;
            const states = topojson.feature(usInfo, usInfo.objects.states);
            const texas = states.features.find(s => s.properties.name === "Texas");

            const miniWidth = 80;
            const miniHeight = 80;
            const miniProj = d3.geoMercator().fitSize([miniWidth, miniHeight], texas);
            const miniPath = d3.geoPath().projection(miniProj);

            const texasPathData = miniPath(texas);
            const dotPos = miniProj([+d.longitude, +d.latitude]);

            const dotColor = d.Churn ? '#ff4444' : '#44ff44';

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
                        <div style="margin-top: 5px;"><strong>${d.city}</strong></div>
                        <div>Stability Index: ${d.financial_stability_index.toFixed(2)}</div>
                        <div>Churn: ${d.Churn ? 'Yes' : 'No'}</div>
                    </div>
                `);
        })
        .on('mouseout', function () {
            d3.select('.tooltip').style('opacity', 0);
        });


    // Description and Insight text as HTML
    d3.select('#q3-bubble')
        .append('div')
        .style('text-align', 'center')
        .style('margin-top', '10px')
        .style('color', '#aaa')
        .style('font-size', '11px')
        .style('font-style', 'italic')
        .html(`
            Financial stability distribution and its relationship to customer churn.<br>
            Color: Red (unstable) → Yellow → Green (stable) | Bubble size: Larger = churned customer
        `);

    d3.select('#q3-bubble')
        .append('div')
        .style('text-align', 'center')
        .style('margin-top', '8px')
        .style('color', '#aaa')
        .style('font-size', '11px')
        .style('font-style', 'italic')
        .text('Insight: Determines if geographic churn is driven by regional economic stress');

})();
