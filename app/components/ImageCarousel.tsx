'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

interface ImageCarouselProps {
  images: string[];
  alt: string;
  imageAnalysis?: { [key: string]: { roomType?: string } };
}

export default function ImageCarousel({ images, alt, imageAnalysis }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToNext = useCallback(() => {
    setCurrentIndex((prevIndex) => 
      prevIndex === images.length - 1 ? 0 : prevIndex + 1
    );
  }, [images.length]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  }, [images.length]);

  const goToIndex = (index: number) => {
    setCurrentIndex(index);
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrevious]);

  // Handle touch events
  useEffect(() => {
    let touchStartX = 0;
    const touchThreshold = 50;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndX = e.changedTouches[0].clientX;
      const deltaX = touchEndX - touchStartX;

      if (Math.abs(deltaX) > touchThreshold) {
        if (deltaX > 0) {
          goToPrevious();
        } else {
          goToNext();
        }
      }
    };

    const element = document.getElementById('carousel-container');
    if (element) {
      element.addEventListener('touchstart', handleTouchStart);
      element.addEventListener('touchend', handleTouchEnd);

      return () => {
        element.removeEventListener('touchstart', handleTouchStart);
        element.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [goToNext, goToPrevious]);

  return (
    <div 
      id="carousel-container"
      className="relative group"
      tabIndex={0}
      role="region"
      aria-label="Image carousel"
    >
      {/* Main Image */}
      <div className="relative w-full aspect-[4/3] overflow-hidden rounded-lg">
        <img
          src={images[currentIndex]}
          alt={`${alt} - Image ${currentIndex + 1}`}
          className="w-full h-full object-cover transition-transform duration-500"
        />
        
        {/* Room Type Banner */}
        {imageAnalysis?.[images[currentIndex]]?.roomType && (
          <div className="absolute bottom-2 left-2 bg-black/50 text-white px-3 py-1 text-sm rounded-full">
            {imageAnalysis[images[currentIndex]].roomType}
          </div>
        )}
        
        {/* Navigation Arrows */}
        <button
          onClick={goToPrevious}
          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Previous image"
        >
          <ChevronLeftIcon className="w-6 h-6" />
        </button>
        <button
          onClick={goToNext}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Next image"
        >
          <ChevronRightIcon className="w-6 h-6" />
        </button>

        {/* Image Counter */}
        <div 
          className="absolute bottom-2 right-2 bg-black/50 text-white px-3 py-1 rounded-full text-sm"
          role="status"
          aria-live="polite"
        >
          {currentIndex + 1} / {images.length}
        </div>
      </div>

      {/* Thumbnail Strip */}
      <div 
        className="flex gap-2 mt-2 overflow-x-auto pb-2"
        role="tablist"
        aria-label="Image thumbnails"
      >
        {images.map((image, index) => (
          <button
            key={image}
            onClick={() => goToIndex(index)}
            className={`relative flex-shrink-0 w-16 h-16 rounded-md overflow-hidden ${
              index === currentIndex ? 'ring-2 ring-blue-500' : ''
            }`}
            role="tab"
            aria-selected={index === currentIndex}
            aria-label={`Image ${index + 1}`}
          >
            <img
              src={image}
              alt={`Thumbnail ${index + 1}`}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
} 