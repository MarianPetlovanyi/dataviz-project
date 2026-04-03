function renderCostChart(data) {
  const W = 1200, H = 510;
  const m = { top: 72, right: 150, bottom: 48, left: 70 };
  const iW = W - m.left - m.right;
  const iH = H - m.top - m.bottom;

  const svg = d3.select("#chart-costs");
  svg.selectAll("*").remove();

  // Title & subtitle
  svg.append("text")
    .attr("x", W / 2).attr("y", 22)
    .attr("text-anchor", "middle")
    .style("fill", "#cbd5e1").style("font-size", "17px").style("font-weight", "600").style("font-family", "Inter,sans-serif")
    .text("Orbital Launch Cost Over Time (Inflation-Adjusted)");
  svg.append("text")
    .attr("x", W / 2).attr("y", 40)
    .attr("text-anchor", "middle")
    .style("fill", "#64748b").style("font-size", "12.5px").style("font-family", "Inter,sans-serif")
    .text("Each dot is a single launch in constant 2020 USD (CPI-adjusted). White line: 5-Year Rolling Mean. Log scale.");

  const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);

  const x = d3.scaleLinear().domain(d3.extent(data, d => d.year)).range([0, iW]).nice();
  const y = d3.scaleLog()
    .domain([Math.max(1, d3.min(data, d => d.costAdjusted) * 0.8), d3.max(data, d => d.costAdjusted) * 1.2])
    .range([iH, 0]);

  const companyTotal = d3.rollup(data, v => v.length, d => d.company);
  const topComps = Array.from(companyTotal.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).map(d => d[0]);
  const palette = ["#6366f1", "#22d3ee", "#f97316", "#22c55e", "#f43f5e", "#a855f7", "#eab308", "#0ea5e9", "#ec4899", "#14b8a6"];
  const color = d3.scaleOrdinal().domain(topComps).range(palette).unknown("#475569");

  // Grid
  g.append("g").selectAll("line").data([1, 10, 50, 100, 500, 1000, 5000]).join("line")
    .attr("x1", 0).attr("x2", iW)
    .attr("y1", d => y(d)).attr("y2", d => y(d))
    .attr("stroke", "rgba(255,255,255,0.04)").attr("stroke-dasharray", "4,4");

  // X-Axis
  g.append("g")
    .attr("transform", `translate(0,${iH})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(10))
    .call(ax => {
      ax.select(".domain").attr("stroke", "rgba(255,255,255,0.1)");
      ax.selectAll(".tick line").remove();
      ax.selectAll(".tick text").style("fill", "#94a3b8").style("font-size", "13px").attr("dy", "10px");
    });

  // Y-Axis (log, explicit ticks to prevent overlap)
  g.append("g")
    .call(d3.axisLeft(y).tickValues([1, 10, 50, 100, 500, 1000, 5000]).tickFormat(d => "$" + d + "M"))
    .call(ax => {
      ax.select(".domain").attr("stroke", "rgba(255,255,255,0.1)");
      ax.selectAll(".tick line").remove();
      ax.selectAll(".tick text").style("fill", "#cbd5e1").style("font-size", "13px");
    });

  g.append("text")
    .attr("transform", "rotate(-90)").attr("x", -iH / 2).attr("y", -55)
    .attr("text-anchor", "middle").style("fill", "#94a3b8").style("font-size", "12px")
    .text("Cost in 2020 USD (Inflation-Adjusted)");

  // Tooltip
  const tip = d3.select("#tooltip-cost");

  // Dots
  g.selectAll(".dot").data(data).join("circle")
    .attr("class", "dot")
    .attr("cx", d => x(d.year))
    .attr("cy", d => y(d.costAdjusted))
    .attr("r", 4).attr("fill", d => color(d.company))
    .attr("fill-opacity", 0.3).attr("stroke", d => color(d.company)).attr("stroke-width", 1.5)
    .style("cursor", "pointer")
    .on("mouseenter", function (e, d) {
      d3.select(this).attr("r", 8).attr("fill-opacity", 0.9);
      tip.style("opacity", 1).html(`
        <div class="tooltip-title">${d.detail}</div>
        <div class="tooltip-row"><span>Company</span><span class="tooltip-val" style="color:${color(d.company)}">${d.company}</span></div>
        <div class="tooltip-row"><span>Year</span><span class="tooltip-val">${d.year}</span></div>
        <div class="tooltip-row"><span>Nominal Cost</span><span class="tooltip-val">$${d.cost.toFixed(1)}M</span></div>
        <div class="tooltip-row"><span>Real Cost (2020 $)</span><span class="tooltip-val" style="color:#22c55e">$${d.costAdjusted.toFixed(1)}M</span></div>
        <div class="tooltip-row"><span>Status</span><span class="tooltip-val">${d.status}</span></div>
      `);
    })
    .on("mousemove", function (e) {
      const r = document.getElementById("chart-costs").closest(".chart-card").getBoundingClientRect();
      tip.style("left", (e.clientX - r.left + 15) + "px").style("top", (e.clientY - r.top - 60) + "px");
    })
    .on("mouseleave", function () {
      d3.select(this).attr("r", 4).attr("fill-opacity", 0.3);
      tip.style("opacity", 0);
    });

  // 5-Year Rolling Mean
  const uniqueYears = Array.from(new Set(data.map(d => d.year))).sort((a, b) => a - b);
  const yearlyMeans = uniqueYears.map(yr => {
    const win = data.filter(d => d.year > yr - 5 && d.year <= yr);
    return { year: yr, mean: win.length > 0 ? d3.mean(win, d => d.costAdjusted) : null };
  }).filter(d => d.mean !== null);

  const meanLine = d3.line().x(d => x(d.year)).y(d => y(d.mean)).curve(d3.curveMonotoneX);

  g.append("path").datum(yearlyMeans).attr("fill", "none")
    .attr("stroke", "#f8fafc").attr("stroke-width", 8).attr("stroke-opacity", 0.1).attr("d", meanLine);
  g.append("path").datum(yearlyMeans).attr("fill", "none")
    .attr("stroke", "#f8fafc").attr("stroke-width", 2.5).attr("d", meanLine);

  g.append("text")
    .attr("x", x(yearlyMeans.at(-1).year))
    .attr("y", y(yearlyMeans.at(-1).mean) - 12)
    .attr("text-anchor", "end").style("fill", "#f8fafc").style("font-size", "12px").style("font-weight", "600")
    .text("5-Yr Rolling Mean");

  // Legend (sidebar)
  const legend = svg.append("g").attr("transform", `translate(${iW + m.left + 18}, ${m.top})`);
  legend.append("text").attr("y", -6).style("fill", "#b0bec5").style("font-size", "12px").style("font-weight", 600).text("Top Organizations");
  topComps.forEach((c, i) => {
    const gE = legend.append("g").attr("transform", `translate(0, ${i * 22 + 10})`);
    gE.append("rect").attr("width", 10).attr("height", 10).attr("rx", 2).attr("fill", color(c));
    gE.append("text").attr("x", 16).attr("y", 9).style("fill", "#b0bec5").style("font-size", "12px").text(c);
  });

  appendChartSource(svg, W, H, SRC_SPACE);
}
