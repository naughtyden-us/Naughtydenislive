'use client';

import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, onAuthStateChanged, signOut, User, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, signInAnonymously, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, orderBy, onSnapshot, addDoc, increment } from 'firebase/firestore';
// Firebase storage removed - now using Cloudinary
// Updated imports for Firestore functionality
import VeriffKYC from './components/VeriffKYC';
import InlineVeriffKYC from './components/InlineVeriffKYC';
import CreatorStudio from './components/CreatorStudio';
import ProfilePictureUpload from './components/ProfilePictureUpload';
import VideoContentUpload from './components/VideoContentUpload';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { logger } from '../utils/logger';

// Remove inlined Tailwind CSS import and custom font injection
const AppCSS = () => null;

// Type definitions
interface Creator {
    likes: number;
    id: number;
    name: string;
    rating: number;
    price: number;
    isAd: boolean;
    image: string;
    type: string;
    isVerified?: boolean;
    verificationStatus?: 'pending' | 'verified' | 'failed';
}

interface Profile {
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
}

interface Post {
    id: number;
    creatorName: string;
    creatorImage: string;
    content: string;
    likes: number;
    comments: Array<{ user: string; text: string }>;
}

// Initial data
const initialPosts: Post[] = [
    {
        id: 1,
        creatorName: 'Jon Ly',
        creatorImage: 'https://images.unsplash.com/photo-1630280717628-7d0d071cf2e3?q=80&w=1160&auto=format&fit=crop',
        content: "Live from the studio! Working on some new looks for my next project. What do you think?",
        likes: 58,
        comments: [
            { user: 'User1', text: 'This is amazing! ❤️' },
            { user: 'User2', text: 'Love the creativity!' },
        ],
    },
    {
        id: 2,
        creatorName: 'Seth Doyle',
        creatorImage: 'https://images.unsplash.com/photo-1630520707335-9e4e79b731c3?q=80&w=1160&auto=format&fit=crop',
        content: "Behind the scenes of my latest photoshoot! It was a blast. Thanks to everyone who tuned in!",
        likes: 120,
        comments: [
            { user: 'User3', text: 'You are so talented!' },
            { user: 'User4', text: 'When is the next live session?' },
        ],
    },
    {
        id: 3,
        creatorName: 'Maria Rodriguez',
        creatorImage: 'https://images.unsplash.com/photo-1728463087178-a8c804a5eec2?q=80&w=1160&auto=format&fit=crop',
        content: "New day, new adventure! Excited to capture some stunning landscapes today. Wish me luck!",
        likes: 87,
        comments: [
            { user: 'User5', text: "Can't wait to see the photos!" },
            { user: 'User6', text: 'Love your work!' },
        ],
    },
];

const initialCreators: Creator[] = [
    {
        id: 1,
        name: 'Jon Ly',
        rating: 4.8,
        price: 34.50,
        isAd: false,
        image: 'https://images.unsplash.com/photo-1630280717628-7d0d071cf2e3?q=80&w=1160&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        type: 'Subscription',
        likes: 124,
        isVerified: true,
        verificationStatus: 'verified',
    },
    {
        id: 2,
        name: 'Seth Doyle',
        rating: 4.6,
        price: 32.00,
        isAd: true,
        image: 'https://images.unsplash.com/photo-1630520707335-9e4e79b731c3?q=80&w=1160&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        type: 'Subscription',
        likes: 210,
        isVerified: true,
        verificationStatus: 'verified',
    },
    {
        id: 3,
        name: 'Riyaan Khan',
        rating: 4.9,
        price: 35.50,
        isAd: false,
        image: 'https://images.unsplash.com/photo-1550428083-7019ebe39b45?q=80&w=1102&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        type: 'Subscription',
        likes: 315,
        isVerified: false,
        verificationStatus: 'pending',
    },
    {
        id: 4,
        name: 'Maria Rodriguez',
        rating: 4.7,
        price: 32.50,
        isAd: false,
        image: 'https://images.unsplash.com/photo-1728463087178-a8c804a5eec2?q=80&w=1160&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        type: 'Subscription',
        likes: 98,
        isVerified: true,
        verificationStatus: 'verified',
    },
    {
        id: 5,
        name: 'Sofia Mykyte',
        rating: 4.7,
        price: 37.00,
        isAd: true,
        image: 'https://images.unsplash.com/photo-1673379421016-b84b1dc410ca?q=80&w=1092&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        type: 'Subscription',
        likes: 156,
        isVerified: false,
        verificationStatus: 'failed',
    },
    {
        id: 6,
        name: 'Hao Leong',
        rating: 4.8,
        price: 38.00,
        isAd: false,
        image: 'https://images.unsplash.com/photo-1584996433468-6e702c8fc9d9?q=80&w=1160&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        type: 'Subscription',
        likes: 421,
        isVerified: true,
        verificationStatus: 'verified',
    },
    {
        id: 7,
        name: 'Jordan Travers',
        rating: 4.5,
        price: 30.00,
        isAd: false,
        image: 'https://images.unsplash.com/photo-1676328012648-ee16da2e08d8?q=80&w=1233&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        type: 'Subscription',
        likes: 85,
        isVerified: false,
        verificationStatus: 'pending',
    },
    {
        id: 8,
        name: 'Jordan Travers',
        rating: 4.5,
        price: 30.00,
        isAd: false,
        image: 'https://images.unsplash.com/photo-1676328012648-ee16da2e08d8?q=80&w=1233&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        type: 'Subscription',
        likes: 150,
        isVerified: true,
        verificationStatus: 'verified',
    },
];

// Components from separate files, combined here
const CreatorCard: React.FC<{ creator: Creator; onViewProfile: (creator: Creator) => void; onLike: (creatorId: number) => void }> = ({ creator, onViewProfile, onLike }) => {
    const [isAnimating, setIsAnimating] = useState(false);

    const handleLikeClick = () => {
        onLike(creator.id);
        setIsAnimating(true);
    };

    return (
        <div
            onClick={() => onViewProfile(creator)}
            className="relative overflow-hidden rounded-xl shadow-lg transform transition-transform duration-300 hover:scale-105 cursor-pointer h-[400px] w-full flex flex-col"
        >
            <div className="aspect-square overflow-hidden">
                <img src={creator.image} alt={creator.name} width={400} height={400} className="w-full h-full object-cover" />
            </div>
            <div className="absolute top-2 right-2 flex space-x-2">
                {creator.isAd && (
                    <span className="text-xs font-semibold bg-pink-600 text-white px-2 py-1 rounded-full uppercase">Ad</span>
                )}
                {creator.isVerified && (
                    <span className="text-xs font-semibold bg-green-600 text-white px-2 py-1 rounded-full uppercase flex items-center space-x-1">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Verified</span>
                    </span>
                )}
                {creator.verificationStatus === 'pending' && (
                    <span className="text-xs font-semibold bg-yellow-600 text-white px-2 py-1 rounded-full uppercase">Pending</span>
                )}
                {creator.verificationStatus === 'failed' && (
                    <span className="text-xs font-semibold bg-red-600 text-white px-2 py-1 rounded-full uppercase">Unverified</span>
                )}
            </div>
            <div className="p-4 bg-gray-900 text-white flex-1 flex flex-col">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold">{creator.name}</h3>
                    <div className="flex items-center space-x-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); handleLikeClick(); }}>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className={`w-6 h-6 text-pink-500 transition-transform ${isAnimating ? 'animate-pulse-glow' : ''}`}
                            onAnimationEnd={() => setIsAnimating(false)}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.936 0-3.694 1.353-4.321 3.235-.916-1.882-2.685-3.235-4.621-3.235C4.599 3.75 2.5 5.765 2.5 8.25c0 3.867 3.93 7.825 8.762 11.233a.5.5 0 00.5.158c.49 0 4.838-3.958 8.762-11.233z" />
                        </svg>
                        <span className="text-sm">{creator.likes}</span>
                    </div>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-400 mb-2">
                    <span>{creator.type}</span>
                    <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9.049 2.927c.3-.921 1.63-0.921 1.932 0l1.258 3.864a1 1 0 00.95.691h4.072c.969 0 1.371 1.243.588 1.81l-3.297 2.388a1 1 0 00-.364 1.118l1.258 3.864c.3.921-.755 1.688-1.54 1.118l-3.297-2.388a1 1 0 00-1.176 0l-3.297 2.388c-.784.57-1.84-.197-1.54-1.118l1.258-3.864a1 1 0 00-.364-1.118L2.091 9.29c-.783-.567-.381-1.81.588-1.81h4.072a1 1 0 00.95-.691l1.258-3.864z" />
                        </svg>
                        <span>{creator.rating}</span>
                    </div>
                </div>
                <div className="flex justify-between items-center text-sm font-bold text-white mb-4">
                    <span>${creator.price}</span>
                    <span className="text-gray-400">/hour</span>
                </div>
                <div className="flex space-x-2 mt-auto">
                    <button className="flex-1 py-2 rounded-lg border border-pink-600 text-pink-600 hover:bg-pink-600 hover:text-white transition-colors">
                        Chat
                    </button>
                </div>
            </div>
        </div>
    );
};

const LivePosts = ({ onClose, user, db }: { onClose: () => void; user: User | null; db: any }) => {
    const [posts, setPosts] = useState<any[]>([]);
    const [newPostContent, setNewPostContent] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState('');
    const [isPosting, setIsPosting] = useState(false);

    // Fetch posts from Firestore
    useEffect(() => {
        if (!db) {
            console.log('LivePosts: No database connection');
            return;
        }

        console.log('LivePosts: Setting up posts listener');
        const postsRef = collection(db, 'posts');
        const q = query(postsRef, orderBy('timestamp', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            console.log('LivePosts: Posts snapshot received:', snapshot.docs.length, 'posts');
            const postsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            console.log('LivePosts: Posts data:', postsData);
            setPosts(postsData);
        }, (error) => {
            console.error('LivePosts: Error fetching posts:', error);
        });

        return () => unsubscribe();
    }, [db]);

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

    const handleComment = (postId: number, commentText: string) => {
        if (!user) return;
        setPosts(posts.map(post =>
            post.id === postId ? {
                ...post,
                comments: [...post.comments, { user: user.displayName || 'Anonymous', text: commentText }]
            } : post
        ));
    };

    const handleNewPost = async () => {
        if (!user || !newPostContent.trim() || !db) return;

        setIsPosting(true);
        try {
            // Extract hashtags from content
            const hashtags = newPostContent.match(/#\w+/g) || [];
            
            const postData = {
                content: newPostContent,
                author: user.displayName || 'Anonymous',
                authorHandle: `@${user.displayName?.toLowerCase().replace(/\s+/g, '') || 'anonymous'}`,
                authorImage: user.photoURL || 'https://placehold.co/100x100',
                timestamp: new Date(),
                likes: 0,
                comments: [],
                reposts: 0,
                hashtags: hashtags,
                isPinned: false,
                userId: user.uid
            };

            console.log('LivePosts: Posting to Firestore:', postData);
            await addDoc(collection(db, 'posts'), postData);
            console.log('LivePosts: Post added successfully');
            setNewPostContent('');
        } catch (error) {
            console.error('LivePosts: Error posting:', error);
        } finally {
            setIsPosting(false);
        }
    };

    const generatePostIdea = async () => {
        setIsGenerating(true);
        setError('');
        const prompt = "Generate a short, engaging, and creative social media post idea for a creator on a platform that shares photos. The tone should be flirty, playful, and confident, and the post should be under 200 characters.";
        const apiKey = "";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
        };

        let attempts = 0;
        const maxAttempts = 3;
        let success = false;
        let generatedText = '';

        while (attempts < maxAttempts && !success) {
            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const result = await response.json();
                const candidate = result.candidates?.[0];
                if (candidate && candidate.content?.parts?.[0]?.text) {
                    generatedText = candidate.content.parts[0].text;
                    success = true;
                } else {
                    throw new Error('No generated text in response');
                }
            } catch (error) {
                attempts++;
                if (attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
                } else {
                    console.error("Failed to generate post idea after multiple attempts:", error);
                    setError("Failed to generate post idea. Please try again.");
                }
            }
        }

        if (success) {
            setNewPostContent(generatedText);
        }
        setIsGenerating(false);
    };

    return (
        <div className="bg-gray-950 text-white min-h-screen font-sans">
            <div className="p-6 md:p-12">
                <div className="flex justify-between items-center mb-6 md:mb-12 relative">
                    <button onClick={onClose} className="py-2 px-4 rounded-lg border border-pink-600 text-pink-600 hover:bg-pink-600 hover:text-white transition-colors">
                        Back
                    </button>
                    <div className="flex flex-col items-center absolute left-1/2 transform -translate-x-1/2">
                        <img src="/logo.png" alt="Naughty Den Logo" width={80} height={32} className="w-auto h-8 md:h-10" />
                        <h1 className="text-3xl font-bold mt-2 text-pink-600">Naughty Talks</h1>
                    </div>
                </div>

                {/* New Post Form */}
                {user && (
                    <div className="max-w-3xl mx-auto bg-gray-900 p-6 rounded-xl shadow-lg mb-8">
                        <h2 className="text-xl font-semibold mb-4">Create a New Post</h2>
                        <textarea
                            value={newPostContent}
                            onChange={(e) => setNewPostContent(e.target.value)}
                            className="w-full h-24 p-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-pink-600 resize-none"
                            placeholder="Share your latest update or photos..."
                        />
                        {error && <p className="text-red-500 text-center text-sm">{error}</p>}
                        <div className="flex justify-between items-center mt-4 space-x-2">
                            <button
                                onClick={handleNewPost}
                                disabled={!newPostContent.trim() || isPosting}
                                className="py-2 px-6 rounded-lg bg-pink-600 hover:bg-pink-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex-grow font-bold"
                            >
                                {isPosting ? 'Posting...' : 'Post'}
                            </button>
                            <button
                                onClick={generatePostIdea}
                                disabled={isGenerating}
                                className="py-2 px-6 rounded-lg border border-pink-600 text-pink-600 hover:bg-pink-600 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-grow-0 flex items-center justify-center space-x-2"
                            >
                                {isGenerating ? (
                                    <svg className="animate-spin h-5 w-5 text-pink-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : (
                                    <>
                                        <span className="text-pink-600">✨</span>
                                        <span className="hidden md:inline">Generate Post Idea</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Live Posts */}
                <div className="max-w-3xl mx-auto space-y-8">
                    {posts.map(post => (
                        <div key={post.id} className="bg-gray-900 p-6 rounded-xl shadow-lg">
                            <div className="flex items-center space-x-4 mb-4">
                                <img
                                    src={post.authorImage || 'https://placehold.co/100x100'}
                                    alt={post.author}
                                    width={48}
                                    height={48}
                                    className="w-12 h-12 rounded-full object-cover border-2 border-pink-600"
                                />
                                <div>
                                    <p className="font-semibold">{post.author}</p>
                                    <p className="text-sm text-gray-400">{post.authorHandle}</p>
                                    <p className="text-xs text-gray-500">
                                        {post.timestamp?.toDate ? post.timestamp.toDate().toLocaleString() : 'Just now'}
                                    </p>
                                </div>
                            </div>
                            <p className="text-gray-300 mb-4">{post.content}</p>
                            {post.hashtags && post.hashtags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {post.hashtags.map((hashtag: string, index: number) => (
                                        <span key={index} className="text-pink-400 text-sm">#{hashtag.replace('#', '')}</span>
                                    ))}
                                </div>
                            )}
                            <div className="flex items-center space-x-4 text-gray-400">
                                <button
                                    onClick={() => handleLike(post.id)}
                                    className="flex items-center space-x-1 hover:text-pink-500 transition-colors"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="currentColor"
                                        viewBox="0 0 24 24"
                                        strokeWidth={1.5}
                                        stroke="currentColor"
                                        className="w-5 h-5"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.936 0-3.694 1.353-4.321 3.235-.916-1.882-2.685-3.235-4.621-3.235C4.599 3.75 2.5 5.765 2.5 8.25c0 3.867 3.93 7.825 8.762 11.233a.5.5 0 00.5.158c.49 0 4.838-3.958 8.762-11.233z" />
                                    </svg>
                                    <span>{post.likes || 0}</span>
                                </button>
                                <span className="text-sm">{post.comments?.length || 0} Comments</span>
                                <span className="text-sm">{post.reposts || 0} Reposts</span>
                            </div>
                            {/* Comments Section */}
                            <div className="mt-4 border-t border-gray-800 pt-4 space-y-2">
                                {post.comments?.map((comment: any, index: number) => (
                                    <div key={index} className="bg-gray-800 p-3 rounded-lg text-sm">
                                        <span className="font-semibold text-white">{comment.user}:</span> <span className="text-gray-300">{comment.text}</span>
                                    </div>
                                ))}
                                {user && (
                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            const form = e.target as HTMLFormElement;
                                            const commentInput = form.elements.namedItem('comment') as HTMLInputElement;
                                            handleComment(post.id, commentInput.value);
                                            commentInput.value = '';
                                        }}
                                        className="flex items-center space-x-2 mt-4"
                                    >
                                        <input
                                            type="text"
                                            name="comment"
                                            placeholder="Add a comment..."
                                            className="flex-1 p-2 rounded-lg bg-gray-700 text-white border-none focus:outline-none focus:ring-2 focus:ring-pink-600"
                                        />
                                        <button type="submit" className="py-2 px-4 rounded-lg bg-pink-600 hover:bg-pink-700 transition-colors text-sm">
                                            Post
                                        </button>
                                    </form>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const EnlargedImageViewer = ({ imageUrl, onClose }: { imageUrl: string; onClose: () => void }) => (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-[101] flex justify-center items-center p-4">
        <div className="relative">
            <button
                onClick={onClose}
                className="absolute top-2 right-2 p-2 rounded-full bg-gray-800 text-gray-400 hover:text-white transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            <img src={imageUrl} alt="Enlarged" className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg" />
        </div>
    </div>
);

const CreatorProfile = ({ creator, onClose }: { creator: Creator; onClose: () => void }) => {
    const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

    return (
        <div className="fixed inset-0 bg-gray-950 text-white overflow-y-auto z-[100]">
            {/* Background Image and Header */}
            <div className="relative h-64 md:h-96">
                <img
                    src={creator.image}
                    alt={`${creator.name}'s banner`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    className="blur-sm brightness-50"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent"></div>
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full bg-gray-800 text-gray-400 hover:text-white transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="relative -mt-24 md:-mt-32 px-4 md:px-12">
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Main Content Area */}
                    <div className="flex-1 space-y-8">
                        {/* Profile Header Card */}
                        <div className="bg-gray-900 rounded-xl p-6 shadow-lg flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-pink-600">
                                    <img src={creator.image} alt={creator.name} width={64} height={64} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <div className="flex items-center space-x-2">
                                        <h2 className="text-2xl font-bold">{creator.name}</h2>
                                        <span className="text-pink-500">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                                                <path fillRule="evenodd" d="M8.614 1.24c.23.01.438.163.518.375a4.011 4.011 0 0 1 5.756 0c.08-.212.288-.365.518-.375a4.122 4.122 0 0 1 .472 0c2.812.083 5.093 2.59 5.093 5.483V16.5c0 3.016-2.614 5.5-5.625 5.5s-5.625-2.484-5.625-5.5V6.723A5.44 5.44 0 0 0 8.614 1.24Zm6.561 2.9c-.313-.85-.889-1.547-1.616-2.081a2.622 2.622 0 0 0-3.328 0c-.727.534-1.303 1.23-1.616 2.081A4.011 4.011 0 0 1 12 3.5a4.011 4.011 0 0 1 3.175.64Z" clipRule="evenodd" />
                                            </svg>
                                        </span>
                                    </div>
                                    <p className="text-gray-400 text-sm">@{creator.name.toLowerCase().replace(' ', '_')}</p>
                                    <p className="text-green-400 text-sm mt-1">Available now</p>
                                </div>
                            </div>
                            <div className="flex space-x-2">
                                <button className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.385a.75.75 0 0 1 .15-1.048l3.12-2.34a.75.75 0 0 1 1.04-.15l3.12 2.34a.75.75 0 0 1-.15 1.048l-3.12 2.34a.75.75 0 0 1-1.04.15l-3.12-2.34z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12 20.25a.75.75 0 0 0 0-1.5.75.75 0 0 0 0 1.5z" />
                                    </svg>
                                </button>
                                <button className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.936 0-3.694 1.353-4.321 3.235-.916-1.882-2.685-3.235-4.621-3.235C4.599 3.75 2.5 5.765 2.5 8.25c0 3.867 3.93 7.825 8.762 11.233a.5.5 0 00.5.158c.49 0 4.838-3.958 8.762-11.233z" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* About Card */}
                        <div className="bg-gray-900 rounded-xl p-6 shadow-lg space-y-4">
                            <h3 className="font-semibold text-lg">Hola! I&apos;m {creator.name}, 22yo - Currently taking boyfriend applications 😉</h3>
                            <div className="border-t border-gray-700 pt-4 space-y-2">
                                <p className="text-gray-400">A few details abt myself:</p>
                                <p className="text-gray-300">
                                    I&apos;m 5&apos;2 ft, 32 D. I&apos;m passionate about scuba diving, snowboarding, and capturing life&apos;s beautiful moments through my lens.
                                </p>
                                <a href="#" className="text-pink-600 font-bold hover:underline flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                    </svg>
                                    More info
                                </a>
                            </div>
                        </div>

                        {/* Recent Photos Card */}
                        <div className="bg-gray-900 rounded-xl p-6 shadow-lg space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold text-lg">Recent Photos</h3>
                                <span className="text-pink-600 text-sm">4 <span className="text-gray-400">new</span> &middot; 4 total</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {/* Dynamically render recent photos */}
                                {[...Array(4)].map((_, index) => (
                                    <div key={index} className="relative rounded-lg overflow-hidden cursor-pointer aspect-square" onClick={() => setEnlargedImage(creator.image)}>
                                        <img src={creator.image} alt="Recent photo" width={200} height={200} className="w-full h-full object-cover" />
                                        <span className="absolute top-2 left-2 text-xs font-semibold bg-pink-600 text-white px-2 py-1 rounded-full uppercase">New</span>
                                        <span className="absolute bottom-2 left-2 text-sm font-bold text-white px-1 py-0.5 rounded-full">#{index + 1}</span>
                                    </div>
                                ))}
                            </div>
                            <button className="w-full py-3 rounded-lg border border-pink-600 text-pink-600 hover:bg-pink-600 hover:text-white transition-colors">
                                View All Photos (100)
                            </button>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="w-full md:w-80 space-y-8">
                        {/* Subscription Card */}
                        <div className="bg-gray-900 rounded-xl p-6 shadow-lg space-y-4">
                            <h3 className="font-semibold text-lg">SUBSCRIPTION</h3>
                            <div className="relative p-3 rounded-lg bg-pink-700 text-white font-bold text-center">
                                Limited offer -70% off for 31 days!
                            </div>
                            <div className="flex items-center space-x-3">
                                <img src={creator.image} alt={creator.name} width={40} height={40} className="w-10 h-10 rounded-full object-cover" />
                                <p className="text-gray-300 text-sm">Hey, baby! I&apos;m treating you to 70% Off&mdash;don&apos;t miss out! Hit that button to SUB, and let&apos;s turn up the heat to-</p>
                            </div>
                            <a href="#" className="text-gray-400 hover:underline text-sm">Read more</a>
                            <button className="w-full py-3 rounded-lg bg-pink-600 hover:bg-pink-700 transition-colors font-bold text-lg">
                                SUBSCRIBE &middot; ${creator.price} for 31 days
                            </button>
                            <p className="text-center text-gray-500 text-xs">Regular price: $10 /month</p>
                            <div className="text-center text-gray-600 text-xs flex justify-around">
                                <a href="#" className="hover:underline">Privacy</a>
                                <a href="#" className="hover:underline">Cookie Notice</a>
                                <a href="#" className="hover:underline">Terms of Service</a>
                            </div>
                        </div>

                        {/* Quick Actions Card */}
                        <div className="bg-gray-900 rounded-xl p-6 shadow-lg space-y-3">
                            <h3 className="font-semibold text-lg">Quick Actions</h3>
                            <button className="w-full py-3 rounded-lg bg-pink-600 hover:bg-pink-700 transition-colors flex items-center justify-center space-x-2">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.636 1.006 3.064 2.378 3.518A3.011 3.011 0 0 0 7.5 17.25H9.75c1.125 0 2.16-.584 2.722-1.518L15 12.75M12 21.75c-2.485 0-4.5-2.015-4.5-4.5H4.5c-2.485 0-4.5-2.015-4.5-4.5S2.015 7.5 4.5 7.5h3C9.75 7.5 11.25 8.75 11.25 10.5V12M18 12.76a4.5 4.5 0 0 1-9 0" />
                                </svg>
                                <span>Chat Live</span>
                            </button>
                            <button className="w-full py-3 rounded-lg bg-purple-600 hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21.75c-4.142 0-7.5-3.358-7.5-7.5S7.858 6.75 12 6.75s7.5 3.358 7.5 7.5-3.358 7.5-7.5 7.5zM12 9.75v3l-2.25 2.25" />
                                </svg>
                                <span>Send Gift</span>
                            </button>
                            <button className="w-full py-3 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-700 transition-colors flex items-center justify-center space-x-2">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21.75c-4.142 0-7.5-3.358-7.5-7.5S7.858 6.75 12 6.75s7.5 3.358 7.5 7.5-3.358 7.5-7.5 7.5zM12 9.75v3l-2.25 2.25" />
                                </svg>
                                <span>Leave Tip</span>
                            </button>
                            <button className="w-full py-3 rounded-lg border border-gray-600 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors flex items-center justify-center space-x-2">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 0 1 .75.75v3.75h3.75a.75.75 0 0 1 0 1.5h-3.75v3.75a.75.75 0 0 1-1.5 0v-3.75h-3.75a.75.75 0 0 1 0-1.5h3.75V7.5a.75.75 0 0 1 .75-.75z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21.75a9.75 9.75 0 1 1 0-19.5 9.75 9.75 0 0 1 0 19.5z" />
                                </svg>
                                <span>Follow</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            {enlargedImage && (
                <EnlargedImageViewer imageUrl={enlargedImage} onClose={() => setEnlargedImage(null)} />
            )}
        </div>
    );
};

// KYC Verification page component, with a simulated verification flow
const VerifyKYCPage = ({ onClose }: { onClose: () => void }) => {
    const [status, setStatus] = useState('pending'); // 'pending', 'success', 'failed'

    useEffect(() => {
        const timer = setTimeout(() => {
            setStatus('success'); // Simulate success after a delay
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white p-4">
            <div className="text-center p-8 bg-gray-900 rounded-lg shadow-xl max-w-sm w-full">
                <h1 className="text-3xl font-bold mb-4">KYC Verification</h1>
                <div className="mb-6">
                    {status === 'pending' && (
                        <>
                            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-pink-500 mx-auto mb-4"></div>
                            <p className="text-gray-300">Verification in progress...</p>
                        </>
                    )}
                    {status === 'success' && (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-500 mx-auto mb-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <p className="text-green-400 font-semibold text-xl">Verification Successful!</p>
                            <p className="text-gray-400 text-sm mt-2">You are now a verified creator.</p>
                        </>
                    )}
                    {status === 'failed' && (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500 mx-auto mb-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <p className="text-red-400 font-semibold text-xl">Verification Failed</p>
                            <p className="text-gray-400 text-sm mt-2">Please try again later.</p>
                        </>
                    )}
                </div>
                <button
                    onClick={onClose}
                    className="mt-8 px-6 py-3 rounded-lg border border-pink-600 text-pink-600 hover:bg-pink-600 hover:text-white transition-colors"
                >
                    Back to Profile
                </button>
            </div>
        </div>
    );
};


interface EditProfileModalProps {
    profile: Profile;
    onClose: () => void;
    onSave: (updatedProfile: Partial<Profile>) => void;
    isCreator: boolean;
    db: any;
    user: User | null;
}

const EditProfileModal = ({ profile, onClose, onSave, isCreator, db, user }: EditProfileModalProps) => {
    const [displayName, setDisplayName] = useState(profile.displayName);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [bio, setBio] = useState(profile.bio || '');
    const [categories, setCategories] = useState(profile.categories || []);
    const [uploading, setUploading] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const allCategories = [
        'Popular / Trending',
        'New Releases',
        'Amateur',
        'Professional Studio',
        'Solo Performances',
        'Couples',
        'Group',
        'Live Streams',
        'Virtual Reality (VR)',
        'Romantic',
        'Hardcore',
        'Roleplay / Fantasy',
        'Fetish / Kink',
        'Softcore / Artistic',
        'Straight',
        'LGBTQ+',
        'Men-focused',
        'Women-focused',
        'Mixed',
        'Short Clips',
        'Full-Length Videos',
        'Premium Only',
        'Free Content'
    ];

    const handleCategoryChange = (category: string) => {
        setCategories(prevCategories =>
            prevCategories.includes(category)
                ? prevCategories.filter(c => c !== category)
                : [...prevCategories, category]
        );
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
        }
    };

    const handleSave = async () => {
        setUploading(true);
        setSaveError(null);
        try {
            let photoURL = profile.photoURL;
            if (selectedFile) {
                try {
                    // Use Cloudinary for image upload
                    const formData = new FormData();
                    formData.append('file', selectedFile);
                    formData.append('folder', `profiles/${profile.uid}`);
                    formData.append('upload_preset', 'unsigned');
                    
                    const response = await fetch(`https://api.cloudinary.com/v1_1/dudlaktup/image/upload`, {
                        method: 'POST',
                        body: formData,
                    });
                    
                    const result = await response.json();
                    if (result.secure_url) {
                        photoURL = result.secure_url;
                    } else {
                        throw new Error(result.error?.message || 'Upload failed');
                    }
                } catch (error) {
                    console.error("Error uploading file:", error);
                    setSaveError("Upload failed. Please try a smaller image or check your connection.");
                    return;
                }
            }
            await onSave({ displayName, photoURL, bio, categories, isProfileComplete: true });
            onClose();
        } catch (error) {
            console.error("Failed to save profile:", error);
            setSaveError("Saving failed. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[101] p-4">
            <div className="bg-gray-900 rounded-lg p-8 w-full max-w-lg relative text-white max-h-[90vh] overflow-y-auto">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <h2 className="text-2xl font-bold text-center mb-6">Edit Profile</h2>

                <div className="space-y-6">
                    <div>
                        <label htmlFor="displayName" className="block text-sm font-medium mb-1">Display Name</label>
                        <input
                            id="displayName"
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="w-full p-2 rounded-lg bg-gray-800 border border-gray-700"
                        />
                    </div>

                    <div>
                        <label htmlFor="photoURL" className="block text-sm font-medium mb-1">Profile Picture</label>
                        <input
                            id="photoURL"
                            type="file"
                            onChange={handleFileChange}
                            className="w-full text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-pink-600 file:text-white hover:file:bg-pink-700"
                        />
                        {selectedFile && (
                            <p className="mt-2 text-sm text-gray-400">Selected file: {selectedFile.name}</p>
                        )}
                        <p className="mt-2 text-sm text-gray-400">Current photo: {profile.photoURL}</p>
                    </div>

                    <div>
                        <label htmlFor="bio" className="block text-sm font-medium mb-1">Bio</label>
                        <textarea
                            id="bio"
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            rows={4}
                            className="w-full p-2 rounded-lg bg-gray-800 border border-gray-700 resize-none"
                        />
                    </div>

                    {isCreator && (
                        <div>
                            <h3 className="text-lg font-bold mb-2">Interests</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                                {allCategories.map(category => (
                                    <label key={category} className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            checked={categories.includes(category)}
                                            onChange={() => handleCategoryChange(category)}
                                            className="form-checkbox text-pink-600 bg-gray-800 border-gray-600 rounded"
                                        />
                                        <span>{category}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end space-x-4 mt-6">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg border border-gray-600 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                            disabled={uploading}
                        >
                            Cancel
                        </button>
                        {saveError && <p className="text-red-400 text-sm text-right">{saveError}</p>}
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 rounded-lg bg-pink-600 hover:bg-pink-700 transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={uploading}
                        >
                            {uploading ? 'Uploading...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ProfilePage = ({ userProfile, onClose, db, onVerifyKYC, onToggleCreatorStatus, isInlineVerificationOpen, onInlineVerificationClose, onVerificationComplete }: { userProfile: Profile; onClose: () => void; db: any; onVerifyKYC: () => void; onToggleCreatorStatus: () => void; isInlineVerificationOpen: boolean; onInlineVerificationClose: () => void; onVerificationComplete: (status: 'success' | 'failed' | 'pending') => void }) => {
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [profile, setProfile] = useState(userProfile);
    const [isProfilePicUploadOpen, setIsProfilePicUploadOpen] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const handleSave = async (updatedProfile: Partial<Profile>) => {
        if (db && profile.uid) {
            const profileRef = doc(db, "profiles", profile.uid);
            try {
                await updateDoc(profileRef, updatedProfile as any);
                setProfile(prevProfile => ({ ...prevProfile, ...updatedProfile }));
                console.log("Profile updated successfully!");
                setIsEditModalOpen(false);
            } catch (error) {
                console.error("Failed to update profile:", error);
            }
        }
    };

    const handleProfilePicUpload = async (urls: string[]) => {
        if (urls.length > 0 && db && profile.uid) {
            const profileRef = doc(db, "profiles", profile.uid);
            try {
                await updateDoc(profileRef, { photoURL: urls[0] });
                setProfile(prevProfile => ({ ...prevProfile, photoURL: urls[0] }));
                console.log("Profile picture updated successfully!");
                setIsProfilePicUploadOpen(false);
            } catch (error) {
                console.error("Failed to update profile picture:", error);
            }
        }
    };

    const handleImageUpload = (imageUrl: string) => {
        setProfile(prevProfile => ({ ...prevProfile, photoURL: imageUrl }));
        setUploadError(null);
    };

    const handleUploadError = (error: string) => {
        setUploadError(error);
    };

    return (
        <div className="fixed inset-0 bg-gray-950 text-white overflow-y-auto z-[100] p-6 md:p-12">
            <button onClick={onClose} className="py-2 px-4 rounded-lg border border-pink-600 text-pink-600 hover:bg-pink-600 hover:text-white transition-colors mb-8">
                Back
            </button>

            <div className={`max-w-3xl mx-auto rounded-xl p-6 shadow-lg space-y-6 ${profile.isCreator ? 'bg-gray-900' : 'bg-gray-800'}`}>
                <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                    <div className="flex items-center space-x-4">
                        <div className="relative group">
                            <img src={profile.photoURL} alt="Profile" className={`w-24 h-24 rounded-full object-cover border-4 ${profile.isCreator ? 'border-pink-600' : 'border-purple-600'} cursor-pointer transition-transform group-hover:scale-105`} />
                            <button
                                onClick={() => setIsProfilePicUploadOpen(true)}
                                className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-white">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                                </svg>
                            </button>
                        </div>
                        <div>
                            <h2 className={`text-3xl font-bold ${profile.isCreator ? 'text-white' : 'text-gray-100'}`}>{profile.displayName}</h2>
                            <p className="text-gray-400">@{profile.displayName.toLowerCase().replace(' ', '_')}</p>
                            <p className={`text-sm mt-1 ${profile.isCreator ? 'text-green-400' : 'text-blue-400'}`}>{profile.isCreator ? 'Creator' : 'User'}</p>
                            <p className="text-xs text-gray-500 mt-1">Click profile picture to change</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsEditModalOpen(true)}
                        className={`px-4 py-2 rounded-lg transition-colors ${profile.isCreator ? 'border-pink-600 text-pink-600 hover:bg-pink-600 hover:text-white' : 'border-purple-600 text-purple-300 hover:bg-purple-600 hover:text-white'}`}
                    >
                        Edit Profile
                    </button>
                </div>
                
                {!profile.isCreator && (
                    <div className="flex justify-between items-center bg-gray-700 p-4 rounded-lg">
                        <div>
                            <h3 className="text-lg font-bold">Become a Creator</h3>
                            <p className="text-sm text-gray-400">Unlock features like live streaming and exclusive content.</p>
                        </div>
                        <button
                            onClick={onToggleCreatorStatus}
                            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 transition-colors font-bold"
                        >
                            Start Now
                        </button>
                    </div>
                )}
                
                {profile.isCreator && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-gray-900 p-4 rounded-lg">
                            <div>
                                <h3 className="text-lg font-bold">KYC Verification</h3>
                                <p className="text-sm text-gray-400">
                                    {profile.isVerified 
                                        ? 'Your identity has been verified. You can now access all creator features.'
                                        : profile.verificationStatus === 'pending'
                                        ? 'Your verification is currently being reviewed. Please wait for approval.'
                                        : profile.verificationStatus === 'failed'
                                        ? 'Verification failed. Please try again with valid documents.'
                                        : 'Verify your identity to unlock creator features.'
                                    }
                                </p>
                                {profile.isVerified && (
                                    <div className="flex items-center space-x-2 mt-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-green-400">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="text-green-400 text-sm font-semibold">Verified Creator</span>
                                    </div>
                                )}
                            </div>
                            {!profile.isVerified && !isInlineVerificationOpen && (
                                <button
                                    onClick={onVerifyKYC}
                                    className={`px-4 py-2 rounded-lg transition-colors ${
                                        profile.verificationStatus === 'pending'
                                            ? 'bg-yellow-600 hover:bg-yellow-700'
                                            : profile.verificationStatus === 'failed'
                                            ? 'bg-red-600 hover:bg-red-700'
                                            : 'bg-green-600 hover:bg-green-700'
                                    }`}
                                >
                                    {profile.verificationStatus === 'pending' 
                                        ? 'Verification Pending'
                                        : profile.verificationStatus === 'failed'
                                        ? 'Retry Verification'
                                        : 'Verify Yourself'
                                    }
                                </button>
                            )}
                        </div>
                        
                        {isInlineVerificationOpen && (
                            <InlineVeriffKYC 
                                onVerificationComplete={onVerificationComplete}
                                onClose={onInlineVerificationClose}
                            />
                        )}
                    </div>
                )}
                
                <div>
                    <h3 className="text-lg font-bold mb-2">About Me</h3>
                    <p className="text-gray-300">{profile.bio || 'No bio set yet.'}</p>
                </div>

                {profile.isCreator && (
                    <div>
                        <h3 className="text-lg font-bold mb-2">My Interests</h3>
                        <div className="flex flex-wrap gap-2">
                            {(profile.categories ?? []).length > 0 ? (
                                (profile.categories ?? []).map(category => (
                                    <span key={category} className="px-3 py-1 bg-pink-600 text-white rounded-full text-sm">
                                        {category}
                                    </span>
                                ))
                            ) : (
                                <span className="text-gray-400 text-sm">No categories selected yet.</span>
                            )}
                        </div>
                    </div>
                )}

                {/* Media Upload Section for Creators */}
                {profile.isCreator && (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">My Media</h3>
                            <p className="text-gray-400 text-sm">Upload your content using the profile picture upload above or the edit profile modal.</p>
                        </div>
                        <div className="text-center py-8 border-2 border-dashed border-gray-700 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                            </svg>
                            <p className="text-gray-400 mb-2">Use the profile picture upload above</p>
                            <p className="text-sm text-gray-500">Upload your profile picture to get started</p>
                        </div>
                    </div>
                )}
            </div>
            {isEditModalOpen && (
                <EditProfileModal
                    profile={profile}
                    onClose={() => setIsEditModalOpen(false)}
                    onSave={(updatedProfile: Partial<Profile>) => handleSave(updatedProfile)}
                    isCreator={profile.isCreator}
                    db={db}
                    user={null}
                />
            )}
            {isProfilePicUploadOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[101] p-4">
                    <div className="bg-gray-900 rounded-lg p-8 w-full max-w-lg relative text-white">
                        <button 
                            onClick={() => setIsProfilePicUploadOpen(false)} 
                            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <h2 className="text-2xl font-bold text-center mb-6">Upload Profile Picture</h2>
                        <ProfilePictureUpload
                            currentImageUrl={profile.photoURL}
                            onImageUpload={handleImageUpload}
                            onError={handleUploadError}
                            userId={profile.uid}
                            isCreator={profile.isCreator}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

// Custom component to explain why KYC can't work in this app
const CreatorsPage = ({ creators, onViewProfile, onLike, onClose }: { creators: Creator[]; onViewProfile: (creator: Creator) => void; onLike: (creatorId: number) => void; onClose: () => void }) => {
    return (
        <div className="bg-gray-950 text-white min-h-screen font-sans">
            <div className="p-6 md:p-12">
                <div className="flex justify-between items-center mb-6 md:mb-12 relative">
                    <button onClick={onClose} className="py-2 px-4 rounded-lg border border-pink-600 text-pink-600 hover:bg-pink-600 hover:text-white transition-colors">
                        Back
                    </button>
                    <div className="flex flex-col items-center absolute left-1/2 transform -translate-x-1/2">
                        <img src="/logo.png" alt="Naughty Den Logo" width={80} height={32} className="w-auto h-8 md:h-10" />
                        <h1 className="text-3xl font-bold mt-2 text-pink-600">All Creators</h1>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
                    {creators.map((creator) => (
                        <CreatorCard key={creator.id} creator={creator} onViewProfile={onViewProfile} onLike={onLike} />
                    ))}
                </div>
            </div>
        </div>
    );
};

// Creator Dashboard Component
const CreatorDashboard = ({ creators, onViewProfile, onLike, onClose, db, onOpenCreatorStudio }: { creators: Creator[]; onViewProfile: (creator: Creator) => void; onLike: (creatorId: number) => void; onClose: () => void; db: any; onOpenCreatorStudio: () => void }) => {
    const [filteredCreators, setFilteredCreators] = useState(creators);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('name');
    const [filterVerified, setFilterVerified] = useState(false);
    const [filterPriceRange, setFilterPriceRange] = useState('all');
    const [liveAudience, setLiveAudience] = useState<any[]>([]);
    const [isLoadingAudience, setIsLoadingAudience] = useState(true);

    // Fetch live audience from database
    useEffect(() => {
        if (!db) return;

        const fetchLiveAudience = async () => {
            try {
                setIsLoadingAudience(true);
                const profilesRef = collection(db, 'profiles');
                const q = query(profilesRef, where('isCreator', '==', true));
                
                const unsubscribe = onSnapshot(q, (snapshot) => {
                    const audienceData = snapshot.docs.map(doc => {
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
                            uid: data.uid || doc.id
                        };
                    });
                    setLiveAudience(audienceData);
                    setIsLoadingAudience(false);
                });

                return () => unsubscribe();
            } catch (error) {
                console.error('Error fetching live audience:', error);
                setIsLoadingAudience(false);
            }
        };

        fetchLiveAudience();
    }, [db]);

    useEffect(() => {
        // Use live audience data if available, otherwise fall back to static creators
        const dataSource = liveAudience.length > 0 ? liveAudience : creators;
        let filtered = dataSource;

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(creator => 
                creator.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                creator.name?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Verified filter
        if (filterVerified) {
            filtered = filtered.filter(creator => creator.isVerified);
        }

        // Price range filter
        if (filterPriceRange !== 'all') {
            const [min, max] = filterPriceRange.split('-').map(Number);
            filtered = filtered.filter(creator => {
                if (max) {
                    return creator.price >= min && creator.price <= max;
                } else {
                    return creator.price >= min;
                }
            });
        }

        // Sort
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return (a.displayName || a.name).localeCompare(b.displayName || b.name);
                case 'price-low':
                    return a.price - b.price;
                case 'price-high':
                    return b.price - a.price;
                case 'rating':
                    return parseFloat(b.rating) - parseFloat(a.rating);
                case 'likes':
                    return b.likes - a.likes;
                default:
                    return 0;
            }
        });

        setFilteredCreators(filtered);
    }, [creators, liveAudience, searchTerm, sortBy, filterVerified, filterPriceRange]);

    return (
        <div className="bg-gray-950 text-white min-h-screen font-sans">
            <div className="p-6 md:p-12">
                <div className="flex justify-between items-center mb-6 md:mb-12 relative">
                    <button onClick={onClose} className="py-2 px-4 rounded-lg border border-pink-600 text-pink-600 hover:bg-pink-600 hover:text-white transition-colors">
                        Back
                    </button>
                    <div className="flex flex-col items-center absolute left-1/2 transform -translate-x-1/2">
                        <img src="/logo.png" alt="Naughty Den Logo" width={80} height={32} className="w-auto h-8 md:h-10" />
                        <h1 className="text-3xl font-bold mt-2 text-pink-600">Creator Dashboard</h1>
                    </div>
                    <button 
                        onClick={onOpenCreatorStudio} 
                        className="py-2 px-4 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 transition-colors text-white font-semibold"
                    >
                        Creator Studio
                    </button>
                </div>

                {/* Filters and Search */}
                <div className="bg-gray-900 rounded-xl p-6 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Search Creators</label>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by name..."
                                className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-pink-600"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Sort By</label>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-pink-600"
                            >
                                <option value="name">Name</option>
                                <option value="price-low">Price (Low to High)</option>
                                <option value="price-high">Price (High to Low)</option>
                                <option value="rating">Rating</option>
                                <option value="likes">Likes</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Price Range</label>
                            <select
                                value={filterPriceRange}
                                onChange={(e) => setFilterPriceRange(e.target.value)}
                                className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-pink-600"
                            >
                                <option value="all">All Prices</option>
                                <option value="20-30">$20 - $30</option>
                                <option value="30-40">$30 - $40</option>
                                <option value="40-50">$40+</option>
                            </select>
                        </div>
                        <div className="flex items-end">
                            <label className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={filterVerified}
                                    onChange={(e) => setFilterVerified(e.target.checked)}
                                    className="form-checkbox text-pink-600 bg-gray-800 border-gray-600 rounded"
                                />
                                <span className="text-sm">Verified Only</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Live Audience Section */}
                <div className="bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 rounded-xl p-6 mb-8 shadow-lg">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                            <h3 className="text-2xl font-bold text-white drop-shadow-lg">Live Audience</h3>
                            <div className="flex items-center space-x-2 bg-white/20 rounded-full px-3 py-1">
                                <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
                                <span className="text-white font-semibold text-sm">LIVE</span>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white/25 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                            <div className="text-3xl font-bold text-white drop-shadow-md">
                                {isLoadingAudience ? (
                                    <div className="animate-pulse">...</div>
                                ) : (
                                    liveAudience.length
                                )}
                            </div>
                            <div className="text-sm text-white/90 font-medium">Active Creators</div>
                        </div>
                        <div className="bg-white/25 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                            <div className="text-3xl font-bold text-white drop-shadow-md">
                                {isLoadingAudience ? (
                                    <div className="animate-pulse">...</div>
                                ) : (
                                    liveAudience.filter(c => c.isVerified).length
                                )}
                            </div>
                            <div className="text-sm text-white/90 font-medium">Verified Creators</div>
                        </div>
                        <div className="bg-white/25 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                            <div className="text-3xl font-bold text-white drop-shadow-md">
                                {isLoadingAudience ? (
                                    <div className="animate-pulse">...</div>
                                ) : (
                                    liveAudience.reduce((sum, c) => sum + c.likes, 0)
                                )}
                            </div>
                            <div className="text-sm text-white/90 font-medium">Total Engagement</div>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-gray-900 rounded-lg p-4">
                        <div className="text-2xl font-bold text-pink-600">{filteredCreators.length}</div>
                        <div className="text-sm text-gray-400">Total Creators</div>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-4">
                        <div className="text-2xl font-bold text-green-600">{filteredCreators.filter(c => c.isVerified).length}</div>
                        <div className="text-sm text-gray-400">Verified</div>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-4">
                        <div className="text-2xl font-bold text-yellow-600">
                            ${filteredCreators.length > 0 ? (filteredCreators.reduce((sum, c) => sum + c.price, 0) / filteredCreators.length).toFixed(2) : '0'}
                        </div>
                        <div className="text-sm text-gray-400">Avg. Price</div>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-4">
                        <div className="text-2xl font-bold text-blue-600">
                            {filteredCreators.reduce((sum, c) => sum + c.likes, 0)}
                        </div>
                        <div className="text-sm text-gray-400">Total Likes</div>
                    </div>
                </div>

                {/* Creators Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
                    {filteredCreators.map((creator) => (
                        <CreatorCard key={creator.id} creator={creator} onViewProfile={onViewProfile} onLike={onLike} />
                    ))}
                </div>
            </div>
        </div>
    );
};

// Browser Gallery Component
const BrowserGallery = ({ creators, onClose }: { creators: Creator[]; onClose: () => void }) => {
    const [hoveredImage, setHoveredImage] = useState<string | null>(null);
    const [selectedCreator, setSelectedCreator] = useState<string | null>(null);

    // Generate sample images for each creator
    const creatorImages = creators.map(creator => ({
        creator,
        images: [
            creator.image,
            `https://images.unsplash.com/photo-${1500000000000 + creator.id * 1000000}?q=80&w=400&auto=format&fit=crop`,
            `https://images.unsplash.com/photo-${1600000000000 + creator.id * 1000000}?q=80&w=400&auto=format&fit=crop`,
            `https://images.unsplash.com/photo-${1700000000000 + creator.id * 1000000}?q=80&w=400&auto=format&fit=crop`,
        ]
    }));

    return (
        <div className="bg-gray-950 text-white min-h-screen font-sans">
            <div className="p-6 md:p-12">
                <div className="flex justify-between items-center mb-6 md:mb-12 relative">
                    <button onClick={onClose} className="py-2 px-4 rounded-lg border border-pink-600 text-pink-600 hover:bg-pink-600 hover:text-white transition-colors">
                        Back
                    </button>
                    <div className="flex flex-col items-center absolute left-1/2 transform -translate-x-1/2">
                        <img src="/logo.png" alt="Naughty Den Logo" width={80} height={32} className="w-auto h-8 md:h-10" />
                        <h1 className="text-3xl font-bold mt-2 text-pink-600">Browser Gallery</h1>
                    </div>
                </div>

                {/* Gallery Stats */}
                <div className="bg-gray-900 rounded-lg p-6 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                        <div>
                            <div className="text-3xl font-bold text-pink-600">{creators.length}</div>
                            <div className="text-sm text-gray-400">Creators</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-green-600">{creatorImages.reduce((sum, ci) => sum + ci.images.length, 0)}</div>
                            <div className="text-sm text-gray-400">Total Images</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-blue-600">{creators.reduce((sum, c) => sum + c.likes, 0)}</div>
                            <div className="text-sm text-gray-400">Total Likes</div>
                        </div>
                    </div>
                </div>

                {/* Gallery Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {creatorImages.map((creatorImage, index) => (
                        <div key={index} className="space-y-4">
                            {creatorImage.images.map((image, imgIndex) => (
                                <div
                                    key={imgIndex}
                                    className="relative group cursor-pointer"
                                    onMouseEnter={() => {
                                        setHoveredImage(image);
                                        setSelectedCreator(creatorImage.creator.name);
                                    }}
                                    onMouseLeave={() => {
                                        setHoveredImage(null);
                                        setSelectedCreator(null);
                                    }}
                                >
                                    <img
                                        src={image}
                                        alt={`${creatorImage.creator.name} - Image ${imgIndex + 1}`}
                                        className="w-full h-64 object-cover rounded-lg transition-transform duration-300 group-hover:scale-105"
                                    />
                                    {hoveredImage === image && (
                                        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                                            <div className="text-center">
                                                <div className="text-white font-bold text-lg">{selectedCreator}</div>
                                                <div className="text-pink-400 text-sm">Click to view full size</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const KYCWarningModal = ({ onClose }: { onClose: () => void }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[101] p-4">
            <div className="bg-gray-900 rounded-lg p-8 w-full max-w-md mx-4 text-white text-center shadow-lg border border-pink-600">
                <div className="flex justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-yellow-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.731 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.007H12v-.007z" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold mb-4">Verification Not Possible</h2>
                <p className="mb-4 text-gray-300">
                    A real KYC process requires a secure server to handle sensitive data and API requests. For your security, this feature is not available in this client-side application.
                </p>
                <p className="mb-6 text-gray-300">
                    In a production environment, this would redirect you to a secure page to complete the verification.
                </p>
                <button
                    onClick={onClose}
                    className="px-6 py-3 rounded-lg bg-pink-600 hover:bg-pink-700 transition-colors font-bold"
                >
                    Understood
                </button>
            </div>
        </div>
    );
};


const DisclaimerModal = ({ onConfirm, onExit }: { onConfirm: () => void; onExit: () => void }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[100]">
            <div className="bg-gray-900 rounded-lg p-8 w-full max-w-md mx-4 text-white text-center shadow-lg border border-pink-600">
                <div className="flex justify-center mb-4">
                    <img src="/logo.png" alt="Naughty Den Logo" className="w-24 h-auto" />
                </div>
                <h2 className="text-2xl font-bold mb-4">Adult Content Warning</h2>
                <p className="mb-4">
                    This app contains adult content. You must be 18+ (or legal age in your region) to enter.
                </p>
                <p className="mb-6">
                    By continuing, you confirm that you meet the age requirement and consent to view explicit material.
                </p>
                <div className="flex justify-center space-x-4">
                    <button
                        onClick={onConfirm}
                        className="px-6 py-3 rounded-lg bg-pink-600 hover:bg-pink-700 transition-colors font-bold"
                    >
                        I Am 18+
                    </button>
                    <button
                        onClick={onExit}
                        className="px-6 py-3 rounded-lg border border-gray-600 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors font-bold"
                    >
                        Exit
                    </button>
                </div>
            </div>
        </div>
    );
};


const Preloader = () => (
    <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <img src="/pl.gif" alt="Loading..." width={64} height={64} className="w-16 h-16" />
    </div>
);

const LoginModal = ({ onClose, auth, onLogin, initialForm = 'login-choice' }: { onClose: () => void; auth: any; onLogin: (isCreator: boolean) => void; initialForm?: string }) => {
    const [activeForm, setActiveForm] = useState(initialForm);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isCreator, setIsCreator] = useState(false);
    const [displayName, setDisplayName] = useState('');

    const db = getFirestore();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const profileDoc = await getDoc(doc(db, "profiles", userCredential.user.uid));
            if (profileDoc.exists()) {
                const profileData = profileDoc.data();
                onLogin(profileData.isCreator);
            }
            onClose();
        } catch (err: any) {
            console.error("Login error:", err);
            if (err.code === 'auth/user-not-found') {
                setError('No account found with this email. Please sign up first.');
            } else if (err.code === 'auth/wrong-password') {
                setError('Incorrect password. Please try again.');
            } else if (err.code === 'auth/invalid-email') {
                setError('Invalid email address. Please check your email.');
            } else if (err.code === 'auth/too-many-requests') {
                setError('Too many failed attempts. Please try again later.');
            } else {
                setError(err.message || 'Login failed. Please try again.');
            }
        }
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCredential.user, { displayName });
            const profileData = {
                uid: userCredential.user.uid,
                displayName: displayName,
                email: email,
                photoURL: userCredential.user.photoURL || 'https://placehold.co/100x100',
                isCreator: isCreator,
                bio: '',
                categories: [],
                isProfileComplete: false
            };
            await setDoc(doc(db, "profiles", userCredential.user.uid), profileData);
            onLogin(isCreator);
            onClose();
        } catch (err: any) {
            console.error("Sign up error:", err);
            if (err.code === 'auth/email-already-in-use') {
                setError('An account with this email already exists. Please sign in instead.');
            } else if (err.code === 'auth/weak-password') {
                setError('Password is too weak. Please choose a stronger password.');
            } else if (err.code === 'auth/invalid-email') {
                setError('Invalid email address. Please check your email.');
            } else if (err.code === 'auth/operation-not-allowed') {
                setError('Email/password accounts are not enabled. Please contact support.');
            } else {
                setError(err.message || 'Sign up failed. Please try again.');
            }
        }
    };

    const handleGoogleLogin = async () => {
        setError('');
        const provider = new GoogleAuthProvider();
        try {
            const userCredential = await signInWithPopup(auth, provider);
            const profileRef = doc(db, "profiles", userCredential.user.uid);
            const profileDoc = await getDoc(profileRef);

            if (!profileDoc.exists()) {
                const profileData = {
                    uid: userCredential.user.uid,
                    displayName: userCredential.user.displayName || 'Anonymous',
                    email: userCredential.user.email || '',
                    photoURL: userCredential.user.photoURL || 'https://placehold.co/100x100',
                    isCreator: false,
                    bio: '',
                    categories: [],
                    isProfileComplete: false
                };
                await setDoc(profileRef, profileData);
                onLogin(false);
            } else {
                onLogin(profileDoc.data()?.isCreator || false);
            }
            onClose();
        } catch (err: any) {
            console.error("Google login error:", err);
            if (err.code === 'auth/popup-closed-by-user') {
                setError('Login was cancelled. Please try again.');
            } else if (err.code === 'auth/popup-blocked') {
                setError('Popup was blocked. Please allow popups and try again.');
            } else {
                setError(err.message || 'Login failed. Please try again.');
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[100]">
            <div className="bg-gray-900 rounded-lg p-8 w-full max-w-md mx-4 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {activeForm === 'login-choice' && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-white text-center">Choose your path</h2>
                        <button
                            onClick={() => { setActiveForm('login'); setIsCreator(false); }}
                            className="w-full py-3 rounded-lg bg-gray-800 border border-gray-700 text-white hover:bg-gray-700 transition-colors"
                        >
                            Log In as a User
                        </button>
                        <button
                            onClick={() => { setActiveForm('login'); setIsCreator(true); }}
                            className="w-full py-3 rounded-lg bg-pink-600 hover:bg-pink-700 transition-colors text-white font-bold"
                        >
                            Log In as a Creator
                        </button>
                        <div className="text-center text-sm mt-4">
                            Don&apos;t have an account yet? <a href="#" onClick={(e) => { e.preventDefault(); setActiveForm('signup'); }} className="text-pink-600 font-bold hover:underline">CREATE ONE NOW</a>
                        </div>
                    </div>
                )}

                {(activeForm === 'login' || activeForm === 'signup') && (
                    <>
                        <form onSubmit={activeForm === 'login' ? handleLogin : handleSignUp} className="space-y-4">
                            <h2 className="text-xl font-bold text-white text-center">{activeForm === 'login' ? 'Log In' : 'Sign Up'}</h2>
                            <div>
                                <label className="sr-only" htmlFor="email">Email Address</label>
                                <input
                                    type="email"
                                    id="email"
                                    placeholder="Email Address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg py-3 px-4 focus:outline-none focus:border-pink-600"
                                />
                            </div>
                            {activeForm === 'signup' && (
                                <div>
                                    <label className="sr-only" htmlFor="displayName">Display Name</label>
                                    <input
                                        type="text"
                                        id="displayName"
                                        placeholder="Display Name"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg py-3 px-4 focus:outline-none focus:border-pink-600"
                                    />
                                </div>
                            )}
                            <div>
                                <label className="sr-only" htmlFor="password">Password</label>
                                <div className="relative">
                                    <input
                                        type="password"
                                        id="password"
                                        placeholder="Password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg py-3 px-4 focus:outline-none focus:border-pink-600"
                                    />
                                    {activeForm === 'login' && (
                                        <a href="#" className="absolute top-1/2 right-4 -translate-y-1/2 text-xs text-gray-500 hover:underline">Forgot</a>
                                    )}
                                </div>
                            </div>
                            {activeForm === 'signup' && (
                                <div className="flex justify-center space-x-4 text-sm text-white">
                                    <label className="flex items-center">
                                        <input type="radio" name="accountType" value="user" checked={!isCreator} onChange={() => setIsCreator(false)} className="mr-2" />
                                        I'm a User
                                    </label>
                                    <label className="flex items-center">
                                        <input type="radio" name="accountType" value="creator" checked={isCreator} onChange={() => setIsCreator(true)} className="mr-2" />
                                        I'm a Creator
                                    </label>
                                </div>
                            )}
                            {error && <p className="text-red-500 text-center text-sm">{error}</p>}
                            <button
                                type="submit"
                                className="w-full py-3 rounded-lg bg-pink-600 hover:bg-pink-700 transition-colors font-bold text-lg"
                            >
                                {activeForm === 'login' ? 'LOG IN' : 'CREATE ACCOUNT'}
                            </button>
                        </form>
                        <div className="flex items-center my-6">
                            <div className="flex-grow border-t border-gray-700"></div>
                            <span className="mx-4 text-gray-500">or</span>
                            <div className="flex-grow border-t border-gray-700"></div>
                        </div>
                        <button
                            onClick={handleGoogleLogin}
                            className="w-full flex items-center justify-center py-3 rounded-lg bg-gray-800 border border-gray-700 hover:bg-gray-700 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor" className="w-5 h-5 mr-2">
                                <path d="M22.675 12.012c0-.503-.043-.997-.123-1.48H12.287v2.8H19.034c-.309 1.583-1.259 2.92-2.585 3.86v2.33h2.99c1.758-1.614 2.772-3.992 2.772-6.61Z" fill="#4285F4" />
                                <path d="M12.287 23.996c2.724 0 5.006-.902 6.674-2.433L15.97 19.233c-1.07.72-2.45 1.148-3.683 1.148-2.84 0-5.26-1.92-6.115-4.524H3.01v2.417C4.77 21.365 8.16 23.996 12.287 23.996Z" fill="#34A853" />
                                <path d="M6.172 14.542c-.22-.61-.34-1.258-.34-1.927s.12-1.317.34-1.927V8.27h-3.16C2.39 9.53 2.014 10.74 2.014 12.016s.376 2.486 1.002 3.743l3.156-2.217Z" fill="#FBBC04" />
                                <path d="M12.287 5.75c1.47 0 2.784.507 3.824 1.492l2.673-2.673C17.3 2.75 15.004 1.996 12.287 1.996c-4.127 0-7.517 2.63-9.28 6.58L6.172 10.8c.854-2.604 3.274-4.523 6.115-4.523Z" fill="#EA4335" />
                            </svg>
                            Sign in with Google
                        </button>
                        <div className="text-center mt-6 text-sm">
                            {activeForm === 'login' ? (
                                <>Don&apos;t have an account yet? <a href="#" onClick={(e) => { e.preventDefault(); setActiveForm('signup'); }} className="text-pink-600 font-bold hover:underline">CREATE ONE NOW</a></>
                            ) : (
                                <>Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); setActiveForm('login-choice'); }} className="text-pink-600 font-bold hover:underline">LOG IN</a></>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

const firebaseConfig = {
    apiKey: "AIzaSyCQtWBB_PL4Gi8P5Td0RCgKc7tUQLzsATg",
    authDomain: "naughtyden-app.firebaseapp.com",
    projectId: "naughtyden-app",
    storageBucket: "naughtyden-app.appspot.com",
    messagingSenderId: "1038096287210",
    appId: "1:1038096287210:web:e2f569629036cd00125e93",
    measurementId: "G-RYREQGMGB1"
};

const App = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [isLoginModalOpen, setIsLoginModal] = useState(false);
    const [loginModalInitialForm, setLoginModalInitialForm] = useState('login-choice');
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<Profile | null>(null);
    const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
    const [selectedPage, setSelectedPage] = useState('home');
    const [showCreatorStudio, setShowCreatorStudio] = useState(false);
    const [showCreatorStudioPopup, setShowCreatorStudioPopup] = useState(false);
    const [auth, setAuth] = useState<any>(null);
    const [db, setDb] = useState<any>(null);
    const [firebaseApp, setFirebaseApp] = useState<any>(null);
    const [creators, setCreators] = useState(initialCreators);
    const [isAgeConfirmed, setIsAgeConfirmed] = useState(false);
    const [isVerifyingKYC, setIsVerifyingKYC] = useState(false);
    const [isKYCWarningModalOpen, setIsKYCWarningModalOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isVeriffKYCModalOpen, setIsVeriffKYCModalOpen] = useState(false);
    const [isInlineVerificationOpen, setIsInlineVerificationOpen] = useState(false);
    const [userMedia, setUserMedia] = useState<string[]>([]);
    const [liveAudience, setLiveAudience] = useState<any[]>([]);

    useEffect(() => {
        const firebaseApp = initializeApp(firebaseConfig);
        const authInstance = getAuth(firebaseApp);
        const dbInstance = getFirestore(firebaseApp);
        setAuth(authInstance);
        setDb(dbInstance);
        setFirebaseApp(firebaseApp);

        const checkAuth = async () => {
            try {
                const initialAuthToken = (window as any).__initial_auth_token;
                if (initialAuthToken) {
                    await signInWithCustomToken(authInstance, initialAuthToken);
                } else {
                    // Try to sign in anonymously, but don't fail if it's restricted
                    try {
                        await signInAnonymously(authInstance);
                    } catch (anonError: any) {
                        if (anonError.code === 'auth/admin-restricted-operation') {
                            console.log("Anonymous sign-in is restricted, continuing without authentication");
                        } else {
                            console.error("Anonymous sign-in failed:", anonError);
                        }
                    }
                }
            } catch (error) {
                console.error("Firebase auth setup failed:", error);
            }
        };
        checkAuth();

        const unsubscribe = onAuthStateChanged(authInstance, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                setIsLoginModal(false);
                try {
                    const profileRef = doc(dbInstance, "profiles", currentUser.uid);
                    const profileDoc = await getDoc(profileRef);
                    const profileData = profileDoc.exists() ? profileDoc.data() as Profile : null;

                    if (profileData) {
                        setUserProfile(profileData);
                        if (!profileData.isProfileComplete) {
                            setIsProfileModalOpen(true);
                        }
                    } else {
                        // Create a new default profile if one doesn't exist
                        const newProfile: Profile = {
                            uid: currentUser.uid,
                            displayName: currentUser.displayName || 'Anonymous',
                            email: currentUser.email || '',
                            photoURL: currentUser.photoURL || 'https://placehold.co/100x100',
                            isCreator: false,
                            bio: '',
                            categories: [],
                            isProfileComplete: false,
                        };
                        await setDoc(profileRef, newProfile);
                        setUserProfile(newProfile);
                        setIsProfileModalOpen(true);
                    }
                } catch (error) {
                    console.error("Error handling user profile:", error);
                    // Continue without profile data if there's an error
                }
            } else {
                setUserProfile(null);
            }
        });

        const ageConfirmed = localStorage.getItem('ageConfirmed');
        if (ageConfirmed === 'true') {
            setIsAgeConfirmed(true);
        }

        setTimeout(() => {
            setIsLoading(false);
        }, 2000);

        return () => unsubscribe();
    }, []);

    // Fetch live audience for navbar
    useEffect(() => {
        if (!db) return;

        const fetchLiveAudience = async () => {
            try {
                const profilesRef = collection(db, 'profiles');
                const q = query(profilesRef, where('isCreator', '==', true));
                
                const unsubscribe = onSnapshot(q, (snapshot) => {
                    const audienceData = snapshot.docs.map(doc => {
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
                            uid: data.uid || doc.id
                        };
                    });
                    setLiveAudience(audienceData);
                });

                return () => unsubscribe();
            } catch (error) {
                console.error('Error fetching live audience:', error);
            }
        };

        fetchLiveAudience();
    }, [db]);

    const handleAgeConfirm = () => {
        localStorage.setItem('ageConfirmed', 'true');
        setIsAgeConfirmed(true);
    };

    const handleAgeExit = () => {
        window.location.href = 'https://www.google.com/';
    };

    const handleLogout = async () => {
        if (auth) {
            try {
                await signOut(auth);
                setSelectedPage('home');
            } catch (error) {
                console.error("Logout failed:", error);
            }
        }
    };

    const handleCreatorStudioAccess = () => {
        if (!user) {
            // User not logged in - show popup
            setShowCreatorStudioPopup(true);
        } else if (!userProfile?.isCreator) {
            // User logged in but not a creator - show popup
            setShowCreatorStudioPopup(true);
        } else {
            // User is logged in and is a creator - open studio
            setShowCreatorStudio(true);
        }
    };

    const handleLike = (id: number) => {
        setCreators(prevCreators =>
            prevCreators.map(creator =>
                creator.id === id ? { ...creator, likes: creator.likes + 1 } : creator
            )
        );
    };

    const handleProfileSave = async (updatedProfile: Partial<Profile>) => {
        if (db && user?.uid) {
            const profileRef = doc(db, "profiles", user.uid);
            try {
                await updateDoc(profileRef, updatedProfile);
                setUserProfile(prevProfile => ({ ...prevProfile!, ...updatedProfile as Profile }));
                console.log("Profile updated successfully!");
                setIsProfileModalOpen(false);
            } catch (error) {
                console.error("Failed to update profile:", error);
            }
        }
    };

    const handleToggleCreatorStatus = async () => {
        if (db && userProfile?.uid) {
            const profileRef = doc(db, "profiles", userProfile.uid);
            try {
                await updateDoc(profileRef, { isCreator: true, isProfileComplete: false });
                setUserProfile(prevProfile => ({ ...prevProfile!, isCreator: true, isProfileComplete: false }));
                setIsProfileModalOpen(true);
                console.log("Profile updated to Creator successfully!");
            } catch (error) {
                console.error("Failed to update profile status:", error);
            }
        }
    };

    const handleVeriffKYC = () => {
        setIsInlineVerificationOpen(true);
    };

    const handleVerificationComplete = async (status: 'success' | 'failed' | 'pending') => {
        if (db && userProfile?.uid) {
            const profileRef = doc(db, "profiles", userProfile.uid);
            try {
                const updateData: any = { verificationStatus: status };
                if (status === 'success') {
                    updateData.isVerified = true;
                }
                await updateDoc(profileRef, updateData);
                setUserProfile(prevProfile => ({ ...prevProfile!, ...updateData }));
                console.log("Verification status updated successfully!");
            } catch (error) {
                console.error("Failed to update verification status:", error);
            }
        }
        setIsVeriffKYCModalOpen(false);
        setIsInlineVerificationOpen(false);
    };

    if (isLoading) {
        return <Preloader />;
    }

    if (!isAgeConfirmed) {
        return <DisclaimerModal onConfirm={handleAgeConfirm} onExit={handleAgeExit} />;
    }

    if (isKYCWarningModalOpen) {
        return <KYCWarningModal onClose={() => setIsKYCWarningModalOpen(false)} />;
    }

    if (isVerifyingKYC) {
        return <VerifyKYCPage onClose={() => setIsVerifyingKYC(false)} />;
    }

    if (selectedPage === 'live-posts') {
        return <LivePosts onClose={() => setSelectedPage('home')} user={user} db={db} />;
    }

    if (selectedPage === 'my-profile' && userProfile) {
        return <ProfilePage 
            userProfile={userProfile} 
            onClose={() => setSelectedPage('home')} 
            db={db} 
            onVerifyKYC={handleVeriffKYC} 
            onToggleCreatorStatus={handleToggleCreatorStatus}
            isInlineVerificationOpen={isInlineVerificationOpen}
            onInlineVerificationClose={() => setIsInlineVerificationOpen(false)}
            onVerificationComplete={handleVerificationComplete}
        />;
    }

    if (selectedCreator) {
        return <CreatorProfile creator={selectedCreator} onClose={() => setSelectedCreator(null)} />;
    }

    if (selectedPage === 'creators') {
        return <CreatorsPage creators={liveAudience.length > 0 ? liveAudience : creators} onViewProfile={setSelectedCreator} onLike={handleLike} onClose={() => setSelectedPage('home')} />;
    }

    if (selectedPage === 'creator-dashboard') {
        return <CreatorDashboard creators={creators} onViewProfile={setSelectedCreator} onLike={handleLike} onClose={() => setSelectedPage('home')} db={db} onOpenCreatorStudio={() => setShowCreatorStudio(true)} />;
    }

    if (selectedPage === 'browser-gallery') {
        return <BrowserGallery creators={creators} onClose={() => setSelectedPage('home')} />;
    }

    if (showCreatorStudio) {
        return <CreatorStudio onClose={() => setShowCreatorStudio(false)} />;
    }

    return (
        <ErrorBoundary>
            <div className="bg-gray-950 text-white min-h-screen font-sans">
                <AppCSS />
            {/* Enhanced Header */}
            <header className="relative z-50 bg-gray-900/95 backdrop-blur-lg border-b border-gray-700 shadow-lg">
                <div className="max-w-7xl mx-auto px-4 md:px-8">
                    <div className="flex justify-between items-center py-3">
                        {/* Logo with enhanced styling */}
                        <div className="flex items-center space-x-4">
                            <div className="relative group">
                                <img src="/logo.png" alt="Naughty Den Logo" width={100} height={40} className="h-10 w-auto transition-transform group-hover:scale-105" />
                            </div>
                        </div>
                        
                        {/* Mobile Menu Button */}
                        <button 
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="md:hidden p-3 rounded-xl bg-gray-800/50 border border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white transition-all duration-300"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                            </svg>
                        </button>

                        {/* Enhanced Desktop Navigation */}
                        <nav className="hidden md:flex items-center space-x-1">
                            <a href="#" onClick={() => setSelectedPage('home')} className="px-3 py-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-800/60 transition-all duration-200 text-sm font-medium">
                                Home
                            </a>
                            <a href="#" onClick={() => setSelectedPage('creators')} className="px-3 py-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-800/60 transition-all duration-200 text-sm font-medium">
                                Creators
                            </a>
                            <div className="relative mx-2">
                                <input 
                                    type="text" 
                                    placeholder="Search photos..." 
                                    className="px-3 py-2 pl-10 rounded-md bg-gray-800/60 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/30 transition-all duration-200 w-48 text-sm"
                                />
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                                </svg>
                            </div>
                            <a href="#" onClick={() => setSelectedPage('live-posts')} className="px-3 py-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-800/60 transition-all duration-200 text-sm font-medium">
                                Get Naughty
                            </a>
                            <a href="#" className="px-3 py-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-800/60 transition-all duration-200 text-sm font-medium">
                                Contact
                            </a>
                        </nav>
                        
                        {/* Enhanced Desktop User Actions */}
                        <div className="hidden md:flex items-center space-x-2">
                            {user && userProfile?.isCreator && (
                                <button 
                                    onClick={handleCreatorStudioAccess}
                                    className="px-3 py-2 rounded-md bg-gradient-to-r from-pink-600 to-purple-600 text-white font-semibold hover:from-pink-700 hover:to-purple-700 transition-all duration-200 text-sm shadow-md"
                                >
                                    Creator Studio
                                </button>
                            )}
                            {user ? (
                                <>
                                    <div className="flex items-center space-x-2 bg-gray-800/40 rounded-lg p-2 border border-gray-600">
                                        {userProfile?.photoURL && (
                                            <div className="relative">
                                                <img src={userProfile.photoURL} alt="Profile" width={32} height={32} className="w-8 h-8 rounded-full border border-pink-500" />
                                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border border-gray-900"></div>
                                            </div>
                                        )}
                                        <div className="flex flex-col">
                                            <span className="text-white font-semibold text-xs">{userProfile?.displayName || user.displayName || 'User'}</span>
                                            <span className="text-xs text-gray-400">{userProfile?.isCreator ? 'Creator' : 'User'}</span>
                                        </div>
                                        {userProfile?.isProfileComplete && <span className="text-green-400 text-sm">✓</span>}
                                    </div>
                                    <button 
                                        onClick={() => setSelectedPage('my-profile')} 
                                        className="px-3 py-2 rounded-md border border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white transition-all duration-200 text-sm font-medium"
                                    >
                                        Profile
                                    </button>
                                    <button 
                                        onClick={handleLogout} 
                                        className="px-3 py-2 rounded-md border border-pink-600 text-pink-600 hover:bg-pink-600 hover:text-white transition-all duration-200 text-sm font-medium"
                                    >
                                        Logout
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button 
                                        onClick={() => setIsLoginModal(true)} 
                                        className="px-4 py-2 rounded-md border border-pink-600 text-pink-600 hover:bg-pink-600 hover:text-white transition-all duration-200 text-sm font-semibold"
                                    >
                                        Login
                                    </button>
                                    <button 
                                        onClick={() => { setLoginModalInitialForm('signup'); setIsLoginModal(true); }} 
                                        className="px-4 py-2 rounded-md bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 transition-all duration-200 text-sm font-semibold shadow-md"
                                    >
                                        Sign Up
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Enhanced Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden fixed inset-0 z-50 bg-gray-950/95 backdrop-blur-md">
                    <div className="p-6 h-full overflow-y-auto">
                        <div className="flex justify-between items-center mb-8">
                            <div className="flex items-center space-x-3">
                                <img src="/logo.png" alt="Naughty Den Logo" width={100} height={40} className="h-10 w-auto" />
                                <div className="text-sm text-pink-400 font-semibold">● Live</div>
                            </div>
                            <button 
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="p-3 rounded-xl bg-gray-800/50 border border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white transition-all duration-300"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <nav className="space-y-2 mb-8">
                            <a href="#" onClick={() => { setSelectedPage('home'); setIsMobileMenuOpen(false); }} className="flex items-center space-x-3 py-3 px-4 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800/50 transition-all duration-300">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                                </svg>
                                <span className="text-lg font-medium">Home</span>
                            </a>
                            <a href="#" onClick={() => { setSelectedPage('creators'); setIsMobileMenuOpen(false); }} className="flex items-center space-x-3 py-3 px-4 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800/50 transition-all duration-300">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                                </svg>
                                <span className="text-lg font-medium">Creators</span>
                            </a>
                            <a href="#" onClick={() => { handleCreatorStudioAccess(); setIsMobileMenuOpen(false); }} className="flex items-center space-x-3 py-3 px-4 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800/50 transition-all duration-300">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                                </svg>
                                <span className="text-lg font-medium">Dashboard</span>
                            </a>
                            <a href="#" onClick={() => { setSelectedPage('live-posts'); setIsMobileMenuOpen(false); }} className="flex items-center space-x-3 py-3 px-4 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800/50 transition-all duration-300">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                </svg>
                                <span className="text-lg font-medium">Get Naughty</span>
                            </a>
                        </nav>

                        <div className="space-y-4">
                            {user ? (
                                <>
                                    <div className="flex items-center space-x-3 mb-6 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                                        {userProfile?.photoURL && (
                                            <div className="relative">
                                                <img src={userProfile.photoURL} alt="Profile" width={50} height={50} className="w-12 h-12 rounded-full border-2 border-pink-500" />
                                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900"></div>
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <p className="text-white font-semibold text-lg">{userProfile?.displayName || user.displayName || 'User'}</p>
                                            <p className="text-gray-400 text-sm">{userProfile?.isCreator ? 'Creator' : 'User'}</p>
                                            {userProfile?.isProfileComplete && <span className="text-green-500 text-sm">✅ Verified</span>}
                                        </div>
                                    </div>
                                    <button onClick={() => { setSelectedPage('my-profile'); setIsMobileMenuOpen(false); }} className="w-full py-3 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white transition-all duration-300 font-medium">
                                        View My Profile
                                    </button>
                                    {userProfile?.isCreator && (
                                        <button onClick={() => { setSelectedPage('my-profile'); setIsMobileMenuOpen(false); }} className="w-full py-3 rounded-lg bg-pink-600 hover:bg-pink-700 text-white transition-all duration-300 font-medium">
                                            Manage Profile
                                        </button>
                                    )}
                                    <button onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} className="w-full py-3 rounded-lg border border-pink-600 text-pink-600 hover:bg-pink-600 hover:text-white transition-all duration-300 font-medium">
                                        Logout
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => { setIsLoginModal(true); setIsMobileMenuOpen(false); }} className="w-full py-3 rounded-lg border border-pink-600 text-pink-600 hover:bg-pink-600 hover:text-white transition-all duration-300 font-semibold">
                                        Login
                                    </button>
                                    <button 
                                        onClick={() => { setLoginModalInitialForm('signup'); setIsLoginModal(true); setIsMobileMenuOpen(false); }} 
                                        className="w-full py-3 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 transition-all duration-300 font-semibold"
                                    >
                                        Sign Up
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* Hero Section */}
            <section className="relative h-[80vh] flex items-center justify-center text-center">
                <div className="absolute inset-0">
                    <img
                        src="https://images.unsplash.com/photo-1648064139778-7ab990300d6e?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                        alt="Hero Background"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div className="absolute inset-0 bg-black opacity-50"></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent"></div>
                </div>
                <div className="relative z-10 max-w-2xl px-4">
                    <h1 className="text-5xl font-extrabold mb-4">
                        Capture the <span className="text-pink-600">Extraordinary</span>
                    </h1>
                    <p className="text-lg text-gray-300 mb-8">
                        Create stunning and unique content. Join thousands of photographers worldwide. Find the perfect image for your next project.
                    </p>
                    <div className="flex justify-center space-x-4">
                        <button onClick={handleCreatorStudioAccess} className="px-6 py-3 rounded-full bg-pink-600 hover:bg-pink-700 transition-colors">
                            Creator Studio &rarr;
                        </button>
                        <button onClick={() => setSelectedPage('browser-gallery')} className="px-6 py-3 rounded-full border border-gray-400 text-gray-300 hover:text-white hover:border-white transition-colors">
                            Browse Gallery &rarr;
                        </button>
                    </div>
                </div>
            </section>
            {/* Featured Creators Section */}
            <section className="py-16 px-6 md:px-12 bg-gray-950">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-200">Featured Creators</h2>
                    <div className="flex items-center space-x-2 text-sm text-pink-600">
                        <span>All (15,000+)</span>
                        <span>|</span>
                        <a href="#" onClick={() => setSelectedPage('creators')} className="hover:underline">Browse all creators</a>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
                    {(liveAudience.length > 0 ? liveAudience : creators).map((creator) => (
                        <CreatorCard key={creator.id || creator.uid} creator={creator} onViewProfile={setSelectedCreator} onLike={handleLike} />
                    ))}
                </div>
            </section>
            {/* Footer */}
            <footer className="bg-gray-900 py-16 px-6 md:px-12 text-gray-400 text-sm">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                    <div className="col-span-1 md:col-span-2">
                        <h4 className="text-lg font-bold text-white mb-2">Naughty Den</h4>
                        <p>A global community for creators and photo seekers. Connect, create, and get inspired.</p>
                    </div>
                    <div>
                        <h4 className="text-lg font-bold text-white mb-2">Explore</h4>
                        <ul>
                            <li className="mb-1"><a href="#" className="hover:underline">Gallery</a></li>
                            <li className="mb-1"><a href="#" onClick={() => setSelectedPage('live-posts')} className="hover:underline">Get Naughty</a></li>
                            <li className="mb-1"><a href="#" className="hover:underline">Community</a></li>
                            <li className="mb-1"><a href="#" className="hover:underline">Creator Events</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-lg font-bold text-white mb-2">Resources</h4>
                        <ul>
                            <li className="mb-1"><a href="#" className="hover:underline">Help &amp; FAQs</a></li>
                            <li className="mb-1"><a href="#" className="hover:underline">Privacy Policy</a></li>
                            <li className="mb-1"><a href="#" className="hover:underline">Terms of Service</a></li>
                            <li className="mb-1"><a href="#" className="hover:underline">Press &amp; Media</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-lg font-bold text-white mb-2">Stay in the loop</h4>
                        <p className="mb-2">Subscribe to our newsletter for exclusive content and updates.</p>
                        <div className="flex">
                            <input type="email" placeholder="Email Address" className="flex-1 p-2 rounded-l-lg bg-gray-800 border border-gray-700 focus:outline-none" />
                            <button className="px-4 py-2 rounded-r-lg bg-pink-600 hover:bg-pink-700 transition-colors">
                                Subscribe
                            </button>
                        </div>
                    </div>
                </div>
                <div className="text-center mt-8 pt-8 border-t border-gray-800">
                    &copy; 2025 Naughty Den. All rights reserved.
                </div>
            </footer>
            {isLoginModalOpen && <LoginModal auth={auth} onClose={() => { setIsLoginModal(false); setLoginModalInitialForm('login-choice'); }} onLogin={() => setSelectedPage('my-profile')} initialForm={loginModalInitialForm} />}
            {isProfileModalOpen && userProfile && (
                <EditProfileModal
                    profile={userProfile}
                    onClose={() => setIsProfileModalOpen(false)}
                    onSave={handleProfileSave}
                    isCreator={userProfile.isCreator}
                    db={db}
                    user={user}
                />
            )}
            {isVeriffKYCModalOpen && (
                <VeriffKYC 
                    onClose={() => setIsVeriffKYCModalOpen(false)} 
                    onVerificationComplete={handleVerificationComplete} 
                />
            )}
            
            {/* Creator Studio Neon Popup */}
            {showCreatorStudioPopup && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="relative bg-gray-900 border-2 border-pink-500 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
                        {/* Neon glow effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-sm"></div>
                        <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl"></div>
                        
                        {/* Close button */}
                        <button 
                            onClick={() => setShowCreatorStudioPopup(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        
                        {/* Content */}
                        <div className="relative z-10 text-center">
                            <div className="mb-6">
                                <div className="mb-4">
                                    <img src="/logo.png" alt="Naughty Den Logo" className="w-24 h-24 mx-auto object-contain" />
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-2">Creator Studio</h2>
                                <p className="text-gray-300 text-lg">
                                    {!user ? "Already mine? Log in. Not yet? Let's change that — sign up." : "Ready to become a creator? Let's get you started!"}
                                </p>
                            </div>
                            
                            <div className="space-y-3">
                                {!user ? (
                                    <>
                                        <button 
                                            onClick={() => { setShowCreatorStudioPopup(false); setIsLoginModal(true); setLoginModalInitialForm('login'); }}
                                            className="w-full py-3 px-6 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg shadow-pink-500/25"
                                        >
                                            Log In
                                        </button>
                                        <button 
                                            onClick={() => { setShowCreatorStudioPopup(false); setIsLoginModal(true); setLoginModalInitialForm('signup'); }}
                                            className="w-full py-3 px-6 border-2 border-pink-500 text-pink-500 hover:bg-pink-500 hover:text-white font-semibold rounded-lg transition-all duration-200"
                                        >
                                            Sign Up
                                        </button>
                                    </>
                                ) : (
                                    <button 
                                        onClick={() => { setShowCreatorStudioPopup(false); setSelectedPage('my-profile'); }}
                                        className="w-full py-3 px-6 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg shadow-pink-500/25"
                                    >
                                        Become a Creator
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            </div>
        </ErrorBoundary>
    );
};

export default App;
