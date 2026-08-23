export interface Category {
  name: string;
  color: string;
}

// Seasons S7→S1, newest first
export const CATEGORIES: Category[] = [
  { name: 'S7', color: '#ef4444' },
  { name: 'S6', color: '#f97316' },
  { name: 'S5', color: '#eab308' },
  { name: 'S4', color: '#22c55e' },
  { name: 'S3', color: '#06b6d4' },
  { name: 'S2', color: '#3b82f6' },
  { name: 'S1', color: '#8b5cf6' },
];

export const SEASON_LABELS: Record<string, string> = {
  S1: 'Season 1 – Adnan Syed',
  S2: 'Season 2 – Joey Watkins',
  S3: 'Season 3 – Multiple Cases',
  S4: 'Season 4 – Multiple Cases',
  S5: 'Season 5 – Jeff Titus',
  S6: 'Season 6 – Jason Carroll',
  S7: 'Season 7 – Amanda Lewis',
};

export interface Format {
  name: string;
  color: string;
}

export const FORMATS: Format[] = [
  { name: 'TJ Weekly',      color: '#f59e0b' },
  { name: 'Unfiltered',     color: '#10b981' },
  { name: 'Season Episode', color: '#8b5cf6' },
  { name: 'Addendum',       color: '#6366f1' },
  { name: 'Mini Series',    color: '#3b82f6' },
  { name: 'Bonus',          color: '#06b6d4' },
  { name: 'Other',          color: '#71717a' },
];

export function getFormatColor(formatName: string): string {
  return FORMATS.find(f => f.name === formatName)?.color ?? '#52525b';
}

export function getSeasonColor(seasonName: string): string {
  return CATEGORIES.find(c => c.name === seasonName)?.color ?? '#52525b';
}

// Gradient from violet → cyan for search highlights
export function getGradientColor(index: number, total: number): string {
  const colors = [
    { r: 139, g: 92,  b: 246 },
    { r: 168, g: 85,  b: 247 },
    { r: 124, g: 58,  b: 237 },
    { r: 99,  g: 102, b: 241 },
    { r: 59,  g: 130, b: 246 },
    { r: 14,  g: 165, b: 233 },
    { r: 6,   g: 182, b: 212 },
  ];

  if (total <= 1) return `rgb(${colors[0].r}, ${colors[0].g}, ${colors[0].b})`;

  const position = index / (total - 1);
  const scaledPos = position * (colors.length - 1);
  const colorIndex = Math.floor(scaledPos);
  const blend = scaledPos - colorIndex;

  const c1 = colors[Math.min(colorIndex, colors.length - 1)];
  const c2 = colors[Math.min(colorIndex + 1, colors.length - 1)];

  return `rgb(
    ${Math.round(c1.r + (c2.r - c1.r) * blend)},
    ${Math.round(c1.g + (c2.g - c1.g) * blend)},
    ${Math.round(c1.b + (c2.b - c1.b) * blend)}
  )`;
}
