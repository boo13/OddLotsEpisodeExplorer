import { EPISODES } from './undisclosedData';
import { FORMATS, CATEGORIES } from './categories';
import type { Episode } from '@/types/episode';

export function getAllEpisodes(): Episode[] {
  return EPISODES;
}

export function searchEpisodes(query: string): Episode[] {
  const q = query.trim();
  if (!q) return [];
  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
  return EPISODES.filter(ep => {
    const haystack = [
      ep.title,
      ep.case_name ?? '',
      ep.guest ?? '',
      ep.format,
      ep.season ?? '',
    ].join(' ').toLowerCase();
    return tokens.every(t => haystack.includes(t));
  });
}

export function getEpisodesByFormat(formatName: string): Episode[] {
  return EPISODES.filter(ep => ep.format === formatName);
}

export function getEpisodesBySeason(seasonName: string): Episode[] {
  return EPISODES.filter(ep => ep.season === seasonName);
}

export interface StatsSummary {
  totalEpisodes: number;
  totalSeasons: number;
  totalFormats: number;
  collection: string;
  sinceRelaunch: number;
}

export interface SeasonCount {
  name: string;
  count: number;
}

export interface FormatCount {
  name: string;
  count: number;
  episodeIds: number[];
}

export interface HighlightCount {
  name: string;
  count: number;
}

export function getStatsSummary(): StatsSummary {
  const seasons = new Set(EPISODES.map(e => e.season).filter(Boolean));
  const formats = new Set(EPISODES.map(e => e.format).filter(Boolean));
  const sinceRelaunch = EPISODES.filter(
    e => e.pub_date && e.pub_date >= '2025-02-01'
  ).length;

  return {
    totalEpisodes: EPISODES.length,
    totalSeasons: seasons.size,
    totalFormats: formats.size,
    collection: 'Undisclosed',
    sinceRelaunch,
  };
}

export function getSeasonCounts(): SeasonCount[] {
  return CATEGORIES.map(cat => ({
    name: cat.name,
    count: EPISODES.filter(e => e.season === cat.name).length,
  }));
}

export function getFormatCounts(): FormatCount[] {
  return FORMATS.map(fmt => {
    const matches = EPISODES.filter(e => e.format === fmt.name);
    return {
      name: fmt.name,
      count: matches.length,
      episodeIds: matches.map(e => e.id),
    };
  });
}

export function getGuestCounts(limit = 20): HighlightCount[] {
  const counts: Record<string, number> = {};
  for (const ep of EPISODES) {
    if (ep.guest) {
      counts[ep.guest] = (counts[ep.guest] ?? 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function getRecentEpisodes(limit = 8): Episode[] {
  return EPISODES.slice(0, limit);
}
