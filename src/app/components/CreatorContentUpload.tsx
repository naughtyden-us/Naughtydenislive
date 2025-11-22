'use client';

import React, { useState, useRef, useCallback } from 'react';
import { uploadImage, uploadVideo, generateVideoThumbnail } from '../utils/cloudinary';

interface CreatorContentUploadProps {
  onContentUpload: (contentUrl: string, contentType: 'image' | 'video', thumbnailUrl?: string) => void;
  onError: (error: string) => void;
  userId: string;
}

const CreatorContentUpload: React.FC<CreatorContentUploadProps> = ({
  onContentUpload,
  onError,
  userId
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [contentType, setContentType] = useState<'image' | 'video' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      onError('Please upload a valid image or video file');
      return false;
    }

    const maxSize = isImage ? 50 * 1024 * 1024 : 500 * 1024 * 1024; // 50MB for images, 500MB for videos
    
    if (file.size > maxSize) {
      onError(`${isImage ? 'Image' : 'Video'} size must be less than ${isImage ? '50MB' : '500MB'}`);
      return false;
    }
    
    return true;
  };

  const handleFileSelect = useCallback(async (file: File) => {
    if (!validateFile(file)) return;

    setSelectedFile(file);
    setIsUploading(true);
    setUploadProgress(0);
    
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    setContentType(isImage ? 'image' : 'video');
    
    try {
      // Create preview immediately for real-time feedback
      if (isImage) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviewUrl(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        const videoUrl = URL.createObjectURL(file);
        setPreviewUrl(videoUrl);
      }

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * (isImage ? 10 : 5);
        });
      }, isImage ? 200 : 500);

      // Upload to Cloudinary
      const folder = `creators/${userId}/content`;
      let result;
      
      if (isImage) {
        result = await uploadImage(file, folder, {
          crop: 'scale',
          quality: 'auto',
          format: 'auto'
        });
      } else {
        result = await uploadVideo(file, folder, {
          quality: 'auto',
          format: 'auto'
        });
      }

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Generate thumbnail for videos
      let thumbnailUrl: string | undefined;
      if (isVideo) {
        try {
          thumbnailUrl = await generateVideoThumbnail(result.public_id, 1);
          console.log('Thumbnail generated:', thumbnailUrl);
        } catch (error) {
          console.warn('Could not generate thumbnail:', error);
        }
      }

      console.log('Content uploaded to Cloudinary:', result.secure_url);
      
      // Update preview with Cloudinary URL
      setPreviewUrl(result.secure_url);
      
      // Notify parent component
      onContentUpload(result.secure_url, isImage ? 'image' : 'video', thumbnailUrl);
      
      setIsUploading(false);
      setUploadProgress(0);
      
    } catch (error) {
      console.error('Upload error:', error);
      onError('Failed to upload content. Please try again.');
      setIsUploading(false);
      setUploadProgress(0);
      setPreviewUrl(null);
      setSelectedFile(null);
      setContentType(null);
    }
  }, [userId, onContentUpload, onError]);

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
          relative w-full h-64 mx-auto border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer
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
            {contentType === 'image' ? (
              <img
                src={previewUrl}
                alt="Content preview"
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <video
                src={previewUrl}
                controls
                className="w-full h-full object-cover rounded-lg"
              />
            )}
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
              className="w-16 h-16 mb-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3A1.5 1.5 0 0 0 1.5 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
              />
            </svg>
            <span className="text-lg font-medium mb-2">
              {isUploading ? 'Uploading Content...' : 'Upload Creator Content'}
            </span>
            <span className="text-sm text-center px-4">
              {isUploading ? 'Please wait while your content is being processed' : 'Click or drag to upload images or videos'}
            </span>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
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
            Uploading {contentType}... {uploadProgress}%
          </p>
        </div>
      )}

      <div className="mt-4 text-center">
        <p className="text-sm text-gray-500">
          Supported: All image and video formats
        </p>
        <p className="text-sm text-gray-500">
          Images: max 50MB | Videos: max 500MB
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

export default CreatorContentUpload;
