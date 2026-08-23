import { NextRequest, NextResponse } from 'next/server';
import { getEpisodesByFormat } from '@/lib/queries';
import { FORMATS } from '@/lib/categories';

export async function GET(request: NextRequest) {
  const formatName = request.nextUrl.searchParams.get('name');

  if (!formatName) {
    return NextResponse.json({ error: 'Format name is required' }, { status: 400 });
  }

  const format = FORMATS.find(f => f.name === formatName);
  if (!format) {
    return NextResponse.json({ error: 'Format not found' }, { status: 404 });
  }

  const episodes = getEpisodesByFormat(formatName);
  return NextResponse.json({ episodes, color: format.color });
}
