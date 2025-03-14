'use client';

import { Listing } from '../services/streeteasy';
import ListingCard from './ListingCard';

interface SearchResultsProps {
  listings: Listing[];
  isLoading: boolean;
  error?: string;
}

export default function SearchResults({ listings, isLoading, error }: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="text-center py-10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading listings...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-600">No listings found matching your criteria.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
} 