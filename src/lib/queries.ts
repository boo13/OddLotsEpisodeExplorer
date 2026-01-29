import { getDb } from './db';
import type { Episode } from '@/types/episode';

// For queries with just episodes table
const GUEST_COALESCE = "COALESCE(guest_clean, guest)";
const TITLE_COALESCE = "COALESCE(guest_title_clean, guest_title)";
const COMPANY_COALESCE = "COALESCE(guest_company_clean, guest_company)";
const LINK_COALESCE = "COALESCE(omny_url, apple_podcasts_url)";

// For queries joining with FTS table (need table prefix)
const GUEST_COALESCE_E = "COALESCE(e.guest_clean, e.guest)";
const TITLE_COALESCE_E = "COALESCE(e.guest_title_clean, e.guest_title)";
const COMPANY_COALESCE_E = "COALESCE(e.guest_company_clean, e.guest_company)";
const LINK_COALESCE_E = "COALESCE(e.omny_url, e.apple_podcasts_url)";

export function getAllEpisodes(): Episode[] {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT
      id,
      title,
      ${GUEST_COALESCE} as guest,
      description,
      duration_seconds,
      pub_date,
      ${TITLE_COALESCE} as guest_title,
      ${COMPANY_COALESCE} as guest_company,
      ${LINK_COALESCE} as episode_link
    FROM episodes
    ORDER BY pub_date ASC
  `);
  return stmt.all() as Episode[];
}

export function searchEpisodes(query: string): Episode[] {
  const db = getDb();

  // FTS5 search
  const stmt = db.prepare(`
    SELECT
      e.id,
      e.title,
      ${GUEST_COALESCE_E} as guest,
      e.description,
      e.duration_seconds,
      e.pub_date,
      ${TITLE_COALESCE_E} as guest_title,
      ${COMPANY_COALESCE_E} as guest_company,
      ${LINK_COALESCE_E} as episode_link
    FROM episodes_fts fts
    JOIN episodes e ON fts.rowid = e.id
    WHERE episodes_fts MATCH ?
    ORDER BY e.pub_date ASC
  `);

  try {
    return stmt.all(query) as Episode[];
  } catch {
    // If FTS query fails, try a simple LIKE search
    const likeStmt = db.prepare(`
      SELECT
        id,
        title,
        ${GUEST_COALESCE} as guest,
        description,
      duration_seconds,
        pub_date,
        ${TITLE_COALESCE} as guest_title,
        ${COMPANY_COALESCE} as guest_company,
        ${LINK_COALESCE} as episode_link
      FROM episodes
      WHERE title LIKE ? OR guest LIKE ? OR guest_clean LIKE ? OR description LIKE ?
      ORDER BY pub_date ASC
    `);
    const pattern = `%${query}%`;
    return likeStmt.all(pattern, pattern, pattern, pattern) as Episode[];
  }
}

export function searchByFormat(keywords: string[], matchField: 'title' | 'title_or_description'): Episode[] {
  const db = getDb();

  const fields = matchField === 'title'
    ? ['title']
    : ['title', 'description'];

  const conditions = keywords.map(() =>
    fields.map(f => `${f} LIKE ?`).join(' OR ')
  ).join(' OR ');

  const stmt = db.prepare(`
    SELECT DISTINCT
      id,
      title,
      ${GUEST_COALESCE} as guest,
      description,
      duration_seconds,
      pub_date,
      ${TITLE_COALESCE} as guest_title,
      ${COMPANY_COALESCE} as guest_company,
      ${LINK_COALESCE} as episode_link
    FROM episodes
    WHERE ${conditions}
    ORDER BY pub_date ASC
  `);

  const params = keywords.flatMap(k => {
    const pattern = `%${k}%`;
    return fields.map(() => pattern);
  });

  return stmt.all(...params) as Episode[];
}

export function searchByCategory(keywords: string[]): Episode[] {
  const db = getDb();

  // Build a query that matches any of the keywords
  const conditions = keywords.map(() =>
    `(title LIKE ? OR description LIKE ? OR guest LIKE ? OR guest_clean LIKE ? OR guest_company LIKE ? OR guest_company_clean LIKE ?)`
  ).join(' OR ');

  const stmt = db.prepare(`
    SELECT DISTINCT
      id,
      title,
      ${GUEST_COALESCE} as guest,
      description,
      duration_seconds,
      pub_date,
      ${TITLE_COALESCE} as guest_title,
      ${COMPANY_COALESCE} as guest_company,
      ${LINK_COALESCE} as episode_link
    FROM episodes
    WHERE ${conditions}
    ORDER BY pub_date ASC
  `);

  const params = keywords.flatMap(k => {
    const pattern = `%${k}%`;
    return [pattern, pattern, pattern, pattern, pattern, pattern];
  });

  return stmt.all(...params) as Episode[];
}

// ============================================
// STATS QUERIES
// ============================================

export interface StatsSummary {
  totalEpisodes: number;
  totalHours: number;
  avgDuration: number;
  dateRange: { start: string; end: string };
}

export interface MonthlyData {
  month: string;
  episodeCount: number;
  totalMinutes: number;
  avgMinutes: number;
}

export interface GuestCount {
  name: string;
  count: number;
}

export interface CompanyCount {
  name: string;
  count: number;
}

export function getStatsSummary(): StatsSummary {
  const db = getDb();

  const summaryStmt = db.prepare(`
    SELECT
      COUNT(*) as totalEpisodes,
      SUM(duration_seconds) / 3600.0 as totalHours,
      AVG(duration_seconds) / 60.0 as avgDuration,
      MIN(pub_date) as startDate,
      MAX(pub_date) as endDate
    FROM episodes
  `);

  const row = summaryStmt.get() as {
    totalEpisodes: number;
    totalHours: number;
    avgDuration: number;
    startDate: string;
    endDate: string;
  };

  return {
    totalEpisodes: row.totalEpisodes,
    totalHours: Math.round(row.totalHours),
    avgDuration: Math.round(row.avgDuration * 10) / 10,
    dateRange: { start: row.startDate, end: row.endDate }
  };
}

export function getMonthlyTimeline(): MonthlyData[] {
  const db = getDb();

  const stmt = db.prepare(`
    SELECT
      strftime('%Y-%m', pub_date) as month,
      COUNT(*) as episodeCount,
      SUM(duration_seconds) / 60.0 as totalMinutes,
      AVG(duration_seconds) / 60.0 as avgMinutes
    FROM episodes
    WHERE pub_date IS NOT NULL
    GROUP BY strftime('%Y-%m', pub_date)
    ORDER BY month ASC
  `);

  return stmt.all() as MonthlyData[];
}

export function getTopGuests(limit: number = 10): GuestCount[] {
  const db = getDb();

  const stmt = db.prepare(`
    SELECT
      ${GUEST_COALESCE} as name,
      COUNT(*) as count
    FROM episodes
    WHERE ${GUEST_COALESCE} IS NOT NULL
      AND ${GUEST_COALESCE} != ''
      AND ${GUEST_COALESCE} != 'N/A'
      AND LOWER(${GUEST_COALESCE}) NOT LIKE '%n/a%'
      AND ${GUEST_COALESCE} != 'Lots More'
    GROUP BY ${GUEST_COALESCE}
    ORDER BY count DESC
    LIMIT ?
  `);

  return stmt.all(limit) as GuestCount[];
}

export function getTopCompanies(limit: number = 10): CompanyCount[] {
  const db = getDb();

  const stmt = db.prepare(`
    SELECT
      ${COMPANY_COALESCE} as name,
      COUNT(*) as count
    FROM episodes
    WHERE ${COMPANY_COALESCE} IS NOT NULL
      AND ${COMPANY_COALESCE} != ''
      AND ${COMPANY_COALESCE} != 'N/A'
      AND LOWER(${COMPANY_COALESCE}) NOT LIKE '%n/a%'
      AND LOWER(${COMPANY_COALESCE}) != 'unknown'
      AND LENGTH(${COMPANY_COALESCE}) < 50
    GROUP BY ${COMPANY_COALESCE}
    ORDER BY count DESC
    LIMIT ?
  `);

  return stmt.all(limit) as CompanyCount[];
}

export function searchByGuest(guestName: string): Episode[] {
  const db = getDb();

  const stmt = db.prepare(`
    SELECT
      id,
      title,
      ${GUEST_COALESCE} as guest,
      description,
      duration_seconds,
      pub_date,
      ${TITLE_COALESCE} as guest_title,
      ${COMPANY_COALESCE} as guest_company,
      ${LINK_COALESCE} as episode_link
    FROM episodes
    WHERE ${GUEST_COALESCE} = ?
    ORDER BY pub_date ASC
  `);

  return stmt.all(guestName) as Episode[];
}

export function searchByCompany(companyName: string): Episode[] {
  const db = getDb();

  const stmt = db.prepare(`
    SELECT
      id,
      title,
      ${GUEST_COALESCE} as guest,
      description,
      duration_seconds,
      pub_date,
      ${TITLE_COALESCE} as guest_title,
      ${COMPANY_COALESCE} as guest_company,
      ${LINK_COALESCE} as episode_link
    FROM episodes
    WHERE ${COMPANY_COALESCE} = ?
    ORDER BY pub_date ASC
  `);

  return stmt.all(companyName) as Episode[];
}

// ============================================
// STATS PAGE 2 QUERIES
// ============================================

export interface YearlyData {
  year: string;
  episodeCount: number;
  totalHours: number;
  avgMinutes: number;
}

export interface TitleCount {
  title: string;
  count: number;
}

export interface DurationBucket {
  bucket: string;
  count: number;
  minMinutes: number;
  maxMinutes: number;
}

export interface LongestEpisode {
  id: number;
  title: string;
  guest: string;
  durationMinutes: number;
  pubDate: string;
}

export function getYearlyStats(): YearlyData[] {
  const db = getDb();

  const stmt = db.prepare(`
    SELECT
      strftime('%Y', pub_date) as year,
      COUNT(*) as episodeCount,
      SUM(duration_seconds) / 3600.0 as totalHours,
      AVG(duration_seconds) / 60.0 as avgMinutes
    FROM episodes
    WHERE pub_date IS NOT NULL
    GROUP BY strftime('%Y', pub_date)
    ORDER BY year ASC
  `);

  return stmt.all() as YearlyData[];
}

export function getTopTitles(limit: number = 10): TitleCount[] {
  const db = getDb();

  const stmt = db.prepare(`
    SELECT
      ${TITLE_COALESCE} as title,
      COUNT(*) as count
    FROM episodes
    WHERE ${TITLE_COALESCE} IS NOT NULL
      AND ${TITLE_COALESCE} != ''
      AND ${TITLE_COALESCE} != 'N/A'
      AND LOWER(${TITLE_COALESCE}) NOT LIKE '%n/a%'
      AND LENGTH(${TITLE_COALESCE}) < 60
    GROUP BY ${TITLE_COALESCE}
    ORDER BY count DESC
    LIMIT ?
  `);

  return stmt.all(limit) as TitleCount[];
}

export function getDurationDistribution(): DurationBucket[] {
  const db = getDb();

  const stmt = db.prepare(`
    SELECT
      CASE
        WHEN duration_seconds / 60 < 20 THEN '0-20'
        WHEN duration_seconds / 60 < 30 THEN '20-30'
        WHEN duration_seconds / 60 < 40 THEN '30-40'
        WHEN duration_seconds / 60 < 50 THEN '40-50'
        WHEN duration_seconds / 60 < 60 THEN '50-60'
        ELSE '60+'
      END as bucket,
      COUNT(*) as count,
      MIN(duration_seconds / 60) as minMinutes,
      MAX(duration_seconds / 60) as maxMinutes
    FROM episodes
    WHERE duration_seconds IS NOT NULL
    GROUP BY bucket
    ORDER BY
      CASE bucket
        WHEN '0-20' THEN 1
        WHEN '20-30' THEN 2
        WHEN '30-40' THEN 3
        WHEN '40-50' THEN 4
        WHEN '50-60' THEN 5
        ELSE 6
      END
  `);

  return stmt.all() as DurationBucket[];
}

export function getLongestEpisodes(limit: number = 8): LongestEpisode[] {
  const db = getDb();

  const stmt = db.prepare(`
    SELECT
      id,
      title,
      ${GUEST_COALESCE} as guest,
      duration_seconds / 60.0 as durationMinutes,
      pub_date as pubDate
    FROM episodes
    WHERE duration_seconds IS NOT NULL
    ORDER BY duration_seconds DESC
    LIMIT ?
  `);

  return stmt.all(limit) as LongestEpisode[];
}

// ============================================
// FORMAT COUNTS (for exclude feature)
// ============================================

import { FORMATS } from './categories';

export interface FormatCount {
  name: string;
  count: number;
  episodeIds: number[];
}

export function getFormatCounts(): FormatCount[] {
  const db = getDb();
  const results: FormatCount[] = [];

  for (const format of FORMATS) {
    const fields = format.matchField === 'title'
      ? ['title']
      : ['title', 'description'];

    const conditions = format.keywords.map(() =>
      fields.map(f => `${f} LIKE ?`).join(' OR ')
    ).join(' OR ');

    const stmt = db.prepare(`
      SELECT DISTINCT id
      FROM episodes
      WHERE ${conditions}
    `);

    const params = format.keywords.flatMap(k => {
      const pattern = `%${k}%`;
      return fields.map(() => pattern);
    });

    const rows = stmt.all(...params) as { id: number }[];
    results.push({
      name: format.name,
      count: rows.length,
      episodeIds: rows.map(r => r.id)
    });
  }

  return results;
}
