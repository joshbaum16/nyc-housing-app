import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { DetailedListing } from '../../types/listings';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY environment variable');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Convert a listing to a text representation for embedding
function listingToText(listing: DetailedListing): string {
  const features = [
    `${listing.bedrooms} bedroom`,
    `${listing.bathrooms} bathroom`,
    listing.sqft ? `${listing.sqft} square feet` : '',
    listing.propertyType || '',
    listing.neighborhood || '',
    listing.borough || '',
    listing.noFee ? 'no fee' : 'fee',
    listing.description || '',
    ...(typeof listing.amenities === 'string' 
      ? JSON.parse(listing.amenities) 
      : listing.amenities || [])
  ].filter(Boolean);

  return features.join(' ');
}

// Calculate cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

export async function POST(request: Request) {
  try {
    const { text, listings } = await request.json();

    // Get embedding for the query
    const queryEmbeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    const queryEmbedding = queryEmbeddingResponse.data[0].embedding;

    // Get embeddings for all listings and calculate similarity
    const listingsWithScores = await Promise.all(
      listings.map(async (listing: DetailedListing) => {
        const listingText = listingToText(listing);
        const listingEmbeddingResponse = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: listingText,
        });
        const listingEmbedding = listingEmbeddingResponse.data[0].embedding;
        const similarity = cosineSimilarity(queryEmbedding, listingEmbedding);
        return { listing, similarity };
      })
    );

    // Sort by similarity score
    const sortedListings = listingsWithScores
      .sort((a, b) => b.similarity - a.similarity)
      .map(item => item.listing);

    return NextResponse.json(sortedListings);
  } catch (error) {
    console.error('Error processing embeddings:', error);
    return NextResponse.json(
      { error: 'Failed to process embeddings' },
      { status: 500 }
    );
  }
} 