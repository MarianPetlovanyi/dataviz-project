function renderTotalCostByDestination(data) {
  const W = 1200, H = 480;
  const m = { top: 72, right: 100, bottom: 48, left: 160 };
  const iW = W - m.left - m.right;
  const iH = H - m.top - m.bottom;

  const valid = data.filter(d => d.tmcn !== null && d.tmcn > 0);
  const summed = Array.from(d3.rollup(valid, v => d3.sum(v, d => d.tmcn), d => d.destination))
    .map(([dest, total]) => ({ dest, total }))
    .sort((a, b) => b.total - a.total);

  const svg = d3.select("#chart-total-cost");
  svg.selectAll("*").remove();

  // Title & subtitle
  svg.append("text")
    .attr("x", W / 2).attr("y", 22)
    .attr("text-anchor", "middle")
    .style("fill", "#cbd5e1").style("font-size", "17px").style("font-weight", "600").style("font-family", "Inter,sans-serif")
    .text("Total Financial Investment by Destination Body");
  svg.append("text")
    .attr("x", W / 2).attr("y", 40)
    .attr("text-anchor", "middle")
    .style("fill", "#64748b").style("font-size", "12.5px").style("font-family", "Inter,sans-serif")
    .text("Cumulative TMCN budget in millions of 2020 USD. Robotic probes only; crewed missions excluded.");

  const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);

  const x = d3.scaleLinear().domain([0, d3.max(summed, d => d.total) * 1.05]).nice().range([0, iW]);
  const y = d3.scaleBand().domain(summed.map(d => d.dest)).range([0, iH]).padding(0.3);

  // Grid
  g.append("g").selectAll("line").data(x.ticks(8)).join("line")
    .attr("x1", d => x(d)).attr("x2", d => x(d))
    .attr("y1", 0).attr("y2", iH)
    .attr("stroke", "rgba(255,255,255,0.04)").attr("stroke-dasharray", "4,4");

  // Axes
  g.append("g")
    .attr("transform", `translate(0,${iH})`)
    .call(d3.axisBottom(x).ticks(8).tickFormat(d => `$${d}M`))
    .call(ax => {
      ax.select(".domain").attr("stroke", "rgba(255,255,255,0.1)");
      ax.selectAll(".tick line").remove();
      ax.selectAll(".tick text").style("fill", "#94a3b8").style("font-size", "13px").attr("dy", "10px");
    });

  g.append("g")
    .call(d3.axisLeft(y).tickSize(0))
    .call(ax => {
      ax.select(".domain").remove();
      ax.selectAll(".tick text").style("fill", "#b0bec5").style("font-weight", "500").style("font-size", "13.5px").attr("dx", "-8px");
    });

  const tip = d3.select("#tooltip5");

  // Bars
  g.selectAll(".bar").data(summed).join("rect")
    .attr("class", "bar")
    .attr("y", d => y(d.dest))
    .attr("x", 0)
    .attr("height", y.bandwidth())
    .attr("width", d => x(d.total))
    .attr("fill", "#a855f7").attr("rx", 4)
    .style("cursor", "crosshair")
    .on("mouseenter", function (e, d) {
      d3.select(this).attr("fill", "#c084fc");
      const r = document.getElementById("chart-total-cost").closest(".chart-card").getBoundingClientRect();
      tip.style("opacity", 1)
        .style("left", (e.clientX - r.left + 15) + "px")
        .style("top", (e.clientY - r.top - 40) + "px")
        .html(`
          <div class="tooltip-title">${d.dest}</div>
          <div class="tooltip-row"><span>Total Cumulative Investment</span>
            <span class="tooltip-val" style="color:#c084fc">$${d.total.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M</span>
          </div>
        `);
    })
    .on("mouseleave", function () {
      d3.select(this).attr("fill", "#a855f7");
      tip.style("opacity", 0);
    });

  // Value labels
  g.selectAll(".label").data(summed).join("text")
    .attr("class", "label")
    .attr("y", d => y(d.dest) + y.bandwidth() / 2)
    .attr("x", d => x(d.total) + 10)
    .attr("dy", "0.35em")
    .style("fill", "#b0bec5").style("font-size", "13px").style("font-weight", "500")
    .text(d => `$${d.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}M`);

  appendChartSource(svg, W, H, SRC_PLANET);
}
