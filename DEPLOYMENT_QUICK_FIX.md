# 🚀 Quick Deployment Steps for chatoraadda.in

## Current Setup
- Domain: `chatoraadda.in` / `www.chatoraadda.in`
- Server: Already deployed and running
- Issue: MIME type error for JS modules

---

## 🔧 Fix Deployed Application

### Option 1: Update Code and Redeploy (Recommended)

#### Step 1: On Your Local Machine

```bash
# Navigate to project root
cd d:\food_delivery_v1

# Build web app
cd web
npm install
npm run build

# Copy to server dist
cd ..
mkdir server\dist 2>nul
xcopy web\dist\* server\dist\ /E /I /Y

# Verify files
dir server\dist
dir server\dist\assets
```

#### Step 2: Upload to Server

Upload the following to your server:
1. `server/src/app.js` (updated with MIME type fixes)
2. `server/server.js` (updated PORT to 8080)
3. `server/dist/*` (entire folder with web build)

#### Step 3: On Your Server

```bash
# Navigate to server directory
cd /path/to/your/server

# Restart the application
pm2 restart food-delivery
# OR if using different process manager
systemctl restart food-delivery
# OR if running directly
# Kill old process and start: node server.js
```

---

### Option 2: Quick Fix Existing Deployment

If you can't update files, configure Nginx to set proper headers:

```nginx
location ~* \.js$ {
    proxy_pass http://localhost:8080;
    add_header Content-Type "application/javascript; charset=UTF-8";
}

location ~* \.css$ {
    proxy_pass http://localhost:8080;
    add_header Content-Type "text/css; charset=UTF-8";
}
```

Then reload Nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## ✅ Verify Fix

1. Open browser: `https://www.chatoraadda.in`
2. Open Developer Console (F12)
3. Check Network tab
4. Look for JS files (e.g., `index-1MWAle4Z.js`)
5. Response Headers should show:
   ```
   Content-Type: application/javascript; charset=UTF-8
   ```

---

## 🔍 Debug Steps

### Check Server Logs
```bash
# If using PM2
pm2 logs food-delivery

# If using systemd
journalctl -u food-delivery -f

# Check Nginx logs
tail -f /var/log/nginx/error.log
```

### Check Files on Server
```bash
# Verify dist folder structure
ls -la /path/to/server/dist/
ls -la /path/to/server/dist/assets/

# Check if files exist
cat /path/to/server/dist/index.html
```

### Test API
```bash
curl https://www.chatoraadda.in/health
curl https://www.chatoraadda.in/api/public/apk-info
```

---

## 📝 Changes Made

### 1. `server/src/app.js`
- Added proper Content-Type headers for JS/CSS files
- Updated wildcard route to exclude static assets
- Prevents serving HTML for asset requests

### 2. `server/server.js`
- Changed default PORT from 5000 to 8080
- Maintains consistency with configuration

### 3. Build Process
- Created automated build scripts
- `build.bat` for Windows
- `build.sh` for Linux/Mac

---

## 🎯 What Causes This Error?

The error occurs when:
1. Browser requests `/assets/index-1MWAle4Z.js`
2. Express wildcard `app.get("*")` matches it
3. Server sends `index.html` instead of JS file
4. Browser expects JS but gets HTML → MIME type error

**Fix:** Exclude asset paths from wildcard route and set proper headers.

---

## 📱 Contact

If issue persists after these steps:
1. Check server logs for errors
2. Verify Nginx configuration
3. Clear browser cache
4. Test in incognito mode

---

**Current Status:** 🔧 Code fixed, ready to redeploy
