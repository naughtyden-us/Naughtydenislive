'use client';

import React, { useState, useRef, useCallback } from 'react';
import { uploadImage } from '../utils/cloudinary';

interface ProfilePictureUploadProps {
  currentImageUrl?: string;
  onImageUpload: (imageUrl: string) => void;
  onError: (error: string) => void;
  userId: string;
  isCreator?: boolean;
}


const ProfilePictureUpload: React.FC<ProfilePictureUploadProps> = ({
  currentImageUrl,
  onImageUpload,
  onError,
  userId,
  isCreator = false
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    const maxSize = 50 * 1024 * 1024; // 50MB - increased for high-quality images
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 
      'image/bmp', 'image/tiff', 'image/svg+xml', 'image/avif', 'image/heic',
      'image/heif', 'image/raw', 'image/cr2', 'image/nef', 'image/arw'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      onError('Please upload a valid image file. Supported formats: JPEG, PNG, WebP, GIF, BMP, TIFF, SVG, AVIF, HEIC, RAW');
      return false;
    }
    
    if (file.size > maxSize) {
      onError('Image size must be less than 50MB');
      return false;
    }
    
    return true;
  };

  const handleFileSelect = useCallback(async (file: File) => {
    if (!validateFile(file)) return;

    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Create preview immediately for real-time feedback
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);

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

      // Upload to Cloudinary with proper transformation parameters
      const folder = `${isCreator ? 'creators' : 'users'}/${userId}/profile-pictures`;
      const result = await uploadImage(file, folder, {
        crop: 'scale',
        quality: 'auto',
        format: 'auto'
      });

      clearInterval(progressInterval);
      setUploadProgress(100);
      
      console.log('Image uploaded to Cloudinary:', result.secure_url);
      
      // Update the preview with the Cloudinary URL for real-time display
      setPreviewUrl(result.secure_url);
      
      // Notify parent component with the new image URL
      onImageUpload(result.secure_url);
      
      setIsUploading(false);
      setUploadProgress(0);
      
    } catch (error) {
      console.error('Upload error:', error);
      onError('Failed to upload image. Please try again.');
      setIsUploading(false);
      setUploadProgress(0);
      setPreviewUrl(null);
    }
  }, [userId, isCreator, onImageUpload, onError]);

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

  const displayImage = previewUrl || currentImageUrl;

  return (
    <div className="w-full max-w-md mx-auto">
      <div
        className={`
          relative w-24 h-24 sm:w-32 sm:h-32 mx-auto rounded-full border-2 border-dashed transition-all duration-200 cursor-pointer
          ${isDragOver ? 'border-pink-500 bg-pink-50' : 'border-gray-300 hover:border-pink-400'}
          ${isUploading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        {displayImage ? (
          <div className="relative w-full h-full">
            <img
              src={displayImage}
              alt="Profile"
              className="w-full h-full object-cover rounded-full"
            />
            {isUploading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                <div className="text-white text-sm font-medium">
                  {uploadProgress}%
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
              className="w-6 h-6 sm:w-8 sm:h-8 mb-2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3A1.5 1.5 0 0 0 1.5 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
              />
            </svg>
            <span className="text-xs text-center px-2">
              {isUploading ? 'Uploading...' : 'Click or drag to upload'}
            </span>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={isUploading}
      />

      {isUploading && (
        <div className="mt-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-pink-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1 text-center">
            Uploading... {uploadProgress}%
          </p>
        </div>
      )}

      <div className="mt-2 text-center">
        <p className="text-xs text-gray-500">
          Supported formats: All image formats (JPEG, PNG, WebP, GIF, BMP, TIFF, SVG, AVIF, HEIC, RAW)
        </p>
        <p className="text-xs text-gray-500">
          Max size: 50MB
        </p>
      </div>
    </div>
  );
};

export default ProfilePictureUpload;
