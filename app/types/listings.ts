import { ImageAnalysis } from '../services/vision';

export interface SearchFilters {
  minBedrooms: string;
  maxBedrooms?: string;
  minBaths?: string;
  minPrice?: string;
  maxPrice: string;
  neighborhoods: string[];
  amenities: string[];
  petFriendly: boolean;
  noFee?: boolean;
}

export interface DetailedListing {
  id: string;
  status: string;
  address: string;
  price: number;
  borough: string;
  neighborhood: string;
  propertyType: string;
  sqft: number;
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  description: string;
  images: string[];
  imageAnalysis?: { [key: string]: ImageAnalysis };
  noFee: boolean;
  agents: string[];
  availableFrom: string;
  daysOnMarket: number;
}

export interface Listing {
  id: string;
  price: number;
  status: string;
  longitude: number;
  latitude: number;
  url: string;
  details?: DetailedListing;
}

export interface SearchResponse {
  pagination: {
    count: number;
    nextOffset: number;
  };
  listings: Listing[];
}

export interface ProcessedPreferences {
  priceRange: {
    min?: number;
    max?: number;
  };
  bedrooms: number | 'studio';
  bathrooms?: number;
  neighborhoods: string[];
  mustHave: string[];
  niceToHave: string[];
  modernPreference?: boolean;
  naturalLightPreference?: boolean;
  appliancePreference?: 'new' | 'standard';
  noFee?: boolean;
}

export interface StreetEasySearchParams {
  areas: string;
  minPrice: string;
  maxPrice: string;
  minBeds: string;
  maxBeds: string;
  minBaths: string;
  noFee: string;
  limit: string;
  offset: string;
} 