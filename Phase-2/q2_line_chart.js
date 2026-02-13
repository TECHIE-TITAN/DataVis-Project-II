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
    const x = d3.scalePoint()
        .domain(['18-25', '26-35', '36-45', '46-55', '56-65', '65+'])
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

    // 6. Line Generator with DASH PATTERNS for better distinction
    const lineGenerator = d3.line()
        .x(d => x(d.age_group))
        .y(d => y(d.churn))
        .curve(d3.curveMonotoneX);

    const structures = ["Single-NoKids", "Single-Kids", "Married-NoKids", "Married-Kids"];
    
    // Define dash patterns for additional visual distinction
    const dashPatterns = {
        "Single-NoKids": "0",        // Solid
        "Single-Kids": "8,4",        // Dashed
        "Married-NoKids": "0",       // Solid
        "Married-Kids": "2,3"        // Dotted
    };

    // 7. Draw lines and interactive dots
    structures.forEach(struct => {
        const structData = q2Data.filter(d => d.structure === struct)
                                 .sort((a, b) => x.domain().indexOf(a.age_group) - x.domain().indexOf(b.age_group));

        if (structData.length > 0) {
            // Draw Line Path with THICKER lines and dash patterns
            const linePath = svg.append("path")
                .datum(structData)
                .attr("class", `line-${struct.replace(/[^a-zA-Z0-9]/g, '')}`)
                .attr("fill", "none")
                .attr("stroke", colorScale(struct))
                .attr("stroke-width", 4)  // Thicker for visibility
                .attr("stroke-dasharray", dashPatterns[struct])
                .attr("opacity", 0.9)
                .attr("d", lineGenerator);

            // Draw Interactive Dots - LARGER for visibility
            svg.selectAll(`.dot-${struct.replace(/[^a-zA-Z0-9]/g, '')}`)
                .data(structData)
                .enter()
                .append("circle")
                .attr("class", `dot-${struct.replace(/[^a-zA-Z0-9]/g, '')}`)
                .attr("cx", d => x(d.age_group))
                .attr("cy", d => y(d.churn))
                .attr("r", 7)  // Larger dots
                .attr("fill", colorScale(struct))
                .attr("stroke", "#000")
                .attr("stroke-width", 2)
                .style("cursor", "pointer")
                .on("mouseover", function(event, d) {
                    // Show tooltip
                    tooltip
                        .style("display", "block")
                        .transition()
                        .duration(200)
                        .style("opacity", 1);
                    
                    tooltip.html(`
                        <div style="border-bottom: 1px solid #555; margin-bottom: 8px; padding-bottom: 6px;">
                            <strong style="color: ${colorScale(d.structure)}; font-size: 14px;">${d.structure}</strong>
                        </div>
                        <div style="margin: 4px 0;"><strong>Age Group:</strong> ${d.age_group}</div>
                        <div style="margin: 4px 0;"><strong>Churn Rate:</strong> ${(d.churn * 100).toFixed(2)}%</div>
                    `)
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 60) + "px");

                    // Highlight the dot
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr("r", 12)
                        .attr("stroke-width", 3)
                        .attr("stroke", "#fff");
                    
                    // Highlight the corresponding line
                    svg.select(`.line-${struct.replace(/[^a-zA-Z0-9]/g, '')}`)
                        .transition()
                        .duration(200)
                        .attr("stroke-width", 6)
                        .attr("opacity", 1);
                })
                .on("mousemove", function(event) {
                    tooltip
                        .style("left", (event.pageX + 15) + "px")
                        .style("top", (event.pageY - 60) + "px");
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
                    
                    // Reset dot
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr("r", 7)
                        .attr("stroke-width", 2)
                        .attr("stroke", "#000");
                    
                    // Reset line
                    svg.select(`.line-${struct.replace(/[^a-zA-Z0-9]/g, '')}`)
                        .transition()
                        .duration(200)
                        .attr("stroke-width", 4)
                        .attr("opacity", 0.9);
                })
                .on("click", function(event, d) {
                    // Click functionality
                    event.stopPropagation();
                    console.log("Clicked data:", d);
                    alert(`${d.structure}\nAge Group: ${d.age_group}\nChurn Rate: ${(d.churn * 100).toFixed(2)}%`);
                });
        }
    });

    // 8. Enhanced Legend with line samples
    const legend = svg.append("g")
        .attr("transform", `translate(${width + 20}, 20)`);

    legend.append("text")
        .attr("x", 0)
        .attr("y", -5)
        .style("fill", "#e0e0e0")
        .style("font-size", "13px")
        .style("font-weight", "600")
        .text("Family Structure:");

    structures.forEach((struct, i) => {
        const legendRow = legend.append("g")
            .attr("class", `legend-${struct.replace(/[^a-zA-Z0-9]/g, '')}`)
            .attr("transform", `translate(0, ${i * 32 + 15})`)
            .style("cursor", "pointer");
        
        // Draw line sample with dash pattern
        legendRow.append("line")
            .attr("x1", 0)
            .attr("x2", 35)
            .attr("y1", 8)
            .attr("y2", 8)
            .attr("stroke", colorScale(struct))
            .attr("stroke-width", 4)
            .attr("stroke-dasharray", dashPatterns[struct]);
        
        legendRow.append("circle")
            .attr("cx", 17)
            .attr("cy", 8)
            .attr("r", 6)
            .attr("fill", colorScale(struct))
            .attr("stroke", "#000")
            .attr("stroke-width", 1.5);
            
        legendRow.append("text")
            .attr("x", 45)
            .attr("y", 12)
            .style("fill", "#e0e0e0")
            .style("font-size", "12px")
            .style("font-weight", "500")
            .text(struct);
        
        // Legend hover effect
        legendRow
            .on("mouseover", function() {
                // Dim all other lines
                svg.selectAll("path[class^='line-']")
                    .transition()
                    .duration(200)
                    .attr("opacity", 0.1);
                
                svg.selectAll("circle[class^='dot-']")
                    .transition()
                    .duration(200)
                    .attr("opacity", 0.1);
                
                // Highlight selected line and dots
                svg.select(`.line-${struct.replace(/[^a-zA-Z0-9]/g, '')}`)
                    .transition()
                    .duration(200)
                    .attr("opacity", 1)
                    .attr("stroke-width", 6);
                
                svg.selectAll(`.dot-${struct.replace(/[^a-zA-Z0-9]/g, '')}`)
                    .transition()
                    .duration(200)
                    .attr("opacity", 1)
                    .attr("r", 9);
            })
            .on("mouseout", function() {
                // Reset all lines
                svg.selectAll("path[class^='line-']")
                    .transition()
                    .duration(200)
                    .attr("opacity", 0.9)
                    .attr("stroke-width", 4);
                
                svg.selectAll("circle[class^='dot-']")
                    .transition()
                    .duration(200)
                    .attr("opacity", 1)
                    .attr("r", 7);
            });
    });
})();