import { NextRequest, NextResponse } from 'next/server';
import { getAllEpisodes } from '@/lib/queries';

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get('name');

  if (!name) {
    return NextResponse.json({ error: 'Guest name required' }, { status: 400 });
  }

  const q = name.toLowerCase();
  const episodes = getAllEpisodes().filter(ep =>
    ep.guest?.toLowerCase().includes(q)
  );

  return NextResponse.json({ episodes, name });
}
