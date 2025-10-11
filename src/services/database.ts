import { 
  Firestore, 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  getDocs, 
  onSnapshot, 
  addDoc, 
  increment,
  serverTimestamp,
  DocumentSnapshot,
  QuerySnapshot
} from 'firebase/firestore';
import { 
  User, 
  Creator, 
  Post, 
  Comment, 
  Profile, 
  CreatorFilters, 
  PostFilters, 
  PaginationParams,
  PaginatedResponse 
} from '../types';

export class DatabaseService {
  private db: Firestore;

  constructor(db: Firestore) {
    this.db = db;
  }

  // User Operations
  async createUser(userData: Partial<User>): Promise<void> {
    try {
      const userRef = doc(this.db, 'users', userData.uid!);
      const userDoc = {
        ...userData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(userRef, userDoc);
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  async getUser(uid: string): Promise<User | null> {
    try {
      const userRef = doc(this.db, 'users', uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        return { id: userSnap.id, ...userSnap.data() } as unknown as User;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw new Error('Failed to fetch user');
    }
  }

  async updateUser(uid: string, updates: Partial<User>): Promise<void> {
    try {
      const userRef = doc(this.db, 'users', uid);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error('Failed to update user');
    }
  }

  // Profile Operations
  async createProfile(profileData: Partial<Profile>): Promise<void> {
    try {
      const profileRef = doc(this.db, 'profiles', profileData.uid!);
      const profileDoc = {
        ...profileData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(profileRef, profileDoc);
    } catch (error) {
      console.error('Error creating profile:', error);
      throw new Error('Failed to create profile');
    }
  }

  async getProfile(uid: string): Promise<Profile | null> {
    try {
      const profileRef = doc(this.db, 'profiles', uid);
      const profileSnap = await getDoc(profileRef);
      
      if (profileSnap.exists()) {
        return { id: profileSnap.id, ...profileSnap.data() } as unknown as Profile;
      }
      return null;
    } catch (error) {
      console.error('Error fetching profile:', error);
      throw new Error('Failed to fetch profile');
    }
  }

  async updateProfile(uid: string, updates: Partial<Profile>): Promise<void> {
    try {
      const profileRef = doc(this.db, 'profiles', uid);
      await updateDoc(profileRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      throw new Error('Failed to update profile');
    }
  }

  // Creator Operations
  async getCreators(filters?: CreatorFilters): Promise<Creator[]> {
    try {
      let q = query(collection(this.db, 'profiles'), where('isCreator', '==', true));

      if (filters?.category) {
        q = query(q, where('categories', 'array-contains', filters.category));
      }

      if (filters?.verified !== undefined) {
        q = query(q, where('isVerified', '==', filters.verified));
      }

      if (filters?.rating) {
        q = query(q, where('rating', '>=', filters.rating));
      }

      q = query(q, orderBy('createdAt', 'desc'));

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as unknown as Creator[];
    } catch (error) {
      console.error('Error fetching creators:', error);
      throw new Error('Failed to fetch creators');
    }
  }

  async getCreatorsPaginated(
    pagination: PaginationParams,
    filters?: CreatorFilters
  ): Promise<PaginatedResponse<Creator>> {
    try {
      let q = query(collection(this.db, 'profiles'), where('isCreator', '==', true));

      if (filters?.category) {
        q = query(q, where('categories', 'array-contains', filters.category));
      }

      if (filters?.verified !== undefined) {
        q = query(q, where('isVerified', '==', filters.verified));
      }

      if (filters?.rating) {
        q = query(q, where('rating', '>=', filters.rating));
      }

      const sortField = pagination.sortBy || 'createdAt';
      const sortOrder = pagination.sortOrder || 'desc';
      q = query(q, orderBy(sortField, sortOrder));

      // Add pagination
      const startIndex = (pagination.page - 1) * pagination.limit;
      if (startIndex > 0) {
        // For now, we'll implement simple pagination
        // In production, you'd want to use startAfter with document snapshots
        q = query(q, limit(pagination.limit));
      } else {
        q = query(q, limit(pagination.limit));
      }

      const querySnapshot = await getDocs(q);
      const creators = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as unknown as Creator[];

      // Note: For accurate total count, you'd need a separate count query
      // This is a simplified implementation
      const total = creators.length; // This should be the actual total count

      return {
        data: creators,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages: Math.ceil(total / pagination.limit),
          hasNext: pagination.page * pagination.limit < total,
          hasPrev: pagination.page > 1,
        }
      };
    } catch (error) {
      console.error('Error fetching paginated creators:', error);
      throw new Error('Failed to fetch creators');
    }
  }

  // Post Operations
  async createPost(postData: Omit<Post, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const postsRef = collection(this.db, 'posts');
      const postDoc = {
        ...postData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const docRef = await addDoc(postsRef, postDoc);
      return docRef.id;
    } catch (error) {
      console.error('Error creating post:', error);
      throw new Error('Failed to create post');
    }
  }

  async getPosts(filters?: PostFilters): Promise<Post[]> {
    try {
      let q = query(collection(this.db, 'posts'));

      if (filters?.authorId) {
        q = query(q, where('authorId', '==', filters.authorId));
      }

      if (filters?.isPinned !== undefined) {
        q = query(q, where('isPinned', '==', filters.isPinned));
      }

      q = query(q, orderBy('timestamp', 'desc'));

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
    } catch (error) {
      console.error('Error fetching posts:', error);
      throw new Error('Failed to fetch posts');
    }
  }

  async likePost(postId: string): Promise<void> {
    try {
      const postRef = doc(this.db, 'posts', postId);
      await updateDoc(postRef, {
        likes: increment(1),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error liking post:', error);
      throw new Error('Failed to like post');
    }
  }

  async addComment(postId: string, comment: Omit<Comment, 'id' | 'timestamp'>): Promise<void> {
    try {
      const postRef = doc(this.db, 'posts', postId);
      const newComment: Comment = {
        ...comment,
        id: Date.now().toString(),
        timestamp: new Date(),
      };
      
      await updateDoc(postRef, {
        comments: increment(1),
        updatedAt: serverTimestamp(),
      });

      // Add comment to comments subcollection
      const commentsRef = collection(this.db, 'posts', postId, 'comments');
      await addDoc(commentsRef, newComment);
    } catch (error) {
      console.error('Error adding comment:', error);
      throw new Error('Failed to add comment');
    }
  }

  // Real-time listeners
  subscribeToCreators(
    callback: (creators: Creator[]) => void,
    filters?: CreatorFilters
  ): () => void {
    try {
      let q = query(collection(this.db, 'profiles'), where('isCreator', '==', true));

      if (filters?.category) {
        q = query(q, where('categories', 'array-contains', filters.category));
      }

      if (filters?.verified !== undefined) {
        q = query(q, where('isVerified', '==', filters.verified));
      }

      q = query(q, orderBy('createdAt', 'desc'));

      return onSnapshot(q, (snapshot: QuerySnapshot) => {
        const creators = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as unknown as Creator[];
        callback(creators);
      }, (error) => {
        console.error('Error in creators subscription:', error);
      });
    } catch (error) {
      console.error('Error setting up creators subscription:', error);
      return () => {};
    }
  }

  subscribeToPosts(
    callback: (posts: Post[]) => void,
    filters?: PostFilters
  ): () => void {
    try {
      let q = query(collection(this.db, 'posts'));

      if (filters?.authorId) {
        q = query(q, where('authorId', '==', filters.authorId));
      }

      if (filters?.isPinned !== undefined) {
        q = query(q, where('isPinned', '==', filters.isPinned));
      }

      q = query(q, orderBy('timestamp', 'desc'));

      return onSnapshot(q, (snapshot: QuerySnapshot) => {
        const posts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Post[];
        callback(posts);
      }, (error) => {
        console.error('Error in posts subscription:', error);
      });
    } catch (error) {
      console.error('Error setting up posts subscription:', error);
      return () => {};
    }
  }

  // Utility methods
  async deleteDocument(collection: string, docId: string): Promise<void> {
    try {
      const docRef = doc(this.db, collection, docId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`Error deleting document from ${collection}:`, error);
      throw new Error(`Failed to delete document from ${collection}`);
    }
  }

  async batchUpdate(updates: Array<{ collection: string; docId: string; data: any }>): Promise<void> {
    try {
      // Note: This is a simplified implementation
      // In production, you'd want to use Firestore's batch operations
      for (const update of updates) {
        const docRef = doc(this.db, update.collection, update.docId);
        await updateDoc(docRef, {
          ...update.data,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('Error in batch update:', error);
      throw new Error('Failed to perform batch update');
    }
  }
}
