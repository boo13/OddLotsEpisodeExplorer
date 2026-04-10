import { NextResponse } from 'next/server';
import { initDb } from '@/lib/db';
import {
  getStatsSummary,
  getSeasonCounts,
  getFormatCounts,
  getRecentEpisodes,
} from '@/lib/queries';

export async function GET() {
  try {
    await initDb();
    return NextResponse.json({
      summary: getStatsSummary(),
      seasonCounts: getSeasonCounts(),
      formatCounts: getFormatCounts(),
      recentEpisodes: getRecentEpisodes(8),
    });
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
