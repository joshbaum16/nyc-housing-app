'use client';

import { useState } from 'react';
import { searchListings, SearchFilters, Listing } from '../services/streeteasy';
import SearchResults from './SearchResults';

const NYC_NEIGHBORHOODS = [
  'Upper East Side',
  'Upper West Side',
  'Lower East Side',
  'Chelsea',
  'Greenwich Village',
  'SoHo',
  'Tribeca',
  'Financial District',
  'Harlem',
  'Williamsburg',
  'DUMBO',
  'Park Slope',
  'Astoria',
  'Long Island City',
];

export default function ClientSearchForm() {
  const [filters, setFilters] = useState<SearchFilters>({
    minBedrooms: '',
    maxPrice: '',
    neighborhoods: [],
    amenities: [],
    petFriendly: false,
  });

  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  const handleNeighborhoodChange = (neighborhood: string) => {
    setFilters(prev => ({
      ...prev,
      neighborhoods: prev.neighborhoods.includes(neighborhood)
        ? prev.neighborhoods.filter(n => n !== neighborhood)
        : [...prev.neighborhoods, neighborhood]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(undefined);

    try {
      const response = await searchListings(filters);
      setListings(response.listings);
    } catch (err) {
      setError('Failed to fetch listings. Please try again.');
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-lg mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bedrooms */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Bedrooms
            </label>
            <select
              value={filters.minBedrooms}
              onChange={(e) => setFilters(prev => ({ ...prev, minBedrooms: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Any</option>
              <option value="studio">Studio</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4+</option>
            </select>
          </div>

          {/* Price Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maximum Price
            </label>
            <select
              value={filters.maxPrice}
              onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Any</option>
              <option value="2000">$2,000</option>
              <option value="3000">$3,000</option>
              <option value="4000">$4,000</option>
              <option value="5000">$5,000</option>
              <option value="7500">$7,500</option>
              <option value="10000">$10,000+</option>
            </select>
          </div>
        </div>

        {/* Neighborhoods */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Neighborhoods
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {NYC_NEIGHBORHOODS.map((neighborhood) => (
              <label key={neighborhood} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.neighborhoods.includes(neighborhood)}
                  onChange={() => handleNeighborhoodChange(neighborhood)}
                  className="rounded text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm">{neighborhood}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Amenities */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amenities
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {['Elevator', 'Doorman', 'Gym', 'Laundry', 'Dishwasher', 'Central AC'].map((amenity) => (
              <label key={amenity} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.amenities.includes(amenity)}
                  onChange={(e) => {
                    setFilters(prev => ({
                      ...prev,
                      amenities: e.target.checked
                        ? [...prev.amenities, amenity]
                        : prev.amenities.filter(a => a !== amenity)
                    }));
                  }}
                  className="rounded text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm">{amenity}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Pet Policy */}
        <div className="mt-6">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={filters.petFriendly}
              onChange={(e) => setFilters(prev => ({ ...prev, petFriendly: e.target.checked }))}
              className="rounded text-blue-500 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Pet Friendly</span>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="mt-6 w-full bg-blue-500 text-white py-3 px-6 rounded-lg hover:bg-blue-600 transition-colors"
          disabled={isLoading}
        >
          {isLoading ? 'Searching...' : 'Search Apartments'}
        </button>
      </form>

      {/* Search Results */}
      <SearchResults 
        listings={listings}
        isLoading={isLoading}
        error={error}
      />
    </div>
  );
} 