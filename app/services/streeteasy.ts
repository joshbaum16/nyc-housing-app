import { prisma } from '../lib/prisma';
import { analyzeImage, ImageAnalysis } from './vision';
import {
  SearchFilters,
  DetailedListing,
  Listing,
  SearchResponse,
  StreetEasySearchParams
} from '../types/listings';

if (!process.env.NEXT_PUBLIC_STREETEASY_API_KEY) {
  throw new Error('Missing STREETEASY_API_KEY environment variable');
}

const STREETEASY_API_CONFIG = {
  host: 'streeteasy-api.p.rapidapi.com',
  key: process.env.NEXT_PUBLIC_STREETEASY_API_KEY,
  baseUrl: 'https://streeteasy-api.p.rapidapi.com'
};

const DEFAULT_SEARCH_PARAMS: Partial<StreetEasySearchParams> = {
  areas: 'all-downtown,all-midtown',
  minPrice: '0',
  maxPrice: '10000',
  minBeds: '0',
  maxBeds: '10',
  minBaths: '1',
  noFee: 'false',
  limit: '15',
  offset: '0'
};

async function getDetailedListingFromDB(id: string): Promise<DetailedListing | null> {
  try {
    const response = await fetch(`/api/listings?id=${id}`);
    const data = await response.json();
    
    if (!data.found) return null;

    const listing = data.listing;
    if (listing.imageAnalysis && typeof listing.imageAnalysis === 'string') {
      listing.imageAnalysis = JSON.parse(listing.imageAnalysis);
    }
    
    return listing;
  } catch (error) {
    console.error('Error checking database:', error);
    return null;
  }
}

async function updateListingPrice(id: string, price: number): Promise<void> {
  try {
    await fetch('/api/listings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, price }),
    });
  } catch (error) {
    console.error('Error updating price:', error);
  }
}

async function analyzeListingImages(images: string[]): Promise<{ [key: string]: ImageAnalysis }> {
  const analysisResults: { [key: string]: ImageAnalysis } = {};
  
  for (const imageUrl of images) {
    try {
      const response = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl }),
      });

      if (!response.ok) throw new Error('Failed to analyze image');

      const analysis = await response.json();
      analysisResults[imageUrl] = analysis;
    } catch (error) {
      console.error(`Error analyzing image ${imageUrl}:`, error);
    }
  }

  return analysisResults;
}

async function saveDetailedListingToDB(listing: DetailedListing): Promise<void> {
  try {
    if (listing.images && (!listing.imageAnalysis || Object.keys(listing.imageAnalysis).length === 0)) {
      listing.imageAnalysis = await analyzeListingImages(listing.images);
    }

    await fetch('/api/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...listing,
        imageAnalysis: JSON.stringify(listing.imageAnalysis || {})
      }),
    });
  } catch (error) {
    console.error('Error saving to database:', error);
  }
}

async function updateCachedListing(
  listing: DetailedListing,
  updates: { newPrice?: number; needsImageAnalysis?: boolean }
): Promise<DetailedListing> {
  const updatedListing = { ...listing };

  if (updates.newPrice !== undefined) {
    console.log(`Updating price for listing ${listing.id} from ${listing.price} to ${updates.newPrice}`);
    updatedListing.price = updates.newPrice;
  }

  if (updates.needsImageAnalysis && updatedListing.images) {
    console.log(`Adding missing image analysis for cached listing ${listing.id}`);
    updatedListing.imageAnalysis = await analyzeListingImages(updatedListing.images);
  }

  await saveDetailedListingToDB(updatedListing);
  return updatedListing;
}

async function fetchListingFromAPI(id: string): Promise<DetailedListing> {
  const response = await fetch(
    `${STREETEASY_API_CONFIG.baseUrl}/rentals/${id}`,
    {
      headers: {
        'x-rapidapi-host': STREETEASY_API_CONFIG.host,
        'x-rapidapi-key': STREETEASY_API_CONFIG.key
      }
    }
  );

  if (!response.ok) throw new Error('Failed to fetch listing details');

  const data = await response.json();
  await saveDetailedListingToDB(data);
  console.log(`Saved new listing to database: ${id}`);
  
  return data;
}

function convertFiltersToSearchParams(filters: SearchFilters): StreetEasySearchParams {
  return {
    areas: filters.neighborhoods.length > 0 ? filters.neighborhoods.join(',') : DEFAULT_SEARCH_PARAMS.areas!,
    minPrice: filters.minPrice || DEFAULT_SEARCH_PARAMS.minPrice!,
    maxPrice: filters.maxPrice || DEFAULT_SEARCH_PARAMS.maxPrice!,
    minBeds: filters.minBedrooms === 'studio' ? '0' : filters.minBedrooms || DEFAULT_SEARCH_PARAMS.minBeds!,
    maxBeds: filters.maxBedrooms || DEFAULT_SEARCH_PARAMS.maxBeds!,
    minBaths: filters.minBaths || DEFAULT_SEARCH_PARAMS.minBaths!,
    noFee: filters.noFee?.toString() || DEFAULT_SEARCH_PARAMS.noFee!,
    limit: DEFAULT_SEARCH_PARAMS.limit!,
    offset: DEFAULT_SEARCH_PARAMS.offset!
  };
}

function filterListingsByPreferences(listings: Listing[], filters: SearchFilters): Listing[] {
  return listings.filter(listing => {
    if (!listing.details) return false;

    if (filters.amenities?.length > 0) {
      const hasAllAmenities = filters.amenities.every(amenity =>
        listing.details!.amenities.some(a => a.toLowerCase().includes(amenity.toLowerCase()))
      );
      if (!hasAllAmenities) return false;
    }

    if (filters.petFriendly) {
      const isPetFriendly = listing.details!.amenities.some(amenity =>
        amenity.toLowerCase().includes('pet friendly')
      );
      if (!isPetFriendly) return false;
    }

    return true;
  });
}

export async function getRentalById(id: string, currentPrice?: number): Promise<DetailedListing> {
  try {
    const cachedListing = await getDetailedListingFromDB(id);
    
    if (cachedListing) {
      const updates = {
        newPrice: currentPrice !== undefined && currentPrice !== cachedListing.price ? currentPrice : undefined,
        needsImageAnalysis: cachedListing.images && (!cachedListing.imageAnalysis || Object.keys(cachedListing.imageAnalysis).length === 0)
      };

      if (updates.newPrice !== undefined || updates.needsImageAnalysis) {
        return await updateCachedListing(cachedListing, updates);
      }

      return cachedListing;
    }

    return await fetchListingFromAPI(id);
  } catch (error) {
    console.error('Error in getRentalById:', error);
    throw error;
  }
}

export async function searchListings(filters: SearchFilters): Promise<SearchResponse> {
  try {
    const searchParams = convertFiltersToSearchParams(filters);
    const params = new URLSearchParams(Object.entries(searchParams));

    console.log(`Fetching listings with params: ${params.toString()}`);
    const response = await fetch(
      `${STREETEASY_API_CONFIG.baseUrl}/rentals/search?${params.toString()}`,
      {
        headers: {
          'x-rapidapi-host': STREETEASY_API_CONFIG.host,
          'x-rapidapi-key': STREETEASY_API_CONFIG.key
        }
      }
    );

    if (!response.ok) throw new Error('Failed to fetch listings');

    const data = await response.json();
    
    const listingsWithDetails = await Promise.all(
      data.listings.map(async (listing: Listing) => {
        try {
          const details = await getRentalById(listing.id, listing.price);
          return { ...listing, details };
        } catch (error) {
          console.error(`Error fetching details for listing ${listing.id}:`, error);
          return listing;
        }
      })
    );

    const filteredListings = filterListingsByPreferences(listingsWithDetails, filters);

    return {
      ...data,
      listings: filteredListings,
      pagination: {
        ...data.pagination,
        count: filteredListings.length
      }
    };
  } catch (error) {
    console.error('Error fetching listings:', error);
    throw error;
  }
} 