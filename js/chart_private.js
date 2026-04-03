function renderPrivateAreaChart(data) {
  const W = 1200, H = 470;
  const m = { top: 72, right: 30, bottom: 48, left: 70 };
  const iW = W - m.left - m.right;
  const iH = H - m.top - m.bottom;

  const svg = d3.select("#chart-private");
  svg.selectAll("*").remove();

  // Title & subtitle
  svg.append("text")
    .attr("x", W / 2).attr("y", 22)
    .attr("text-anchor", "middle")
    .style("fill", "#cbd5e1").style("font-size", "17px").style("font-weight", "600").style("font-family", "Inter,sans-serif")
    .text("The Rise of Private Spaceflight");
  svg.append("text")
    .attr("x", W / 2).attr("y", 40)
    .attr("text-anchor", "middle")
    .style("fill", "#64748b").style("font-size", "12.5px").style("font-family", "Inter,sans-serif")
    .text("State agencies, government-related contractors, and private/commercial operators. Excludes Russia & Soviet entities.");

  const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);

  const years = d3.range(1957, 2021);
  const groups = ["State / government", "Government-related", "Private / commercial"];

  const yearGrouped = d3.rollup(data, v => v.length, d => d.year, d => getOrgType(d.company));
  const stackData = years.map(yr => {
    const entry = { year: yr };
    groups.forEach(grp => { entry[grp] = (yearGrouped.get(yr) || new Map()).get(grp) || 0; });
    return entry;
  });
  const series = d3.stack().keys(groups)(stackData);

  const x = d3.scaleLinear().domain([1957, 2020]).range([0, iW]);
  const y = d3.scaleLinear().domain([0, d3.max(series.at(-1), d => d[1]) * 1.1]).range([iH, 0]);
  const color = d3.scaleOrdinal().domain(groups).range(["#3b82f6", "#a855f7", "#f43f5e"]);

  // Grid
  g.append("g").selectAll("line").data(y.ticks(6)).join("line")
    .attr("x1", 0).attr("x2", iW)
    .attr("y1", d => y(d)).attr("y2", d => y(d))
    .attr("stroke", "rgba(255,255,255,0.04)").attr("stroke-dasharray", "4,4");

  // Areas
  const area = d3.area()
    .x(d => x(d.data.year))
    .y0(d => y(d[0]))
    .y1(d => y(d[1]))
    .curve(d3.curveCatmullRom.alpha(0.5));

  const tip = d3.select("#tooltip1");

  g.selectAll(".area").data(series).join("path")
    .attr("class", "area")
    .attr("fill", d => color(d.key))
    .attr("fill-opacity", 0.82)
    .attr("d", area)
    .style("cursor", "crosshair")
    .on("mousemove", function (e, d) {
      const xPos = d3.pointer(e)[0];
      const yearHovered = Math.round(x.invert(xPos));
      const dataPt = d.find(p => p.data.year === yearHovered);
      if (!dataPt) return;
      const val = dataPt[1] - dataPt[0];
      const grp = d.key;
      const r = document.getElementById("chart-private").closest(".chart-card").getBoundingClientRect();
      tip.style("opacity", 1)
        .style("left", (e.clientX - r.left + 15) + "px")
        .style("top", (e.clientY - r.top - 40) + "px")
        .html(`
          <div class="tooltip-title">${yearHovered}</div>
          <div class="tooltip-row"><span>Segment</span><span class="tooltip-val" style="color:${color(grp)}">${grp}</span></div>
          <div class="tooltip-row"><span>Launches</span><span class="tooltip-val">${val}</span></div>
        `);
    })
    .on("mouseleave", () => tip.style("opacity", 0));

  // X-Axis
  g.append("g")
    .attr("transform", `translate(0,${iH})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(12))
    .call(ax => {
      ax.select(".domain").attr("stroke", "rgba(255,255,255,0.1)");
      ax.selectAll(".tick line").remove();
      ax.selectAll(".tick text").style("fill", "#94a3b8").style("font-size", "13px").attr("dy", "10px");
    });

  // Y-Axis
  g.append("g")
    .call(d3.axisLeft(y).ticks(6))
    .call(ax => {
      ax.select(".domain").attr("stroke", "rgba(255,255,255,0.1)");
      ax.selectAll(".tick line").remove();
      ax.selectAll(".tick text").style("fill", "#94a3b8").style("font-size", "13px");
    });

  g.append("text")
    .attr("transform", "rotate(-90)").attr("x", -iH / 2).attr("y", -55)
    .attr("text-anchor", "middle").style("fill", "#94a3b8").style("font-size", "12px")
    .text("Launches per year");

  // Legend (top-left box)
  const legend = svg.append("g").attr("transform", `translate(${m.left + 20}, ${m.top + 16})`);
  legend.append("rect").attr("x", -10).attr("y", -12).attr("width", 190).attr("height", 90)
    .attr("fill", "rgba(9,16,24,0.88)").attr("rx", 6).attr("stroke", "rgba(255,255,255,0.05)");
  [...groups].reverse().forEach((gName, i) => {
    const row = legend.append("g").attr("transform", `translate(0, ${i * 26 + 4})`);
    row.append("rect").attr("width", 14).attr("height", 14).attr("rx", 3).attr("fill", color(gName));
    row.append("text").attr("x", 22).attr("y", 11).style("fill", "#b0bec5").style("font-size", "12.5px").text(gName);
  });

  appendChartSource(svg, W, H, SRC_SPACE);
}
