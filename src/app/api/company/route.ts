import { NextRequest, NextResponse } from 'next/server';
import { searchByCompany } from '@/lib/queries';
import { initDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const name = searchParams.get('name');

  if (!name) {
    return NextResponse.json({ error: 'Case type required' }, { status: 400 });
  }

  try {
    await initDb();
    const episodes = searchByCompany(name);
    return NextResponse.json({ episodes, name });
  } catch (error) {
    console.error('Company search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
