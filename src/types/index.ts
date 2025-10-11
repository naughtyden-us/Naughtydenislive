// Centralized type definitions for the application

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  isCreator: boolean;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Creator extends User {
  bio?: string;
  categories?: string[];
  price?: number;
  rating?: number;
  likes?: number;
  views?: number;
  verificationStatus?: 'pending' | 'verified' | 'failed';
  isProfileComplete?: boolean;
  handle?: string;
  // Additional fields for compatibility
  name?: string;
  image?: string;
  isAd?: boolean;
  type?: string;
}

export interface Post {
  id: string;
  authorId: string;
  author: string;
  authorHandle: string;
  authorImage: string;
  content: string;
  mediaUrls: string[];
  hashtags: string[];
  likes: number;
  comments: Comment[];
  reposts: number;
  isPinned: boolean;
  location?: string;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Comment {
  id: string;
  userId: string;
  user: string;
  text: string;
  timestamp: Date;
  likes: number;
}

export interface Profile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  isCreator: boolean;
  bio?: string;
  categories?: string[];
  isProfileComplete: boolean;
  isVerified?: boolean;
  verificationStatus?: 'pending' | 'verified' | 'failed';
  price?: number;
  rating?: number;
  likes?: number;
  views?: number;
  handle?: string;
}

// Filter interfaces
export interface CreatorFilters {
  category?: string;
  verified?: boolean;
  priceRange?: [number, number];
  rating?: number;
  search?: string;
}

export interface PostFilters {
  authorId?: string;
  hashtags?: string[];
  dateRange?: [Date, Date];
  isPinned?: boolean;
}

// API Response interfaces
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

// Upload interfaces
export interface UploadProgress {
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  url?: string;
  error?: string;
}

// App State interfaces
export interface AppState {
  user: User | null;
  userProfile: Creator | null;
  creators: Creator[];
  posts: Post[];
  loading: boolean;
  error: string | null;
}

// Component Props interfaces
export interface CreatorCardProps {
  creator: Creator;
  onViewProfile: (creator: Creator) => void;
  onLike: (creatorId: string) => void;
}

export interface PostCardProps {
  post: Post;
  onLike: (postId: string) => void;
  onComment: (postId: string, comment: string) => void;
  onRepost: (postId: string) => void;
}

// Form interfaces
export interface SignUpData {
  email: string;
  password: string;
  displayName: string;
  isCreator: boolean;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface ProfileUpdateData {
  displayName?: string;
  bio?: string;
  categories?: string[];
  photoURL?: string;
  price?: number;
}

// Error interfaces
export interface AppError {
  code: string;
  message: string;
  details?: any;
}

// Loading states
export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

// Pagination
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
