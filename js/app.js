// Shared source attribution helper (called by each chart at the bottom of its SVG)
function appendChartSource(svg, W, H, parts) {
  const cw = 5.5;
  const totalW = parts.reduce((s, p) => s + p.text.length * cw, 0);
  let curX = W / 2 - totalW / 2;
  parts.forEach(p => {
    const parent = p.href
      ? svg.append("a").attr("href", p.href).attr("target", "_blank")
      : svg;
    parent.append("text")
      .attr("x", curX).attr("y", H - 6)
      .style("font-size", "10px").style("font-family", "Inter,sans-serif")
      .attr("fill", p.href ? "#6366f1" : "#64748b")
      .attr("text-decoration", p.href ? "underline" : null)
      .text(p.text);
    curX += p.text.length * cw;
  });
}

const SRC_SPACE = [
  { text: "Source: ", href: null },
  { text: "All Space Missions 1957", href: "https://www.kaggle.com/datasets/agirlcoding/all-space-missions-from-1957" },
];

const SRC_PLANET = [
  { text: "Source: ", href: null },
  { text: "NASA Interplanetary Mission Database (NIM)", href: "https://datadryad.org/dataset/doi:10.5061/dryad.fj6q5745z" },
];

const STATE_ORGS = new Set([
  "AEB", "AMBA", "Armée de l'Air", "Arm??e de l'Air", "ASI", "CASC", "CASIC",
  "CECLES", "CNES", "ESA", "IRGC", "ISA", "ISAS", "ISRO", "JAXA", "KARI",
  "KCST", "NASA", "RAE", "Roscosmos", "RVSN USSR",
  "US Air Force", "US Navy", "VKS RF"
]);

const GOV_RELATED_ORGS = new Set([
  "Boeing", "Douglas", "ExPace", "General Dynamics", "IAI", "Khrunichev",
  "Kosmotras", "Land Launch", "Lockheed", "Martin Marietta", "MHI",
  "Northrop", "OKB-586", "Sandia", "Sea Launch", "SRC", "Starsem",
  "ULA", "UT", "Yuzhmash"
]);

const getOrgType = company => {
  if (STATE_ORGS.has(company)) return "State / government";
  if (GOV_RELATED_ORGS.has(company)) return "Government-related";
  return "Private / commercial";
};


const CPI_TABLE = [
  { year: 1957, cpi: 28.1 }, { year: 1960, cpi: 29.6 }, { year: 1965, cpi: 31.5 },
  { year: 1970, cpi: 38.8 }, { year: 1975, cpi: 53.8 }, { year: 1980, cpi: 82.4 },
  { year: 1985, cpi: 107.6 }, { year: 1990, cpi: 130.7 }, { year: 1995, cpi: 152.4 },
  { year: 2000, cpi: 172.2 }, { year: 2005, cpi: 195.3 }, { year: 2010, cpi: 218.1 },
  { year: 2015, cpi: 237.0 }, { year: 2020, cpi: 258.8 }, { year: 2030, cpi: 258.8 }
];
const CPI_2020 = 258.8;

function getCPI(year) {
  if (year <= CPI_TABLE[0].year) return CPI_TABLE[0].cpi;
  for (let i = 0; i < CPI_TABLE.length - 1; i++) {
    if (year >= CPI_TABLE[i].year && year < CPI_TABLE[i + 1].year) {
      const y1 = CPI_TABLE[i].year, y2 = CPI_TABLE[i + 1].year;
      const c1 = CPI_TABLE[i].cpi, c2 = CPI_TABLE[i + 1].cpi;
      return c1 + (c2 - c1) * ((year - y1) / (y2 - y1));
    }
  }
  return CPI_TABLE.at(-1).cpi;
}


const RUSSIAN_LOCS = ["russia", "kazakhstan", "ussr", "vostochny", "plesetsk", "baikonur", "kapustin"];
const RUSSIAN_ORGS = ["roscosmos", "kosmotras", "khrunichev", "starsem", "land launch", "sea launch"];

function isRussian(row) {
  const loc = (row["Location"] || "").toLowerCase();
  const comp = (row["Company Name"] || "").toLowerCase();
  return RUSSIAN_LOCS.some(s => loc.includes(s)) || RUSSIAN_ORGS.some(s => comp.includes(s));
}


Promise.all([
  d3.csv("data/Space_Corrected.csv"),
  d3.csv("data/NIM_Database.csv")
]).then(([rawSpace, rawPlanet]) => {

  const spaceData = rawSpace
    .filter(d => !isRussian(d))
    .map(d => {
      const match = (d["Datum"] || "").match(/\d{4}/);
      const year = match ? +match[0] : null;
      const raw = parseFloat((d[" Rocket"] || "").replace(/,/g, ""));
      const cost = isNaN(raw) ? null : raw;
      const costAdjusted = (cost && year) ? cost * (CPI_2020 / getCPI(year)) : null;
      return {
        company: (d["Company Name"] || "").trim(),
        year,
        cost,
        costAdjusted,
        status: (d["Status Mission"] || "").trim(),
        detail: (d["Detail"] || "").trim()
      };
    })
    .filter(d => d.year !== null);

  const spaceYears = Array.from(new Set(spaceData.map(d => d.year))).sort((a, b) => a - b);

  renderLaunchesChart("#chart-launches", spaceData, spaceYears);
  renderOutcomesChart("#chart-outcomes", spaceData, spaceYears);
  renderPrivateAreaChart(spaceData);
  renderCostChart(spaceData.filter(d => d.cost !== null && d.cost > 0));

  const DEST_MAP = { "L1": "L1 Lagrange Point", "Asteroid": "Near-Earth Asteroid", "Asteroid Belt": "Main Belt Asteroid" };

  const planetData = rawPlanet
    .filter(d => d.Mission && d.Mission.trim().length > 0)
    .map(d => {
      const raw = (d.Destination || "").trim();
      const dest = DEST_MAP[raw] || raw;
      const sa = (d.SA || "").toUpperCase();
      return {
        mission: d.Mission,
        destination: dest,
        powerSource: sa === "RTG" ? "Nuclear (RTG)" : sa ? "Solar Array" : "Unknown",
        tmcn: parseFloat(d.TMCN) || null
      };
    });

  renderSankey(planetData);
  renderTotalCostByDestination(planetData);
});
