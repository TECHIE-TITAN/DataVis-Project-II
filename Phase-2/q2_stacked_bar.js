(function() {
    const margin = {top: 40, right: 180, bottom: 80, left: 90};
    const width = 800 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    const svg = d3.select("#risk-composition-chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create tooltip
    const tooltip = d3.select('body')
        .append('div')
        .attr('class', 'q2-stacked-tooltip')
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

    // Define structures and colors (matching other charts)
    const structures = ["Single-NoKids", "Single-Kids", "Married-NoKids", "Married-Kids"];
    const colorScale = d3.scaleOrdinal()
        .domain(structures)
        .range(["#FF1744", "#FFC107", "#00E676", "#2196F3"]); // Red, Amber, Green, Blue

    // Process data into stacked format
    const tenureGroups = q2StackedData.map(d => d.tenure_group);
    
    // Create stack generator
    const stack = d3.stack()
        .keys(structures)
        .value((d, key) => d[key] || 0);
    
    const series = stack(q2StackedData);

    // Scales
    const x = d3.scaleBand()
        .domain(tenureGroups)
        .range([0, width])
        .padding(0.3);

    const y = d3.scaleLinear()
        .domain([0, 100]) // Percentage scale
        .range([height, 0]);

    // Add gridlines
    svg.append("g")
        .attr("class", "grid")
        .attr("opacity", 0.15)
        .call(d3.axisLeft(y)
            .tickSize(-width)
            .tickFormat("")
        );

    // Axes
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .attr("class", "axis")
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("font-size", "11px")
        .style("fill", "#e0e0e0");

    svg.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y).tickFormat(d => d + "%").ticks(10))
        .selectAll("text")
        .style("font-size", "11px")
        .style("fill", "#e0e0e0");

    // Axis Labels
    svg.append("text")
        .attr("class", "axis-label")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height + 50)
        .style("fill", "#e0e0e0")
        .style("font-size", "14px")
        .style("font-weight", "500")
        .text("Customer Tenure");

    svg.append("text")
        .attr("class", "axis-label")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("y", -65)
        .attr("x", -height / 2)
        .style("fill", "#e0e0e0")
        .style("font-size", "14px")
        .style("font-weight", "500")
        .text("% of Total Churners");

    // Draw stacked bars
    const groups = svg.selectAll("g.layer")
        .data(series)
        .enter()
        .append("g")
        .attr("class", d => `layer-${d.key.replace(/[^a-zA-Z0-9]/g, '')}`)
        .attr("fill", d => colorScale(d.key));

    groups.selectAll("rect")
        .data(d => d)
        .enter()
        .append("rect")
        .attr("x", d => x(d.data.tenure_group))
        .attr("y", d => y(d[1]))
        .attr("height", d => y(d[0]) - y(d[1]))
        .attr("width", x.bandwidth())
        .attr("stroke", "#000")
        .attr("stroke-width", 1)
        .style("cursor", "pointer")
        .on("mouseover", function(event, d) {
            const structure = d3.select(this.parentNode).datum().key;
            const percentage = d[1] - d[0];
            
            // Show tooltip
            tooltip
                .style("display", "block")
                .transition()
                .duration(200)
                .style("opacity", 1);
            
            tooltip.html(`
                <div style="border-bottom: 1px solid #555; margin-bottom: 8px; padding-bottom: 6px;">
                    <strong style="color:${colorScale(structure)}; font-size: 14px;">${structure}</strong>
                </div>
                <div style="margin: 4px 0;"><strong>Tenure:</strong> ${d.data.tenure_group}</div>
                <div style="margin: 4px 0;"><strong>Percentage:</strong> ${percentage.toFixed(1)}%</div>
                <div style="margin: 4px 0; font-size: 11px; color: #aaa;">Of all churners in this tenure group</div>
            `)
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 80) + "px");
            
            // Highlight segment
            d3.select(this)
                .transition()
                .duration(200)
                .attr("opacity", 1)
                .attr("stroke", "#fff")
                .attr("stroke-width", 2);
        })
        .on("mousemove", function(event) {
            tooltip
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 80) + "px");
        })
        .on("mouseout", function() {
            // Hide tooltip
            tooltip
                .transition()
                .duration(300)
                .style("opacity", 0)
                .on("end", function() {
                    tooltip.style("display", "none");
                });
            
            // Reset segment
            d3.select(this)
                .transition()
                .duration(200)
                .attr("opacity", 0.9)
                .attr("stroke", "#000")
                .attr("stroke-width", 1);
        })
        .on("click", function(event, d) {
            const structure = d3.select(this.parentNode).datum().key;
            const percentage = d[1] - d[0];
            event.stopPropagation();
            alert(`${structure}\nTenure: ${d.data.tenure_group}\nPercentage: ${percentage.toFixed(1)}%`);
        })
        .attr("opacity", 0.9);

    // Legend
    const legend = svg.append("g")
        .attr("transform", `translate(${width + 20}, 20)`);

    legend.append("text")
        .attr("x", 0)
        .attr("y", -5)
        .style("fill", "#e0e0e0")
        .style("font-size", "13px")
        .style("font-weight", "600")
        .text("Family Structure:");

    structures.forEach((structure, i) => {
        const legendRow = legend.append("g")
            .attr("transform", `translate(0, ${i * 28 + 15})`)
            .style("cursor", "pointer");
        
        legendRow.append("rect")
            .attr("width", 18)
            .attr("height", 18)
            .attr("fill", colorScale(structure))
            .attr("opacity", 0.9)
            .attr("stroke", "#000")
            .attr("stroke-width", 1);
        
        legendRow.append("text")
            .attr("x", 25)
            .attr("y", 13)
            .style("fill", "#e0e0e0")
            .style("font-size", "12px")
            .text(structure);
        
        // Legend hover effect
        legendRow
            .on("mouseover", function() {
                // Highlight all segments of this structure
                svg.selectAll(`.layer-${structure.replace(/[^a-zA-Z0-9]/g, '')} rect`)
                    .transition()
                    .duration(200)
                    .attr("opacity", 1)
                    .attr("stroke", "#fff")
                    .attr("stroke-width", 2);
                
                // Dim others
                structures.forEach(otherStruct => {
                    if (otherStruct !== structure) {
                        svg.selectAll(`.layer-${otherStruct.replace(/[^a-zA-Z0-9]/g, '')} rect`)
                            .transition()
                            .duration(200)
                            .attr("opacity", 0.2);
                    }
                });
            })
            .on("mouseout", function() {
                // Reset all
                svg.selectAll("rect")
                    .transition()
                    .duration(200)
                    .attr("opacity", 0.9)
                    .attr("stroke", "#000")
                    .attr("stroke-width", 1);
            });
    });

    // Add explanatory note
    const note = legend.append("g")
        .attr("transform", `translate(0, ${structures.length * 28 + 40})`);
    
    note.append("text")
        .attr("x", 0)
        .attr("y", 0)
        .style("fill", "#999")
        .style("font-size", "10px")
        .style("font-style", "italic")
        .text("Each bar = 100%");
    
    note.append("text")
        .attr("x", 0)
        .attr("y", 15)
        .style("fill", "#999")
        .style("font-size", "10px")
        .style("font-style", "italic")
        .text("of churners in that");
    
    note.append("text")
        .attr("x", 0)
        .attr("y", 30)
        .style("fill", "#999")
        .style("font-size", "10px")
        .style("font-style", "italic")
        .text("tenure group");

})();