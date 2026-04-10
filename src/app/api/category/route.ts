import { NextRequest, NextResponse } from 'next/server';
import { searchByCategory } from '@/lib/queries';
import { CATEGORIES } from '@/lib/categories';
import { initDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const categoryName = searchParams.get('name');

  if (!categoryName) {
    return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
  }

  const category = CATEGORIES.find(c => c.name === categoryName);
  if (!category) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }

  try {
    await initDb();
    const episodes = searchByCategory([category.name]);
    return NextResponse.json({ episodes, color: category.color });
  } catch (error) {
    console.error('Error fetching category episodes:', error);
    return NextResponse.json({ error: 'Failed to fetch category episodes' }, { status: 500 });
  }
}
