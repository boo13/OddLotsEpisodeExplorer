import { FORMATS, CATEGORIES } from './categories';
import { SEASON_ORDER, UNDISCLOSED_CASES } from './undisclosedData';
import type { Episode } from '@/types/episode';

function toEpisode(record: (typeof UNDISCLOSED_CASES)[number]): Episode {
  return {
    id: record.id,
    title: record.title,
    season: record.season,
    format: record.format,
    collection: record.collection,
    guest: record.season,
    description: record.description,
    pub_date: null,
    guest_title: record.format,
    guest_company: 'Undisclosed Podcast',
    episode_link: record.sourceUrl,
    duration_seconds: null,
  };
}

function sortBySourceOrder(a: Episode, b: Episode): number {
  const seasonDelta = getSeasonIndex(a.season) - getSeasonIndex(b.season);
  if (seasonDelta !== 0) return seasonDelta;
  return a.id - b.id;
}

function getSeasonIndex(season: string | null): number {
  if (!season) return SEASON_ORDER.length;
  return SEASON_ORDER.indexOf(season as (typeof SEASON_ORDER)[number]);
}

function matchesText(episode: Episode, query: string): boolean {
  const haystack = [
    episode.title,
    episode.description ?? '',
    episode.season ?? '',
    episode.format ?? '',
    episode.collection ?? '',
  ].join(' ').toLowerCase();

  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every(token => haystack.includes(token));
}

export function getAllEpisodes(): Episode[] {
  return UNDISCLOSED_CASES.map(toEpisode).sort(sortBySourceOrder);
}

export function searchEpisodes(query: string): Episode[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  return getAllEpisodes().filter(episode => matchesText(episode, trimmed));
}

export function searchByFormat(keywords: string[], matchField: 'title' | 'title_or_description'): Episode[] {
  const all = getAllEpisodes();
  const lowered = keywords.map(keyword => keyword.toLowerCase());

  return all.filter(episode => {
    const fieldValue = matchField === 'title'
      ? episode.title
      : `${episode.title} ${episode.description ?? ''}`;
    const haystack = fieldValue.toLowerCase();
    return lowered.some(keyword => haystack.includes(keyword));
  });
}

export function searchByCategory(keywords: string[]): Episode[] {
  const all = getAllEpisodes();
  const lowered = keywords.map(keyword => keyword.toLowerCase());

  return all.filter(episode => {
    const haystack = `${episode.season ?? ''} ${episode.title} ${episode.description ?? ''}`.toLowerCase();
    return lowered.some(keyword => haystack.includes(keyword));
  });
}

export function searchByGuest(guestName: string): Episode[] {
  return getAllEpisodes().filter(episode =>
    episode.season?.toLowerCase() === guestName.toLowerCase()
      || episode.title.toLowerCase().includes(guestName.toLowerCase())
  );
}

export function searchByCompany(companyName: string): Episode[] {
  return getAllEpisodes().filter(episode =>
    episode.format?.toLowerCase() === companyName.toLowerCase()
      || episode.collection?.toLowerCase() === companyName.toLowerCase()
  );
}

export interface StatsSummary {
  totalEpisodes: number;
  totalSeasons: number;
  totalFormats: number;
  collection: string;
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
  const episodes = getAllEpisodes();
  const seasons = new Set(episodes.map(episode => episode.season).filter(Boolean));
  const formats = new Set(episodes.map(episode => episode.format).filter(Boolean));

  return {
    totalEpisodes: episodes.length,
    totalSeasons: seasons.size,
    totalFormats: formats.size,
    collection: 'Undisclosed',
  };
}

export function getSeasonCounts(): SeasonCount[] {
  const episodes = getAllEpisodes();
  return CATEGORIES.map(category => ({
    name: category.name,
    count: episodes.filter(episode => episode.season === category.name).length,
  }));
}

export function getFormatCounts(): FormatCount[] {
  const episodes = getAllEpisodes();
  return FORMATS.map(format => ({
    name: format.name,
    count: episodes.filter(episode => episode.format === format.name).length,
    episodeIds: episodes.filter(episode => episode.format === format.name).map(episode => episode.id),
  }));
}

export function getTopTitles(limit = 10): HighlightCount[] {
  return getAllEpisodes()
    .slice(0, limit)
    .map(episode => ({
      name: episode.title,
      count: 1,
    }));
}

export function getRecentEpisodes(limit = 8): Episode[] {
  return getAllEpisodes().slice(0, limit);
}
