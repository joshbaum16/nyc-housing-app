import { DetailedListing } from '../types/listings';

// Sort listings by relevance to a query description
export async function sortListingsByRelevance(
  listings: DetailedListing[],
  queryDescription: string
): Promise<DetailedListing[]> {
  try {
    const response = await fetch('/api/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: queryDescription,
        listings,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get embeddings');
    }

    return await response.json();
  } catch (error) {
    console.error('Error in sortListingsByRelevance:', error);
    return listings; // Return unsorted listings if there's an error
  }
} 