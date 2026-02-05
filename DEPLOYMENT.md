# 🚀 Food Delivery App - Deployment Guide

## 📋 Prerequisites

- Node.js v16+ installed
- MongoDB instance (local or cloud)
- Domain/Server with SSL (for production)

---

## 🛠️ Production Build Process

### Step 1: Build Web Frontend

```bash
cd web
npm install
npm run build
```

This will create an optimized build in `web/dist/` folder.

### Step 2: Copy Build to Server

```bash
# From project root
cp -r web/dist/* server/dist/
```

**Important:** The `server/dist/` folder should contain:
- `index.html`
- `assets/` folder with JS and CSS files
- `vite.svg` and other static assets

### Step 3: Install Server Dependencies

```bash
cd server
npm install --production
```

### Step 4: Configure Environment Variables

Create `server/.env` file:

```env
# Server
PORT=8080
NODE_ENV=production

# MongoDB
MONGODB_URI=mongodb://localhost:27017/food_delivery
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/food_delivery

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Supabase (for OTP)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Step 5: Start Production Server

```bash
cd server
npm start
```

Server will run on port **8080** (or your custom PORT).

---

## 🌐 Server Configuration (Express.js)

The server now serves:
1. **API routes** at `/api/*`
2. **Uploaded files** at `/uploads/*` (APK downloads)
3. **Static frontend** from `server/dist/`
4. **SPA fallback** for all non-API routes

### Key Features:
- ✅ Proper MIME types for JS modules
- ✅ Handles React Router client-side routing
- ✅ Serves static assets correctly
- ✅ APK file uploads and downloads

---

## 🔧 Nginx Configuration (Optional - Recommended)

If deploying behind Nginx as reverse proxy:

```nginx
server {
    listen 80;
    server_name chatoraadda.in www.chatoraadda.in;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name chatoraadda.in www.chatoraadda.in;
    
    # SSL Configuration
    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;
    
    # Allow large APK uploads (61MB+). Default is 1m; set before any location that receives uploads.
    client_max_body_size 100m;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:8080;
        proxy_cache_valid 200 30d;
        add_header Cache-Control "public, max-age=2592000";
    }
    
    # APK upload - long timeouts for large file (60MB+)
    location = /api/admin/apk-upload {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 100m;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
    
    # API routes
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 100m;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }
    
    # Uploads (APK downloads)
    location /uploads/ {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
    }
    
    # All other routes - proxy to Node.js
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🐛 Troubleshooting Common Issues

### Issue 1: MIME Type Error for JS Modules

**Error:**
```
Failed to load module script: Expected a JavaScript module 
but the server responded with a MIME type of "text/html"
```

**Solution:** ✅ Already fixed in `server/src/app.js`
- Static files are served with proper `Content-Type` headers
- Wildcard route excludes `/assets/*` and `.js` files
- SPA fallback only for HTML routes

### Issue 2: Assets Not Loading (404) or CSS/JS Return "text/html"

**Error:** `Refused to apply style from '.../assets/index-xxx.css' because its MIME type ('text/html') is not a supported stylesheet MIME type`

**Cause:** Either the `assets/` folder is missing on the server, or a reverse proxy (e.g. Nginx) is serving `index.html` for missing files instead of passing the request to Node.

**Fix:**
1. Deploy the **full** `web/dist/` output: copy **both** `index.html` **and** the `assets/` folder into `server/dist/` (e.g. `cp -r web/dist/* server/dist/`).
2. Ensure `server/dist/assets/` exists and contains the built `.js` and `.css` files.
3. If using Nginx, do **not** use `try_files $uri $uri/ /index.html;` for `/` when Node serves the app; proxy all requests to Node (see Nginx config above) so Express can serve `/assets/` with correct MIME types.

**Check:**
1. `server/dist/` folder has `assets/` directory
2. `index.html` is in `server/dist/`
3. File paths in `index.html` start with `/assets/` (not relative)

### Issue 3: API Routes Return HTML

**Check:**
1. API routes are registered **before** static file serving
2. Wildcard `app.get("*")` excludes `/api/*` paths

### Issue 4: React Router Routes Return 404

**Solution:** Already handled by SPA fallback in `server/src/app.js`

### Issue 5: 502 Bad Gateway on APK Upload

**Error:** `POST .../api/admin/apk-upload 502 (Bad Gateway)` when uploading APK (e.g. 61 MB).

**Cause:** Nginx (or another reverse proxy) blocks or times out large uploads. Default `client_max_body_size` is 1 MB and proxy timeouts can be too short.

**Fix (on the server where Nginx runs):**

1. **Allow large body size** – inside the `server { }` block (before or inside `location` blocks), add:
   ```nginx
   client_max_body_size 100m;
   ```

2. **Longer timeouts for APK upload** – add a dedicated location before the general `/api/` block:
   ```nginx
   location = /api/admin/apk-upload {
       proxy_pass http://localhost:8080;
       proxy_http_version 1.1;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
       client_max_body_size 100m;
       proxy_connect_timeout 300s;
       proxy_send_timeout 300s;
       proxy_read_timeout 300s;
   }
   ```

3. **Reload Nginx:** `sudo nginx -t && sudo systemctl reload nginx` (or `sudo service nginx reload`).

The full Nginx example in the "Nginx Configuration" section above already includes these settings.

---

## 📱 Client App (React Native)

### Android APK Build

```bash
cd client
cd android
./gradlew assembleRelease
```

APK location: `client/android/app/build/outputs/apk/release/app-release.apk`

### Upload APK to Server

1. Login to admin panel at `https://yourdomain.com/admin`
2. Go to "App Settings"
3. Upload the APK file
4. APK will be available at `/uploads/app-release.apk`

---

## 🎯 Deployment Checklist

- [ ] Build web frontend (`npm run build` in `web/`)
- [ ] Copy `web/dist/*` to `server/dist/`
- [ ] Create `server/.env` with all required variables
- [ ] Install production dependencies in `server/`
- [ ] Test locally: `npm start` in `server/`
- [ ] Configure Nginx reverse proxy (optional but recommended)
- [ ] Setup SSL certificate
- [ ] Start server with PM2 or systemd
- [ ] Upload APK via admin panel
- [ ] Test all routes: landing page, admin login, API endpoints

---

## 🔄 Using PM2 (Process Manager)

```bash
# Install PM2 globally
npm install -g pm2

# Start server
cd server
pm2 start server.js --name food-delivery

# Other commands
pm2 status
pm2 logs food-delivery
pm2 restart food-delivery
pm2 stop food-delivery

# Auto-restart on system reboot
pm2 startup
pm2 save
```

---

## 🎉 Testing Deployment

1. **Landing Page:** `https://yourdomain.com/`
2. **Admin Login:** `https://yourdomain.com/admin`
3. **API Health:** `https://yourdomain.com/health`
4. **APK Info:** `https://yourdomain.com/api/public/apk-info`
5. **APK Download:** `https://yourdomain.com/uploads/app-release.apk`

---

## 📞 Support

For issues, check:
- Server logs: `pm2 logs food-delivery`
- Nginx logs: `/var/log/nginx/error.log`
- Browser console for frontend errors
- Network tab for failed requests

---

**Made with ❤️ for Chatora Adda**
