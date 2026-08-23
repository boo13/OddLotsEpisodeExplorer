import { NextRequest, NextResponse } from 'next/server';
import { getEpisodesBySeason } from '@/lib/queries';
import { CATEGORIES } from '@/lib/categories';

export async function GET(request: NextRequest) {
  const seasonName = request.nextUrl.searchParams.get('name');

  if (!seasonName) {
    return NextResponse.json({ error: 'Season name is required' }, { status: 400 });
  }

  const category = CATEGORIES.find(c => c.name === seasonName);
  if (!category) {
    return NextResponse.json({ error: 'Season not found' }, { status: 404 });
  }

  const episodes = getEpisodesBySeason(seasonName);
  return NextResponse.json({ episodes, color: category.color });
}
