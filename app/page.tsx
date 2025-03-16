'use client';

import { useState, useEffect } from 'react';
import NaturalSearch from './components/NaturalSearch';
import ListingCard from './components/ListingCard';
import { Listing } from './types/listings';
import { sortListingsByRelevance } from './services/embeddings';

type SortOption = 'none' | 'price-asc' | 'price-desc' | 'relevance';

export default function Home() {
  const [searchResults, setSearchResults] = useState<Listing[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [isClearing, setIsClearing] = useState(false);
  const [currentQueryDescription, setCurrentQueryDescription] = useState<string>();
  const [sortedListings, setSortedListings] = useState<Listing[]>([]);

  const clearCache = async () => {
    setIsClearing(true);
    try {
      await fetch('/api/clear-cache', { method: 'POST' });
      setSearchResults([]);
      setSortedListings([]);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    } finally {
      setIsClearing(false);
    }
  };

  const handleSearchResults = async (listings: Listing[]) => {
    setSearchResults(listings);
  };

  const handleQueryDescription = (description: string) => {
    setCurrentQueryDescription(description);
  };

  // Update sorted results whenever search results or sort option changes
  useEffect(() => {
    const updateSortedResults = async () => {
      const results = [...searchResults];
      
      switch (sortBy) {
        case 'price-asc':
          setSortedListings([...results].sort((a, b) => a.price - b.price));
          break;
        case 'price-desc':
          setSortedListings([...results].sort((a, b) => b.price - a.price));
          break;
        case 'relevance':
          if (currentQueryDescription) {
            console.log('Sorting by relevance with query:', currentQueryDescription);
            try {
              const relevanceSorted = await sortListingsByRelevance(results, currentQueryDescription);
              setSortedListings(relevanceSorted);
            } catch (error) {
              console.error('Error sorting by relevance:', error);
              setSortedListings(results);
            }
          } else {
            console.log('No query description available for relevance sorting');
            setSortedListings(results);
          }
          break;
        default:
          setSortedListings(results);
      }
    };

    updateSortedResults();
  }, [searchResults, sortBy, currentQueryDescription]);

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
          <NaturalSearch 
            onResults={handleSearchResults} 
            onQueryDescription={handleQueryDescription}
          />
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
                  <option value="relevance">Relevance</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="none">Default</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedListings.map((listing: Listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
} 