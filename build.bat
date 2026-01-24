@echo off
REM 🚀 Food Delivery App - Production Build Script (Windows)
REM This script builds the web frontend and copies it to the server dist folder

echo 🎯 Starting production build process...
echo.

REM Step 1: Build Web Frontend
echo 📦 Step 1: Building web frontend...
cd web
call npm install
call npm run build
cd ..
echo ✅ Web build completed!
echo.

REM Step 2: Clean server dist folder
echo 🧹 Step 2: Cleaning server dist folder...
if exist server\dist rmdir /s /q server\dist
mkdir server\dist
echo ✅ Server dist folder cleaned!
echo.

REM Step 3: Copy web build to server dist
echo 📋 Step 3: Copying web build to server dist...
xcopy web\dist\* server\dist\ /E /I /Y
echo ✅ Web build copied to server!
echo.

REM Step 4: Verify files
echo 🔍 Step 4: Verifying build files...
if exist server\dist\index.html (
    echo ✅ index.html found
) else (
    echo ❌ index.html NOT found!
    exit /b 1
)

if exist server\dist\assets (
    echo ✅ assets folder found
    dir server\dist\assets
) else (
    echo ❌ assets folder NOT found!
    exit /b 1
)
echo.

REM Step 5: Install server dependencies
echo 📦 Step 5: Installing server dependencies...
cd server
call npm install --production
cd ..
echo ✅ Server dependencies installed!
echo.

echo 🎉 Build process completed successfully!
echo.
echo Next steps:
echo 1. Configure server\.env file with production variables
echo 2. Start server: cd server ^&^& npm start
echo 3. Access your app at http://localhost:8080
echo.
echo For detailed deployment guide, see DEPLOYMENT.md

pause
