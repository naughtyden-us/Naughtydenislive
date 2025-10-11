# Cloudinary Setup Instructions

## Fix "Upload preset not found" Error

### Step 1: Create Unsigned Upload Preset in Cloudinary Dashboard

1. Go to your Cloudinary Dashboard: https://cloudinary.com/console
2. Navigate to **Settings** → **Upload** → **Upload presets**
3. Click **"Add upload preset"**
4. Configure the preset:
   - **Preset name**: `unsigned`
   - **Signing Mode**: Select **"Unsigned"**
   - **Folder**: `naughtyden` (or leave empty)
   - **Quality**: `auto`
   - **Format**: `auto`
   - **Access mode**: `public`
5. Click **"Save"**

### Step 2: Alternative Solution (No Upload Preset Required)

If you prefer not to use upload presets, you can use Cloudinary's widget or implement server-side uploads. The current implementation will work once you create the `unsigned` upload preset.

### Step 3: Test the Upload

After creating the upload preset, your uploads should work without the "Upload preset not found" error.

## Current Configuration

- **Cloud Name**: `dudlaktup`
- **API Key**: `363425299489252`
- **Upload Preset**: `unsigned` (needs to be created)

## Features Supported

- ✅ All image formats (JPEG, PNG, WebP, GIF, BMP, TIFF, SVG, AVIF, HEIC, RAW)
- ✅ All video formats (MP4, WebM, MOV, AVI, WMV, FLV, MKV, M4V, 3GP, OGV, TS, MTS, VOB, ASF, RM)
- ✅ Automatic optimization
- ✅ Flexible dimensions
- ✅ Real-time preview
- ✅ Thumbnail generation for videos
