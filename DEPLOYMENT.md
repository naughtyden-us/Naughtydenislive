# Deployment Guide

## Prerequisites

1. **Firebase Project Setup**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication (Email/Password, Google)
   - Enable Firestore Database
   - Enable Storage (if using Firebase Storage)
   - Get your Firebase configuration

2. **Cloudinary Account**
   - Create a Cloudinary account at [Cloudinary](https://cloudinary.com/)
   - Get your Cloud Name and API Key
   - Set up unsigned upload preset

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Cloudinary Configuration
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
NEXT_PUBLIC_CLOUDINARY_API_KEY=your_cloudinary_api_key
```

## Firebase Security Rules

### Firestore Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own profile
    match /profiles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Posts are readable by all authenticated users
    match /posts/{postId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.auth.uid == resource.data.authorId;
      allow update: if request.auth != null && request.auth.uid == resource.data.authorId;
      allow delete: if request.auth != null && request.auth.uid == resource.data.authorId;
    }
    
    // Comments are readable by all authenticated users
    match /posts/{postId}/comments/{commentId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null && request.auth.uid == resource.data.userId;
      allow delete: if request.auth != null && request.auth.uid == resource.data.userId;
    }
  }
}
```

### Storage Rules (if using Firebase Storage)
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Deployment Options

### Option 1: Vercel (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   vercel
   ```

3. **Set Environment Variables**
   - Go to your Vercel dashboard
   - Navigate to your project settings
   - Add all environment variables from `.env.local`

4. **Redeploy**
   ```bash
   vercel --prod
   ```

### Option 2: Netlify

1. **Build the project**
   ```bash
   npm run build
   npm run export
   ```

2. **Deploy to Netlify**
   - Drag and drop the `out` folder to Netlify
   - Or connect your GitHub repository

3. **Set Environment Variables**
   - Go to Site settings > Environment variables
   - Add all required environment variables

### Option 3: Firebase Hosting

1. **Install Firebase CLI**
   ```bash
   npm install -g firebase-tools
   ```

2. **Initialize Firebase**
   ```bash
   firebase init hosting
   ```

3. **Configure firebase.json**
   ```json
   {
     "hosting": {
       "public": "out",
       "ignore": [
         "firebase.json",
         "**/.*",
         "**/node_modules/**"
       ],
       "rewrites": [
         {
           "source": "**",
           "destination": "/index.html"
         }
       ]
     }
   }
   ```

4. **Build and Deploy**
   ```bash
   npm run build
   npm run export
   firebase deploy
   ```

## Post-Deployment Checklist

- [ ] Verify all environment variables are set correctly
- [ ] Test authentication (sign up, sign in, sign out)
- [ ] Test database operations (create posts, like posts)
- [ ] Test file uploads (if applicable)
- [ ] Verify Firebase security rules are working
- [ ] Check error handling and logging
- [ ] Test on different devices and browsers
- [ ] Set up monitoring and analytics

## Performance Optimization

1. **Enable Compression**
   - Vercel: Automatic
   - Netlify: Enable in settings
   - Firebase: Automatic

2. **CDN Configuration**
   - All platforms provide CDN by default
   - Configure custom domains if needed

3. **Image Optimization**
   - Use Next.js Image component
   - Configure Cloudinary transformations

## Monitoring

1. **Error Tracking**
   - Set up Sentry or similar service
   - Configure error boundaries

2. **Analytics**
   - Google Analytics
   - Firebase Analytics

3. **Performance Monitoring**
   - Vercel Analytics
   - Firebase Performance Monitoring

## Troubleshooting

### Common Issues

1. **Environment Variables Not Working**
   - Ensure variables start with `NEXT_PUBLIC_`
   - Redeploy after adding new variables

2. **Firebase Authentication Issues**
   - Check Firebase console for enabled providers
   - Verify domain is added to authorized domains

3. **Database Permission Errors**
   - Review Firestore security rules
   - Check user authentication status

4. **Build Failures**
   - Check TypeScript errors
   - Verify all dependencies are installed
   - Review build logs for specific errors

### Support

For deployment issues:
1. Check the platform-specific documentation
2. Review build logs
3. Test locally with production environment variables
4. Contact platform support if needed
