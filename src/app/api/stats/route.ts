import { NextResponse } from 'next/server';
import {
  getStatsSummary,
  getSeasonCounts,
  getFormatCounts,
  getRecentEpisodes,
} from '@/lib/queries';

export async function GET() {
  return NextResponse.json({
    summary: getStatsSummary(),
    seasonCounts: getSeasonCounts(),
    formatCounts: getFormatCounts(),
    recentEpisodes: getRecentEpisodes(8),
  });
}
