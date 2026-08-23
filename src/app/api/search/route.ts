import { NextRequest, NextResponse } from 'next/server';
import { searchEpisodes } from '@/lib/queries';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter q is required' }, { status: 400 });
  }

  const episodes = searchEpisodes(query);
  return NextResponse.json(episodes);
}
