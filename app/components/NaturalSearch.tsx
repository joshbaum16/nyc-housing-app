'use client';

import { useState } from 'react';
import { searchListings } from '../services/streeteasy';
import { Listing } from '../types/listings';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isSearching?: boolean;
}

interface NaturalSearchProps {
  onResults: (listings: Listing[]) => void;
}

export default function NaturalSearch({ onResults }: NaturalSearchProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm your NYC apartment search assistant. Tell me what you're looking for, and I'll help you find the perfect place. What area are you interested in, and what's your budget?"
    }
  ]);
  const [input, setInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (userMessage: string) => {
    try {
      setIsSearching(true);
      
      // Add user message to chat
      setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

      // Add typing indicator
      setMessages(prev => [...prev, { role: 'assistant', content: '...', isSearching: true }]);

      const response = await fetch('/api/process-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: userMessage,
          conversationHistory: messages.map(m => ({ role: m.role, content: m.content }))
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to process search query: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Remove typing indicator
      setMessages(prev => prev.filter(m => !m.isSearching));

      if (data.needsMoreInfo) {
        // Bot needs more information, add follow-up question
        setMessages(prev => [...prev, { role: 'assistant', content: data.followUpQuestion }]);
        setIsSearching(false);
        return;
      }

      const searchCriteria = {
        minBedrooms: data.minBeds || '0',
        maxBedrooms: data.maxBeds || '10',
        minBaths: data.minBaths || '1',
        minPrice: data.minPrice?.toString() || '0',
        maxPrice: data.maxPrice?.toString() || '10000',
        neighborhoods: data.areas ? data.areas.split(',') : [],
        amenities: data.additionalPreferences.mustHave || [],
        petFriendly: data.additionalPreferences.mustHave.includes('pet friendly'),
        noFee: data.noFee === 'true'
      };

      // Add searching message with specific areas
      const searchingMessage = `I'm searching for listings in ${
        searchCriteria.neighborhoods.length > 0 
          ? searchCriteria.neighborhoods
              .map((n: string) => n.split('-')
                .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' '))
              .join(', ')
          : 'all areas'
      } within your criteria...`;
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: searchingMessage
      }]);

      const results = await searchListings(searchCriteria);

      // Filter results based on additional preferences
      const filteredListings = results.listings.filter(listing => {
        if (!listing.details?.imageAnalysis) {
          return true;
        }

        const { additionalPreferences } = data;
        const imageAnalyses = listing.details.imageAnalysis;
        
        // Calculate aggregated scores
        const scores = Object.values(imageAnalyses).reduce((acc, analysis) => {
          // Sum both scores for averaging
          acc.naturalLightSum += analysis.naturalLightScore;
          acc.modernScoreSum += analysis.modernScore;
          acc.scoreCount++;
          return acc;
        }, {
          naturalLightSum: 0,
          modernScoreSum: 0,
          scoreCount: 0
        });

        const finalScores = scores.scoreCount > 0 ? {
          naturalLight: Math.round(scores.naturalLightSum / scores.scoreCount),
          modern: Math.round(scores.modernScoreSum / scores.scoreCount)
        } : {
          naturalLight: 0,
          modern: 0
        };
        
        let excluded = false;
        if (additionalPreferences.modernPreference && finalScores.modern < 7) {
          excluded = true;
        }
        if (additionalPreferences.naturalLightPreference && finalScores.naturalLight < 7) {
          excluded = true;
        }
        return !excluded;
      });

      // Create a more detailed results message
      let resultMessage = '';
      if (filteredListings.length > 0) {
        const priceRange = filteredListings.reduce((acc, listing) => {
          acc.min = Math.min(acc.min, listing.price);
          acc.max = Math.max(acc.max, listing.price);
          return acc;
        }, { min: Infinity, max: -Infinity });

        resultMessage = `I found ${filteredListings.length} apartments matching your criteria${
          filteredListings.length > 1 
            ? `, ranging from $${priceRange.min.toLocaleString()} to $${priceRange.max.toLocaleString()}`
            : ` at $${priceRange.min.toLocaleString()}`
        }. Let me know if you'd like to refine the search further or if you have any questions about specific listings!`;
      } else {
        resultMessage = "I couldn't find any apartments matching those exact criteria. Would you like to try with different neighborhoods or adjust your price range?";
      }

      setMessages(prev => [...prev, { role: 'assistant', content: resultMessage }]);
      onResults(filteredListings);

    } catch (error) {
      console.error('Search error:', error);
      setMessages(prev => [
        ...prev.filter(m => !m.isSearching),
        { role: 'assistant', content: 'Sorry, I encountered an error while searching. Please try again.' }
      ]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSearching) return;
    
    handleSearch(input);
    setInput('');
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 flex flex-col h-[600px]">
      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
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
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          className="flex-1 p-3 border rounded-lg"
          placeholder="Tell me what you're looking for..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isSearching}
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50"
          disabled={isSearching || !input.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
} 