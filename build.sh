#!/bin/bash

# 🚀 Food Delivery App - Production Build Script
# This script builds the web frontend and copies it to the server dist folder

set -e  # Exit on error

echo "🎯 Starting production build process..."
echo ""

# Step 1: Build Web Frontend
echo "📦 Step 1: Building web frontend..."
cd web
npm install
npm run build
cd ..
echo "✅ Web build completed!"
echo ""

# Step 2: Clean server dist folder
echo "🧹 Step 2: Cleaning server dist folder..."
rm -rf server/dist
mkdir -p server/dist
echo "✅ Server dist folder cleaned!"
echo ""

# Step 3: Copy web build to server dist
echo "📋 Step 3: Copying web build to server dist..."
cp -r web/dist/* server/dist/
echo "✅ Web build copied to server!"
echo ""

# Step 4: Verify files
echo "🔍 Step 4: Verifying build files..."
if [ -f "server/dist/index.html" ]; then
    echo "✅ index.html found"
else
    echo "❌ index.html NOT found!"
    exit 1
fi

if [ -d "server/dist/assets" ]; then
    echo "✅ assets folder found"
    ls -lh server/dist/assets/
else
    echo "❌ assets folder NOT found!"
    exit 1
fi
echo ""

# Step 5: Install server dependencies
echo "📦 Step 5: Installing server dependencies..."
cd server
npm install --production
cd ..
echo "✅ Server dependencies installed!"
echo ""

echo "🎉 Build process completed successfully!"
echo ""
echo "Next steps:"
echo "1. Configure server/.env file with production variables"
echo "2. Start server: cd server && npm start"
echo "3. Access your app at http://localhost:8080"
echo ""
echo "For detailed deployment guide, see DEPLOYMENT.md"
