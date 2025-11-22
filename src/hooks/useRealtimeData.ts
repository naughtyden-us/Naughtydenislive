import { useState, useEffect, useCallback } from 'react';
import { Firestore, Query, onSnapshot, QuerySnapshot } from 'firebase/firestore';
import { Creator, Post } from '../types';

interface UseRealtimeDataOptions {
  enabled?: boolean;
  onError?: (error: Error) => void;
}

export const useRealtimeData = <T>(
  db: Firestore | null,
  query: Query | null,
  options: UseRealtimeDataOptions = {}
) => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { enabled = true, onError } = options;

  useEffect(() => {
    if (!db || !query || !enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      query,
      (snapshot: QuerySnapshot) => {
        const docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as T[];
        setData(docs);
        setLoading(false);
      },
      (err) => {
        const error = new Error(`Database error: ${err.message}`);
        setError(error);
        setLoading(false);
        onError?.(error);
      }
    );

    return () => unsubscribe();
  }, [db, query, enabled, onError]);

  const refetch = useCallback(() => {
    setLoading(true);
    setError(null);
  }, []);

  return { data, loading, error, refetch };
};

export const useCreators = (
  db: Firestore | null,
  filters?: {
    category?: string;
    verified?: boolean;
    search?: string;
  }
) => {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Import Firestore functions dynamically to avoid SSR issues
    import('firebase/firestore').then(({ collection, query, where, orderBy, onSnapshot }) => {
      let q = query(collection(db, 'profiles'), where('isCreator', '==', true));

      if (filters?.category) {
        q = query(q, where('categories', 'array-contains', filters.category));
      }

      if (filters?.verified !== undefined) {
        q = query(q, where('isVerified', '==', filters.verified));
      }

      q = query(q, orderBy('createdAt', 'desc'));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const creatorsData = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.displayName || 'Unknown Creator',
              displayName: data.displayName || 'Unknown Creator',
              image: data.photoURL || 'https://images.unsplash.com/photo-1630280717628-7d0d071cf2e3?q=80&w=400&auto=format&fit=crop',
              likes: data.likes || 0,
              rating: data.rating || 4.5,
              price: data.price || 30,
              isAd: false,
              type: 'Subscription',
              isVerified: data.isVerified || false,
              verificationStatus: data.verificationStatus || 'pending',
              bio: data.bio || '',
              categories: data.categories || [],
              email: data.email || '',
              uid: data.uid || doc.id,
              photoURL: data.photoURL,
              views: data.views || Math.floor(Math.random() * 1000) + 100
            };
          }) as unknown as Creator[];

          // Apply search filter if provided
          let filteredCreators = creatorsData;
          if (filters?.search) {
            filteredCreators = creatorsData.filter(creator =>
              creator.displayName.toLowerCase().includes(filters.search!.toLowerCase()) ||
              (creator.bio && creator.bio.toLowerCase().includes(filters.search!.toLowerCase()))
            );
          }

          setCreators(filteredCreators);
          setLoading(false);
        },
        (err) => {
          setError(new Error(`Failed to fetch creators: ${err.message}`));
          setLoading(false);
        }
      );

      return () => unsubscribe();
    });
  }, [db, filters?.category, filters?.verified, filters?.search]);

  return { creators, loading, error };
};

export const usePosts = (
  db: Firestore | null,
  filters?: {
    authorId?: string;
    isPinned?: boolean;
  }
) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    import('firebase/firestore').then(({ collection, query, where, orderBy, onSnapshot }) => {
      let q = query(collection(db, 'posts'));

      if (filters?.authorId) {
        q = query(q, where('authorId', '==', filters.authorId));
      }

      if (filters?.isPinned !== undefined) {
        q = query(q, where('isPinned', '==', filters.isPinned));
      }

      q = query(q, orderBy('timestamp', 'desc'));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const postsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Post[];
          setPosts(postsData);
          setLoading(false);
        },
        (err) => {
          setError(new Error(`Failed to fetch posts: ${err.message}`));
          setLoading(false);
        }
      );

      return () => unsubscribe();
    });
  }, [db, filters?.authorId, filters?.isPinned]);

  return { posts, loading, error };
};

export const usePagination = <T>(
  data: T[],
  pageSize: number = 20
) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setTotalPages(Math.ceil(data.length / pageSize));
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [data.length, pageSize, currentPage, totalPages]);

  const paginatedData = data.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  }, [currentPage, totalPages]);

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage]);

  return {
    currentPage,
    totalPages,
    paginatedData,
    goToPage,
    nextPage,
    prevPage,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
  };
};
