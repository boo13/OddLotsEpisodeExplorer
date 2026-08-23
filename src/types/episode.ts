export interface Episode {
  id: number;
  title: string;
  format: string;  // 'TJ Weekly' | 'Unfiltered' | 'Season Episode' | 'Addendum' | 'Mini Series' | 'Bonus' | 'Other'
  season: string | null;  // 'S1' through 'S7', or null
  case_name: string | null;  // e.g. "The State v. Amanda Lewis"
  guest: string | null;  // TJ Weekly featured person
  pub_date: string | null;
  duration_seconds: number | null;
  description: string | null;
  episode_link: string | null;
}

export interface EpisodeWithHighlight extends Episode {
  highlighted: boolean;
  color?: string;
}
