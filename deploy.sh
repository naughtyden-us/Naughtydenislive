#!/bin/bash

# Deployment script for Naughty Den App

echo "🚀 Starting deployment process..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run linting
echo "🔍 Running linting..."
npm run lint

# Run type checking
echo "🔧 Running type checking..."
npm run type-check

# Build the application
echo "🏗️ Building application..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    
    # Deploy to Vercel (if Vercel CLI is installed)
    if command -v vercel &> /dev/null; then
        echo "🚀 Deploying to Vercel..."
        vercel --prod
    else
        echo "⚠️ Vercel CLI not found. Please install it with: npm i -g vercel"
        echo "📁 Build files are ready in the .next directory"
    fi
else
    echo "❌ Build failed. Please check the errors above."
    exit 1
fi

echo "🎉 Deployment process completed!"
