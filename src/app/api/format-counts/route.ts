import { NextResponse } from 'next/server';
import { getFormatCounts } from '@/lib/queries';
import { initDb } from '@/lib/db';

export async function GET() {
  try {
    await initDb();
    const counts = getFormatCounts();
    return NextResponse.json(counts);
  } catch (error) {
    console.error('Error fetching format counts:', error);
    return NextResponse.json({ error: 'Failed to fetch format counts' }, { status: 500 });
  }
}
