// Heatmap 3: Credit Quality Map
(function() {
    const margin = {top: 20, right: 20, bottom: 60, left: 80};
    const width = 450;
    const height = 400;
    
    const tenureBuckets = ['0-1yr', '1-2yr', '2-4yr', '4-8yr', '8+yr'];
    const incomeBuckets = ['<25K', '25-50K', '50-75K', '75-100K', '100-150K', '150K+'];
    
    const colorScale = d3.scaleLinear()
        .domain([0, 1])
        .range(['#2d1b4e', '#b39ddb']);
    
    const tooltip = d3.select('.tooltip');
    
    const sampleData = [
        {tenure: '0-1yr', income: '<25K', value: 0.40, count: 120},
        {tenure: '1-2yr', income: '<25K', value: 0.45, count: 150},
        {tenure: '2-4yr', income: '<25K', value: 0.50, count: 180},
        {tenure: '4-8yr', income: '<25K', value: 0.55, count: 200},
        {tenure: '8+yr', income: '<25K', value: 0.60, count: 250},
        
        {tenure: '0-1yr', income: '25-50K', value: 0.50, count: 200},
        {tenure: '1-2yr', income: '25-50K', value: 0.55, count: 250},
        {tenure: '2-4yr', income: '25-50K', value: 0.60, count: 300},
        {tenure: '4-8yr', income: '25-50K', value: 0.65, count: 350},
        {tenure: '8+yr', income: '25-50K', value: 0.70, count: 400},
        
        {tenure: '0-1yr', income: '50-75K', value: 0.65, count: 300},
        {tenure: '1-2yr', income: '50-75K', value: 0.70, count: 350},
        {tenure: '2-4yr', income: '50-75K', value: 0.73, count: 400},
        {tenure: '4-8yr', income: '50-75K', value: 0.76, count: 450},
        {tenure: '8+yr', income: '50-75K', value: 0.80, count: 500},
        
        {tenure: '0-1yr', income: '75-100K', value: 0.75, count: 250},
        {tenure: '1-2yr', income: '75-100K', value: 0.78, count: 300},
        {tenure: '2-4yr', income: '75-100K', value: 0.82, count: 350},
        {tenure: '4-8yr', income: '75-100K', value: 0.85, count: 400},
        {tenure: '8+yr', income: '75-100K', value: 0.88, count: 450},
        
        {tenure: '0-1yr', income: '100-150K', value: 0.82, count: 180},
        {tenure: '1-2yr', income: '100-150K', value: 0.85, count: 220},
        {tenure: '2-4yr', income: '100-150K', value: 0.88, count: 260},
        {tenure: '4-8yr', income: '100-150K', value: 0.90, count: 300},
        {tenure: '8+yr', income: '100-150K', value: 0.93, count: 350},
        
        {tenure: '0-1yr', income: '150K+', value: 0.88, count: 100},
        {tenure: '1-2yr', income: '150K+', value: 0.90, count: 130},
        {tenure: '2-4yr', income: '150K+', value: 0.92, count: 160},
        {tenure: '4-8yr', income: '150K+', value: 0.94, count: 190},
        {tenure: '8+yr', income: '150K+', value: 0.96, count: 220}
    ];
    
    const cellWidth = (width - margin.left - margin.right) / tenureBuckets.length;
    const cellHeight = (height - margin.top - margin.bottom) / incomeBuckets.length;
    
    const svg = d3.select('#chart3')
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    g.selectAll('.cell')
        .data(sampleData)
        .enter()
        .append('rect')
        .attr('class', 'heatmap-cell')
        .attr('x', d => tenureBuckets.indexOf(d.tenure) * cellWidth)
        .attr('y', d => incomeBuckets.indexOf(d.income) * cellHeight)
        .attr('width', cellWidth)
        .attr('height', cellHeight)
        .attr('fill', d => colorScale(d.value))
        .on('mouseover', function(event, d) {
            tooltip.style('opacity', 1)
                .style('left', (event.pageX + 15) + 'px')
                .style('top', (event.pageY - 15) + 'px')
                .html(`
                    <div><strong>Tenure:</strong> ${d.tenure}</div>
                    <div><strong>Income:</strong> ${d.income}</div>
                    <div><strong>Good Credit:</strong> ${(d.value * 100).toFixed(1)}%</div>
                    <div style="color: #888; font-size: 11px; margin-top: 5px;">Count: ${d.count}</div>
                `);
        })
        .on('mouseout', function() {
            tooltip.style('opacity', 0);
        });
    
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
    
    const xScale = d3.scaleBand()
        .domain(tenureBuckets)
        .range([0, cellWidth * tenureBuckets.length]);
    
    g.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${cellHeight * incomeBuckets.length})`)
        .call(d3.axisBottom(xScale));
    
    const yScale = d3.scaleBand()
        .domain(incomeBuckets)
        .range([0, cellHeight * incomeBuckets.length]);
    
    g.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(yScale));
    
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
