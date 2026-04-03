function renderLaunchesChart(svgSelector, data, years) {
  const W = 1240, H = 510;
  const m = { top: 106, right: 20, bottom: 52, left: 52 };
  const iW = W - m.left - m.right;
  const iH = H - m.top - m.bottom;

  // Top 10 companies
  const companyTotal = d3.rollup(data, v => v.length, d => d.company);
  const top10 = Array.from(companyTotal.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(d => d[0]);
  const OTHER = "Other";

  data.forEach(d => { d.grp = top10.includes(d.company) ? d.company : OTHER; });
  const groups = [...top10, OTHER];

  const palette = [
    "#6366f1", "#22d3ee", "#f97316", "#22c55e", "#f43f5e",
    "#a855f7", "#eab308", "#0ea5e9", "#ec4899", "#14b8a6", "#94a3b8"
  ];
  const color = d3.scaleOrdinal().domain(groups).range(palette);

  // Yearly rollup
  const yearGrouped = d3.rollup(data, v => v.length, d => d.year, d => d.grp);
  const stackData = years.map(yr => {
    const row = { year: yr };
    groups.forEach(g => { row[g] = (yearGrouped.get(yr) || new Map()).get(g) || 0; });
    return row;
  });
  const series = d3.stack().keys(groups).order(d3.stackOrderNone).offset(d3.stackOffsetNone)(stackData);

  // Scales
  const x = d3.scaleLinear().domain([years[0], years[years.length - 1]]).range([0, iW]);
  const yMax = d3.max(series[series.length - 1], d => d[1]);
  const y = d3.scaleLinear().domain([0, yMax * 1.08]).range([iH, 0]);

  // SVG
  const svg = d3.select(svgSelector).attr("viewBox", `0 0 ${W} ${H}`);

  // Title
  svg.append("text")
    .attr("x", W / 2).attr("y", 24)
    .attr("text-anchor", "middle")
    .style("fill", "#cbd5e1")
    .style("font-size", "17px").style("font-weight", "600")
    .style("font-family", "Inter,sans-serif")
    .text("Annual Launches by Organization");

  svg.append("text")
    .attr("x", W / 2).attr("y", 42)
    .attr("text-anchor", "middle")
    .style("fill", "#475569")
    .style("font-size", "12px")
    .style("font-family", "Inter,sans-serif")
    .text("Top 10 organizations stacked by launches per year. Excludes Russia & Soviet entities.");

  // Legend — 2 rows of 6 + 5
  const itemW = 132;
  const rowY = [60, 78];
  const rows = [groups.slice(0, 6), groups.slice(6)];

  rows.forEach((row, ri) => {
    const startX = (W - row.length * itemW) / 2;
    row.forEach((k, i) => {
      const lx = startX + i * itemW;
      const ly = rowY[ri];
      svg.append("rect")
        .attr("x", lx).attr("y", ly)
        .attr("width", 10).attr("height", 10)
        .attr("fill", color(k)).attr("rx", 2);
      svg.append("text")
        .attr("x", lx + 14).attr("y", ly + 9)
        .style("fill", "#94a3b8")
        .style("font-size", "10px")
        .style("font-family", "Inter,sans-serif")
        .text(k);
    });
  });

  // Chart group
  const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);

  // Grid
  g.append("g").selectAll("line")
    .data(y.ticks(6)).join("line")
    .attr("x1", 0).attr("x2", iW)
    .attr("y1", d => y(d)).attr("y2", d => y(d))
    .attr("stroke", "rgba(255,255,255,0.04)")
    .attr("stroke-dasharray", "4,4");

  // Areas
  const area = d3.area()
    .x(d => x(d.data.year))
    .y0(d => y(d[0]))
    .y1(d => y(d[1]))
    .curve(d3.curveCatmullRom.alpha(0.5));

  g.selectAll(".area-path")
    .data(series).join("path")
    .attr("class", "area-path")
    .attr("d", area)
    .attr("fill", d => color(d.key))
    .attr("fill-opacity", 0.78);

  // X axis
  g.append("g")
    .attr("transform", `translate(0,${iH})`)
    .call(d3.axisBottom(x).ticks(12).tickFormat(d3.format("d")))
    .call(ax => {
      ax.select(".domain").attr("stroke", "rgba(255,255,255,0.1)");
      ax.selectAll(".tick text").style("fill", "#64748b").style("font-size", "11px").style("font-family", "Inter,sans-serif");
      ax.selectAll(".tick line").attr("stroke", "rgba(255,255,255,0.07)");
    });

  // Y axis
  g.append("g")
    .call(d3.axisLeft(y).ticks(6))
    .call(ax => {
      ax.select(".domain").attr("stroke", "rgba(255,255,255,0.08)");
      ax.selectAll(".tick text").style("fill", "#64748b").style("font-size", "11px").style("font-family", "Inter,sans-serif");
      ax.selectAll(".tick line").attr("stroke", "rgba(255,255,255,0.06)");
    });

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -iH / 2).attr("y", -40)
    .attr("text-anchor", "middle")
    .style("fill", "#475569").style("font-size", "11px").style("font-family", "Inter,sans-serif")
    .text("Launches per year");

  appendChartSource(svg, W, H, SRC_SPACE);
}
