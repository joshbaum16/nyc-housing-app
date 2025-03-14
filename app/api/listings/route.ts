import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  try {
    const listing = await prisma.detailedListing.findUnique({
      where: { id }
    });

    if (!listing) {
      return NextResponse.json({ found: false });
    }

    return NextResponse.json({
      found: true,
      listing: {
        ...listing,
        amenities: JSON.parse(listing.amenities),
        images: JSON.parse(listing.images),
        imageAnalysis: listing.imageAnalysis ? JSON.parse(listing.imageAnalysis) : {},
        agents: JSON.parse(listing.agents)
      }
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const listing = await request.json();
    
    const baseData: Record<string, any> = {
      status: listing.status,
      address: listing.address,
      price: listing.price,
      borough: listing.borough || '',
      neighborhood: listing.neighborhood || '',
      propertyType: listing.propertyType || '',
      sqft: listing.sqft || 0,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      amenities: JSON.stringify(listing.amenities),
      description: listing.description || '',
      images: JSON.stringify(listing.images),
      noFee: listing.noFee,
      agents: JSON.stringify(listing.agents),
      availableFrom: listing.availableFrom,
      daysOnMarket: listing.daysOnMarket
    };

    // Only include imageAnalysis if it exists
    if (listing.imageAnalysis) {
      baseData.imageAnalysis = JSON.stringify(listing.imageAnalysis);
    }
    
    const now = new Date();
    
    await prisma.detailedListing.upsert({
      where: { id: listing.id },
      update: baseData,
      create: {
        id: listing.id,
        ...baseData,
        createdAt: now,
        updatedAt: now
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, price } = await request.json();
    
    if (!id || typeof price !== 'number') {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    await prisma.detailedListing.update({
      where: { id },
      data: { price }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
} 