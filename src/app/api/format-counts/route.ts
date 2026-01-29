import { NextResponse } from 'next/server';
import { getFormatCounts } from '@/lib/queries';

export async function GET() {
  try {
    const counts = getFormatCounts();
    return NextResponse.json(counts);
  } catch (error) {
    console.error('Error fetching format counts:', error);
    return NextResponse.json({ error: 'Failed to fetch format counts' }, { status: 500 });
  }
}
