import { NextResponse } from 'next/server';
import { getAllEpisodes } from '@/lib/queries';

export async function GET() {
  try {
    const episodes = getAllEpisodes();
    return NextResponse.json(episodes);
  } catch (error) {
    console.error('Error fetching episodes:', error);
    return NextResponse.json({ error: 'Failed to fetch episodes' }, { status: 500 });
  }
}
