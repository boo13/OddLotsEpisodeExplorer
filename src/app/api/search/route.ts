import { NextRequest, NextResponse } from 'next/server';
import { searchEpisodes } from '@/lib/queries';
import { initDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter q is required' }, { status: 400 });
  }

  try {
    await initDb();
    const episodes = searchEpisodes(query);
    return NextResponse.json(episodes);
  } catch (error) {
    console.error('Error searching episodes:', error);
    return NextResponse.json({ error: 'Failed to search episodes' }, { status: 500 });
  }
}
