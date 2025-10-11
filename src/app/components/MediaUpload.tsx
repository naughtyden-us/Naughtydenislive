'use client';

import React, { useState, useRef } from 'react';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FirebaseApp } from 'firebase/app';

interface MediaUploadProps {
  onUploadComplete: (urls: string[]) => void;
  onClose: () => void;
  userId: string;
  firebaseApp: FirebaseApp;
}

const MediaUpload: React.FC<MediaUploadProps> = ({ onUploadComplete, onClose, userId, firebaseApp }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (files: FileList | null) => {
    if (files) {
      const fileArray = Array.from(files);
      const validFiles = fileArray.filter(file => {
        // Check file type
        const isValidType = file.type.startsWith('image/') || file.type.startsWith('video/');
        // Check file size (max 50MB)
        const isValidSize = file.size <= 50 * 1024 * 1024;
        return isValidType && isValidSize;
      });
      
      if (validFiles.length !== fileArray.length) {
        alert('Some files were skipped. Only images and videos under 50MB are allowed.');
      }
      
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    
    try {
      // Debug: Check if firebaseApp is available
      console.log('Firebase App:', firebaseApp);
      console.log('User ID:', userId);
      
      if (!firebaseApp) {
        throw new Error('Firebase app not initialized');
      }
      
      if (!userId) {
        throw new Error('User ID not available');
      }
      
      // Use the Firebase app instance
      const storage = getStorage(firebaseApp);
      console.log('Storage instance:', storage);
      const urls: string[] = [];
      
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        console.log(`Uploading file ${i + 1}/${selectedFiles.length}:`, file.name);
        
        const fileName = `${Date.now()}-${i}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const fileRef = ref(storage, `media/${userId}/${fileName}`);
        
        console.log('File reference path:', `media/${userId}/${fileName}`);
        
        // Update progress
        const progress = ((i + 1) / selectedFiles.length) * 100;
        setUploadProgress(progress);
        
        try {
          console.log('Starting upload...');
          await uploadBytes(fileRef, file);
          console.log('Upload completed, getting download URL...');
          const url = await getDownloadURL(fileRef);
          console.log('Download URL:', url);
          urls.push(url);
        } catch (fileError) {
          console.error(`Failed to upload ${file.name}:`, fileError);
          throw new Error(`Failed to upload ${file.name}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`);
        }
      }
      
      console.log('All uploads completed:', urls);
      setUploadProgress(100);
      onUploadComplete(urls);
      setSelectedFiles([]);
      
      // Small delay to show 100% progress
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (!uploadError) {
        setUploadProgress(0);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-[9999] p-4">
      <div className="bg-gray-900 rounded-lg p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Upload Media</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Drag and Drop Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive ? 'border-pink-500 bg-pink-500 bg-opacity-10' : 'border-gray-600'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <p className="text-gray-300 mb-4">Drag and drop your photos/videos here</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-2 bg-pink-600 hover:bg-pink-700 rounded-lg text-white font-semibold transition-colors"
          >
            Choose Files
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />
        </div>

        {/* Selected Files */}
        {selectedFiles.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-white mb-4">Selected Files ({selectedFiles.length})</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {selectedFiles.map((file, index) => (
                <div key={index} className="relative bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-300 truncate">{file.name}</span>
                    <button
                      onClick={() => removeFile(index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="text-xs text-gray-400">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                  <div className="text-xs text-gray-400">
                    {file.type.startsWith('image/') ? '📷 Image' : '🎥 Video'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {uploading && (
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-white">Uploading...</span>
              <span className="text-gray-400">{Math.round(uploadProgress)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-pink-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {uploadError && (
          <div className="mt-4 p-3 bg-red-900/50 border border-red-500 rounded-lg">
            <div className="flex items-center space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-red-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.731 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.007H12v-.007z" />
              </svg>
              <span className="text-red-400 text-sm">{uploadError}</span>
            </div>
            <button
              onClick={() => setUploadError(null)}
              className="mt-2 text-red-300 hover:text-red-200 text-sm underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4 mt-8">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-600 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors rounded-lg"
            disabled={uploading}
          >
            Cancel
          </button>
          {uploadError ? (
            <button
              onClick={() => {
                setUploadError(null);
                setUploading(false);
                setUploadProgress(0);
              }}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
            >
              Try Again
            </button>
          ) : (
            <button
              onClick={uploadFiles}
              className="px-6 py-2 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={selectedFiles.length === 0 || uploading}
            >
              {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} File${selectedFiles.length !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MediaUpload;
