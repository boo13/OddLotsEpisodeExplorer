import { NextRequest, NextResponse } from 'next/server';
import { getAllEpisodes } from '@/lib/queries';

// Search by case_name (repurposed from the old "company" route)
export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get('name');

  if (!name) {
    return NextResponse.json({ error: 'Case name required' }, { status: 400 });
  }

  const q = name.toLowerCase();
  const episodes = getAllEpisodes().filter(ep =>
    ep.case_name?.toLowerCase().includes(q)
  );

  return NextResponse.json({ episodes, name });
}
