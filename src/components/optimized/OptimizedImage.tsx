/**
 * Optimized Image Component
 *
 * Provides advanced image optimization with:
 * - Next.js Image optimization
 * - WebP/AVIF format support
 * - Lazy loading with intersection observer
 * - Progressive loading with blur placeholder
 * - Error handling and fallbacks
 * - Performance monitoring
 */

'use client';

import Image from 'next/image';
import React, { useState, useRef, useEffect } from 'react';

import { usePerformanceMonitor } from '@/lib/performance-monitor';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  fallbackSrc?: string;
  sizes?: string;
  fill?: boolean;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  objectPosition?: string;
  onLoad?: () => void;
  onError?: () => void;
  lazy?: boolean;
  threshold?: number;
  rootMargin?: string;
}

/**
 * Generate blur placeholder data URL
 */
function generateBlurDataURL(width: number = 10, height: number = 10): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return '';
  }

  // Create gradient blur effect
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#f3f4f6');
  gradient.addColorStop(0.5, '#e5e7eb');
  gradient.addColorStop(1, '#d1d5db');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  return canvas.toDataURL();
}

/**
 * Optimized Image Component
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  quality = 85,
  placeholder = 'blur',
  blurDataURL,
  fallbackSrc,
  sizes,
  fill = false,
  objectFit = 'cover',
  objectPosition = 'center',
  onLoad,
  onError,
  lazy = true,
  threshold = 0.1,
  rootMargin = '50px',
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isVisible, setIsVisible] = useState(!lazy || priority);
  const [currentSrc, setCurrentSrc] = useState(src);
  const imageRef = useRef<HTMLDivElement>(null);
  const { recordRender } = usePerformanceMonitor('OptimizedImage');

  // Generate blur placeholder if not provided
  const defaultBlurDataURL = blurDataURL || generateBlurDataURL(width, height);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || priority || isVisible) {
      return;
    }

    const element = imageRef.current;
    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        const entry = entries[0];
        if (entry && entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(element);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [lazy, priority, isVisible, threshold, rootMargin]);

  // Handle image load
  const handleLoad = () => {
    setIsLoaded(true);
    recordRender();
    onLoad?.();
  };

  // Handle image error
  const handleError = () => {
    setHasError(true);
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      setHasError(false);
    } else {
      onError?.();
    }
  };

  // Helper function to determine image sizes
  function getImageSizes(): string {
    if (sizes) {
      return sizes;
    }
    if (fill) {
      return '100vw';
    }
    if (width) {
      return `${width}px`;
    }
    return '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw';
  }

  // Determine sizes if not provided
  const imageSizes = getImageSizes();

  return (
    <div
      ref={imageRef}
      className={`relative overflow-hidden ${className}`}
      style={fill ? undefined : { width, height }}
    >
      {isVisible ? (
        <>
          {!hasError ? (
            <Image
              src={currentSrc}
              alt={alt}
              {...(!fill && width && { width })}
              {...(!fill && height && { height })}
              fill={fill}
              sizes={imageSizes}
              quality={quality}
              priority={priority}
              placeholder={placeholder}
              {...(placeholder === 'blur' &&
                defaultBlurDataURL && { blurDataURL: defaultBlurDataURL })}
              className={`transition-opacity duration-300 ${
                isLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              style={{
                objectFit: fill ? objectFit : undefined,
                objectPosition: fill ? objectPosition : undefined,
              }}
              onLoad={handleLoad}
              onError={handleError}
            />
          ) : (
            // Error fallback
            <div
              className="flex items-center justify-center bg-gray-200 text-gray-500"
              style={fill ? { width: '100%', height: '100%' } : { width, height }}
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}

          {/* Loading overlay */}
          {!isLoaded && !hasError && (
            <div
              className="absolute inset-0 bg-gray-200 animate-pulse"
              style={{
                backgroundImage: placeholder === 'blur' ? `url(${defaultBlurDataURL})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
          )}
        </>
      ) : (
        // Placeholder while not visible
        <div
          className="bg-gray-200 animate-pulse"
          style={fill ? { width: '100%', height: '100%' } : { width, height }}
        />
      )}
    </div>
  );
};

/**
 * Avatar Image Component (optimized for profile pictures)
 */
export const OptimizedAvatar: React.FC<{
  src?: string;
  alt: string;
  size?: number;
  className?: string;
  fallbackInitials?: string;
}> = ({ src, alt, size = 40, className = '', fallbackInitials }) => {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-300 text-gray-600 font-medium rounded-full ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {fallbackInitials || alt.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-full ${className}`}
      quality={90}
      priority={size > 100} // Prioritize larger avatars
      onError={() => setHasError(true)}
    />
  );
};

/**
 * Hero Image Component (optimized for large banner images)
 */
export const OptimizedHeroImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
  overlay?: boolean;
  overlayOpacity?: number;
}> = ({ src, alt, className = '', overlay = false, overlayOpacity = 0.4 }) => {
  return (
    <div className={`relative ${className}`}>
      <OptimizedImage
        src={src}
        alt={alt}
        fill
        priority
        quality={95}
        sizes="100vw"
        objectFit="cover"
        objectPosition="center"
      />
      {overlay && <div className="absolute inset-0 bg-black" style={{ opacity: overlayOpacity }} />}
    </div>
  );
};

/**
 * Gallery Image Component (optimized for image galleries)
 */
export const OptimizedGalleryImage: React.FC<{
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  onClick?: () => void;
}> = ({ src, alt, width, height, className = '', onClick }) => {
  return (
    <div
      className={`cursor-pointer transition-transform hover:scale-105 ${className}`}
      onClick={onClick}
    >
      <OptimizedImage
        src={src}
        alt={alt}
        width={width}
        height={height}
        quality={80}
        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
        className="rounded-lg shadow-md"
      />
    </div>
  );
};

export default OptimizedImage;
