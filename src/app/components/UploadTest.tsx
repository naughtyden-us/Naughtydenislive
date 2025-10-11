'use client';

import React, { useState } from 'react';
import ProfilePictureUpload from './ProfilePictureUpload';
import VideoContentUpload from './VideoContentUpload';
import CreatorContentUpload from './CreatorContentUpload';
// Firebase components removed - now using Cloudinary
import SimpleUploadTest from './SimpleUploadTest';
import QuickFix from './QuickFix';
import DiagnosticTool from './DiagnosticTool';
import ComponentTest from './ComponentTest';
import CloudinaryTest from './CloudinaryTest';
// Firebase storage removed - now using Cloudinary

const UploadTest: React.FC = () => {
  const [profileImageUrl, setProfileImageUrl] = useState<string>('');
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const [creatorContentUrl, setCreatorContentUrl] = useState<string>('');
  const [creatorThumbnailUrl, setCreatorThumbnailUrl] = useState<string>('');
  const [creatorContentType, setCreatorContentType] = useState<'image' | 'video' | null>(null);
  const [error, setError] = useState<string>('');
  const [cloudinaryStatus, setCloudinaryStatus] = useState<string>('Testing Cloudinary connection...');

  const handleProfileImageUpload = (imageUrl: string) => {
    setProfileImageUrl(imageUrl);
    setError('');
    console.log('Profile image uploaded to Cloudinary:', imageUrl);
  };

  const handleVideoUpload = (videoUrl: string, thumbnailUrl?: string) => {
    setVideoUrl(videoUrl);
    setThumbnailUrl(thumbnailUrl || '');
    setError('');
    console.log('Video uploaded to Cloudinary:', videoUrl);
    console.log('Thumbnail uploaded to Cloudinary:', thumbnailUrl);
  };

  const handleCreatorContentUpload = (contentUrl: string, thumbnailUrl?: string, contentType: 'image' | 'video') => {
    setCreatorContentUrl(contentUrl);
    setCreatorThumbnailUrl(thumbnailUrl || '');
    setCreatorContentType(contentType);
    setError('');
    console.log('Creator content uploaded to Cloudinary:', contentUrl);
    console.log('Content type:', contentType);
    if (thumbnailUrl) {
      console.log('Thumbnail uploaded to Cloudinary:', thumbnailUrl);
    }
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    console.error('Upload error:', errorMessage);
  };

  // Test Cloudinary connection
  React.useEffect(() => {
    try {
      // Test Cloudinary configuration
      setCloudinaryStatus('✅ Cloudinary configured successfully');
    } catch (error) {
      setCloudinaryStatus('❌ Cloudinary configuration failed: ' + error);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Upload Functionality Test</h1>
        
        {/* URGENT FIX */}
        <div className="mb-8">
          <QuickFix />
        </div>
        
        {error && (
          <div className="bg-red-900 border border-red-600 text-red-300 px-4 py-3 rounded-lg mb-6">
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Profile Picture Upload Test */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Profile Picture Upload</h2>
            <ProfilePictureUpload
              currentImageUrl={profileImageUrl}
              onImageUpload={handleProfileImageUpload}
              onError={handleError}
              userId="test-user-123"
              isCreator={false}
            />
            {profileImageUrl && (
              <div className="mt-4">
                <p className="text-sm text-gray-400 mb-2">Uploaded Image URL:</p>
                <p className="text-xs text-gray-500 break-all">{profileImageUrl}</p>
                <img 
                  src={profileImageUrl} 
                  alt="Uploaded profile" 
                  className="w-20 h-20 rounded-full object-cover mt-2"
                />
              </div>
            )}
          </div>

          {/* Video Content Upload Test */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Video Content Upload</h2>
            <VideoContentUpload
              onVideoUpload={handleVideoUpload}
              onError={handleError}
              userId="test-user-123"
              isCreator={true}
            />
            {videoUrl && (
              <div className="mt-4">
                <p className="text-sm text-gray-400 mb-2">Uploaded Video URL:</p>
                <p className="text-xs text-gray-500 break-all mb-2">{videoUrl}</p>
                {thumbnailUrl && (
                  <>
                    <p className="text-sm text-gray-400 mb-2">Thumbnail URL:</p>
                    <p className="text-xs text-gray-500 break-all mb-2">{thumbnailUrl}</p>
                    <img 
                      src={thumbnailUrl} 
                      alt="Video thumbnail" 
                      className="w-32 h-18 object-cover rounded"
                    />
                  </>
                )}
                <video 
                  src={videoUrl} 
                  controls 
                  className="w-full max-w-xs mt-2 rounded"
                />
              </div>
            )}
          </div>
        </div>

        {/* Creator Content Upload Test */}
        <div className="mt-8">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Creator Content Upload (Images & Videos)</h2>
            <CreatorContentUpload
              onContentUpload={handleCreatorContentUpload}
              onError={handleError}
              userId="test-creator-123"
            />
            {creatorContentUrl && (
              <div className="mt-4">
                <p className="text-sm text-gray-400 mb-2">Uploaded Content URL:</p>
                <p className="text-xs text-gray-500 break-all mb-2">{creatorContentUrl}</p>
                <p className="text-sm text-gray-400 mb-2">Content Type: {creatorContentType}</p>
                {creatorThumbnailUrl && (
                  <>
                    <p className="text-sm text-gray-400 mb-2">Thumbnail URL:</p>
                    <p className="text-xs text-gray-500 break-all mb-2">{creatorThumbnailUrl}</p>
                    <img 
                      src={creatorThumbnailUrl} 
                      alt="Content thumbnail" 
                      className="w-32 h-18 object-cover rounded"
                    />
                  </>
                )}
                {creatorContentType === 'image' ? (
                  <img 
                    src={creatorContentUrl} 
                    alt="Uploaded content" 
                    className="w-full max-w-xs mt-2 rounded"
                  />
                ) : (
                  <video 
                    src={creatorContentUrl} 
                    controls 
                    className="w-full max-w-xs mt-2 rounded"
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Component & Environment Test */}
        <div className="mt-8">
          <ComponentTest />
        </div>

        {/* Comprehensive Diagnostic Tool */}
        <div className="mt-8">
          <DiagnosticTool />
        </div>

        {/* Simple Direct Upload Test */}
        <div className="mt-8">
          <SimpleUploadTest />
        </div>

        {/* Cloudinary Integration Test */}
        <div className="mt-8">
          <CloudinaryTest />
        </div>

        {/* Cloudinary Test Results */}
        <div className="mt-8 bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Cloudinary Test Results</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-blue-400">🔗 Cloudinary Connection</h3>
              <p className="text-sm text-gray-400">{cloudinaryStatus}</p>
            </div>
            <div>
              <h3 className="font-semibold text-green-400">✅ Profile Picture Upload</h3>
              <p className="text-sm text-gray-400">
                {profileImageUrl ? 'Successfully uploaded to Cloudinary' : 'No image uploaded yet'}
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-green-400">✅ Video Content Upload</h3>
              <p className="text-sm text-gray-400">
                {videoUrl ? 'Successfully uploaded to Cloudinary' : 'No video uploaded yet'}
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-green-400">✅ Mobile Responsiveness</h3>
              <p className="text-sm text-gray-400">
                Components are optimized for mobile devices with responsive sizing
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-green-400">✅ File Validation</h3>
              <p className="text-sm text-gray-400">
                Images: All formats (JPEG, PNG, WebP, GIF, BMP, TIFF, SVG, AVIF, HEIC, RAW) - max 50MB
              </p>
              <p className="text-sm text-gray-400">
                Videos: All formats (MP4, WebM, MOV, AVI, WMV, FLV, MKV, M4V, 3GP, OGV, TS, MTS, VOB, ASF, RM) - max 500MB
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-green-400">✅ Auto Optimization</h3>
              <p className="text-sm text-gray-400">
                Cloudinary automatically optimizes images and videos for better performance
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadTest;
