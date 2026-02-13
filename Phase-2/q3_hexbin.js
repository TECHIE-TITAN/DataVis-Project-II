// Map 1: Spatial Churn Hotspot (Hexbin)
(function () {
    const margin = { top: 20, right: 20, bottom: 80, left: 20 };
    const width = 800;
    const height = 500;

    d3.select('#q3-hexbin').html('');

    const svg = d3.select('#q3-hexbin')
        .append('svg')
        .attr('width', '100%')
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const data = q3Data;

    data.forEach(d => {
        d.latitude = +d.latitude;
        d.longitude = +d.longitude;
        d.Churn = +d.Churn;
    });

    const pointsGeoJSON = {
        type: "MultiPoint",
        coordinates: data.map(d => [d.longitude, d.latitude])
    };

    const projection = d3.geoMercator()
        .fitSize([width, height - margin.bottom], pointsGeoJSON);

    const path = d3.geoPath().projection(projection);

    // Add graticule (lat/long grid lines)
    const graticule = d3.geoGraticule()
        .step([0.5, 0.5]); // Grid every 0.5 degrees

    svg.append("path")
        .datum(graticule)
        .attr("d", path)
        .attr("fill", "none")
        .attr("stroke", "#666")
        .attr("stroke-width", 0.5)
        .attr("opacity", 0.5);

    // Hexbin generator
    const hexbin = d3.hexbin()
        .x(d => projection([d.longitude, d.latitude])[0])
        .y(d => projection([d.longitude, d.latitude])[1])
        .radius(10)
        .extent([[0, 0], [width, height]]);

    const validPoints = data.filter(d => {
        const p = projection([d.longitude, d.latitude]);
        return p && !isNaN(p[0]) && !isNaN(p[1]);
    });

    const bins = hexbin(validPoints);

    const color = d3.scaleLinear()
        .domain([0, 1])
        .range(['#2d5016', '#8b0000']);

    const maxCount = d3.max(bins, d => d.length) || 1;
    const radius = d3.scaleSqrt()
        .domain([0, maxCount])
        .range([0, hexbin.radius()]);

    svg.append('g')
        .selectAll('path')
        .data(bins)
        .enter().append('path')
        .attr('d', d => hexbin.hexagon(radius(d.length)))
        .attr('transform', d => `translate(${d.x},${d.y})`)
        .attr('fill', d => color(d3.mean(d, p => p.Churn)))
        .attr('stroke', '#000')
        .attr('stroke-width', '0.5px')
        .attr('opacity', 0.8)
        .on('mouseover', function (event, d) {
            const churnRate = d3.mean(d, p => p.Churn);
            // Get unique cities in this hexbin
            const cities = [...new Set(d.map(p => p.city))];
            const locationText = cities.length <= 3
                ? cities.join(', ')
                : `${cities.slice(0, 2).join(', ')} +${cities.length - 2} more`;

            // Calculate center of hexbin
            const hexCenterLon = d3.mean(d, p => p.longitude);
            const hexCenterLat = d3.mean(d, p => p.latitude);

            // Create mini Texas map
            const usInfo = q3MapData;
            const states = topojson.feature(usInfo, usInfo.objects.states);
            const texas = states.features.find(s => s.properties.name === "Texas");

            const miniWidth = 80;
            const miniHeight = 80;
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
                         <div>Customers: ${d.length}</div>
                         <div>Churn Rate: ${(churnRate * 100).toFixed(1)}%</div>
                     </div>
                 `);
            d3.select(this).attr('stroke', '#fff').attr('stroke-width', '2px');
        })
        .on('mouseout', function () {
            d3.select('.tooltip').style('opacity', 0);
            d3.select(this).attr('stroke', '#000').attr('stroke-width', '0.5px');
        });


    // Description and Insight text as HTML (outside SVG to avoid clipping)
    d3.select('#q3-hexbin')
        .append('div')
        .style('text-align', 'center')
        .style('margin-top', '10px')
        .style('color', '#aaa')
        .style('font-size', '11px')
        .style('font-style', 'italic')
        .html(`
            Hexagonal binning reveals geographic clustering of customer churn.<br>
            Hexagon size = customer count | Color: Green (low churn) → Red (high churn)
        `);

    d3.select('#q3-hexbin')
        .append('div')
        .style('text-align', 'center')
        .style('margin-top', '8px')
        .style('color', '#aaa')
        .style('font-size', '11px')
        .style('font-style', 'italic')
        .text('Insight: Identifies specific geographic regions with elevated churn');

})();
