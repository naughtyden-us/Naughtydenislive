'use client';

import React, { useState, useEffect } from 'react';
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, increment, where } from 'firebase/firestore';

interface CreatorStudioProps {
  onClose: () => void;
  user?: any;
  userProfile?: any;
  db?: any;
}

interface Post {
  id: string;
  content: string;
  author: string;
  authorHandle: string;
  authorImage: string;
  timestamp: any;
  likes: number;
  comments: number;
  reposts: number;
  location?: string;
  hashtags: string[];
  isPinned?: boolean;
  imageUrl?: string;
}

const CreatorStudio: React.FC<CreatorStudioProps> = ({ onClose, user, userProfile, db }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [feedTab, setFeedTab] = useState('foryou');
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostLocation, setNewPostLocation] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [creators, setCreators] = useState<any[]>([]);

  // Fetch posts from Firestore
  useEffect(() => {
    if (!db) {
      console.log('No database connection');
      return;
    }

    console.log('Setting up posts listener');
    const postsRef = collection(db, 'posts');
    const q = query(postsRef, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('Posts snapshot received:', snapshot.docs.length, 'posts');
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      console.log('Posts data:', postsData);
      setPosts(postsData);
    }, (error) => {
      console.error('Error fetching posts:', error);
    });

    return () => unsubscribe();
  }, [db]);

  // Fetch creators for For You section (same as main page)
  useEffect(() => {
    if (!db) return;

    const profilesRef = collection(db, 'profiles');
    const q = query(profilesRef, where('isCreator', '==', true));

    const unsubscribe = onSnapshot(q, (snapshot) => {
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
          // Additional fields for For You section
          photoURL: data.photoURL,
          views: data.views || Math.floor(Math.random() * 1000) + 100
        };
      });
      setCreators(creatorsData);
    });

    return () => unsubscribe();
  }, [db]);

  const handlePost = async () => {
    if (!newPostContent.trim() || !user || !userProfile || !db) return;

    setIsPosting(true);
    try {
      // Extract hashtags from content
      const hashtags = newPostContent.match(/#\w+/g) || [];
      
      const postData = {
        content: newPostContent,
        author: userProfile.displayName || 'Anonymous',
        authorHandle: `@${userProfile.displayName?.toLowerCase().replace(/\s+/g, '') || 'anonymous'}`,
        authorImage: userProfile.photoURL || 'https://placehold.co/100x100',
        timestamp: new Date(),
        likes: 0,
        comments: [],
        reposts: 0,
        location: newPostLocation || undefined,
        hashtags: hashtags,
        isPinned: false,
        userId: user.uid
      };

      console.log('Posting to Firestore:', postData);
      await addDoc(collection(db, 'posts'), postData);
      console.log('Post added successfully');
      setNewPostContent('');
      setNewPostLocation('');
    } catch (error) {
      console.error('Error posting:', error);
    } finally {
      setIsPosting(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!db) return;
    
    try {
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        likes: increment(1)
      });
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  // Add sample post for testing
  const addSamplePost = async () => {
    if (!user || !userProfile || !db) return;
    
    try {
      const postData = {
        content: "Just finished an amazing photoshoot! ✨ The lighting was absolutely perfect today. Can't wait to share the results with you all! What do you think of this behind-the-scenes shot? 💕 #photography #behindthescenes #newcontent",
        author: userProfile.displayName || 'Anonymous',
        authorHandle: `@${userProfile.displayName?.toLowerCase().replace(/\s+/g, '') || 'anonymous'}`,
        authorImage: userProfile.photoURL || 'https://placehold.co/100x100',
        timestamp: new Date(),
        likes: 2800,
        comments: 156,
        reposts: 89,
        location: 'Los Angeles, CA',
        hashtags: ['#photography', '#behindthescenes', '#newcontent'],
        isPinned: true,
        userId: user.uid
      };

      await addDoc(collection(db, 'posts'), postData);
      console.log('Sample post added');
    } catch (error) {
      console.error('Error adding sample post:', error);
    }
  };

  // Add sample creators for testing
  const addSampleCreators = async () => {
    if (!db) return;
    
    try {
      const sampleCreators = [
        {
          displayName: 'TaniaSaenz',
          email: 'tania@example.com',
          photoURL: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?q=80&w=400&auto=format&fit=crop',
          isCreator: true,
          bio: 'Professional model and content creator',
          categories: ['Soul Mate', 'Exclusive'],
          isVerified: true,
          rating: 4.8,
          views: 890,
          likes: 1250,
          price: 45,
          verificationStatus: 'verified'
        },
        {
          displayName: 'MoniqueMinx',
          email: 'monique@example.com',
          photoURL: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=400&auto=format&fit=crop',
          isCreator: true,
          bio: 'Creative photographer and model',
          categories: ['Soul Mate', 'Exclusive'],
          isVerified: true,
          rating: 4.8,
          views: 1123,
          likes: 980,
          price: 35,
          verificationStatus: 'verified'
        },
        {
          displayName: 'Emma Stone',
          email: 'emma@example.com',
          photoURL: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400&auto=format&fit=crop',
          isCreator: true,
          bio: 'Fashion model and influencer',
          categories: ['Girl', 'Hot Flirt'],
          isVerified: true,
          rating: 4.9,
          views: 2345,
          likes: 2100,
          price: 55,
          verificationStatus: 'verified'
        },
        {
          displayName: 'Jade Wilson',
          email: 'jade@example.com',
          photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop',
          isCreator: true,
          bio: 'Professional dancer and performer',
          categories: ['Mature', 'Certified'],
          isVerified: true,
          rating: 4.7,
          views: 1892,
          likes: 1450,
          price: 40,
          verificationStatus: 'verified'
        }
      ];

      for (const creator of sampleCreators) {
        await addDoc(collection(db, 'profiles'), creator);
      }
      console.log('Sample creators added');
    } catch (error) {
      console.error('Error adding sample creators:', error);
    }
  };

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'feed', label: 'Feed', icon: '❤️' },
    { id: 'foryou', label: 'For You', icon: '👥' },
    { id: 'content', label: 'Content', icon: '🖼️' },
    { id: 'aigenerate', label: 'AI Generate', icon: '✨' },
    { id: 'socialschedule', label: 'Social Schedule', icon: '📅' },
    { id: 'earnings', label: 'Earnings', icon: '💰' },
    { id: 'messages', label: 'Messages', icon: '💬' },
    { id: 'manager', label: 'Manager', icon: '👥' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  const recentActivities = [
    { type: 'purchase', user: 'John D.', action: 'purchased "Intimate White Top"', time: '2 hours ago', amount: '+$85', color: 'green' },
    { type: 'like', user: 'Sarah M.', action: 'liked "Seductive Black Lingerie"', time: '3 hours ago', color: 'red' },
    { type: 'message', user: 'Mike R.', action: 'sent a message', time: '5 hours ago', color: 'blue' },
    { type: 'purchase', user: 'Alex K.', action: 'purchased "Elegant Red Dress"', time: '1 day ago', amount: '+$75', color: 'green' },
    { type: 'follow', user: 'Emma L.', action: 'started following you', time: '1 day ago', color: 'purple' },
  ];

  const topContent = [
    { title: 'Seductive Black Lingerie', views: '4,200', likes: '1,156', earnings: '$3,990' },
    { title: 'Intimate White Top', views: '3,450', likes: '892', earnings: '$2,125' },
    { title: 'Sensual Dance Performance', views: '2,890', likes: '756', earnings: '$3,468' },
    { title: 'Elegant Red Dress', views: '2,890', likes: '634', earnings: '$2,167' },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'purchase': return '🛒';
      case 'like': return '❤️';
      case 'message': return '💬';
      case 'follow': return '👤';
      default: return '•';
    }
  };

  const getActivityColor = (color: string) => {
    switch (color) {
      case 'green': return 'bg-green-500';
      case 'red': return 'bg-red-500';
      case 'blue': return 'bg-blue-500';
      case 'purple': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="bg-gray-950 text-white min-h-screen font-sans flex">
      {/* Left Sidebar */}
      <div className="w-64 bg-gray-900 p-6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-white text-lg font-semibold">Creator Studio</h1>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>
        <p className="text-gray-400 text-sm mb-8">Manage your content & earnings.</p>

        {/* Navigation */}
        <nav className="flex-1 space-y-2">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                activeTab === item.id 
                  ? 'bg-pink-600 text-white' 
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Profile */}
        <div className="mt-auto flex items-center space-x-3">
          <div className="w-8 h-8 bg-pink-600 rounded-full flex items-center justify-center overflow-hidden">
            {userProfile?.photoURL ? (
              <img src={userProfile.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-sm font-semibold">
                {userProfile?.displayName?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            )}
          </div>
          <div>
            <p className="text-white text-sm font-medium">{userProfile?.displayName || 'User'}</p>
            <p className="text-gray-400 text-xs">@{userProfile?.displayName?.toLowerCase().replace(/\s+/g, '') || 'user'}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">
            {activeTab === 'feed' ? 'Feed' : 'Dashboard Overview'}
          </h2>
          <p className="text-gray-400">
            {activeTab === 'feed' 
              ? 'Share your creative journey with your audience' 
              : `Welcome back, ${userProfile?.displayName || 'Creator'}! Here's your performance summary.`
            }
          </p>
          <div className="flex justify-end">
            <span className="text-gray-400 text-sm">Last updated </span>
            <span className="text-pink-400 text-sm ml-1">Just now</span>
          </div>
        </div>

        {/* Feed Section */}
        {activeTab === 'feed' && (
          <div className="flex gap-6">
            {/* Main Feed Content */}
            <div className="flex-1 space-y-6">
              {/* Feed Tabs */}
              <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg w-fit">
                {[
                  { id: 'foryou', label: 'For You' },
                  { id: 'following', label: 'Following' },
                  { id: 'trending', label: 'Trending' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setFeedTab(tab.id)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      feedTab === tab.id
                        ? 'bg-pink-600 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Post Creation */}
              <div className="bg-gray-900 rounded-xl p-6">
                <div className="flex space-x-4">
                  <div className="w-10 h-10 bg-pink-600 rounded-full flex items-center justify-center overflow-hidden">
                    {userProfile?.photoURL ? (
                      <img src={userProfile.photoURL} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-sm font-semibold">
                        {userProfile?.displayName?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <textarea
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      placeholder="What's happening in your creative world?"
                      className="w-full bg-transparent text-white placeholder-gray-400 resize-none focus:outline-none text-lg"
                      rows={3}
                    />
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center space-x-4">
                        <button className="text-gray-400 hover:text-pink-400 transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </button>
                        <button className="text-gray-400 hover:text-pink-400 transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                        <button className="text-gray-400 hover:text-pink-400 transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m6-6a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                        <button className="text-gray-400 hover:text-pink-400 transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                      </div>
                      <button
                        onClick={handlePost}
                        disabled={!newPostContent.trim() || isPosting}
                        className="px-6 py-2 bg-pink-600 hover:bg-pink-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-full transition-colors"
                      >
                        {isPosting ? 'Posting...' : 'Post'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Posts Feed */}
              <div className="space-y-4">
                {posts.length === 0 && (
                  <div className="bg-gray-900 rounded-xl p-6 text-center">
                    <p className="text-gray-400 mb-4">No posts yet. Be the first to share something!</p>
                    <button
                      onClick={addSamplePost}
                      className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg transition-colors"
                    >
                      Add Sample Post
                    </button>
                  </div>
                )}
                {posts.map((post) => (
                  <div key={post.id} className="bg-gray-900 rounded-xl p-6">
                    <div className="flex space-x-4">
                      <div className="w-10 h-10 bg-pink-600 rounded-full flex items-center justify-center overflow-hidden">
                        {post.authorImage ? (
                          <img src={post.authorImage} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white text-sm font-semibold">
                            {post.author.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-semibold text-white">{post.author}</span>
                          <span className="text-gray-400">{post.authorHandle}</span>
                          {post.isPinned && (
                            <span className="bg-pink-600 text-white text-xs px-2 py-1 rounded-full">PINNED</span>
                          )}
                          <span className="text-gray-400 text-sm">
                            {post.timestamp?.toDate ? post.timestamp.toDate().toLocaleTimeString() : '1h'}
                          </span>
                        </div>
                        <p className="text-white mb-3">{post.content}</p>
                        {post.location && (
                          <p className="text-gray-400 text-sm mb-3">{post.location}</p>
                        )}
                        {post.hashtags && post.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {post.hashtags.map((hashtag: string, index: number) => (
                              <span key={index} className="text-pink-400 text-sm">#{hashtag.replace('#', '')}</span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center space-x-6 text-gray-400">
                          <button className="flex items-center space-x-2 hover:text-pink-400 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <span>{post.comments || 0}</span>
                          </button>
                          <button className="flex items-center space-x-2 hover:text-pink-400 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span>{post.reposts || 0}</span>
                          </button>
                          <button 
                            onClick={() => handleLike(post.id)}
                            className="flex items-center space-x-2 hover:text-pink-400 transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            <span>{post.likes || 0}</span>
                          </button>
                          <button className="flex items-center space-x-2 hover:text-pink-400 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="w-80 space-y-6">
              {/* Search */}
              <div className="bg-gray-900 rounded-xl p-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search creators..."
                    className="w-full bg-gray-800 text-white placeholder-gray-400 rounded-lg py-2 px-4 pl-10 focus:outline-none focus:ring-2 focus:ring-pink-600"
                  />
                  <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <button className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* What's happening */}
              <div className="bg-gray-900 rounded-xl p-4">
                <h3 className="text-white font-semibold mb-4">What's happening</h3>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-gray-400 text-sm">Trending in Photography</p>
                    <p className="text-white font-semibold">#NewContent</p>
                    <p className="text-gray-400 text-sm">12.5K posts</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-400 text-sm">Trending in Content Creation</p>
                    <p className="text-white font-semibold">#BehindTheScenes</p>
                    <p className="text-gray-400 text-sm">8.9K posts</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-400 text-sm">Trending in Partnerships</p>
                    <p className="text-white font-semibold">#Collaboration</p>
                    <p className="text-gray-400 text-sm">6.7K posts</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-400 text-sm">Trending in Lifestyle</p>
                    <p className="text-white font-semibold">#MorningMotivation</p>
                    <p className="text-gray-400 text-sm">5.4K posts</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-400 text-sm">Trending in Photography</p>
                    <p className="text-white font-semibold">#PhotoshootLife</p>
                    <p className="text-gray-400 text-sm">4.2K posts</p>
                  </div>
                </div>
              </div>

              {/* Who to follow */}
              <div className="bg-gray-900 rounded-xl p-4">
                <h3 className="text-white font-semibold mb-4">Who to follow</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-pink-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-semibold">E</span>
                      </div>
                      <div>
                        <p className="text-white font-semibold">Emma Stone</p>
                        <p className="text-gray-400 text-sm">@emmastone</p>
                        <p className="text-gray-400 text-xs">234.5K followers</p>
                      </div>
                    </div>
                    <button className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white text-sm font-semibold rounded-full transition-colors">
                      Follow
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-semibold">J</span>
                      </div>
                      <div>
                        <p className="text-white font-semibold">Jade Wilson</p>
                        <p className="text-gray-400 text-sm">@jadewilson</p>
                        <p className="text-gray-400 text-xs">89.2K followers</p>
                      </div>
                    </div>
                    <button className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white text-sm font-semibold rounded-full transition-colors">
                      Follow
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* For You Section */}
        {activeTab === 'foryou' && (
          <div className="flex gap-6">
            {/* Category Sidebar */}
            <div className="w-64 bg-gray-800 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-6">Categories</h3>
              <div className="space-y-2">
                {['All', 'Exclusive', 'Certified', 'Girl', 'Hot Flirt', 'Soul Mate', 'Mature', 'New Models', 'Fetish', 'Transgirl', 'Lesbian', 'Couple'].map((category) => (
                  <button
                    key={category}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      category === 'Exclusive' 
                        ? 'bg-red-600 text-white' 
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
              
              <div className="mt-8">
                <div className="flex items-center space-x-2 mb-4">
                  <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  <h4 className="text-white font-semibold">Show Type</h4>
                </div>
                <div className="space-y-2">
                  <button className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium bg-red-600 text-white">
                    All
                  </button>
                  <button className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white">
                    Free Chat
                  </button>
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">Live Content Creators</h2>
                  <p className="text-gray-400">Discover the most popular creators in premium content.</p>
                </div>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search creators..."
                    className="bg-gray-800 text-white placeholder-gray-400 rounded-lg py-2 px-4 pl-10 focus:outline-none focus:ring-2 focus:ring-pink-600"
                  />
                  <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div className="flex space-x-2">
                  <button className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </button>
                  <button className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>


              {/* Creators Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {creators.map((creator) => (
                <div key={creator.id} className="bg-gray-900 rounded-xl overflow-hidden hover:bg-gray-800 transition-colors">
                  <div className="relative">
                      <div className="aspect-square bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                        {creator.image || creator.photoURL ? (
                          <img 
                            src={creator.image || creator.photoURL} 
                            alt={creator.displayName} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-white text-4xl font-bold">
                            {creator.displayName?.charAt(0)?.toUpperCase() || 'C'}
                          </span>
                        )}
                      </div>
                    <div className="absolute top-2 left-2">
                      <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                        LIVE
                      </span>
                    </div>
                    <div className="absolute top-2 right-2">
                      <button className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-semibold">
                        Private Chat
                      </button>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-semibold text-white">{creator.displayName || 'Creator'}</h3>
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-400 mb-3">
                          <div className="flex items-center space-x-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span>{creator.views || Math.floor(Math.random() * 1000) + 100}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                            <span>{creator.rating || 4.8}</span>
                          </div>
                        </div>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {creator.categories && creator.categories.length > 0 ? (
                        creator.categories.slice(0, 2).map((category: string, index: number) => (
                          <span key={index} className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">
                            {category}
                          </span>
                        ))
                      ) : (
                        <>
                          <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">Soul Mate</span>
                          <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">Exclusive</span>
                        </>
                      )}
                    </div>
                    <button className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-semibold py-2 rounded-lg transition-colors">
                      Start Private Chat
                    </button>
                  </div>
                </div>
              ))}
            </div>

              {creators.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-400 mb-4">No creators found. Check back later!</p>
                  <button
                    onClick={addSampleCreators}
                    className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg transition-colors"
                  >
                    Add Sample Creators
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dashboard Content */}
        {activeTab !== 'feed' && activeTab !== 'foryou' && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Earnings */}
          <div className="bg-gray-900 rounded-xl p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-gray-400 text-sm font-medium">Total Earnings</h3>
                <p className="text-2xl font-bold text-white">$15,420.5</p>
                <p className="text-green-400 text-sm flex items-center">
                  <span className="mr-1">↗</span>
                  +12.5% this month
                </p>
              </div>
              <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
                <span className="text-green-500 text-2xl">💰</span>
              </div>
            </div>
          </div>

          {/* Monthly Earnings */}
          <div className="bg-gray-900 rounded-xl p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-gray-400 text-sm font-medium">Monthly Earnings</h3>
                <p className="text-2xl font-bold text-white">$3,240.75</p>
                <p className="text-gray-400 text-sm flex items-center">
                  <span className="mr-1">📅</span>
                  This month
                </p>
              </div>
              <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
                <span className="text-blue-500 text-2xl">📈</span>
              </div>
            </div>
          </div>

          {/* Total Views */}
          <div className="bg-gray-900 rounded-xl p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-gray-400 text-sm font-medium">Total Views</h3>
                <p className="text-2xl font-bold text-white">125,400</p>
                <p className="text-gray-400 text-sm flex items-center">
                  <span className="mr-1">🕐</span>
                  All time
                </p>
              </div>
              <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
                <span className="text-purple-500 text-2xl">👁️</span>
              </div>
            </div>
          </div>

          {/* Followers */}
          <div className="bg-gray-900 rounded-xl p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-gray-400 text-sm font-medium">Followers</h3>
                <p className="text-2xl font-bold text-white">2,340</p>
                <p className="text-gray-400 text-sm flex items-center">
                  <span className="mr-1">👤</span>
                  +45 this week
                </p>
              </div>
              <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
                <span className="text-pink-500 text-2xl">👥</span>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Content Library */}
          <div className="bg-gray-900 rounded-xl p-6">
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-lg">🖼️</span>
              <h3 className="text-white font-semibold">Content Library</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Photos</span>
                <span className="text-white">89</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Videos</span>
                <span className="text-white">12</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total Likes</span>
                <span className="text-white">8,950</span>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="bg-gray-900 rounded-xl p-6">
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-lg">💬</span>
              <h3 className="text-white font-semibold">Messages</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Unread</span>
                <span className="text-white">156</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Response Rate</span>
                <span className="text-green-400">98%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Avg Response</span>
                <span className="text-white">2 min</span>
              </div>
            </div>
          </div>

          {/* Performance */}
          <div className="bg-gray-900 rounded-xl p-6">
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-lg">⭐</span>
              <h3 className="text-white font-semibold">Performance</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Rating</span>
                <span className="text-white">4.9/5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Conversion</span>
                <span className="text-green-400">15.2%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Repeat Buyers</span>
                <span className="text-white">67%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="bg-gray-900 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${getActivityColor(activity.color)}`}></div>
                  <div className="flex-1">
                    <p className="text-white text-sm">
                      <span className="font-medium">{activity.user}</span> {activity.action}
                    </p>
                    <p className="text-gray-400 text-xs">{activity.time}</p>
                  </div>
                  {activity.amount && (
                    <span className="text-green-400 text-sm font-medium">{activity.amount}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Top Performing Content */}
          <div className="bg-gray-900 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4">Top Performing Content</h3>
            <div className="space-y-4">
              {topContent.map((content, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{content.title}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-400">
                      <span className="flex items-center">
                        <span className="mr-1">👁️</span>
                        {content.views}
                      </span>
                      <span className="flex items-center">
                        <span className="mr-1">❤️</span>
                        {content.likes}
                      </span>
                    </div>
                  </div>
                  <span className="text-green-400 text-sm font-medium">{content.earnings} earned</span>
                </div>
              ))}
            </div>
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CreatorStudio;
