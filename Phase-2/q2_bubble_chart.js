(function() {
    const margin = {top: 40, right: 180, bottom: 80, left: 90};
    const width = 800 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    const svg = d3.select("#q2-bubble-chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create tooltip (ensure it's on top)
    const tooltip = d3.select('body')
        .append('div')
        .attr('class', 'q2-bubble-tooltip')
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

    // 1. Scales
    const x = d3.scaleLinear()
        .domain([18, d3.max(q2BubbleData, d => d.age_in_years) + 2])
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(q2BubbleData, d => d.churn) * 1.15])
        .range([height, 0]);

    const z = d3.scaleSqrt()
        .domain([0, d3.max(q2BubbleData, d => d.income)])
        .range([3, 12]); // Smaller bubbles to reduce overlap

    // IMPROVED COLOR SCHEME - Same as line chart for consistency
    const color = d3.scaleOrdinal()
        .domain(["Single-NoKids", "Single-Kids", "Married-NoKids", "Married-Kids"])
        .range(["#FF1744", "#FFC107", "#00E676", "#2196F3"]); // Red, Amber, Green, Blue

    // 2. Add subtle gridlines
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

    // 3. Axes
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .attr("class", "axis")
        .call(d3.axisBottom(x).ticks(10))
        .selectAll("text")
        .style("font-size", "12px")
        .style("font-weight", "500");

    svg.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y).tickFormat(d3.format(".0%")).ticks(8))
        .selectAll("text")
        .style("font-size", "12px")
        .style("font-weight", "500");

    // 4. Axis Labels
    svg.append("text")
        .attr("class", "axis-label")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height + 50)
        .style("fill", "#e0e0e0")
        .style("font-size", "14px")
        .style("font-weight", "500")
        .text("Age (years)");

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

    // 5. Add slight jitter to reduce overlap and improve readability
    const jitterAmount = 1.5; // pixels of random offset
    
    const categories = ["Single-NoKids", "Single-Kids", "Married-NoKids", "Married-Kids"];
    
    categories.forEach(category => {
        const categoryData = q2BubbleData.filter(d => d.structure === category);
        
        svg.selectAll(`.bubble-${category.replace(/[^a-zA-Z0-9]/g, '')}`)
            .data(categoryData)
            .enter()
            .append("circle")
            .attr("class", `bubble-${category.replace(/[^a-zA-Z0-9]/g, '')}`)
            .attr("cx", d => x(d.age_in_years) + (Math.random() - 0.5) * jitterAmount)
            .attr("cy", d => y(d.churn) + (Math.random() - 0.5) * jitterAmount)
            .attr("r", d => z(d.income))
            .attr("fill", color(category))
            .attr("opacity", 0.7)  // More transparent to see overlap
            .attr("stroke", "#000")
            .attr("stroke-width", 1.5)
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
                        <strong style="color:${color(d.structure)}; font-size: 14px;">${d.structure}</strong>
                    </div>
                    <div style="margin: 4px 0;"><strong>Age:</strong> ${d.age_in_years} years</div>
                    <div style="margin: 4px 0;"><strong>Avg Income:</strong> $${Math.round(d.income).toLocaleString()}</div>
                    <div style="margin: 4px 0;"><strong>Churn Rate:</strong> ${(d.churn * 100).toFixed(1)}%</div>
                `)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 60) + "px");
                
                // Highlight bubble - bring to front
                d3.select(this)
                    .raise()
                    .transition()
                    .duration(200)
                    .attr("r", d => z(d.income) * 1.7)
                    .attr("stroke", "#fff")
                    .attr("stroke-width", 3)
                    .attr("opacity", 1);

                // Cross-chart linking
                if (window.q2ChartBus) window.q2ChartBus.highlight(d.structure);
            })
            .on("mousemove", function(event) {
                tooltip
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 60) + "px");
            })
            .on("mouseout", function(event, d) {
                // Hide tooltip
                tooltip
                    .transition()
                    .duration(300)
                    .style("opacity", 0)
                    .on("end", function() {
                        tooltip.style("display", "none");
                    });
                
                // Reset bubble
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("r", d => z(d.income))
                    .attr("stroke", "#000")
                    .attr("stroke-width", 1.5)
                    .attr("opacity", 0.7);

                // Cross-chart reset
                if (window.q2ChartBus) window.q2ChartBus.reset();
            })
            .on("click", function(event, d) {
                // Click functionality - show alert with data
                event.stopPropagation();
                console.log("Clicked data:", d);
                alert(`${d.structure}\nAge: ${d.age_in_years}\nIncome: $${Math.round(d.income).toLocaleString()}\nChurn: ${(d.churn * 100).toFixed(1)}%`);
            });
    });

    // 6. Enhanced Legend
    const legend = svg.append("g")
        .attr("transform", `translate(${width + 20}, 20)`);

    legend.append("text")
        .attr("x", 0)
        .attr("y", -5)
        .style("fill", "#e0e0e0")
        .style("font-size", "13px")
        .style("font-weight", "600")
        .text("Family Structure:");
    
    categories.forEach((category, i) => {
        const legendRow = legend.append("g")
            .attr("transform", `translate(0, ${i * 30 + 15})`)
            .style("cursor", "pointer");
        
        legendRow.append("circle")
            .attr("cx", 9)
            .attr("cy", 9)
            .attr("r", 8)
            .attr("fill", color(category))
            .attr("opacity", 0.7)
            .attr("stroke", "#000")
            .attr("stroke-width", 1.5);
            
        legendRow.append("text")
            .attr("x", 25)
            .attr("y", 13)
            .style("fill", "#e0e0e0")
            .style("font-size", "12px")
            .style("font-weight", "500")
            .text(category);
        
        // Legend hover effect
        legendRow
            .on("mouseover", function() {
                // Highlight all bubbles of this category
                svg.selectAll(`.bubble-${category.replace(/[^a-zA-Z0-9]/g, '')}`)
                    .transition()
                    .duration(200)
                    .attr("opacity", 1)
                    .attr("stroke-width", 2.5)
                    .attr("stroke", "#fff");
                
                // Dim others
                categories.forEach(otherCat => {
                    if (otherCat !== category) {
                        svg.selectAll(`.bubble-${otherCat.replace(/[^a-zA-Z0-9]/g, '')}`)
                            .transition()
                            .duration(200)
                            .attr("opacity", 0.15);
                    }
                });

                if (window.q2ChartBus) window.q2ChartBus.highlight(category);
            })
            .on("mouseout", function() {
                // Reset all
                svg.selectAll("circle[class^='bubble-']")
                    .transition()
                    .duration(200)
                    .attr("opacity", 0.7)
                    .attr("stroke-width", 1.5)
                    .attr("stroke", "#000");

                if (window.q2ChartBus) window.q2ChartBus.reset();
            });
    });

    // Add size reference
    const sizeGuide = legend.append("g")
        .attr("transform", `translate(0, ${categories.length * 30 + 40})`);
    
    sizeGuide.append("text")
        .attr("x", 0)
        .attr("y", 0)
        .style("fill", "#e0e0e0")
        .style("font-size", "11px")
        .style("font-weight", "600")
        .text("Bubble Size:");
    
    sizeGuide.append("text")
        .attr("x", 0)
        .attr("y", 18)
        .style("fill", "#b0b0b0")
        .style("font-size", "10px")
        .text("= Average Income");

    // Cross-chart event bus listener
    window._q2BubbleChartHighlight = function(struct) {
        if (!struct) {
            svg.selectAll("circle[class^='bubble-']")
                .transition().duration(300)
                .attr("opacity", 0.7).attr("stroke", "#000").attr("stroke-width", 1.5);
        } else {
            categories.forEach(cat => {
                if (cat === struct) {
                    svg.selectAll(`.bubble-${cat.replace(/[^a-zA-Z0-9]/g, '')}`)
                        .transition().duration(200)
                        .attr("opacity", 1).attr("stroke", "#fff").attr("stroke-width", 2.5);
                } else {
                    svg.selectAll(`.bubble-${cat.replace(/[^a-zA-Z0-9]/g, '')}`)
                        .transition().duration(200).attr("opacity", 0.12);
                }
            });
        }
    };

    // Filter to show only selected family structures
    window._q2BubbleChartFilter = function(structures) {
        if (!structures) {
            svg.selectAll("circle[class^='bubble-']")
                .transition().duration(300).attr("opacity", 0.7);
        } else {
            categories.forEach(cat => {
                const shouldShow = structures.includes(cat);
                svg.selectAll(`.bubble-${cat.replace(/[^a-zA-Z0-9]/g, '')}`)
                    .transition().duration(200)
                    .attr("opacity", shouldShow ? 0.8 : 0.1);
            });
        }
    };
    
    // Highlight age range
    window._q2BubbleChartAgeRange = function(fromAge, toAge) {
        if (!fromAge || !toAge) {
            svg.selectAll("circle[class^='bubble-']")
                .transition().duration(300).attr("stroke-width", 1.5);
            svg.selectAll("circle[class^='bubble-']")
                .style("filter", "none");
        } else {
            // Map age strings to approximate numeric ranges for filtering
            const ageMap = {"18-25": [18, 25], "26-35": [26, 35], "36-45": [36, 45], 
                           "46-55": [46, 55], "56-65": [56, 65], "65+": [65, 120]};
            const [minFrom, maxFrom] = ageMap[fromAge] || [0, 150];
            const [minTo, maxTo] = ageMap[toAge] || [0, 150];
            const minAge = Math.min(minFrom, minTo);
            const maxAge = Math.max(maxFrom, maxTo);
            
            svg.selectAll("circle[class^='bubble-']").each(function(d) {
                const age = d.age_in_years;
                const inRange = age >= minAge && age <= maxAge;
                d3.select(this)
                    .transition().duration(200)
                    .attr("stroke-width", inRange ? 3 : 1.5)
                    .style("filter", inRange ? "drop-shadow(0 0 6px #FFEA00)" : "none");
            });
        }
    };

})();
