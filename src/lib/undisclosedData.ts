export interface UndisclosedCaseRecord {
  id: number;
  title: string;
  season: string;
  format: string;
  description: string;
  sourceUrl: string;
  collection: string;
}

const SOURCE_URL = 'https://www.undisclosedpod.com/seasons-cases';

const BASE_CASES = [
  { title: 'Amanda Lewis', season: 'Season 7' },
  { title: 'Adnan Syed 2.0', season: 'Season 7', format: 'Follow-up / revisit' },
  { title: 'Wayne Braddy and Karl Willis', season: 'Season 7' },
  { title: 'Jason Carroll', season: 'Season 6' },
  { title: 'Darrell Ewing', season: 'Season 6' },
  { title: 'Jeff Titus', season: 'Season 5' },
  { title: 'John Brookins', season: 'Season 5' },
  { title: 'Jonathan Irons', season: 'Season 5' },
  { title: 'Fred Freeman/Temujin Kensu', season: 'Season 5' },
  { title: 'Greg Lance', season: 'Season 4' },
  { title: 'Joseph Webster', season: 'Season 4' },
  { title: 'Rocky Myers', season: 'Season 4' },
  { title: 'Keith Davis Jr.', season: 'Season 4' },
  { title: 'The Case Against Adnan Syed', season: 'Season 4', format: 'Follow-up / revisit' },
  { title: 'Dennis Perry', season: 'Season 3' },
  { title: 'Pam Lanier', season: 'Season 3' },
  { title: 'Ronnie Long', season: 'Season 3' },
  { title: 'Chester Hollman III', season: 'Season 3' },
  { title: 'Terrance Lewis', season: 'Season 3' },
  { title: 'Willie Veasy', season: 'Season 3' },
  { title: 'Shaurn Thomas', season: 'Season 3' },
  { title: 'Gary Mitchum Reeves', season: 'Season 3' },
  { title: 'The Killing of Freddie Gray', season: 'Season 3' },
  { title: 'Jamar Huggins', season: 'Season 3' },
  { title: 'Joey Watkins', season: 'Season 2' },
  { title: 'Adnan Syed', season: 'Season 1' },
] as const;

function formatTitle(title: string): string {
  return title;
}

export const UNDISCLOSED_CASES: UndisclosedCaseRecord[] = BASE_CASES.map((item, index) => {
  const format = 'format' in item ? item.format : 'Main case';
  return {
    id: index + 1,
    title: formatTitle(item.title),
    season: item.season,
    format,
    description: `Official Undisclosed case entry from ${item.season}.`,
    sourceUrl: SOURCE_URL,
    collection: 'Cases',
  };
});

export const SEASON_ORDER = [
  'Season 7',
  'Season 6',
  'Season 5',
  'Season 4',
  'Season 3',
  'Season 2',
  'Season 1',
] as const;

export const CASE_FORMATS = [
  { name: 'Main case', color: '#8b5cf6' },
  { name: 'Follow-up / revisit', color: '#22d3ee' },
] as const;
