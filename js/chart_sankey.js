function renderSankey(data) {
  const W = 1200, H = 450;
  const m = { top: 72, right: 30, bottom: 48, left: 30 };
  const iW = W - m.left - m.right;
  const iH = H - m.top - m.bottom;

  const svg = d3.select("#chart-sankey");
  svg.selectAll("*").remove();

  // Title & subtitle
  svg.append("text")
    .attr("x", W / 2).attr("y", 22)
    .attr("text-anchor", "middle")
    .style("fill", "#cbd5e1").style("font-size", "17px").style("font-weight", "600").style("font-family", "Inter,sans-serif")
    .text("Power Sources by Destination");
  svg.append("text")
    .attr("x", W / 2).attr("y", 40)
    .attr("text-anchor", "middle")
    .style("fill", "#64748b").style("font-size", "12.5px").style("font-family", "Inter,sans-serif")
    .text("Sankey flow from destination to power source. Band width ∝ mission count. Robotic probes only; crewed missions excluded.");

  const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);

  // Build links
  const linksMap = new Map();
  data.forEach(d => {
    if (d.powerSource === "Unknown") return;
    const key = d.destination + "->" + d.powerSource;
    if (!linksMap.has(key)) linksMap.set(key, { source: d.destination, target: d.powerSource, value: 0 });
    linksMap.get(key).value += 1;
  });

  const links = Array.from(linksMap.values());
  const nodesMap = new Map();
  links.forEach(l => {
    nodesMap.set(l.source, { name: l.source, type: "dest" });
    nodesMap.set(l.target, { name: l.target, type: "power" });
  });
  let nodes = Array.from(nodesMap.values());

  links.forEach(l => {
    l.source = nodes.findIndex(n => n.name === l.source);
    l.target = nodes.findIndex(n => n.name === l.target);
  });

  const sankey = d3.sankey()
    .nodeWidth(30).nodePadding(20)
    .extent([[0, 0], [iW, iH]]);

  const graph = sankey({
    nodes: nodes.map(d => Object.assign({}, d)),
    links: links.map(d => Object.assign({}, d))
  });

  const getColor = name => {
    if (name === "Nuclear (RTG)") return "#ef4444";
    if (name === "Solar Array") return "#eab308";
    return "#3b82f6";
  };

  const tip = d3.select("#tooltip3");

  // Ribbons
  g.append("g").attr("fill", "none")
    .selectAll("path").data(graph.links).join("path")
    .attr("d", d3.sankeyLinkHorizontal())
    .attr("stroke", d => getColor(d.target.name))
    .attr("stroke-width", d => Math.max(1, d.width))
    .attr("stroke-opacity", 0.3)
    .style("cursor", "crosshair")
    .on("mouseenter", function (e, d) {
      d3.select(this).attr("stroke-opacity", 0.65);
      tip.style("opacity", 1).html(`
        <div class="tooltip-title">${d.source.name} → ${d.target.name}</div>
        <div class="tooltip-row"><span>Missions</span><span class="tooltip-val">${d.value}</span></div>
      `);
    })
    .on("mousemove", function (e) {
      const r = document.getElementById("chart-sankey").closest(".chart-card").getBoundingClientRect();
      tip.style("left", (e.clientX - r.left + 15) + "px").style("top", (e.clientY - r.top - 50) + "px");
    })
    .on("mouseleave", function () {
      d3.select(this).attr("stroke-opacity", 0.3);
      tip.style("opacity", 0);
    });

  // Nodes
  const nodeElems = g.append("g")
    .selectAll("g").data(graph.nodes).join("g")
    .attr("transform", d => `translate(${d.x0},${d.y0})`);

  nodeElems.append("rect")
    .attr("height", d => d.y1 - d.y0)
    .attr("width", d => d.x1 - d.x0)
    .attr("fill", d => getColor(d.name))
    .attr("rx", 3).attr("stroke", "rgba(0,0,0,0.3)");

  nodeElems.append("text")
    .attr("x", d => d.x0 < W / 2 ? (d.x1 - d.x0) + 8 : -8)
    .attr("y", d => (d.y1 - d.y0) / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", d => d.x0 < W / 2 ? "start" : "end")
    .style("fill", "#cbd5e1").style("font-size", "14.5px").style("font-weight", 500)
    .text(d => `${d.name} (${d.value})`);

  appendChartSource(svg, W, H, SRC_PLANET);
}
