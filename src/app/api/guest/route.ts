import { NextRequest, NextResponse } from 'next/server';
import { searchByGuest } from '@/lib/queries';
import { initDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const name = searchParams.get('name');

  if (!name) {
    return NextResponse.json({ error: 'Season name required' }, { status: 400 });
  }

  try {
    await initDb();
    const episodes = searchByGuest(name);
    return NextResponse.json({ episodes, name });
  } catch (error) {
    console.error('Guest search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
