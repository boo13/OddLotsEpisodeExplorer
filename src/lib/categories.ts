export interface Category {
  name: string;
  keywords: string[];
  color: string;
}

export const CATEGORIES: Category[] = [
  {
    name: "Fed/Central Banks",
    keywords: ["Federal Reserve", "FOMC", "Jerome Powell", "central bank", "monetary policy"],
    color: "#ef4444"
  },
  {
    name: "China",
    keywords: ["China", "Chinese", "Beijing", "Xi Jinping"],
    color: "#f97316"
  },
  {
    name: "Bonds/Treasuries",
    keywords: ["Treasury", "treasuries", "bond market", "yield curve", "fixed income"],
    color: "#eab308"
  },
  {
    name: "Crypto",
    keywords: ["crypto", "bitcoin", "ethereum", "blockchain", "stablecoin", "DeFi"],
    color: "#22c55e"
  },
  {
    name: "Housing",
    keywords: ["housing", "real estate", "mortgage", "homebuyer", "rental"],
    color: "#06b6d4"
  },
  {
    name: "Inflation",
    keywords: ["inflation", "CPI", "deflation", "disinflation", "price stability"],
    color: "#3b82f6"
  },
  {
    name: "Energy/Oil",
    keywords: ["oil price", "OPEC", "crude", "petroleum", "natural gas", "renewable energy"],
    color: "#8b5cf6"
  },
  {
    name: "Tech/AI",
    keywords: ["artificial intelligence", "Nvidia", "semiconductor", "ChatGPT", "machine learning"],
    color: "#ec4899"
  },
  {
    name: "Supply Chain",
    keywords: ["supply chain", "shipping", "logistics", "freight", "container"],
    color: "#f43f5e"
  },
  {
    name: "Russia/Ukraine",
    keywords: ["Russia", "Ukraine", "Putin", "Kyiv", "Moscow"],
    color: "#a855f7"
  },
  {
    name: "Banking",
    keywords: ["JPMorgan", "Goldman Sachs", "Morgan Stanley", "SVB", "Silicon Valley Bank", "bank failure"],
    color: "#14b8a6"
  },
  {
    name: "Labor/Jobs",
    keywords: ["labor market", "employment", "unemployment", "wage growth", "job market"],
    color: "#f59e0b"
  },
  {
    name: "Trade/Tariffs",
    keywords: ["tariff", "trade war", "protectionism", "WTO"],
    color: "#84cc16"
  },
  {
    name: "Private Credit",
    keywords: ["private credit", "direct lending", "private debt", "Blackstone Credit"],
    color: "#0ea5e9"
  },
  {
    name: "ETFs/Investing",
    keywords: ["ETF", "index fund", "passive investing", "Vanguard"],
    color: "#6366f1"
  }
];

export interface Format {
  name: string;
  keywords: string[];
  color: string;
  matchField: 'title' | 'title_or_description';
}

export const FORMATS: Format[] = [
  {
    name: "Lots More",
    keywords: ["Lots More"],
    color: "#a78bfa",
    matchField: 'title',
  },
  {
    name: "Sponsored Content",
    keywords: ["Sponsored Content"],
    color: "#f59e0b",
    matchField: 'title',
  },
  {
    name: "Cross-Promotion",
    keywords: ["Introducing:"],
    color: "#38bdf8",
    matchField: 'title',
  },
  {
    name: "Listener Questions",
    keywords: [" AMA ", "AMA Episode", "Answer All Your Questions", "Answer Your Questions", "Listener Questions", "Answer Listener"],
    color: "#34d399",
    matchField: 'title',
  },
];

// Generate a smooth purple-to-blue gradient color based on position
export function getGradientColor(index: number, total: number): string {
  // Gradient from violet (#8b5cf6) through purple to cyan (#06b6d4)
  const colors = [
    { r: 139, g: 92, b: 246 },   // violet
    { r: 168, g: 85, b: 247 },   // purple
    { r: 124, g: 58, b: 237 },   // violet-600
    { r: 99, g: 102, b: 241 },   // indigo
    { r: 59, g: 130, b: 246 },   // blue
    { r: 14, g: 165, b: 233 },   // sky
    { r: 6, g: 182, b: 212 },    // cyan
  ];

  if (total <= 1) return `rgb(${colors[0].r}, ${colors[0].g}, ${colors[0].b})`;

  // Map index to position in gradient (0 to 1)
  const position = index / (total - 1);
  const scaledPos = position * (colors.length - 1);
  const colorIndex = Math.floor(scaledPos);
  const blend = scaledPos - colorIndex;

  const c1 = colors[Math.min(colorIndex, colors.length - 1)];
  const c2 = colors[Math.min(colorIndex + 1, colors.length - 1)];

  const r = Math.round(c1.r + (c2.r - c1.r) * blend);
  const g = Math.round(c1.g + (c2.g - c1.g) * blend);
  const b = Math.round(c1.b + (c2.b - c1.b) * blend);

  return `rgb(${r}, ${g}, ${b})`;
}
