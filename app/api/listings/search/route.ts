import { NextResponse } from 'next/server';
import { searchListings } from '@/app/services/streeteasy';
import { SearchFilters } from '@/app/types/listings';

export async function POST(request: Request) {
  try {
    const filters = await request.json() as SearchFilters;
    const searchResponse = await searchListings(filters);
    
    return NextResponse.json(searchResponse);
  } catch (error) {
    console.error('Error searching listings:', error);
    return NextResponse.json(
      { error: 'Failed to search listings' },
      { status: 500 }
    );
  }
} 