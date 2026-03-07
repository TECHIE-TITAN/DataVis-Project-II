// Heatmap 1: Churn Density Map
(function() {
    const margin = {top: 20, right: 20, bottom: 60, left: 80};
    const width = 450;
    const height = 400;
    
    const tenureBuckets = ['0-1yr', '1-2yr', '2-4yr', '4-8yr', '8+yr'];
    const incomeBuckets = ['<25K', '25-50K', '50-75K', '75-100K', '100-150K', '150K+'];
    
    const colorScale = d3.scaleLinear()
        .domain([0, 0.5, 1])
        .range(['#2d5016', '#ffd700', '#8b0000']);
    
    const tooltip = d3.select('.tooltip');
    
    // Real data from autoinsurance_churn.csv (pre-aggregated via heatmap_bus.js)
    // Cell value = churn rate (0–1 scale)
    // Displayed as: (d.value * 100).toFixed(1) + '%'  →  e.g. 0.3999 → "40.0%"
    const sampleData = window.heatmapData.cells.map(d => ({
        tenure: d.tenure,
        income: d.income,
        value:  d.churn,
        count:  d.count
    }));
    
    const cellWidth = (width - margin.left - margin.right) / tenureBuckets.length;
    const cellHeight = (height - margin.top - margin.bottom) / incomeBuckets.length;
    
    const svg = d3.select('#chart1')
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Draw heatmap cells
    const cells = g.selectAll('.cell')
        .data(sampleData)
        .enter()
        .append('rect')
        .attr('class', 'heatmap-cell')
        .attr('x', d => tenureBuckets.indexOf(d.tenure) * cellWidth)
        .attr('y', d => incomeBuckets.indexOf(d.income) * cellHeight)
        .attr('width', cellWidth)
        .attr('height', cellHeight)
        .attr('fill', d => colorScale(d.value))
        .attr('stroke', '#000000')
        .attr('stroke-width', 2)
        .on('mouseover', function(event, d) {
            const key = `${d.tenure}|${d.income}`;
            window.heatmapBus.highlight(key, event);
        })
        .on('mousemove', function(event) {
            // Keep the tooltip near the cursor while moving
            d3.select('.tooltip')
                .style('left', (event.pageX + 18) + 'px')
                .style('top', (event.pageY - 18) + 'px');
        })
        .on('mouseout', function() {
            window.heatmapBus.reset();
        });

    // Register this heatmap with the shared event bus
    window.heatmapBus.register(
        'churn',
        cells,
        sampleData,
        d => (d.value * 100).toFixed(1) + '%'
    );
    window.heatmapBus.registries['churn'].label = '🔴 Churn Rate';
    
    // Add text labels
    g.selectAll('.label')
        .data(sampleData)
        .enter()
        .append('text')
        .attr('x', d => tenureBuckets.indexOf(d.tenure) * cellWidth + cellWidth / 2)
        .attr('y', d => incomeBuckets.indexOf(d.income) * cellHeight + cellHeight / 2)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', '#ffffff')
        .attr('font-size', '11px')
        .attr('font-weight', 'bold')
        .style('pointer-events', 'none')
        .text(d => (d.value * 100).toFixed(1) + '%');
    
    // X axis
    const xScale = d3.scaleBand()
        .domain(tenureBuckets)
        .range([0, cellWidth * tenureBuckets.length]);
    
    g.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${cellHeight * incomeBuckets.length})`)
        .call(d3.axisBottom(xScale));
    
    // Y axis
    const yScale = d3.scaleBand()
        .domain(incomeBuckets)
        .range([0, cellHeight * incomeBuckets.length]);
    
    g.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(yScale));
    
    // Axis labels
    svg.append('text')
        .attr('class', 'axis-label')
        .attr('x', width / 2)
        .attr('y', height - 5)
        .attr('text-anchor', 'middle')
        .text('Days Tenure');
    
    svg.append('text')
        .attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', 15)
        .attr('text-anchor', 'middle')
        .text('Income');
})();
