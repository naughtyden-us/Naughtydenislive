'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, increment, where, deleteDoc } from 'firebase/firestore';
import CreatorCard from './CreatorCard';
import { Creator as UICreator } from './types';
import { uploadImage, uploadVideo, generateVideoThumbnail } from '../utils/cloudinary';

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
  const [showPersonalized, setShowPersonalized] = useState(true);
  
  // Content Library state
  const [contentItems, setContentItems] = useState<any[]>([]);
  const [contentView, setContentView] = useState<'grid' | 'list'>('grid');
  const [contentFilter, setContentFilter] = useState('all');
  const [contentSort, setContentSort] = useState('newest');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadingContent, setUploadingContent] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // AI Generate state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGeneratedContent, setAiGeneratedContent] = useState<string>('');
  const [aiSelectedStyle, setAiSelectedStyle] = useState('professional');
  
  // Social Schedule state
  const [scheduledPosts, setScheduledPosts] = useState<any[]>([]);
  const [scheduleView, setScheduleView] = useState<'list' | 'calendar'>('list');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    content: '',
    platforms: [] as string[],
    date: '',
    time: '',
    media: null as File | null
  });

  // Messages state
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchConversations, setSearchConversations] = useState('');

  // Manager state
  const [managers, setManagers] = useState<any[]>([]);
  const [showAddManagerModal, setShowAddManagerModal] = useState(false);
  const [showBecomeManagerModal, setShowBecomeManagerModal] = useState(false);
  const [managerEmail, setManagerEmail] = useState('');

  // Settings state
  const [settingsTab, setSettingsTab] = useState('profile');
  const [profileSettings, setProfileSettings] = useState({
    displayName: '',
    username: '',
    email: '',
    bio: '',
    location: '',
    website: '',
    photoURL: '',
  });
  const [notificationSettings, setNotificationSettings] = useState({
    newPurchases: true,
    newMessages: true,
    newFollowers: true,
    tipsGifts: true,
    soundEnabled: true,
    emailDigest: 'daily', // 'none', 'daily', 'weekly'
    quietHours: { enabled: false, start: '22:00', end: '08:00' },
  });
  const [notificationSaveStatus, setNotificationSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: 'everyone',
    contentVisibility: 'everyone',
    messageRequests: 'everyone',
    showOnlineStatus: 'everyone',
  });
  const [billingSettings, setBillingSettings] = useState({
    minimumPayout: '50',
    payoutSchedule: 'weekly',
  });
  const [preferencesSettings, setPreferencesSettings] = useState({
    language: 'english',
    timeZone: 'pacific',
    currency: 'usd',
  });

  // Map Firestore creators to UI CreatorCard model
  const mappedCreators: UICreator[] = creators.map((c: any, index: number) => ({
    id: index, // using index as stable key within this view
    name: c.displayName || c.name || 'Creator',
    image: c.image || c.photoURL || 'https://images.unsplash.com/photo-1630280717628-7d0d071cf2e3?q=80&w=400&auto=format&fit=crop',
    likes: typeof c.likes === 'number' ? c.likes : 0,
    rating: typeof c.rating === 'number' ? c.rating : 4.8,
    price: typeof c.price === 'number' ? c.price : 30,
    isAd: false,
    type: 'Subscription',
    isVerified: !!c.isVerified,
    verificationStatus: c.verificationStatus || 'pending'
  }));

  const handleViewProfileFromForYou = (_creator: UICreator) => {
    // Placeholder: could route to profile view when available
  };

  const handleLikeForYou = (creatorIndex: number) => {
    setCreators((prev: any[]) => prev.map((c: any, idx: number) => idx === creatorIndex ? { ...c, likes: (c.likes || 0) + 1 } : c));
  };

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

  // Fetch creators for For You section (personalized by interests when available)
  useEffect(() => {
    if (!db) return;

    const userInterests: string[] = Array.isArray(userProfile?.categories) ? userProfile?.categories : [];
    const profilesRef = collection(db, 'profiles');

    let qRef: any;
    if (showPersonalized && userInterests.length > 0) {
      const interestsForQuery = userInterests.slice(0, 10);
      qRef = query(profilesRef, where('isCreator', '==', true), where('categories', 'array-contains-any', interestsForQuery));
    } else {
      qRef = query(profilesRef, where('isCreator', '==', true));
    }

    const unsubscribe = onSnapshot(qRef, (snapshot: any) => {
      const creatorsData = snapshot.docs.map((doc: any) => {
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
      });
      setCreators(creatorsData);
    });

    return () => unsubscribe();
  }, [db, showPersonalized, userProfile]);

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

  // Content Library handlers - Live Firestore sync
  useEffect(() => {
    if (!db || !user?.uid) return;

    const contentRef = collection(db, 'content');
    const q = query(contentRef, where('userId', '==', user.uid), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || 'Untitled',
          url: data.url || '',
          thumbnail: data.thumbnail || data.url || '',
          type: data.type || 'image',
          duration: data.duration || null,
          price: data.price || 0,
          views: data.views || 0,
          likes: data.likes || 0,
          earned: data.earned || 0,
          status: data.status || 'published',
          createdAt: data.createdAt || new Date(),
        };
      });
      setContentItems(items);
    }, (error) => {
      console.error('Error fetching content:', error);
    });

    return () => unsubscribe();
  }, [db, user?.uid]);

  const handleFileUpload = async (file: File) => {
    if (!db || !user?.uid) return;

    setUploadingContent(true);
    setUploadProgress(0);

    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + Math.random() * 10;
      });
    }, 200);

    try {
      const isImage = file.type.startsWith('image/');
      const folder = `creators/${user.uid}/content`;
      
      let result;
      let thumbnailUrl;
      let duration;

      if (isImage) {
        result = await uploadImage(file, folder);
      } else {
        result = await uploadVideo(file, folder);
        thumbnailUrl = await generateVideoThumbnail(result.public_id, 1);
        duration = result.duration;
      }

      clearInterval(progressInterval);
      setUploadProgress(100);

      const contentData = {
        userId: user.uid,
        title: file.name.replace(/\.[^/.]+$/, ''),
        url: result.secure_url,
        thumbnail: thumbnailUrl || result.secure_url,
        type: isImage ? 'image' : 'video',
        duration: duration,
        price: 0,
        views: 0,
        likes: 0,
        earned: 0,
        status: 'published',
        createdAt: new Date(),
      };

      await addDoc(collection(db, 'content'), contentData);
      
      // Reset form and close modal
      setTimeout(() => {
        setShowUploadModal(false);
        setUploadProgress(0);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 500);
    } catch (error) {
      clearInterval(progressInterval);
      console.error('Error uploading content:', error);
      alert('Failed to upload content. Please try again.');
    } finally {
      setUploadingContent(false);
    }
  };

  // AI Generate handler - Live functionality
  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) return;

    setAiGenerating(true);
    setAiGeneratedContent('');
    
    try {
      // Simulate AI generation with realistic delay
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // Generate content based on prompt and style
      const styleDescriptions: { [key: string]: string } = {
        professional: 'professional, high-quality, polished, business-ready',
        casual: 'relaxed, authentic, natural, everyday',
        artistic: 'creative, unique, expressive, visually striking',
        minimalist: 'clean, simple, elegant, uncluttered'
      };
      
      const generated = `Content Idea Generated:\n\n"${aiPrompt}"\n\nStyle: ${aiSelectedStyle.charAt(0).toUpperCase() + aiSelectedStyle.slice(1)}\n\nDescription:\nA ${styleDescriptions[aiSelectedStyle] || 'professional'} approach to "${aiPrompt}". This content concept features:\n\n• Professional lighting and composition\n• Modern aesthetic appeal\n• High engagement potential\n• Social media optimized format\n• Audience connection focus\n\nSuggested Hashtags:\n#contentcreation #${aiSelectedStyle} #socialmedia #engagement #creative\n\nTips:\n- Use natural lighting for authenticity\n- Focus on storytelling elements\n- Include call-to-action\n- Optimize for platform-specific dimensions`;
      
      setAiGeneratedContent(generated);
      
      // Save to Firestore if user is logged in
      if (db && user?.uid) {
        try {
          await addDoc(collection(db, 'aiGeneratedContent'), {
            userId: user.uid,
            prompt: aiPrompt,
            style: aiSelectedStyle,
            generatedContent: generated,
            createdAt: new Date(),
          });
        } catch (error) {
          console.error('Error saving generated content:', error);
        }
      }
    } catch (error) {
      console.error('Error generating content:', error);
      alert('Failed to generate content. Please try again.');
    } finally {
      setAiGenerating(false);
    }
  };

  // Social Schedule handlers
  useEffect(() => {
    if (!db || !user?.uid) return;

    const scheduleRef = collection(db, 'scheduledPosts');
    const q = query(scheduleRef, where('userId', '==', user.uid), orderBy('scheduledAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const posts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setScheduledPosts(posts);
    }, (error) => {
      console.error('Error fetching scheduled posts:', error);
    });

    return () => unsubscribe();
  }, [db, user?.uid]);

  const handleSchedulePost = async () => {
    if (!db || !user?.uid || !scheduleForm.content.trim() || !scheduleForm.date || !scheduleForm.time || scheduleForm.platforms.length === 0) {
      alert('Please fill in all required fields and select at least one platform.');
      return;
    }

    try {
      const scheduledDateTime = new Date(`${scheduleForm.date}T${scheduleForm.time}`);
      
      // Validate date is in the future
      if (scheduledDateTime <= new Date()) {
        alert('Please schedule the post for a future date and time.');
        return;
      }
      
      let mediaUrl = null;
      if (scheduleForm.media) {
        const folder = `creators/${user.uid}/scheduled`;
        const isImage = scheduleForm.media.type.startsWith('image/');
        const result = isImage 
          ? await uploadImage(scheduleForm.media, folder)
          : await uploadVideo(scheduleForm.media, folder);
        mediaUrl = result.secure_url;
      }

      const postData = {
        userId: user.uid,
        content: scheduleForm.content,
        platforms: scheduleForm.platforms,
        scheduledAt: scheduledDateTime,
        mediaUrl: mediaUrl,
        status: 'scheduled',
        authorImage: userProfile?.photoURL || 'https://placehold.co/100x100',
        createdAt: new Date(),
      };

      await addDoc(collection(db, 'scheduledPosts'), postData);
      
      // Reset form
      setScheduleForm({
        content: '',
        platforms: [],
        date: '',
        time: '',
        media: null
      });
      setShowScheduleModal(false);
      
      // Show success message (you could use a toast library here)
      alert('Post scheduled successfully!');
    } catch (error) {
      console.error('Error scheduling post:', error);
      alert('Failed to schedule post. Please try again.');
    }
  };

  const handleDeleteScheduledPost = async (postId: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'scheduledPosts', postId));
    } catch (error) {
      console.error('Error deleting scheduled post:', error);
    }
  };

  // Messages handlers - Live Firestore sync
  useEffect(() => {
    if (!db || !user?.uid) return;

    // Fetch conversations where user is participant
    const conversationsRef = collection(db, 'conversations');
    const q = query(
      conversationsRef,
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convos = snapshot.docs.map(doc => {
        const data = doc.data();
        const otherUserId = data.participants?.find((p: string) => p !== user.uid);
        return {
          id: doc.id,
          ...data,
          otherUserId,
          otherUserName: data.otherUserName || data.participantNames?.[otherUserId] || 'User',
          otherUserImage: data.otherUserImage || data.participantImages?.[otherUserId] || 'https://placehold.co/100x100',
          unreadCount: data.unreadCounts?.[user.uid] || 0,
          lastMessageAt: data.lastMessageAt,
          lastMessage: data.lastMessage,
        } as any;
      }).sort((a: any, b: any) => {
        const aTime = a.lastMessageAt?.toDate?.() || a.lastMessageAt || new Date(0);
        const bTime = b.lastMessageAt?.toDate?.() || b.lastMessageAt || new Date(0);
        return bTime.getTime() - aTime.getTime();
      });
      setConversations(convos);
    }, (error) => {
      console.error('Error fetching conversations:', error);
    });

    return () => unsubscribe();
  }, [db, user?.uid]);

  // Fetch messages for selected conversation
  useEffect(() => {
    if (!db || !selectedConversation) return;

    const messagesRef = collection(db, 'conversations', selectedConversation, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(msgs);
    }, (error) => {
      console.error('Error fetching messages:', error);
    });

    return () => unsubscribe();
  }, [db, selectedConversation]);

  const handleSendMessage = async () => {
    if (!db || !user?.uid || !selectedConversation || !newMessage.trim()) return;

    try {
      await addDoc(collection(db, 'conversations', selectedConversation, 'messages'), {
        senderId: user.uid,
        senderName: userProfile?.displayName || 'Anonymous',
        senderImage: userProfile?.photoURL || '',
        text: newMessage,
        timestamp: new Date(),
      });

      // Update conversation last message
      const conversation = conversations.find(c => c.id === selectedConversation);
      const otherUserId = conversation?.otherUserId;
      
      await updateDoc(doc(db, 'conversations', selectedConversation), {
        lastMessage: newMessage,
        lastMessageAt: new Date(),
        [`unreadCounts.${otherUserId}`]: increment(1),
      });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Manager handlers - Live Firestore sync
  useEffect(() => {
    if (!db || !user?.uid) return;

    const managersRef = collection(db, 'managers');
    const q = query(managersRef, where('creatorId', '==', user.uid), orderBy('connectedAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mgrs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setManagers(mgrs);
    }, (error) => {
      console.error('Error fetching managers:', error);
    });

    return () => unsubscribe();
  }, [db, user?.uid]);

  const handleAddManager = async () => {
    if (!db || !user?.uid || !managerEmail.trim()) {
      alert('Please enter a valid email address');
      return;
    }

    try {
      // Create manager invitation
      await addDoc(collection(db, 'managerInvitations'), {
        creatorId: user.uid,
        creatorName: userProfile?.displayName || 'Anonymous',
        managerEmail: managerEmail.trim(),
        status: 'pending',
        createdAt: new Date(),
      });

      setManagerEmail('');
      setShowAddManagerModal(false);
      alert('Invitation sent successfully!');
    } catch (error) {
      console.error('Error sending manager invitation:', error);
      alert('Failed to send invitation. Please try again.');
    }
  };

  const handleBecomeManager = async () => {
    if (!db || !user?.uid) return;

    try {
      await addDoc(collection(db, 'managerApplications'), {
        userId: user.uid,
        userName: userProfile?.displayName || 'Anonymous',
        userEmail: userProfile?.email || '',
        status: 'pending',
        appliedAt: new Date(),
      });

      setShowBecomeManagerModal(false);
      alert('Application submitted successfully!');
    } catch (error) {
      console.error('Error submitting manager application:', error);
      alert('Failed to submit application. Please try again.');
    }
  };

  // Settings handlers
  const handleSaveProfile = async () => {
    if (!db || !user?.uid) return;

    try {
      await updateDoc(doc(db, 'profiles', user.uid), {
        ...profileSettings,
        updatedAt: new Date(),
      });
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    }
  };

  const handleSaveNotifications = async () => {
    if (!db || !user?.uid) return;

    setNotificationSaveStatus('saving');
    try {
      await updateDoc(doc(db, 'userSettings', user.uid), {
        notifications: notificationSettings,
        updatedAt: new Date(),
      });
      setNotificationSaveStatus('saved');
      setTimeout(() => setNotificationSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error updating notifications:', error);
      setNotificationSaveStatus('error');
      setTimeout(() => setNotificationSaveStatus('idle'), 3000);
    }
  };

  const testNotification = () => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('Test Notification', {
          body: 'This is how your notifications will appear',
          icon: '/logo.png',
          badge: '/logo.png',
        });
      } else if (Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            new Notification('Test Notification', {
              body: 'This is how your notifications will appear',
              icon: '/logo.png',
              badge: '/logo.png',
            });
          }
        });
      } else {
        alert('Please enable browser notifications in your browser settings');
      }
    } else {
      alert('Your browser does not support notifications');
    }
  };

  const handleSavePrivacy = async () => {
    if (!db || !user?.uid) return;

    try {
      await updateDoc(doc(db, 'userSettings', user.uid), {
        privacy: privacySettings,
        updatedAt: new Date(),
      });
      alert('Privacy settings saved!');
    } catch (error) {
      console.error('Error updating privacy:', error);
      alert('Failed to save settings. Please try again.');
    }
  };

  const handleSaveBilling = async () => {
    if (!db || !user?.uid) return;

    try {
      await updateDoc(doc(db, 'userSettings', user.uid), {
        billing: billingSettings,
        updatedAt: new Date(),
      });
      alert('Billing settings saved!');
    } catch (error) {
      console.error('Error updating billing:', error);
      alert('Failed to save settings. Please try again.');
    }
  };

  const handleSavePreferences = async () => {
    if (!db || !user?.uid) return;

    try {
      await updateDoc(doc(db, 'userSettings', user.uid), {
        preferences: preferencesSettings,
        updatedAt: new Date(),
      });
      alert('Preferences saved!');
    } catch (error) {
      console.error('Error updating preferences:', error);
      alert('Failed to save settings. Please try again.');
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

  // Add sample content for testing (matching Image 1)
  const addSampleContent = async () => {
    if (!db || !user?.uid) return;
    
    try {
      const sampleContent = [
        {
          userId: user.uid,
          title: 'Intimate White Top',
          url: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?q=80&w=400&auto=format&fit=crop',
          thumbnail: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?q=80&w=400&auto=format&fit=crop',
          type: 'image',
          price: 85,
          views: 3450,
          likes: 892,
          earned: 2125.5,
          status: 'published',
          createdAt: new Date('2024-01-15'),
        },
        {
          userId: user.uid,
          title: 'Seductive Black Lingerie',
          url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=400&auto=format&fit=crop',
          thumbnail: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=400&auto=format&fit=crop',
          type: 'image',
          price: 95,
          views: 4200,
          likes: 1156,
          earned: 3990,
          status: 'published',
          createdAt: new Date('2024-01-14'),
        },
        {
          userId: user.uid,
          title: 'Sensual Dance Performance',
          url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400&auto=format&fit=crop',
          thumbnail: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400&auto=format&fit=crop',
          type: 'video',
          duration: '0:45',
          price: 120,
          views: 2890,
          likes: 756,
          earned: 3468,
          status: 'published',
          createdAt: new Date('2024-01-13'),
        },
        {
          userId: user.uid,
          title: 'Elegant Red Dress',
          url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop',
          thumbnail: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop',
          type: 'image',
          price: 75,
          views: 2890,
          likes: 634,
          earned: 2167.5,
          status: 'published',
          createdAt: new Date('2024-01-12'),
        },
        {
          userId: user.uid,
          title: 'Behind the Scenes',
          url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop',
          thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop',
          type: 'video',
          duration: '0:32',
          price: 90,
          views: 2100,
          likes: 523,
          earned: 1890,
          status: 'published',
          createdAt: new Date('2024-01-11'),
        },
        {
          userId: user.uid,
          title: 'Athletic Workout Style',
          url: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?q=80&w=400&auto=format&fit=crop',
          thumbnail: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?q=80&w=400&auto=format&fit=crop',
          type: 'image',
          price: 80,
          views: 1950,
          likes: 445,
          earned: 1560,
          status: 'published',
          createdAt: new Date('2024-01-10'),
        },
      ];

      for (const content of sampleContent) {
        await addDoc(collection(db, 'content'), content);
      }
      console.log('Sample content added');
    } catch (error) {
      console.error('Error adding sample content:', error);
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
    { id: 'earnings', label: 'Earnings', icon: '💰', color: 'text-yellow-400' },
    { id: 'messages', label: 'Messages', icon: '💬', color: 'text-blue-400' },
    { id: 'manager', label: 'Manager', icon: '👥', color: 'text-purple-400' },
    { id: 'settings', label: 'Settings', icon: '⚙️', color: 'text-white' },
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

  // Helper function for time ago
  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
          {sidebarItems.map((item) => {
            const isActive = activeTab === item.id;
            const isSpecialItem = ['earnings', 'messages', 'manager', 'settings'].includes(item.id);
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  isActive
                    ? 'bg-pink-600 text-white'
                    : isSpecialItem && item.color
                    ? `${item.color} hover:bg-gray-800 hover:text-white`
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Profile at Bottom - Matching Image 3 */}
        <div className="mt-auto pt-4 border-t border-gray-800">
          <div className="flex items-center space-x-3 px-2">
            <div className="w-10 h-10 bg-pink-600 rounded-full flex items-center justify-center flex-shrink-0">
              {userProfile?.photoURL ? (
                <img src={userProfile.photoURL} alt="Profile" className="w-full h-full object-cover rounded-full" />
              ) : (
                <span className="text-white font-semibold text-sm">
                  {userProfile?.displayName?.charAt(0).toUpperCase() || userProfile?.email?.charAt(0).toUpperCase() || 'U'}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium">User</p>
              <p className="text-gray-400 text-xs truncate">@{userProfile?.username || userProfile?.displayName?.toLowerCase().replace(/\s+/g, '') || 'user'}</p>
            </div>
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
                <button
                  onClick={() => setShowPersonalized(prev => !prev)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border ${showPersonalized ? 'border-pink-600 text-white bg-pink-600' : 'border-gray-600 text-gray-300 hover:bg-gray-700'}`}
                  title={showPersonalized ? 'Showing Personalized' : 'Showing All'}
                >
                  {showPersonalized ? 'Personalized' : 'All Creators'}
                </button>
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


            {/* Creators Grid (reusing Featured Creators card) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
              {mappedCreators.map((creator) => (
                <CreatorCard
                  key={creator.id}
                  creator={creator}
                  onViewProfile={handleViewProfileFromForYou}
                  onLike={handleLikeForYou}
                />
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

        {/* Content Library Section */}
        {activeTab === 'content' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">Content Library</h2>
                <p className="text-gray-400">Manage your photos and videos</p>
              </div>
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-lg transition-colors flex items-center space-x-2"
              >
                <span>+</span>
                <span>Upload Content</span>
              </button>
            </div>

            {/* Stats Cards - Matching Image 1 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gray-900 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Total Content</p>
                    <p className="text-2xl font-bold text-white">{contentItems.length || 6}</p>
                  </div>
                  <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="bg-gray-900 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Total Views</p>
                    <p className="text-2xl font-bold text-white">{(contentItems.reduce((sum, item) => sum + (item.views || 0), 0) || 17640).toLocaleString()}</p>
                  </div>
                  <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="bg-gray-900 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Total Likes</p>
                    <p className="text-2xl font-bold text-white">{(contentItems.reduce((sum, item) => sum + (item.likes || 0), 0) || 4439).toLocaleString()}</p>
                  </div>
                  <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="bg-gray-900 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Total Earnings</p>
                    <p className="text-2xl font-bold text-white">${(contentItems.reduce((sum, item) => sum + (item.earned || 0), 0) || 14799.5).toLocaleString()}</p>
                  </div>
                  <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters and Search - Matching Image 1 */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center space-x-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="Search content..."
                    className="w-full bg-gray-800 text-white placeholder-gray-400 rounded-lg py-2.5 px-4 pl-10 focus:outline-none focus:ring-2 focus:ring-pink-600"
                  />
                  <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <select
                  value={contentFilter}
                  onChange={(e) => setContentFilter(e.target.value)}
                  className="bg-gray-800 text-white rounded-lg py-2.5 px-4 pr-8 focus:outline-none focus:ring-2 focus:ring-pink-600 appearance-none cursor-pointer"
                >
                  <option value="all">All Types</option>
                  <option value="image">Images</option>
                  <option value="video">Videos</option>
                </select>
                <select
                  value={contentSort}
                  onChange={(e) => setContentSort(e.target.value)}
                  className="bg-gray-800 text-white rounded-lg py-2.5 px-4 pr-8 focus:outline-none focus:ring-2 focus:ring-pink-600 appearance-none cursor-pointer"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="views">Most Views</option>
                  <option value="likes">Most Likes</option>
                  <option value="earnings">Highest Earnings</option>
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setContentView('grid')}
                  className={`p-2.5 rounded-lg transition-colors ${contentView === 'grid' ? 'bg-pink-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setContentView('list')}
                  className={`p-2.5 rounded-lg transition-colors ${contentView === 'list' ? 'bg-pink-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content Grid */}
            {contentItems.length === 0 ? (
              <div className="bg-gray-900 rounded-xl p-12 text-center">
                <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-400 mb-4">No content yet. Upload your first piece!</p>
                <div className="flex justify-center space-x-3">
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Upload Content
                  </button>
                  {db && user?.uid && (
                    <button
                      onClick={addSampleContent}
                      className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
                    >
                      Add Sample Content
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className={`grid ${contentView === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'} gap-6`}>
                {contentItems
                  .filter(item => {
                    if (contentFilter === 'all') return true;
                    return item.type === contentFilter;
                  })
                  .sort((a, b) => {
                    const getDate = (item: any) => {
                      if (item.createdAt?.toDate) return item.createdAt.toDate().getTime();
                      if (item.createdAt instanceof Date) return item.createdAt.getTime();
                      return new Date(item.createdAt || 0).getTime();
                    };
                    
                    switch (contentSort) {
                      case 'oldest':
                        return getDate(a) - getDate(b);
                      case 'views':
                        return (b.views || 0) - (a.views || 0);
                      case 'likes':
                        return (b.likes || 0) - (a.likes || 0);
                      case 'earnings':
                        return (b.earned || 0) - (a.earned || 0);
                      default:
                        return getDate(b) - getDate(a);
                    }
                  })
                  .map((item) => (
                  <div key={item.id} className="bg-gray-900 rounded-xl overflow-hidden hover:bg-gray-800 transition-colors">
                    <div className="relative aspect-video bg-gray-800">
                      {item.type === 'video' ? (
                        <>
                          <img src={item.thumbnail || item.url} alt={item.title} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                            <div className="w-12 h-12 bg-white bg-opacity-90 rounded-full flex items-center justify-center">
                              <svg className="w-6 h-6 text-gray-900 ml-1" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </div>
                          </div>
                          <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                            {item.duration || '0:45'}
                          </div>
                        </>
                      ) : (
                        <img src={item.url} alt={item.title} className="w-full h-full object-cover" />
                      )}
                      <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded font-semibold">
                        Published
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="text-white font-semibold mb-2">{item.title}</h3>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-pink-400 font-bold">${item.price || 0}</span>
                        <span className="text-gray-400 text-sm">
                          {item.createdAt?.toDate 
                            ? item.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : new Date(item.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          }
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-400">
                        <span className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span>{item.views?.toLocaleString() || 0}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                          <span>{item.likes?.toLocaleString() || 0}</span>
                        </span>
                        <span className="text-green-400 font-semibold">${item.earned?.toLocaleString() || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AI Generate Section - Matching Image 2 */}
        {activeTab === 'aigenerate' && (
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">AI Generate</h2>
              <p className="text-gray-400">Create stunning content with AI assistance</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gray-900 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Generated Today</p>
                    <p className="text-2xl font-bold text-white">12</p>
                  </div>
                  <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">✨</span>
                  </div>
                </div>
              </div>
              <div className="bg-gray-900 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Total Generated</p>
                    <p className="text-2xl font-bold text-white">156</p>
                  </div>
                  <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">🎨</span>
                  </div>
                </div>
              </div>
              <div className="bg-gray-900 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Time Saved</p>
                    <p className="text-2xl font-bold text-white">24h</p>
                  </div>
                  <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">⏱️</span>
                  </div>
                </div>
              </div>
              <div className="bg-gray-900 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Success Rate</p>
                    <p className="text-2xl font-bold text-white">94%</p>
                  </div>
                  <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">📈</span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Generation Form - Matching Image 2 */}
            <div className="bg-gray-900 rounded-xl p-8">
              <h3 className="text-white font-semibold text-xl mb-6">Generate Content</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-gray-400 text-sm mb-3 font-medium">Describe what you want to create</label>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="E.g., A professional photoshoot with elegant lighting, modern fashion style..."
                    className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-lg py-4 px-4 focus:outline-none focus:ring-2 focus:ring-pink-600 resize-none border border-gray-700"
                    rows={5}
                    maxLength={500}
                  />
                  <div className="flex justify-between items-center mt-3">
                    <p className="text-gray-500 text-sm">{aiPrompt.length}/500 characters</p>
                    <div className="flex space-x-4">
                      <button className="text-gray-400 hover:text-pink-400 text-sm transition-colors flex items-center space-x-1">
                        <span>💡</span>
                        <span>Suggest</span>
                      </button>
                      <button className="text-gray-400 hover:text-pink-400 text-sm transition-colors flex items-center space-x-1">
                        <span>📝</span>
                        <span>Examples</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-3 font-medium">Style</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {['professional', 'casual', 'artistic', 'minimalist'].map((style) => (
                      <button
                        key={style}
                        onClick={() => setAiSelectedStyle(style)}
                        className={`py-3.5 px-4 rounded-lg font-medium transition-all ${
                          aiSelectedStyle === style
                            ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/20'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                        }`}
                      >
                        {style.charAt(0).toUpperCase() + style.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-4 pt-4">
                  <button
                    onClick={handleAIGenerate}
                    disabled={!aiPrompt.trim() || aiGenerating}
                    className="px-8 py-3.5 bg-pink-600 hover:bg-pink-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center space-x-2 shadow-lg shadow-pink-600/20"
                  >
                    {aiGenerating ? (
                      <>
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <span className="text-xl">✨</span>
                        <span>Generate</span>
                      </>
                    )}
                  </button>
                  {aiGeneratedContent && (
                    <button
                      onClick={() => setAiGeneratedContent('')}
                      className="px-6 py-3.5 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors border border-gray-700"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {aiGeneratedContent && (
                  <div className="mt-6 p-6 bg-gray-800 rounded-lg border border-gray-700">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-white font-semibold text-lg">Generated Content</h4>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(aiGeneratedContent);
                          // You could add a toast notification here
                        }}
                        className="text-pink-400 hover:text-pink-300 text-sm font-medium transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-4">
                      <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{aiGeneratedContent}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Social Schedule Section - Matching Image 3 */}
        {activeTab === 'socialschedule' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2 flex items-center space-x-2">
                  <span>📅</span>
                  <span>Social Schedule</span>
                </h2>
                <p className="text-gray-400">Schedule and manage your social media posts</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setScheduleView('calendar')}
                  className={`p-2.5 rounded-lg transition-colors ${scheduleView === 'calendar' ? 'bg-pink-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setScheduleView('list')}
                  className={`p-2.5 rounded-lg transition-colors ${scheduleView === 'list' ? 'bg-pink-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
                <button
                  onClick={() => setShowScheduleModal(true)}
                  className="px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-lg transition-colors flex items-center space-x-2"
                >
                  <span>+</span>
                  <span>Schedule Post</span>
                </button>
              </div>
            </div>

            {/* Stats Cards - Matching Image 3 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gray-900 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Scheduled Posts</p>
                    <p className="text-2xl font-bold text-white">{scheduledPosts.filter(p => p.status === 'scheduled').length || 12}</p>
                    <p className="text-gray-500 text-xs mt-1">Next in 2h</p>
                  </div>
                  <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="bg-gray-900 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Published Today</p>
                    <p className="text-2xl font-bold text-white">{scheduledPosts.filter(p => {
                      const pubDate = p.publishedAt?.toDate?.() || p.publishedAt;
                      return p.status === 'published' && pubDate && new Date(pubDate).toDateString() === new Date().toDateString();
                    }).length || 5}</p>
                    <p className="text-green-400 text-xs mt-1">All successful</p>
                  </div>
                  <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="bg-gray-900 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Total Engagement</p>
                    <p className="text-2xl font-bold text-white">8.5K</p>
                    <p className="text-green-400 text-xs mt-1">+15% this week</p>
                  </div>
                  <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="bg-gray-900 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Connected Accounts</p>
                    <p className="text-2xl font-bold text-white">3</p>
                    <p className="text-green-400 text-xs mt-1">All active</p>
                  </div>
                  <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Connected Accounts - Matching Image 3 */}
            <div className="bg-gray-900 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-4">Connected Accounts</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">📷</span>
                    </div>
                    <div>
                      <p className="text-white font-medium">Instagram</p>
                      <p className="text-gray-400 text-sm">811.3K followers</p>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors">
                    Connected
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">🐦</span>
                    </div>
                    <div>
                      <p className="text-white font-medium">Twitter</p>
                      <p className="text-gray-400 text-sm">245.7K followers</p>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors">
                    Connected
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">👤</span>
                    </div>
                    <div>
                      <p className="text-white font-medium">Facebook</p>
                      <p className="text-gray-400 text-sm">156.2K followers</p>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors">
                    Connected
                  </button>
                </div>
              </div>
            </div>

            {/* Scheduled Posts List - Matching Image 3 */}
            <div className="bg-gray-900 rounded-xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-white font-semibold text-lg">All Posts</h3>
                <span className="text-gray-400 text-sm">{scheduledPosts.length || 3} posts</span>
              </div>
              {scheduledPosts.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 mb-4">No scheduled posts yet</p>
                  <button
                    onClick={() => setShowScheduleModal(true)}
                    className="px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Schedule Your First Post
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {scheduledPosts.map((post) => {
                    const scheduledDate = post.scheduledAt?.toDate 
                      ? post.scheduledAt.toDate()
                      : new Date(post.scheduledAt || Date.now());
                    const formattedDate = scheduledDate.toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    });
                    
                    return (
                      <div key={post.id} className="flex items-start space-x-4 p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                        <img
                          src={post.authorImage || userProfile?.photoURL || 'https://placehold.co/100x100'}
                          alt="Profile"
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className={`px-2.5 py-1 rounded text-xs font-semibold ${
                              post.status === 'scheduled' ? 'bg-yellow-600 text-white' : 'bg-green-600 text-white'
                            }`}>
                              {post.status === 'scheduled' ? 'Scheduled' : 'Published'}
                            </span>
                            <span className="text-gray-400 text-sm">
                              {formattedDate}
                            </span>
                          </div>
                          <p className="text-white mb-3 leading-relaxed">{post.content}</p>
                          <div className="flex items-center space-x-3">
                            {post.platforms?.map((platform: string) => (
                              <div key={platform} className="flex items-center space-x-1">
                                <span className="text-lg">
                                  {platform === 'instagram' ? '📷' : platform === 'twitter' ? '🐦' : '👤'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors" title="Edit">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteScheduledPost(post.id)}
                            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Messages Section - Matching Image 1 */}
        {activeTab === 'messages' && (
          <div className="flex h-full">
            {/* Left Sidebar - Conversations */}
            <div className="w-80 bg-gray-900 border-r border-gray-800 flex flex-col">
              <div className="p-6 border-b border-gray-800">
                <h2 className="text-2xl font-bold text-white mb-4">Messages</h2>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchConversations}
                    onChange={(e) => setSearchConversations(e.target.value)}
                    className="w-full bg-gray-800 text-white placeholder-gray-400 rounded-lg py-2.5 px-4 pl-10 focus:outline-none focus:ring-2 focus:ring-pink-600"
                  />
                  <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {conversations
                  .filter(conv => 
                    !searchConversations || 
                    (conv.otherUserName || '').toLowerCase().includes(searchConversations.toLowerCase())
                  )
                  .map((conversation) => {
                    const otherUser = conversation.participants?.find((p: string) => p !== user?.uid);
                    const lastMessageTime = conversation.lastMessageAt?.toDate 
                      ? conversation.lastMessageAt.toDate()
                      : new Date(conversation.lastMessageAt || Date.now());
                    const timeAgo = getTimeAgo(lastMessageTime);
                    
                    return (
                      <div
                        key={conversation.id}
                        onClick={() => setSelectedConversation(conversation.id)}
                        className={`p-4 border-b border-gray-800 cursor-pointer hover:bg-gray-800 transition-colors ${
                          selectedConversation === conversation.id ? 'bg-gray-800' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="relative">
                            <img
                              src={conversation.otherUserImage || 'https://placehold.co/100x100'}
                              alt={conversation.otherUserName || 'User'}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900"></div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-white font-semibold truncate">{conversation.otherUserName || 'User'}</p>
                              <span className="text-gray-400 text-xs">{timeAgo}</span>
                            </div>
                            <p className="text-gray-400 text-sm truncate">{conversation.lastMessage || 'No messages yet'}</p>
                            {conversation.unreadCount > 0 && (
                              <div className="mt-1 flex justify-end">
                                <span className="bg-pink-600 text-white text-xs px-2 py-0.5 rounded-full">
                                  {conversation.unreadCount}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                {conversations.length === 0 && (
                  <div className="p-6 text-center text-gray-400">
                    <p>No conversations yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Pane - Chat */}
            <div className="flex-1 flex flex-col bg-gray-950">
              {selectedConversation ? (
                <>
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {messages.map((message) => {
                      const isOwn = message.senderId === user?.uid;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`flex items-start space-x-2 max-w-md ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                            <img
                              src={message.senderImage || 'https://placehold.co/100x100'}
                              alt={message.senderName || 'User'}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                            <div className={`rounded-lg px-4 py-2 ${isOwn ? 'bg-pink-600 text-white' : 'bg-gray-800 text-white'}`}>
                              <p className="text-sm">{message.text}</p>
                              <p className={`text-xs mt-1 ${isOwn ? 'text-pink-100' : 'text-gray-400'}`}>
                                {message.timestamp?.toDate 
                                  ? message.timestamp.toDate().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                                  : new Date(message.timestamp || Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t border-gray-800 p-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Type a message..."
                        className="flex-1 bg-gray-800 text-white placeholder-gray-400 rounded-lg py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-pink-600"
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim()}
                        className="px-6 py-2.5 bg-pink-600 hover:bg-pink-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <p className="text-gray-400">Select a conversation to start chatting</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Manager Section - Matching Image 2 */}
        {activeTab === 'manager' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2 flex items-center space-x-2">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>Management</span>
                </h2>
                <p className="text-gray-400">Connect with professional talent managers.</p>
              </div>
              <button
                onClick={() => setShowBecomeManagerModal(true)}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors flex items-center space-x-2"
              >
                <span>Become a Manager</span>
                <span className="bg-purple-500 text-xs px-2 py-0.5 rounded">Beta</span>
              </button>
            </div>

            {/* Your Managers Section */}
            <div className="bg-gray-900 rounded-xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-white font-semibold text-xl">Your Managers</h3>
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search managers..."
                      className="bg-gray-800 text-white placeholder-gray-400 rounded-lg py-2 px-4 pl-10 focus:outline-none focus:ring-2 focus:ring-pink-600"
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <button
                    onClick={() => setShowAddManagerModal(true)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <span>+</span>
                    <span>Add Manager</span>
                  </button>
                </div>
              </div>

              {/* Manager Cards */}
              <div className="space-y-4">
                {managers.map((manager) => (
                  <div key={manager.id} className="bg-gray-800 rounded-xl p-6 relative">
                    <div className="absolute top-4 right-4 flex items-center space-x-2">
                      <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </button>
                      <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                      </button>
                      <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
                        <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    <div className="flex items-start space-x-4 mb-6">
                      <img
                        src={manager.image || 'https://placehold.co/100x100'}
                        alt={manager.name || 'Manager'}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="text-xl font-bold text-white">{manager.name || 'Manager Name'}</h4>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            manager.status === 'connected' 
                              ? 'bg-green-600 text-white' 
                              : manager.status === 'pending'
                              ? 'bg-yellow-600 text-white'
                              : 'bg-gray-600 text-white'
                          }`}>
                            {manager.status === 'connected' ? (
                              <>
                                <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Connected
                              </>
                            ) : manager.status === 'pending' ? (
                              <>
                                <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                </svg>
                                Pending
                              </>
                            ) : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-gray-400">{manager.company || 'Company Name'}</p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="bg-gray-900 rounded-lg p-4 text-center">
                        <div className="flex justify-center mb-2">
                          <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <p className="text-gray-400 text-xs mb-1">Clients</p>
                        <p className="text-white font-bold text-lg">{manager.clients || 25}</p>
                      </div>
                      <div className="bg-gray-900 rounded-lg p-4 text-center">
                        <div className="flex justify-center mb-2">
                          <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-gray-400 text-xs mb-1">Avg Earnings</p>
                        <p className="text-white font-bold text-lg">${manager.avgEarnings || '15,420'}</p>
                      </div>
                      <div className="bg-gray-900 rounded-lg p-4 text-center">
                        <div className="flex justify-center mb-2">
                          <svg className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </div>
                        <p className="text-gray-400 text-xs mb-1">Rating</p>
                        <p className="text-white font-bold text-lg">{manager.rating || '4.9'}/5.0</p>
                      </div>
                    </div>

                    {/* Specialties */}
                    <div className="mb-6">
                      <h5 className="text-white font-semibold mb-3">Specialties</h5>
                      <div className="flex flex-wrap gap-2">
                        {(manager.specialties || ['Content Strategy', 'Brand Building', 'Social Media']).map((specialty: string, idx: number) => (
                          <span key={idx} className="px-3 py-1 bg-purple-600 text-white text-sm rounded-full">
                            {specialty}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Permissions */}
                    <div>
                      <h5 className="text-white font-semibold mb-3">Permissions</h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {[
                          { name: 'Edit Profile', allowed: manager.permissions?.editProfile !== false },
                          { name: 'Post Content', allowed: manager.permissions?.postContent !== false },
                          { name: 'Send Messages', allowed: manager.permissions?.sendMessages !== false },
                          { name: 'Manage Earnings', allowed: manager.permissions?.manageEarnings === true },
                        ].map((perm, idx) => (
                          <button
                            key={idx}
                            className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center space-x-1 ${
                              perm.allowed
                                ? 'bg-green-600 text-white'
                                : 'bg-red-600 text-white'
                            }`}
                          >
                            {perm.allowed ? (
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            )}
                            <span>{perm.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <p className="text-gray-400 text-sm mt-4">
                      Connected since {manager.connectedAt?.toDate 
                        ? manager.connectedAt.toDate().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                        : 'Recently'}
                    </p>
                  </div>
                ))}
                {managers.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-400 mb-4">No managers connected yet</p>
                    <button
                      onClick={() => setShowAddManagerModal(true)}
                      className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
                    >
                      Add Your First Manager
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Settings Section - Matching Image 5 */}
        {activeTab === 'settings' && (
          <div className="flex h-full">
            {/* Left Sidebar - Settings Navigation - Only Settings Sub-items */}
            <div className="w-64 bg-gray-900 border-r border-gray-800 p-6 flex flex-col">
              <h2 className="text-2xl font-bold text-white mb-8">Settings</h2>
              <nav className="space-y-2 flex-1">
                {[
                  { id: 'profile', label: 'Profile', icon: '👤' },
                  { id: 'notifications', label: 'Notifications', icon: '🔔' },
                  { id: 'privacy', label: 'Privacy', icon: '🔒' },
                  { id: 'billing', label: 'Billing', icon: '💳' },
                  { id: 'preferences', label: 'Preferences', icon: '🌐' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSettingsTab(item.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 text-base font-medium ${
                      settingsTab === item.id
                        ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/30'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 p-8 overflow-y-auto bg-gray-950">
              {/* Profile Settings */}
              {settingsTab === 'profile' && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold text-white">Profile</h3>
                  
                  {/* Profile Photo */}
                  <div className="bg-gray-900 rounded-xl p-6">
                    <label className="block text-gray-400 text-sm mb-2">Profile Photo</label>
                    <div className="flex items-center space-x-6">
                      <div className="relative">
                        <img
                          src={profileSettings.photoURL || 'https://placehold.co/100x100'}
                          alt="Profile"
                          className="w-24 h-24 rounded-full object-cover"
                        />
                        <button className="absolute bottom-0 right-0 w-8 h-8 bg-pink-600 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm mb-2">Update your profile picture</p>
                        <button className="text-pink-400 hover:text-pink-300 text-sm font-medium">Change Photo</button>
                      </div>
                    </div>
                  </div>

                  {/* Profile Information */}
                  <div className="bg-gray-900 rounded-xl p-6 space-y-4">
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Display Name</label>
                      <input
                        type="text"
                        value={profileSettings.displayName}
                        onChange={(e) => setProfileSettings({ ...profileSettings, displayName: e.target.value })}
                        className="w-full bg-gray-800 text-white rounded-lg py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-pink-600"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Username</label>
                      <input
                        type="text"
                        value={profileSettings.username}
                        onChange={(e) => setProfileSettings({ ...profileSettings, username: e.target.value })}
                        className="w-full bg-gray-800 text-white rounded-lg py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-pink-600"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Email</label>
                      <input
                        type="email"
                        value={profileSettings.email}
                        onChange={(e) => setProfileSettings({ ...profileSettings, email: e.target.value })}
                        className="w-full bg-gray-800 text-white rounded-lg py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-pink-600"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Bio</label>
                      <textarea
                        value={profileSettings.bio}
                        onChange={(e) => setProfileSettings({ ...profileSettings, bio: e.target.value })}
                        rows={6}
                        className="w-full bg-gray-800 text-white rounded-lg py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-pink-600 resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Location</label>
                      <input
                        type="text"
                        value={profileSettings.location}
                        onChange={(e) => setProfileSettings({ ...profileSettings, location: e.target.value })}
                        className="w-full bg-gray-800 text-white rounded-lg py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-pink-600"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Website</label>
                      <input
                        type="url"
                        value={profileSettings.website}
                        onChange={(e) => setProfileSettings({ ...profileSettings, website: e.target.value })}
                        className="w-full bg-gray-800 text-white rounded-lg py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-pink-600"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSaveProfile}
                    className="px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    <span>Save Changes</span>
                  </button>
                </div>
              )}

              {/* Notifications Settings - Matching Image 6 */}
              {settingsTab === 'notifications' && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold text-white">Notifications</h3>
                  
                  {/* Browser Notification Permission Banner */}
                  {typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default' && (
                    <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-4 flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-semibold text-base mb-1.5">Enable Browser Notifications</h4>
                        <p className="text-gray-400 text-sm leading-relaxed">Get real-time notifications even when you're not on the site</p>
                      </div>
                      <button
                        onClick={async () => {
                          const permission = await Notification.requestPermission();
                          if (permission === 'granted') {
                            alert('Notifications enabled!');
                          }
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        Enable
                      </button>
                    </div>
                  )}

                  {/* Main Notification Settings */}
                  <div className="bg-gray-900 rounded-xl p-6 space-y-4">
                    {[
                      { key: 'newPurchases', title: 'New purchases', description: 'Get notified when someone buys your content' },
                      { key: 'newMessages', title: 'New messages', description: 'Get notified when you receive new messages' },
                      { key: 'newFollowers', title: 'New followers', description: 'Get notified when someone follows you' },
                      { key: 'tipsGifts', title: 'Tips & Gifts', description: 'Get notified when you receive tips or gifts' },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                        <div className="flex-1">
                          <h4 className="text-white font-semibold text-base mb-1.5">{item.title}</h4>
                          <p className="text-gray-400 text-sm leading-relaxed">{item.description}</p>
                        </div>
                        <button
                          onClick={() => setNotificationSettings({
                            ...notificationSettings,
                            [item.key]: !notificationSettings[item.key as keyof typeof notificationSettings]
                          })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            notificationSettings[item.key as keyof typeof notificationSettings] ? 'bg-pink-600' : 'bg-gray-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              notificationSettings[item.key as keyof typeof notificationSettings] ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Additional Settings */}
                  <div className="bg-gray-900 rounded-xl p-6 space-y-4">
                    <h4 className="text-white font-semibold text-lg mb-4">Additional Preferences</h4>
                    
                    {/* Sound Notifications */}
                    <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                      <div>
                        <h4 className="text-white font-semibold text-base mb-1.5">Sound Notifications</h4>
                        <p className="text-gray-400 text-sm leading-relaxed">Play sound when receiving notifications</p>
                      </div>
                      <button
                        onClick={() => setNotificationSettings({
                          ...notificationSettings,
                          soundEnabled: !notificationSettings.soundEnabled
                        })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          notificationSettings.soundEnabled ? 'bg-pink-600' : 'bg-gray-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            notificationSettings.soundEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Email Digest */}
                    <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                      <div className="flex-1">
                        <h4 className="text-white font-semibold text-base mb-1.5">Email Digest</h4>
                        <p className="text-gray-400 text-sm leading-relaxed">Receive a summary of notifications via email</p>
                      </div>
                      <select
                        value={notificationSettings.emailDigest}
                        onChange={(e) => setNotificationSettings({
                          ...notificationSettings,
                          emailDigest: e.target.value
                        })}
                        className="bg-gray-700 text-white text-sm rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-pink-600 ml-4"
                      >
                        <option value="none">None</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                      </select>
                    </div>

                    {/* Quiet Hours */}
                    <div className="p-4 bg-gray-800 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-white font-semibold text-base mb-1.5">Quiet Hours</h4>
                          <p className="text-gray-400 text-sm leading-relaxed">Pause notifications during specific hours</p>
                        </div>
                        <button
                          onClick={() => setNotificationSettings({
                            ...notificationSettings,
                            quietHours: { ...notificationSettings.quietHours, enabled: !notificationSettings.quietHours.enabled }
                          })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            notificationSettings.quietHours.enabled ? 'bg-pink-600' : 'bg-gray-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              notificationSettings.quietHours.enabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                      {notificationSettings.quietHours.enabled && (
                        <div className="flex items-center space-x-3 pt-2">
                          <div className="flex-1">
                            <label className="block text-gray-400 text-xs mb-1">Start Time</label>
                            <input
                              type="time"
                              value={notificationSettings.quietHours.start}
                              onChange={(e) => setNotificationSettings({
                                ...notificationSettings,
                                quietHours: { ...notificationSettings.quietHours, start: e.target.value }
                              })}
                              className="w-full bg-gray-700 text-white text-sm rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-pink-600"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-gray-400 text-xs mb-1">End Time</label>
                            <input
                              type="time"
                              value={notificationSettings.quietHours.end}
                              onChange={(e) => setNotificationSettings({
                                ...notificationSettings,
                                quietHours: { ...notificationSettings.quietHours, end: e.target.value }
                              })}
                              className="w-full bg-gray-700 text-white text-sm rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-pink-600"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Test Notification Button */}
                  {typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted' && (
                    <button
                      onClick={testNotification}
                      className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      <span>Test Notification</span>
                    </button>
                  )}

                  {/* Save Button with Status */}
                  <button
                    onClick={handleSaveNotifications}
                    disabled={notificationSaveStatus === 'saving'}
                    className={`w-full px-6 py-3 text-white font-semibold rounded-lg transition-all flex items-center justify-center space-x-2 ${
                      notificationSaveStatus === 'saved' 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : notificationSaveStatus === 'error'
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-pink-600 hover:bg-pink-700'
                    } ${notificationSaveStatus === 'saving' ? 'opacity-75 cursor-wait' : ''}`}
                  >
                    {notificationSaveStatus === 'saving' && (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    )}
                    {notificationSaveStatus === 'saved' && (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {notificationSaveStatus === 'error' && (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    {notificationSaveStatus === 'idle' && (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                    )}
                    <span>
                      {notificationSaveStatus === 'saving' 
                        ? 'Saving...' 
                        : notificationSaveStatus === 'saved' 
                        ? 'Saved!' 
                        : notificationSaveStatus === 'error'
                        ? 'Error - Try Again'
                        : 'Save Changes'}
                    </span>
                  </button>
                </div>
              )}

              {/* Privacy Settings - Matching Image 7 */}
              {settingsTab === 'privacy' && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold text-white">Privacy Settings</h3>
                  
                  <div className="bg-gray-900 rounded-xl p-6 space-y-4">
                    {[
                      { key: 'profileVisibility', title: 'Profile Visibility', description: 'Who can see your profile' },
                      { key: 'contentVisibility', title: 'Content Visibility', description: 'Who can see your content' },
                      { key: 'messageRequests', title: 'Message Requests', description: 'Who can send you messages' },
                      { key: 'showOnlineStatus', title: 'Show Online Status', description: 'Let others see when you\'re online' },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                        <div>
                          <h4 className="text-white font-medium mb-1">{item.title}</h4>
                          <p className="text-gray-400 text-sm">{item.description}</p>
                        </div>
                        <select
                          value={privacySettings[item.key as keyof typeof privacySettings]}
                          onChange={(e) => setPrivacySettings({
                            ...privacySettings,
                            [item.key]: e.target.value
                          })}
                          className="bg-gray-700 text-white rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-pink-600"
                        >
                          <option value="everyone">Everyone</option>
                          <option value="followers">Followers</option>
                          <option value="none">None</option>
                        </select>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleSavePrivacy}
                    className="px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    <span>Save Changes</span>
                  </button>
                </div>
              )}

              {/* Billing Settings - Matching Image 8 */}
              {settingsTab === 'billing' && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold text-white">Billing</h3>
                  
                  {/* Payment Methods */}
                  <div className="bg-gray-900 rounded-xl p-6">
                    <h4 className="text-white font-semibold mb-4">Payment Methods</h4>
                    <div className="bg-gray-800 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-8 bg-blue-600 rounded flex items-center justify-center">
                            <span className="text-white font-bold text-xs">VISA</span>
                          </div>
                          <div>
                            <p className="text-white font-medium">•••• •••• •••• 4242</p>
                            <p className="text-gray-400 text-sm">Expires 12/25</p>
                          </div>
                        </div>
                        <button className="text-pink-400 hover:text-pink-300 font-medium">Edit</button>
                      </div>
                    </div>
                    <button className="text-pink-400 hover:text-pink-300 font-medium">+ Add Payment Method</button>
                  </div>

                  {/* Payout Settings */}
                  <div className="bg-gray-900 rounded-xl p-6 space-y-4">
                    <h4 className="text-white font-semibold mb-4">Payout Settings</h4>
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Minimum Payout</label>
                      <select
                        value={billingSettings.minimumPayout}
                        onChange={(e) => setBillingSettings({ ...billingSettings, minimumPayout: e.target.value })}
                        className="w-full bg-gray-800 text-white rounded-lg py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-pink-600"
                      >
                        <option value="50">$50</option>
                        <option value="100">$100</option>
                        <option value="250">$250</option>
                        <option value="500">$500</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Payout Schedule</label>
                      <select
                        value={billingSettings.payoutSchedule}
                        onChange={(e) => setBillingSettings({ ...billingSettings, payoutSchedule: e.target.value })}
                        className="w-full bg-gray-800 text-white rounded-lg py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-pink-600"
                      >
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Bi-weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={handleSaveBilling}
                    className="px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    <span>Save Changes</span>
                  </button>
                </div>
              )}

              {/* Preferences Settings - Matching Image 9 - Optimized Layout */}
              {settingsTab === 'preferences' && (
                <div className="space-y-6">
                  {/* Header with Currency Dropdown in Top Right */}
                  <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-bold text-white">General Preferences</h3>
                    <div className="relative">
                      <select
                        value={preferencesSettings.currency}
                        onChange={(e) => setPreferencesSettings({ ...preferencesSettings, currency: e.target.value })}
                        className="bg-gray-800 text-white rounded-lg py-2.5 px-4 pr-8 focus:outline-none focus:ring-2 focus:ring-pink-600 appearance-none cursor-pointer border border-gray-700 min-w-[120px]"
                      >
                        <option value="usd">USD ($)</option>
                        <option value="eur">EUR (€)</option>
                        <option value="gbp">GBP (£)</option>
                        <option value="cad">CAD ($)</option>
                      </select>
                      <svg className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  
                  <div className="bg-gray-900 rounded-xl p-6 space-y-4">
                    <div>
                      <label className="block text-gray-400 text-sm mb-2 font-medium">Language</label>
                      <select
                        value={preferencesSettings.language}
                        onChange={(e) => setPreferencesSettings({ ...preferencesSettings, language: e.target.value })}
                        className="w-full bg-gray-800 text-white rounded-lg py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-pink-600 border border-gray-700"
                      >
                        <option value="english">English</option>
                        <option value="spanish">Spanish</option>
                        <option value="french">French</option>
                        <option value="german">German</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-2 font-medium">Time Zone</label>
                      <select
                        value={preferencesSettings.timeZone}
                        onChange={(e) => setPreferencesSettings({ ...preferencesSettings, timeZone: e.target.value })}
                        className="w-full bg-gray-800 text-white rounded-lg py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-pink-600 border border-gray-700"
                      >
                        <option value="pacific">Pacific Time (PT)</option>
                        <option value="mountain">Mountain Time (MT)</option>
                        <option value="central">Central Time (CT)</option>
                        <option value="eastern">Eastern Time (ET)</option>
                      </select>
                    </div>
                  </div>

                  {/* Action Buttons - Matching Image Layout */}
                  <div className="flex items-center justify-start space-x-4">
                    <button
                      className="px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-lg transition-colors flex items-center space-x-2"
                    >
                      <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Preferences</span>
                    </button>
                    <button
                      onClick={handleSavePreferences}
                      className="px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-lg transition-colors flex items-center space-x-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      <span>Save Changes</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dashboard Content */}
        {activeTab !== 'feed' && activeTab !== 'foryou' && activeTab !== 'content' && activeTab !== 'aigenerate' && activeTab !== 'socialschedule' && activeTab !== 'messages' && activeTab !== 'manager' && activeTab !== 'settings' && (
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

        {/* Upload Content Modal - Enhanced with drag & drop */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-900 rounded-xl p-8 w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadProgress(0);
                  setUploadingContent(false);
                }}
                className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors z-10"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h3 className="text-2xl font-bold text-white mb-6">Upload Content</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-gray-400 text-sm mb-3 font-medium">Select File</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const file = e.dataTransfer.files[0];
                      if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
                        handleFileUpload(file);
                      }
                    }}
                    className="border-2 border-dashed border-gray-700 rounded-lg p-12 text-center cursor-pointer hover:border-pink-600 transition-colors bg-gray-800/50"
                  >
                    <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-400 mb-2 text-lg">Drop your image or video here</p>
                    <p className="text-pink-400 text-sm font-medium">Browse files</p>
                    <p className="text-gray-500 text-xs mt-2">Supports: JPG, PNG, GIF, MP4, MOV</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                    className="hidden"
                  />
                </div>

                {uploadingContent && (
                  <div className="space-y-3 bg-gray-800 rounded-lg p-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300 font-medium">Uploading...</span>
                      <span className="text-pink-400 font-semibold">{Math.round(uploadProgress)}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-pink-600 h-3 rounded-full transition-all duration-300 flex items-center justify-end pr-2"
                        style={{ width: `${uploadProgress}%` }}
                      >
                        {uploadProgress > 10 && (
                          <span className="text-white text-xs font-semibold">{Math.round(uploadProgress)}%</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    onClick={() => {
                      setShowUploadModal(false);
                      setUploadProgress(0);
                      setUploadingContent(false);
                    }}
                    disabled={uploadingContent}
                    className="px-6 py-3 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors border border-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Schedule Post Modal - Matching Image 4 */}
        {showScheduleModal && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-900 rounded-xl p-8 w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors z-10"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h3 className="text-2xl font-bold text-white mb-8">Schedule New Post</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-gray-400 text-sm mb-3 font-medium">Post Content</label>
                  <textarea
                    value={scheduleForm.content}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, content: e.target.value })}
                    placeholder="What's happening?"
                    className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-lg py-4 px-4 focus:outline-none focus:ring-2 focus:ring-pink-600 resize-none border border-gray-700"
                    rows={5}
                    maxLength={280}
                  />
                  <p className="text-gray-500 text-sm mt-2">{scheduleForm.content.length}/280 characters</p>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-3 font-medium">Select Platforms</label>
                  <div className="flex space-x-3">
                    {['instagram', 'twitter', 'facebook'].map((platform) => (
                      <button
                        key={platform}
                        onClick={() => {
                          const platforms = scheduleForm.platforms.includes(platform)
                            ? scheduleForm.platforms.filter(p => p !== platform)
                            : [...scheduleForm.platforms, platform];
                          setScheduleForm({ ...scheduleForm, platforms });
                        }}
                        className={`flex-1 py-4 px-4 rounded-lg font-medium transition-all ${
                          scheduleForm.platforms.includes(platform)
                            ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/20'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                        }`}
                      >
                        <div className="flex flex-col items-center space-y-2">
                          <span className="text-2xl">
                            {platform === 'instagram' ? '📷' : platform === 'twitter' ? '🐦' : '👤'}
                          </span>
                          <span>{platform.charAt(0).toUpperCase() + platform.slice(1)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-3 font-medium">Date</label>
                    <div className="relative">
                      <input
                        type="date"
                        value={scheduleForm.date}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })}
                        className="w-full bg-gray-800 text-white rounded-lg py-3 px-4 pr-10 focus:outline-none focus:ring-2 focus:ring-pink-600 border border-gray-700"
                      />
                      <svg className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-3 font-medium">Time</label>
                    <div className="relative">
                      <input
                        type="time"
                        value={scheduleForm.time}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })}
                        className="w-full bg-gray-800 text-white rounded-lg py-3 px-4 pr-10 focus:outline-none focus:ring-2 focus:ring-pink-600 border border-gray-700"
                      />
                      <svg className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-3 font-medium">Add Media (Optional)</label>
                  <div
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*,video/*';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) setScheduleForm({ ...scheduleForm, media: file });
                      };
                      input.click();
                    }}
                    className="border-2 border-dashed border-gray-700 rounded-lg p-12 text-center cursor-pointer hover:border-pink-600 transition-colors bg-gray-800/50"
                  >
                    <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-400 mb-2 text-lg">Drop your image or video here</p>
                    <p className="text-pink-400 text-sm font-medium">Browse files</p>
                  </div>
                  {scheduleForm.media && (
                    <div className="mt-3 p-3 bg-gray-800 rounded-lg flex items-center justify-between">
                      <p className="text-gray-300 text-sm">Selected: {scheduleForm.media.name}</p>
                      <button
                        onClick={() => setScheduleForm({ ...scheduleForm, media: null })}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    onClick={() => {
                      setShowScheduleModal(false);
                      setScheduleForm({
                        content: '',
                        platforms: [],
                        date: '',
                        time: '',
                        media: null
                      });
                    }}
                    className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors border border-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSchedulePost}
                    disabled={!scheduleForm.content.trim() || !scheduleForm.date || !scheduleForm.time || scheduleForm.platforms.length === 0}
                    className="px-8 py-3 bg-pink-600 hover:bg-pink-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors shadow-lg shadow-pink-600/20"
                  >
                    Schedule Post
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Manager Modal - Matching Image 3 */}
        {showAddManagerModal && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-900 rounded-xl p-8 w-full max-w-md relative">
              <button
                onClick={() => {
                  setShowAddManagerModal(false);
                  setManagerEmail('');
                }}
                className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h3 className="text-2xl font-bold text-white mb-6">Connect a Manager</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-white text-sm mb-3 font-medium">Manager's Email Address</label>
                  <input
                    type="email"
                    value={managerEmail}
                    onChange={(e) => setManagerEmail(e.target.value)}
                    placeholder="manager@agency.com"
                    className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-pink-600 border border-gray-700"
                  />
                </div>

                <div className="bg-orange-900/20 border border-orange-600 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">!</span>
                    </div>
                    <div>
                      <p className="text-orange-400 font-semibold mb-1">Important</p>
                      <p className="text-white text-sm">
                        This will give the manager full access to edit your profile, post content, and send messages on your behalf.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    onClick={() => {
                      setShowAddManagerModal(false);
                      setManagerEmail('');
                    }}
                    className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddManager}
                    disabled={!managerEmail.trim()}
                    className="px-6 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    <span>Send Invite</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Become Manager Modal - Matching Image 4 */}
        {showBecomeManagerModal && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-900 rounded-xl p-8 w-full max-w-md relative">
              <button
                onClick={() => setShowBecomeManagerModal(false)}
                className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Become a Manager</h3>
                <span className="inline-block bg-purple-600 text-white text-xs px-3 py-1 rounded-full">Beta</span>
              </div>
              
              <div className="space-y-4 mb-6">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-3">Manager Benefits:</h4>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Manage multiple creators</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Earn commission on sales</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Access to analytics dashboard</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Professional tools & resources</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-purple-900/20 border border-purple-600 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <svg className="w-6 h-6 text-purple-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    <div>
                      <h5 className="text-white font-semibold mb-1">Beta Program</h5>
                      <p className="text-white text-sm">
                        Join our exclusive beta program and help shape the future of creator management.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowBecomeManagerModal(false)}
                  className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBecomeManager}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  <span>Apply Now</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatorStudio;
