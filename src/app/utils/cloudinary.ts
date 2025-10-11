// Cloudinary client-side configuration
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dudlaktup';
const API_KEY = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || '363425299489252';

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  format: string;
  width?: number;
  height?: number;
  bytes: number;
}

export interface CloudinaryVideoUploadResult extends CloudinaryUploadResult {
  duration?: number;
}

// Upload image to Cloudinary with support for all formats
export const uploadImage = async (
  file: File,
  folder: string = 'naughtyden',
  transformation?: any
): Promise<CloudinaryUploadResult> => {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    formData.append('upload_preset', 'unsigned'); // Use unsigned upload preset
    
    // Add quality and format optimization
    formData.append('quality', 'auto');
    formData.append('format', 'auto');

    if (transformation) {
      formData.append('transformation', JSON.stringify(transformation));
    }

    fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData,
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(result => {
      if (result.error) {
        console.error('Cloudinary error:', result.error);
        reject(new Error(`Cloudinary error: ${result.error.message}. Please check your upload preset configuration.`));
      } else {
        console.log('Upload successful:', result);
        resolve({
          public_id: result.public_id,
          secure_url: result.secure_url,
          format: result.format,
          width: result.width,
          height: result.height,
          bytes: result.bytes
        });
      }
    })
    .catch(error => {
      console.error('Upload failed:', error);
      reject(new Error(`Upload failed: ${error.message}. Please check your Cloudinary configuration.`));
    });
  });
};

// Upload video to Cloudinary with support for all formats
export const uploadVideo = async (
  file: File,
  folder: string = 'naughtyden',
  transformation?: any
): Promise<CloudinaryVideoUploadResult> => {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    formData.append('resource_type', 'video');
    formData.append('upload_preset', 'unsigned'); // Use unsigned upload preset
    
    // Add quality and format optimization for videos
    formData.append('quality', 'auto');
    formData.append('format', 'auto');

    if (transformation) {
      formData.append('transformation', JSON.stringify(transformation));
    }

    fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`, {
      method: 'POST',
      body: formData,
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(result => {
      if (result.error) {
        console.error('Cloudinary error:', result.error);
        reject(new Error(`Cloudinary error: ${result.error.message}. Please check your upload preset configuration.`));
      } else {
        console.log('Video upload successful:', result);
        resolve({
          public_id: result.public_id,
          secure_url: result.secure_url,
          format: result.format,
          width: result.width,
          height: result.height,
          bytes: result.bytes,
          duration: result.duration
        });
      }
    })
    .catch(error => {
      console.error('Video upload failed:', error);
      reject(new Error(`Video upload failed: ${error.message}. Please check your Cloudinary configuration.`));
    });
  });
};

// Generate thumbnail from video
export const generateVideoThumbnail = async (
  videoPublicId: string,
  timestamp: number = 1
): Promise<string> => {
  // Generate thumbnail URL using Cloudinary's transformation API
  const thumbnailUrl = `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/so_${timestamp},w_320,h_180,c_scale,f_jpg/${videoPublicId}`;
  
  return thumbnailUrl;
};

// Delete asset from Cloudinary (requires server-side implementation)
export const deleteAsset = async (publicId: string, resourceType: 'image' | 'video' = 'image'): Promise<void> => {
  // Note: Asset deletion requires server-side implementation with API secret
  // For now, we'll just log the request
  console.log(`Asset deletion requested for ${publicId} (${resourceType})`);
  console.warn('Asset deletion requires server-side implementation with API secret');
};
