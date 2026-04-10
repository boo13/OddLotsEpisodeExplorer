export interface Category {
  name: string;
  color: string;
}

export const CATEGORIES: Category[] = [
  {
    name: "Season 7",
    color: "#ef4444"
  },
  {
    name: "Season 6",
    color: "#f97316"
  },
  {
    name: "Season 5",
    color: "#eab308"
  },
  {
    name: "Season 4",
    color: "#22c55e"
  },
  {
    name: "Season 3",
    color: "#06b6d4"
  },
  {
    name: "Season 2",
    color: "#3b82f6"
  },
  {
    name: "Season 1",
    color: "#8b5cf6"
  }
];

export interface Format {
  name: string;
  color: string;
}

export const FORMATS: Format[] = [
  {
    name: "Main case",
    color: "#a78bfa",
  },
  {
    name: "Follow-up / revisit",
    color: "#34d399",
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
