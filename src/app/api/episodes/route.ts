import { NextResponse } from 'next/server';
import { getAllEpisodes } from '@/lib/queries';

export async function GET() {
  return NextResponse.json(getAllEpisodes());
}
