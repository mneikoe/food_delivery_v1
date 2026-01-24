#!/bin/bash

# APK Upload Script for Production Server
# Run this if admin panel upload fails

echo "🚀 Uploading APK to Production Server..."
echo "================================================"

# Configuration
LOCAL_APK="D:/food_delivery_v1/client/android/app/build/outputs/apk/release/app-release.apk"
SERVER_USER="your_username"  # Change this
SERVER_HOST="www.chatoraadda.in"
SERVER_PATH="/path/to/server/uploads/"  # Change this

# Check if APK exists
if [ ! -f "$LOCAL_APK" ]; then
    echo "❌ Error: APK file not found at $LOCAL_APK"
    exit 1
fi

echo "📱 APK File: $(basename "$LOCAL_APK")"
echo "📏 APK Size: $(du -h "$LOCAL_APK" | cut -f1)"
echo ""

# Upload using SCP
echo "📤 Uploading to server..."
scp "$LOCAL_APK" "$SERVER_USER@$SERVER_HOST:$SERVER_PATH/app-release.apk"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Upload successful!"
    echo ""
    
    # Create apk-info.json
    echo "📝 Creating apk-info.json..."
    
    APK_SIZE=$(du -h "$LOCAL_APK" | cut -f1)
    CURRENT_DATE=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
    
    ssh "$SERVER_USER@$SERVER_HOST" "cat > $SERVER_PATH/../apk-info.json << EOF
{
  \"name\": \"app-release.apk\",
  \"size\": \"$APK_SIZE\",
  \"uploadDate\": \"$CURRENT_DATE\",
  \"url\": \"/uploads/app-release.apk\",
  \"available\": true,
  \"filename\": \"app-release.apk\"
}
EOF"
    
    echo "✅ Metadata created!"
    echo ""
    echo "🔄 Restarting server..."
    ssh "$SERVER_USER@$SERVER_HOST" "pm2 restart food-delivery || systemctl restart food-delivery"
    
    echo ""
    echo "🎉 Done! APK is now available at:"
    echo "   https://www.chatoraadda.in/uploads/app-release.apk"
else
    echo ""
    echo "❌ Upload failed!"
    echo "Please check your SSH credentials and server path."
fi
