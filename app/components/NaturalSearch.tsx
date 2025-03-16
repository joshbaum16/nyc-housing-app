'use client';

import { useState } from 'react';
import { searchListings } from '../services/streeteasy';
import { sortListingsByRelevance } from '../services/embeddings';
import { Listing } from '../types/listings';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isSearching?: boolean;
}

interface Props {
  onResults: (listings: Listing[]) => void;
  onQueryDescription?: (description: string) => void;
}

type SortOption = 'none' | 'price-asc' | 'price-desc' | 'relevance';

export default function NaturalSearch({ onResults, onQueryDescription }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm your NYC apartment search assistant. Tell me what you're looking for, and I'll help you find the perfect place. What area are you interested in, and what's your budget?"
    }
  ]);
  const [input, setInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [currentQueryDescription, setCurrentQueryDescription] = useState<string>();
  const [searchCriteria, setSearchCriteria] = useState({
    minBedrooms: '0',
    maxBedrooms: '10',
    minBaths: '1',
    minPrice: '0',
    maxPrice: '10000',
    neighborhoods: [],
    amenities: [],
    petFriendly: false,
    noFee: false
  });

  const handleSearch = async () => {
    if (!input.trim()) return;

    setMessages([...messages, { role: 'user', content: input }]);
    setInput('');

    try {
      const response = await fetch('/api/process-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: input,
          conversationHistory: messages.map(m => ({ role: m.role, content: m.content })),
          criteria: searchCriteria
        }),
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      
      if (data.needsMoreInfo) {
        setMessages([
          ...messages,
          { role: 'user', content: input },
          { role: 'assistant', content: data.followUpQuestion }
        ]);
        return;
      }

      // Convert the processed preferences back to search criteria
      const updatedCriteria = {
        ...searchCriteria,
        minBedrooms: data.minBeds || searchCriteria.minBedrooms,
        maxBedrooms: data.maxBeds || searchCriteria.maxBedrooms,
        minBaths: data.minBaths || searchCriteria.minBaths,
        minPrice: data.minPrice || searchCriteria.minPrice,
        maxPrice: data.maxPrice || searchCriteria.maxPrice,
        neighborhoods: data.areas ? data.areas.split(',') : searchCriteria.neighborhoods,
        amenities: data.additionalPreferences?.mustHave || searchCriteria.amenities,
        petFriendly: data.additionalPreferences?.mustHave?.includes('pet friendly') || searchCriteria.petFriendly,
        noFee: data.noFee === 'true'
      };
      setSearchCriteria(updatedCriteria);

      // Search for listings with the updated criteria
      const listingsResponse = await fetch('/api/listings/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCriteria),
      });

      if (!listingsResponse.ok) {
        throw new Error('Failed to fetch listings');
      }

      const listingsData = await listingsResponse.json();
      const { listings } = listingsData;

      // Update query description for relevance sorting
      if (data.queryDescription) {
        setCurrentQueryDescription(data.queryDescription);
        if (onQueryDescription) {
          onQueryDescription(data.queryDescription);
        }
      }
      onResults(listings);

      setMessages([
        ...messages,
        { role: 'user', content: input },
        { role: 'assistant', content: `I found ${listings.length} listings that match your criteria.` }
      ]);
    } catch (error) {
      console.error('Search error:', error);
      setMessages([
        ...messages,
        { role: 'user', content: input },
        { role: 'assistant', content: 'Sorry, there was an error processing your search.' }
      ]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSearching) return;
    
    handleSearch();
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col h-[600px] bg-white rounded-lg shadow-sm">
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {message.isSearching ? (
                <div className="flex space-x-2 items-center">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                </div>
              ) : (
                message.content
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input form */}
      <div className="p-4 border-t">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            className="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Tell me what you're looking for..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isSearching}
          />
          <button
            type="submit"
            className="bg-blue-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors"
            disabled={isSearching || !input.trim()}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
} 