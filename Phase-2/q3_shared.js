// ============================================================
// Q3 Shared Infrastructure: Event bus, county base layer, legends
// ============================================================

// ---------- Event Bus (pub/sub for cross-map syncing) ----------
const q3EventBus = {
    _listeners: {},
    on(event, callback) {
        if (!this._listeners[event]) this._listeners[event] = [];
        this._listeners[event].push(callback);
    },
    emit(event, data) {
        (this._listeners[event] || []).forEach(cb => cb(data));
    }
};

// ---------- Texas county boundaries loader (CDN, cached) ----------
let _texasCountiesCache = null;

async function loadTexasCounties() {
    if (_texasCountiesCache) return _texasCountiesCache;
    try {
        const us = await d3.json('https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json');
        // Texas FIPS = 48; county ids start with "48"
        const allCounties = topojson.feature(us, us.objects.counties);
        _texasCountiesCache = {
            type: "FeatureCollection",
            features: allCounties.features.filter(f => f.id && f.id.startsWith("48"))
        };
        return _texasCountiesCache;
    } catch (e) {
        console.warn("Could not load county boundaries:", e);
        return null;
    }
}

// ---------- Draw Texas county outlines ----------
function drawTexasBase(svg, pathGenerator) {
    // Draw from cache (assumes loadTexasCounties already resolved)
    if (!_texasCountiesCache) return;
    svg.insert("g", ":first-child")
        .attr("class", "texas-counties")
        .selectAll("path")
        .data(_texasCountiesCache.features)
        .enter().append("path")
        .attr("d", pathGenerator)
        .attr("fill", "none")
        .attr("stroke", "#888")
        .attr("stroke-width", 0.8)
        .attr("opacity", 0.75);

    // Major Texas cities labels
    const majorCities = [
        { name: "Houston", coords: [-95.3698, 29.7604] },
        { name: "Dallas", coords: [-96.7970, 32.7767] },
        { name: "Austin", coords: [-97.7431, 30.2672] },
        { name: "San Antonio", coords: [-98.4936, 29.4241] },
        { name: "El Paso", coords: [-106.4850, 31.7619] },
    ];

    const proj = pathGenerator.projection ? pathGenerator.projection() : null;
    if (proj) {
        svg.select(".texas-counties")
            .selectAll("text.city-label")
            .data(majorCities)
            .enter().append("text")
            .attr("class", "city-label")
            .attr("x", d => proj(d.coords)[0])
            .attr("y", d => proj(d.coords)[1])
            .attr("text-anchor", "middle")
            .attr("dy", -6)
            .attr("fill", "#777")
            .attr("font-size", "8px")
            .attr("font-family", "sans-serif")
            .text(d => d.name);
    }
}

// ---------- Gradient Legend ----------
function drawGradientLegend(container, colorScale, { title, width = 200, height = 12, ticks = 5, format = '.0f' } = {}) {
    const legendDiv = container.append('div')
        .attr('class', 'q3-legend')
        .style('display', 'flex')
        .style('flex-direction', 'column')
        .style('align-items', 'center')
        .style('margin-top', '10px');

    if (title) {
        legendDiv.append('div')
            .style('color', '#ccc')
            .style('font-size', '11px')
            .style('margin-bottom', '4px')
            .style('font-weight', '600')
            .text(title);
    }

    const svgLegend = legendDiv.append('svg')
        .attr('width', width + 40)
        .attr('height', height + 30);

    // Create gradient
    const defs = svgLegend.append('defs');
    const gradientId = 'legend-gradient-' + Math.random().toString(36).substr(2, 6);
    const linearGrad = defs.append('linearGradient')
        .attr('id', gradientId);

    const domain = colorScale.domain();
    const nStops = 20;
    for (let i = 0; i <= nStops; i++) {
        const t = i / nStops;
        const val = domain[0] + t * (domain[domain.length - 1] - domain[0]);
        linearGrad.append('stop')
            .attr('offset', `${t * 100}%`)
            .attr('stop-color', colorScale(val));
    }

    svgLegend.append('rect')
        .attr('x', 20)
        .attr('y', 2)
        .attr('width', width)
        .attr('height', height)
        .attr('rx', 3)
        .style('fill', `url(#${gradientId})`);

    // Axis
    const legendScale = d3.scaleLinear()
        .domain(domain)
        .range([20, 20 + width]);

    const legendAxis = d3.axisBottom(legendScale)
        .ticks(ticks)
        .tickFormat(d3.format(format))
        .tickSize(4);

    svgLegend.append('g')
        .attr('transform', `translate(0, ${height + 2})`)
        .call(legendAxis)
        .selectAll('text')
        .attr('fill', '#aaa')
        .attr('font-size', '9px');

    svgLegend.selectAll('.domain, line').attr('stroke', '#666');
}

// ---------- Size Legend (circles) ----------
function drawSizeLegend(container, sizeScale, { title, values, labels, color = '#888' } = {}) {
    const legendDiv = container.append('div')
        .attr('class', 'q3-legend')
        .style('display', 'flex')
        .style('flex-direction', 'column')
        .style('align-items', 'center')
        .style('margin-top', '8px');

    if (title) {
        legendDiv.append('div')
            .style('color', '#ccc')
            .style('font-size', '11px')
            .style('margin-bottom', '4px')
            .style('font-weight', '600')
            .text(title);
    }

    const maxR = d3.max(values, v => sizeScale(v));
    const svgH = maxR * 2 + 30;
    const svgW = values.length * 60 + 20;

    const svgLegend = legendDiv.append('svg')
        .attr('width', svgW)
        .attr('height', svgH);

    const g = svgLegend.selectAll('g')
        .data(values)
        .enter().append('g')
        .attr('transform', (d, i) => `translate(${30 + i * 60}, ${svgH / 2 - 5})`);

    g.append('circle')
        .attr('r', d => sizeScale(d))
        .attr('fill', color)
        .attr('opacity', 0.6)
        .attr('stroke', '#aaa')
        .attr('stroke-width', 0.5);

    g.append('text')
        .attr('y', d => sizeScale(d) + 14)
        .attr('text-anchor', 'middle')
        .attr('fill', '#aaa')
        .attr('font-size', '9px')
        .text((d, i) => labels ? labels[i] : d);
}

// ---------- Category Legend (for syncing controls) ----------
function drawCategoryLegend(container, categories, colorFn, { title, onClick } = {}) {
    const legendDiv = container.append('div')
        .attr('class', 'q3-legend q3-category-legend')
        .style('display', 'flex')
        .style('flex-wrap', 'wrap')
        .style('justify-content', 'center')
        .style('gap', '8px')
        .style('margin-top', '10px');

    if (title) {
        legendDiv.append('div')
            .style('width', '100%')
            .style('text-align', 'center')
            .style('color', '#ccc')
            .style('font-size', '11px')
            .style('margin-bottom', '2px')
            .style('font-weight', '600')
            .text(title);
    }

    categories.forEach(cat => {
        const item = legendDiv.append('div')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('gap', '4px')
            .style('cursor', onClick ? 'pointer' : 'default')
            .style('padding', '3px 8px')
            .style('border-radius', '4px')
            .style('border', '1px solid #333')
            .style('transition', 'all 0.2s')
            .attr('data-category', cat.key)
            .on('mouseover', function () {
                d3.select(this).style('border-color', '#888');
            })
            .on('mouseout', function () {
                d3.select(this).style('border-color', '#333');
            });

        if (onClick) {
            item.on('click', function () {
                // Toggle selection visual
                const isActive = d3.select(this).classed('active');
                legendDiv.selectAll('div[data-category]').classed('active', false)
                    .style('background', 'transparent');
                if (!isActive) {
                    d3.select(this).classed('active', true)
                        .style('background', 'rgba(255,255,255,0.08)');
                }
                onClick(isActive ? null : cat.key);
            });
        }

        item.append('div')
            .style('width', '12px')
            .style('height', '12px')
            .style('border-radius', '3px')
            .style('background', colorFn(cat.value));

        item.append('span')
            .style('color', '#bbb')
            .style('font-size', '10px')
            .text(cat.label);
    });
}
