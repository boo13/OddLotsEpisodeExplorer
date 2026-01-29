import { NextRequest, NextResponse } from 'next/server';
import { searchByCompany } from '@/lib/queries';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const name = searchParams.get('name');

  if (!name) {
    return NextResponse.json({ error: 'Company name required' }, { status: 400 });
  }

  try {
    const episodes = searchByCompany(name);
    return NextResponse.json({ episodes, name });
  } catch (error) {
    console.error('Company search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
