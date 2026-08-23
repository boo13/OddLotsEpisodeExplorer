import rawEpisodes from './undisclosedEpisodes.json';
import type { Episode } from '@/types/episode';

export const EPISODES: Episode[] = rawEpisodes as unknown as Episode[];
