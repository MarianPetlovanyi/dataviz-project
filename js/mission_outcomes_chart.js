function renderOutcomesChart(svgSelector, data, years) {
  const W = 1240, H = 430;
  const m = { top: 76, right: 90, bottom: 52, left: 58 };
  const iW = W - m.left - m.right;
  const iH = H - m.top - m.bottom;

  // Per-year outcome counts
  const yearlyOutcomes = years.map(yr => {
    const yd = data.filter(d => d.year === yr);
    const total = yd.length;
    const succ = yd.filter(d => d.status === "Success").length;
    const fail = yd.filter(d => d.status === "Failure" || d.status === "Prelaunch Failure").length;
    const part = yd.filter(d => d.status === "Partial Failure").length;
    return { year: yr, total, succ, fail, part };
  });

  // 5-year rolling success rate
  const rolling = yearlyOutcomes.map((d, i, arr) => {
    const slice = arr.slice(Math.max(0, i - 4), i + 1);
    const ts = slice.reduce((s, dd) => s + dd.total, 0);
    const ss = slice.reduce((s, dd) => s + dd.succ, 0);
    return { year: d.year, rate: ts > 0 ? ss / ts : null };
  });

  // Scales
  const x = d3.scaleBand().domain(years).range([0, iW]).padding(0.15);
  const yL = d3.scaleLinear()
    .domain([0, d3.max(yearlyOutcomes, d => d.total) * 1.12])
    .range([iH, 0]);
  const yR = d3.scaleLinear().domain([0, 1.05]).range([iH, 0]);

  // SVG
  const svg = d3.select(svgSelector).attr("viewBox", `0 0 ${W} ${H}`);

  // Title
  svg.append("text")
    .attr("x", W / 2).attr("y", 24)
    .attr("text-anchor", "middle")
    .style("fill", "#cbd5e1")
    .style("font-size", "17px").style("font-weight", "600")
    .style("font-family", "Inter,sans-serif")
    .text("Annual Mission Outcomes");

  svg.append("text")
    .attr("x", W / 2).attr("y", 42)
    .attr("text-anchor", "middle")
    .style("fill", "#64748b")
    .style("font-size", "12.5px")
    .style("font-family", "Inter,sans-serif")
    .text("Success / Partial Failure / Failure counts per year, with 5-year rolling success rate.");

  // Defs (gradient)
  const defs = svg.append("defs");
  const grad = defs.append("linearGradient")
    .attr("id", "rateGrad").attr("x1", "0%").attr("y1", "0%").attr("x2", "0%").attr("y2", "100%");
  grad.append("stop").attr("offset", "0%").attr("stop-color", "#6366f1").attr("stop-opacity", 0.25);
  grad.append("stop").attr("offset", "100%").attr("stop-color", "#6366f1").attr("stop-opacity", 0);

  // Chart group
  const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);

  const midBand = d => (x(d.year) ?? 0) + x.bandwidth() / 2;

  // Grid
  g.append("g").selectAll("line")
    .data(yL.ticks(5)).join("line")
    .attr("x1", 0).attr("x2", iW)
    .attr("y1", d => yL(d)).attr("y2", d => yL(d))
    .attr("stroke", "rgba(255,255,255,0.04)")
    .attr("stroke-dasharray", "4,4");

  // Stacked bars
  yearlyOutcomes.forEach(d => {
    let curY = iH;
    [["succ", "#22c55e"], ["part", "#f59e0b"], ["fail", "#ef4444"]].forEach(([key, col]) => {
      const cnt = d[key];
      if (!cnt) return;
      const bh = iH - yL(cnt);
      g.append("rect")
        .attr("x", x(d.year)).attr("y", curY - bh)
        .attr("width", x.bandwidth()).attr("height", bh)
        .attr("fill", col).attr("fill-opacity", 0.82).attr("rx", 1);
      curY -= bh;
    });
  });


  g.append("path").datum(rolling)
    .attr("d", d3.area()
      .defined(d => d.rate !== null)
      .x(midBand).y0(iH).y1(d => yR(d.rate ?? 0))
      .curve(d3.curveCatmullRom.alpha(0.5)))
    .attr("fill", "url(#rateGrad)");

  g.append("path").datum(rolling)
    .attr("d", d3.line()
      .defined(d => d.rate !== null)
      .x(midBand).y(d => yR(d.rate ?? 0))
      .curve(d3.curveCatmullRom.alpha(0.5)))
    .attr("fill", "none")
    .attr("stroke", "#6366f1")
    .attr("stroke-width", 2.5)
    .attr("stroke-linecap", "round");

  // Left Y axis
  g.append("g")
    .call(d3.axisLeft(yL).ticks(5))
    .call(ax => {
      ax.select(".domain").attr("stroke", "rgba(255,255,255,0.06)");
      ax.selectAll(".tick text").style("fill", "#94a3b8").style("font-size", "13px").style("font-family", "Inter,sans-serif");
      ax.selectAll(".tick line").attr("stroke", "rgba(255,255,255,0.05)");
    });
  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -iH / 2).attr("y", -44)
    .attr("text-anchor", "middle")
    .style("fill", "#64748b").style("font-size", "12px").style("font-family", "Inter,sans-serif")
    .text("Launches");

  // X axis
  g.append("g")
    .attr("transform", `translate(0,${iH})`)
    .call(d3.axisBottom(x)
      .tickValues(years.filter(y => y % 5 === 0))
      .tickFormat(d3.format("d")))
    .call(ax => {
      ax.select(".domain").attr("stroke", "rgba(255,255,255,0.08)");
      ax.selectAll(".tick text").style("fill", "#94a3b8").style("font-size", "13px").style("font-family", "Inter,sans-serif");
      ax.selectAll(".tick line").remove();
    });

  // Right Y axis
  g.append("g")
    .attr("transform", `translate(${iW},0)`)
    .call(d3.axisRight(yR).ticks(5).tickFormat(d => d3.format(".0%")(d)))
    .call(ax => {
      ax.select(".domain").attr("stroke", "rgba(255,255,255,0.06)");
      ax.selectAll(".tick text").style("fill", "#818cf8").style("font-size", "13px").style("font-family", "Inter,sans-serif");
      ax.selectAll(".tick line").remove();
    });
  g.append("text")
    .attr("transform", "rotate(90)")
    .attr("x", iH / 2).attr("y", -(iW + 72))
    .attr("text-anchor", "middle")
    .style("fill", "#818cf8").style("font-size", "12px").style("font-family", "Inter,sans-serif")
    .text("5-yr Rolling Success Rate");

  // Inline legend
  const legG = g.append("g").attr("transform", "translate(16,8)");
  [["#22c55e", "Success"], ["#f59e0b", "Partial"], ["#ef4444", "Failure"]].forEach(([col, lbl], i) => {
    legG.append("rect")
      .attr("x", i * 86).attr("y", 0).attr("width", 12).attr("height", 12)
      .attr("fill", col).attr("fill-opacity", 0.85).attr("rx", 2);
    legG.append("text")
      .attr("x", i * 86 + 17).attr("y", 10)
      .style("fill", "#b0bec5").style("font-size", "12px").style("font-family", "Inter,sans-serif")
      .text(lbl);
  });
  legG.append("line")
    .attr("x1", 262).attr("x2", 282).attr("y1", 6).attr("y2", 6)
    .attr("stroke", "#818cf8").attr("stroke-width", 2.5).attr("stroke-linecap", "round");
  legG.append("text")
    .attr("x", 286).attr("y", 10)
    .style("fill", "#818cf8").style("font-size", "12px").style("font-family", "Inter,sans-serif")
    .text("5-yr rolling success rate");

  // Interactive overlays — drawn last so they sit on top
  const tip = d3.select("#tooltip-outcomes");
  g.selectAll(".yr-overlay")
    .data(yearlyOutcomes).join("rect")
    .attr("class", "yr-overlay")
    .attr("x", d => x(d.year))
    .attr("y", 0)
    .attr("width", x.bandwidth())
    .attr("height", iH)
    .attr("fill", "transparent")
    .style("cursor", "crosshair")
    .on("mouseenter", function(e, d) {
      d3.select(this).attr("fill", "rgba(255,255,255,0.05)");
      const rate = rolling.find(r => r.year === d.year)?.rate;
      tip.style("opacity", 1)
        .style("left", (e.pageX + 16) + "px")
        .style("top",  (e.pageY - 80) + "px")
        .html(`
          <div class="tooltip-title">${d.year}</div>
          <div class="tooltip-row"><span style="color:#22c55e">Success</span><span class="tooltip-val">${d.succ}</span></div>
          <div class="tooltip-row"><span style="color:#f59e0b">Partial</span><span class="tooltip-val">${d.part}</span></div>
          <div class="tooltip-row"><span style="color:#ef4444">Failure</span><span class="tooltip-val">${d.fail}</span></div>
          <div class="tooltip-row"><span>Total</span><span class="tooltip-val">${d.total}</span></div>
          ${rate != null ? `<div class="tooltip-row"><span style="color:#818cf8">Rate</span><span class="tooltip-val" style="color:#818cf8">${d3.format(".0%")(rate)}</span></div>` : ""}
        `);
    })
    .on("mousemove", function(e) {
      tip.style("left", (e.pageX + 16) + "px")
         .style("top",  (e.pageY - 80) + "px");
    })
    .on("mouseleave", function() {
      d3.select(this).attr("fill", "transparent");
      tip.style("opacity", 0);
    });

  appendChartSource(svg, W, H, SRC_SPACE);
}
