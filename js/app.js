function appendChartSource(svg, W, H, parts) {
  const textElem = svg.append("text")
    .attr("x", W / 2).attr("y", H - 6)
    .attr("text-anchor", "middle")
    .style("font-size", "10px").style("font-family", "Inter,sans-serif");

  parts.forEach(p => {
    const parent = p.href
      ? textElem.append("a").attr("href", p.href).attr("target", "_blank")
      : textElem;
    
    parent.append("tspan")
      .attr("fill", p.href ? "#6366f1" : "#64748b")
      .attr("text-decoration", p.href ? "underline" : null)
      .attr("xml:space", "preserve")
      .text(p.text);
  });
}

const SRC_SPACE = [
  { text: "Джерело: ", href: null },
  { text: "Kaggle", href: "https://www.kaggle.com/datasets/agirlcoding/all-space-missions-from-1957/data" },
  { text: " та ", href: null },
  { text: "The Space Devs API", href: "https://thespacedevs.com/llapi" },
];

const SRC_COST = [
  { text: "Джерело: ", href: null },
  { text: "Всі космічні місії з 1957 (Kaggle)", href: "https://www.kaggle.com/datasets/agirlcoding/all-space-missions-from-1957/data" },
];

const SRC_PLANET = [
  { text: "Джерело: ", href: null },
  { text: "База даних міжпланетних місій NASA (NIM)", href: "https://datadryad.org/dataset/doi:10.5061/dryad.fj6q5745z" },
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
  if (STATE_ORGS.has(company)) return "Державні";
  if (GOV_RELATED_ORGS.has(company)) return "Урядові підрядники";
  return "Приватні / комерційні";
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
      const COMPANY_ALIASES = {
        "China Aerospace Science and Technology Corporation": "CASC",
        "United Launch Alliance": "ULA",
        "National Aeronautics and Space Administration": "NASA",
        "Russian Space Forces": "VKS RF",
      };
      let rawComp = (d["Company Name"] || "").trim();
      let comp = COMPANY_ALIASES[rawComp] || rawComp;

      return {
        company: comp,
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

  const DEST_MAP = {
    "L1": "Точка Лагранжа L1",
    "Asteroid": "Навколоземний астероїд",
    "Asteroid Belt": "Астероїд головного поясу",
    "Mars": "Марс",
    "Moon": "Місяць",
    "Venus": "Венера",
    "Jupiter": "Юпітер",
    "Saturn": "Сатурн",
    "Mercury": "Меркурій",
    "Sun": "Сонце",
    "Comet": "Комета",
    "Lunar": "Місяць",
    "Pluto": "Плутон",

  };

  const planetData = rawPlanet
    .filter(d => d.Mission && d.Mission.trim().length > 0)
    .map(d => {
      const raw = (d.Destination || "").trim();
      const dest = DEST_MAP[raw] || raw;
      const sa = (d.SA || "").toUpperCase();
      return {
        mission: d.Mission,
        destination: dest,
        powerSource: sa === "RTG" ? "Ядерні (РІТЕГ)" : sa ? "Сонячні батареї" : "Невідомо",
        tmcn: parseFloat(d.TMCN) || null
      };
    });

  renderSankey(planetData);
  renderTotalCostByDestination(planetData);
});
