'use client';

import React, { useState } from 'react';
import { uploadImage, uploadVideo } from '../utils/cloudinary';

const CloudinaryTest: React.FC = () => {
  const [imageResult, setImageResult] = useState<string>('');
  const [videoResult, setVideoResult] = useState<string>('');
  const [error, setError] = useState<string>('');

  const testImageUpload = async () => {
    try {
      // Create a high-quality test image with various dimensions
      const canvas = document.createElement('canvas');
      canvas.width = 800; // Higher resolution
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Create a gradient background
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#ff6b6b');
        gradient.addColorStop(1, '#4ecdc4');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add text
        ctx.fillStyle = 'white';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Cloudinary Test Image', canvas.width/2, canvas.height/2);
        ctx.fillText('High Quality Upload', canvas.width/2, canvas.height/2 + 40);
        
        canvas.toBlob(async (blob) => {
          if (blob) {
            const file = new File([blob], 'test-image.png', { type: 'image/png' });
            const result = await uploadImage(file, 'test-uploads', {
              quality: 'auto',
              format: 'auto'
            });
            setImageResult(result.secure_url);
          }
        }, 'image/png', 0.95); // High quality
      }
    } catch (err) {
      setError('Image upload failed: ' + err);
    }
  };

  const testVideoUpload = async () => {
    try {
      // Create a simple test video (1 second of black screen)
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, 320, 240);
        ctx.fillStyle = 'white';
        ctx.font = '24px Arial';
        ctx.fillText('Test Video', 100, 120);
        
        // Convert canvas to video (simplified - in real app you'd use proper video creation)
        const stream = canvas.captureStream(1);
        const mediaRecorder = new MediaRecorder(stream);
        const chunks: Blob[] = [];
        
        mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
        mediaRecorder.onstop = async () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          const file = new File([blob], 'test-video.webm', { type: 'video/webm' });
          const result = await uploadVideo(file, 'test-uploads');
          setVideoResult(result.secure_url);
        };
        
        mediaRecorder.start();
        setTimeout(() => mediaRecorder.stop(), 1000);
      }
    } catch (err) {
      setError('Video upload failed: ' + err);
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Cloudinary Integration Test</h2>
      
      {/* Supported Formats Display */}
      <div className="mb-6 p-4 bg-gray-700 rounded-lg">
        <h3 className="font-semibold text-green-400 mb-2">✅ Supported Formats</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-blue-400 mb-1">Images:</h4>
            <p className="text-gray-300">JPEG, PNG, WebP, GIF, BMP, TIFF, SVG, AVIF, HEIC, RAW (CR2, NEF, ARW)</p>
            <p className="text-gray-400 text-xs mt-1">Max size: 50MB | Auto optimization</p>
          </div>
          <div>
            <h4 className="font-medium text-blue-400 mb-1">Videos:</h4>
            <p className="text-gray-300">MP4, WebM, MOV, AVI, WMV, FLV, MKV, M4V, 3GP, OGV, TS, MTS, VOB, ASF, RM</p>
            <p className="text-gray-400 text-xs mt-1">Max size: 500MB | Auto optimization</p>
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        <div>
          <button
            onClick={testImageUpload}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded mr-4"
          >
            Test Image Upload
          </button>
          {imageResult && (
            <div className="mt-2">
              <p className="text-sm text-gray-400">Image URL:</p>
              <p className="text-xs text-gray-500 break-all">{imageResult}</p>
              <img src={imageResult} alt="Test" className="w-32 h-32 object-cover rounded mt-2" />
            </div>
          )}
        </div>

        <div>
          <button
            onClick={testVideoUpload}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded mr-4"
          >
            Test Video Upload
          </button>
          {videoResult && (
            <div className="mt-2">
              <p className="text-sm text-gray-400">Video URL:</p>
              <p className="text-xs text-gray-500 break-all">{videoResult}</p>
              <video src={videoResult} controls className="w-64 h-48 rounded mt-2" />
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-900 border border-red-600 text-red-300 px-4 py-3 rounded-lg">
            <p className="text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CloudinaryTest;
