export interface Episode {
  id: number;
  title: string;
  season: string | null;
  format: string | null;
  collection: string | null;
  guest: string | null;
  description: string | null;
  pub_date: string | null;
  guest_title: string | null;
  guest_company: string | null;
  episode_link: string | null;
  duration_seconds: number | null;
}

export interface EpisodeWithHighlight extends Episode {
  highlighted: boolean;
  color?: string;
}
