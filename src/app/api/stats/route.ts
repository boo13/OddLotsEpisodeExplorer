import { NextResponse } from 'next/server';
import { initDb } from '@/lib/db';
import {
  getStatsSummary,
  getMonthlyTimeline,
  getTopGuests,
  getTopCompanies,
  getYearlyStats,
  getTopTitles,
  getDurationDistribution,
  getLongestEpisodes
} from '@/lib/queries';

export async function GET() {
  try {
    await initDb();
    const summary = getStatsSummary();
    const timeline = getMonthlyTimeline();
    const topGuests = getTopGuests(10);
    const topCompanies = getTopCompanies(10);

    // Page 2 stats
    const yearlyStats = getYearlyStats();
    const topTitles = getTopTitles(10);
    const durationDistribution = getDurationDistribution();
    const longestEpisodes = getLongestEpisodes(8);

    return NextResponse.json({
      summary,
      timeline,
      topGuests,
      topCompanies,
      // Page 2
      yearlyStats,
      topTitles,
      durationDistribution,
      longestEpisodes
    });
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
