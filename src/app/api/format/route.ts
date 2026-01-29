import { NextRequest, NextResponse } from 'next/server';
import { searchByFormat } from '@/lib/queries';
import { FORMATS } from '@/lib/categories';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const formatName = searchParams.get('name');

  if (!formatName) {
    return NextResponse.json({ error: 'Format name is required' }, { status: 400 });
  }

  const format = FORMATS.find(f => f.name === formatName);
  if (!format) {
    return NextResponse.json({ error: 'Format not found' }, { status: 404 });
  }

  try {
    const episodes = searchByFormat(format.keywords, format.matchField);
    return NextResponse.json({ episodes, color: format.color });
  } catch (error) {
    console.error('Error fetching format episodes:', error);
    return NextResponse.json({ error: 'Failed to fetch format episodes' }, { status: 500 });
  }
}
