'use client';

import { Listing } from '../types/listings';
import ImageCarousel from './ImageCarousel';

interface ListingCardProps {
  listing: Listing;
}

export default function ListingCard({ listing }: ListingCardProps) {
  const details = listing.details;

  if (!details) {
    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
        <div className="h-48 bg-gray-200"></div>
        <div className="p-4">
          <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          <div className="mt-4 h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  const imageAnalyses = details.imageAnalysis || {};

  // Get kitchen photos for modernity score
  const kitchenAnalyses = Object.values(imageAnalyses).filter(analysis => 
    analysis?.roomType?.toLowerCase() === 'kitchen'
  );

  // Get top 4 photos by natural light score
  const sortedByLight = Object.values(imageAnalyses)
    .filter(analysis => 
      typeof analysis?.naturalLightScore === 'number' && 
      !isNaN(analysis.naturalLightScore)
    )
    .sort((a, b) => (b.naturalLightScore || 0) - (a.naturalLightScore || 0))
    .slice(0, 4);

  // Calculate modern score from kitchen photos - take the best score and add bonus points
  const modernScore = kitchenAnalyses.length > 0
    ? Math.min(10, Math.round(
        Math.max(
          ...kitchenAnalyses.map(analysis => 
            typeof analysis?.modernScore === 'number' && !isNaN(analysis.modernScore)
              ? analysis.modernScore 
              : 0
          )
        ) * 1.5 // Multiply the best score by 1.5
      ))
    : Math.min(10, Math.round(
        Math.max(
          ...Object.values(imageAnalyses).map(analysis => 
            typeof analysis?.modernScore === 'number' && !isNaN(analysis.modernScore)
              ? analysis.modernScore * 0.8 // Use 80% of the best non-kitchen score as fallback
              : 0
          )
        )
      ));

  // Calculate natural light score from top 4 photos - weight towards the best scores
  const naturalLightScore = sortedByLight.length > 0
    ? Math.min(10, Math.round(
        (sortedByLight.reduce((sum, analysis, index) => {
          const score = analysis.naturalLightScore || 0;
          const weight = [1.5, 1.2, 1, 1][index] || 1; // Weight best photos more heavily
          return sum + (score * weight);
        }, 0) / (sortedByLight.length * 1.2)) * 1.3 // Increase overall score by 30%
      ))
    : 0;

  const finalScores = {
    naturalLight: naturalLightScore,
    modern: modernScore
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {details.images && details.images.length > 0 && (
        <div className="relative">
          <ImageCarousel 
            images={details.images} 
            alt={details.address}
            imageAnalysis={imageAnalyses}
          />
        </div>
      )}
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-semibold text-gray-900">
            ${details.price.toLocaleString()}/month
          </h3>
          {details.noFee && (
            <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
              No Fee
            </span>
          )}
        </div>
        
        <p className="text-gray-600 text-sm mb-2">{details.address}</p>
        
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
          <span>{details.bedrooms} {details.bedrooms === 1 ? 'bed' : 'beds'}</span>
          <span>{details.bathrooms} {details.bathrooms === 1 ? 'bath' : 'baths'}</span>
          {details.sqft && <span>{details.sqft.toLocaleString()} sq ft</span>}
        </div>

        <div className="mb-3">
          <p className="text-sm text-gray-600">
            {details.neighborhood}, {details.borough}
          </p>
        </div>

        {Object.keys(imageAnalyses).length > 0 && (
          <div className="mb-3 flex gap-2">
            <div className="bg-gray-100 text-gray-800 text-sm px-3 py-1 rounded-full flex items-center gap-1">
              <span>☀️</span>
              <span>Natural Light: {finalScores.naturalLight}/10</span>
            </div>
            <div className="bg-gray-100 text-gray-800 text-sm px-3 py-1 rounded-full flex items-center gap-1">
              <span>✨</span>
              <span>Modern: {finalScores.modern}/10</span>
            </div>
          </div>
        )}

        {details.amenities && details.amenities.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-1">Amenities:</p>
            <div className="flex flex-wrap gap-1">
              {details.amenities.slice(0, 3).map((amenity: string, index: number) => (
                <span
                  key={index}
                  className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded"
                >
                  {amenity}
                </span>
              ))}
              {details.amenities.length > 3 && (
                <span className="text-gray-500 text-xs">
                  +{details.amenities.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        <div className="mt-4 flex justify-between items-center">
          <span className="text-sm text-gray-500">
            {details.daysOnMarket} days on market
          </span>
          <a
            href={listing.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600 text-sm font-medium"
          >
            View Details →
          </a>
        </div>
      </div>
    </div>
  );
} 