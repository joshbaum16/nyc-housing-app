import { NextResponse } from 'next/server';
import { analyzeImage } from '@/app/services/vision';

export async function POST(request: Request) {
  try {
    const { imageUrl } = await request.json();
    
    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    const analysis = await analyzeImage(imageUrl);
    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Error analyzing image:', error);
    return NextResponse.json(
      { error: 'Failed to analyze image' },
      { status: 500 }
    );
  }
} 