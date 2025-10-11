'use client';

import React from 'react';

// Creator Card Skeleton
export const CreatorCardSkeleton: React.FC = () => (
  <div className="bg-gray-900 rounded-xl overflow-hidden animate-pulse">
    <div className="aspect-square bg-gray-700" />
    <div className="p-4">
      <div className="flex items-center space-x-2 mb-2">
        <div className="h-4 bg-gray-700 rounded w-24" />
        <div className="w-2 h-2 bg-gray-700 rounded-full" />
      </div>
      <div className="flex items-center space-x-4 mb-3">
        <div className="h-3 bg-gray-700 rounded w-12" />
        <div className="h-3 bg-gray-700 rounded w-8" />
      </div>
      <div className="flex space-x-1 mb-3">
        <div className="h-5 bg-gray-700 rounded-full w-16" />
        <div className="h-5 bg-gray-700 rounded-full w-20" />
      </div>
      <div className="h-10 bg-gray-700 rounded-lg" />
    </div>
  </div>
);

// Post Card Skeleton
export const PostCardSkeleton: React.FC = () => (
  <div className="bg-gray-900 rounded-xl p-6 animate-pulse">
    <div className="flex space-x-4">
      <div className="w-10 h-10 bg-gray-700 rounded-full" />
      <div className="flex-1">
        <div className="flex items-center space-x-2 mb-2">
          <div className="h-4 bg-gray-700 rounded w-20" />
          <div className="h-3 bg-gray-700 rounded w-16" />
          <div className="h-3 bg-gray-700 rounded w-12" />
        </div>
        <div className="space-y-2 mb-4">
          <div className="h-4 bg-gray-700 rounded w-full" />
          <div className="h-4 bg-gray-700 rounded w-3/4" />
          <div className="h-4 bg-gray-700 rounded w-1/2" />
        </div>
        <div className="flex space-x-1 mb-3">
          <div className="h-5 bg-gray-700 rounded-full w-16" />
          <div className="h-5 bg-gray-700 rounded-full w-20" />
        </div>
        <div className="flex items-center space-x-6">
          <div className="h-4 bg-gray-700 rounded w-8" />
          <div className="h-4 bg-gray-700 rounded w-12" />
          <div className="h-4 bg-gray-700 rounded w-10" />
        </div>
      </div>
    </div>
  </div>
);

// Feed Skeleton
export const FeedSkeleton: React.FC = () => (
  <div className="space-y-4">
    {/* Post Creation Skeleton */}
    <div className="bg-gray-900 rounded-xl p-6 animate-pulse">
      <div className="flex space-x-4">
        <div className="w-10 h-10 bg-gray-700 rounded-full" />
        <div className="flex-1">
          <div className="h-20 bg-gray-700 rounded-lg mb-4" />
          <div className="flex items-center justify-between">
            <div className="flex space-x-4">
              <div className="w-8 h-8 bg-gray-700 rounded" />
              <div className="w-8 h-8 bg-gray-700 rounded" />
              <div className="w-8 h-8 bg-gray-700 rounded" />
            </div>
            <div className="h-8 bg-gray-700 rounded-full w-16" />
          </div>
        </div>
      </div>
    </div>

    {/* Posts Skeleton */}
    {Array.from({ length: 3 }).map((_, index) => (
      <PostCardSkeleton key={index} />
    ))}
  </div>
);

// Creator Grid Skeleton
export const CreatorGridSkeleton: React.FC<{ count?: number }> = ({ count = 8 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
    {Array.from({ length: count }).map((_, index) => (
      <CreatorCardSkeleton key={index} />
    ))}
  </div>
);

// Profile Skeleton
export const ProfileSkeleton: React.FC = () => (
  <div className="bg-gray-900 rounded-xl p-6 animate-pulse">
    <div className="flex items-center space-x-4 mb-6">
      <div className="w-16 h-16 bg-gray-700 rounded-full" />
      <div className="flex-1">
        <div className="h-6 bg-gray-700 rounded w-32 mb-2" />
        <div className="h-4 bg-gray-700 rounded w-24" />
      </div>
    </div>
    <div className="space-y-3">
      <div className="h-4 bg-gray-700 rounded w-full" />
      <div className="h-4 bg-gray-700 rounded w-3/4" />
    </div>
  </div>
);

// Stats Skeleton
export const StatsSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    {Array.from({ length: 4 }).map((_, index) => (
      <div key={index} className="bg-gray-900 rounded-xl p-6 animate-pulse">
        <div className="h-8 bg-gray-700 rounded w-16 mb-2" />
        <div className="h-4 bg-gray-700 rounded w-20" />
      </div>
    ))}
  </div>
);

// Table Skeleton
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({ 
  rows = 5, 
  columns = 4 
}) => (
  <div className="bg-gray-900 rounded-xl overflow-hidden animate-pulse">
    <div className="p-6 border-b border-gray-800">
      <div className="h-6 bg-gray-700 rounded w-32" />
    </div>
    <div className="divide-y divide-gray-800">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="p-6 flex space-x-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={colIndex} className="h-4 bg-gray-700 rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  </div>
);

// Loading Spinner
export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className="flex items-center justify-center">
      <div className={`${sizeClasses[size]} animate-spin`}>
        <svg className="w-full h-full text-pink-600" fill="none" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    </div>
  );
};

// Loading Overlay
export const LoadingOverlay: React.FC<{ message?: string }> = ({ 
  message = 'Loading...' 
}) => (
  <div className="fixed inset-0 bg-gray-950 bg-opacity-75 flex items-center justify-center z-50">
    <div className="bg-gray-900 rounded-xl p-8 text-center">
      <LoadingSpinner size="lg" />
      <p className="text-white mt-4">{message}</p>
    </div>
  </div>
);

// Shimmer Effect
export const Shimmer: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 bg-[length:200%_100%] ${className}`} />
);
