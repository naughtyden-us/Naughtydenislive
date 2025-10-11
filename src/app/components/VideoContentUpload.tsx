'use client';

import React, { useState, useRef, useCallback } from 'react';
import { uploadVideo, generateVideoThumbnail } from '../utils/cloudinary';

interface VideoContentUploadProps {
  onVideoUpload: (videoUrl: string, thumbnailUrl?: string) => void;
  onError: (error: string) => void;
  userId: string;
  isCreator?: boolean;
}


const VideoContentUpload: React.FC<VideoContentUploadProps> = ({
  onVideoUpload,
  onError,
  userId,
  isCreator = false
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    const maxSize = 500 * 1024 * 1024; // 500MB - increased for high-quality videos
    const allowedTypes = [
      'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/avi',
      'video/mov', 'video/wmv', 'video/flv', 'video/mkv', 'video/m4v', 'video/3gp',
      'video/ogv', 'video/ts', 'video/mts', 'video/m2ts', 'video/vob', 'video/asf',
      'video/rm', 'video/rmvb', 'video/viv', 'video/amv', 'video/mxf', 'video/roq'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      onError('Please upload a valid video file. Supported formats: MP4, WebM, MOV, AVI, WMV, FLV, MKV, M4V, 3GP, OGV, TS, MTS, VOB, ASF, RM, and more');
      return false;
    }
    
    if (file.size > maxSize) {
      onError('Video size must be less than 500MB');
      return false;
    }
    
    return true;
  };

  const generateThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      video.addEventListener('loadedmetadata', () => {
        canvas.width = 320;
        canvas.height = 180;
        
        // Seek to 1 second or 10% of video duration
        video.currentTime = Math.min(1, video.duration * 0.1);
      });

      video.addEventListener('seeked', () => {
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(thumbnailDataUrl);
        } else {
          reject(new Error('Could not get canvas context'));
        }
      });

      video.addEventListener('error', () => {
        reject(new Error('Error loading video'));
      });

      video.src = URL.createObjectURL(file);
      video.load();
    });
  };

  const handleFileSelect = useCallback(async (file: File) => {
    if (!validateFile(file)) return;

    setSelectedFile(file);
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Create preview
      const videoUrl = URL.createObjectURL(file);
      setPreviewUrl(videoUrl);

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 5;
        });
      }, 500);

      // Upload video to Cloudinary with flexible dimensions
      const folder = `${isCreator ? 'creators' : 'users'}/${userId}/videos`;
      const result = await uploadVideo(file, folder, {
        quality: 'auto',
        format: 'auto'
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Generate thumbnail using Cloudinary
      let thumbnailUrl: string | undefined;
      try {
        thumbnailUrl = await generateVideoThumbnail(result.public_id, 1);
        console.log('Thumbnail generated:', thumbnailUrl);
      } catch (error) {
        console.warn('Could not generate thumbnail:', error);
      }

      console.log('Video uploaded to Cloudinary:', result.secure_url);
      onVideoUpload(result.secure_url, thumbnailUrl);
      setIsUploading(false);
      setUploadProgress(0);
      
    } catch (error) {
      console.error('Upload error:', error);
      onError('Failed to upload video. Please try again.');
      setIsUploading(false);
      setUploadProgress(0);
      setPreviewUrl(null);
      setSelectedFile(null);
    }
  }, [userId, isCreator, onVideoUpload, onError]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleClick = () => {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className={`
          relative w-full h-48 sm:h-64 mx-auto border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer
          ${isDragOver ? 'border-pink-500 bg-pink-50' : 'border-gray-300 hover:border-pink-400'}
          ${isUploading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        {previewUrl ? (
          <div className="relative w-full h-full">
            <video
              src={previewUrl}
              controls
              className="w-full h-full object-cover rounded-lg"
            />
            {isUploading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                <div className="text-white text-center">
                  <div className="text-lg font-medium mb-2">Uploading...</div>
                  <div className="text-sm">{uploadProgress}%</div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-12 h-12 sm:w-16 sm:h-16 mb-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
              />
            </svg>
            <span className="text-base sm:text-lg font-medium mb-2">
              {isUploading ? 'Uploading Video...' : 'Upload Video Content'}
            </span>
            <span className="text-xs sm:text-sm text-center px-4">
              {isUploading ? 'Please wait while your video is being processed' : 'Click or drag to upload video'}
            </span>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={isUploading}
      />

      {isUploading && (
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-pink-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-sm text-gray-500 mt-2 text-center">
            Uploading video... {uploadProgress}%
          </p>
        </div>
      )}

      <div className="mt-4 text-center">
        <p className="text-sm text-gray-500">
          Supported formats: All video formats (MP4, WebM, MOV, AVI, WMV, FLV, MKV, M4V, 3GP, OGV, TS, MTS, VOB, ASF, RM, and more)
        </p>
        <p className="text-sm text-gray-500">
          Max size: 500MB
        </p>
        {selectedFile && (
          <p className="text-sm text-gray-400 mt-2">
            Selected: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(1)} MB)
          </p>
        )}
      </div>
    </div>
  );
};

export default VideoContentUpload;
