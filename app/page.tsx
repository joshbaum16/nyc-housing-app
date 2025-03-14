'use client';

import { useState } from 'react';
import NaturalSearch from './components/NaturalSearch';
import ListingCard from './components/ListingCard';
import { Listing } from './types/listings';

type SortOption = 'none' | 'price-asc' | 'price-desc';

export default function Home() {
  const [searchResults, setSearchResults] = useState<Listing[]>([]);
  const [isClearing, setIsClearing] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('none');

  const clearCache = async () => {
    try {
      setIsClearing(true);
      const response = await fetch('/api/clear-cache', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to clear cache');
      }

      // Clear the current search results
      setSearchResults([]);
      alert('Cache cleared successfully');
    } catch (error) {
      console.error('Error clearing cache:', error);
      alert('Failed to clear cache');
    } finally {
      setIsClearing(false);
    }
  };

  const sortedResults = [...searchResults].sort((a, b) => {
    if (sortBy === 'price-asc') {
      return a.price - b.price;
    } else if (sortBy === 'price-desc') {
      return b.price - a.price;
    }
    return 0;
  });

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">NYC Housing Search</h1>
          <button
            onClick={clearCache}
            disabled={isClearing}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 disabled:opacity-50"
          >
            {isClearing ? 'Clearing...' : 'Clear Cache'}
          </button>
        </div>
        
        {/* Natural Language Search */}
        <div className="mb-12">
          <NaturalSearch onResults={setSearchResults} />
        </div>

        {/* Results */}
        {searchResults.length > 0 ? (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">
                {searchResults.length} Results Found
              </h2>
              <div className="flex items-center gap-2">
                <label htmlFor="sort" className="text-sm text-gray-600">
                  Sort by:
                </label>
                <select
                  id="sort"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="border rounded-lg px-3 py-2 text-sm bg-white"
                >
                  <option value="none">Default</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedResults.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center text-gray-500">
            Describe your ideal apartment above and we'll find the best matches!
          </div>
        )}
      </div>
    </main>
  );
} 