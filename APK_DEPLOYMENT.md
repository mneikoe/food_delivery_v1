# 🚀 APK Upload & Deployment Instructions

## ❌ Current Error
```
Cannot GET /uploads/app-release.apk
```

## 🔍 Root Cause
The APK file is **NOT uploaded** to the production server's `uploads` folder.

---

## ✅ Solution Steps

### Step 1: Build Android APK (Already Done Locally)

Your APK is at:
```
client/android/app/build/outputs/apk/release/app-release.apk
```

### Step 2: Upload APK to Server

You have **TWO options**:

#### **Option A: Via Admin Panel (Recommended)** ✅

1. Go to: `https://www.chatoraadda.in/admin/login`
2. Login with admin credentials
3. Navigate to: **App Settings** (gear icon in sidebar)
4. Click **Upload APK** button
5. Select: `client/android/app/build/outputs/apk/release/app-release.apk`
6. Wait for upload to complete
7. Done! ✅

**Advantages:**
- ✅ Easy UI
- ✅ Automatic metadata creation
- ✅ Proper file naming
- ✅ No server SSH needed

---

#### **Option B: Manual Upload via SSH/FTP**

**If Admin Panel Upload Fails:**

1. **Find Server Path:**
```bash
ssh user@chatoraadda.in
cd /path/to/your/app/server
pwd  # Note this path
```

2. **Create uploads folder (if doesn't exist):**
```bash
mkdir -p uploads
chmod 755 uploads
```

3. **Upload APK from local machine:**
```bash
# Using SCP
scp client/android/app/build/outputs/apk/release/app-release.apk user@chatoraadda.in:/path/to/server/uploads/

# OR using SFTP
sftp user@chatoraadda.in
put client/android/app/build/outputs/apk/release/app-release.apk /path/to/server/uploads/app-release.apk
```

4. **Create apk-info.json:**
```bash
ssh user@chatoraadda.in
cd /path/to/server
nano apk-info.json
```

Paste this content:
```json
{
  "name": "app-release.apk",
  "size": "60 MB",
  "uploadDate": "2026-01-24T13:00:00.000Z",
  "url": "/uploads/app-release.apk",
  "available": true,
  "filename": "app-release.apk",
  "path": "/path/to/server/uploads/app-release.apk"
}
```

5. **Set correct permissions:**
```bash
chmod 644 uploads/app-release.apk
chmod 644 apk-info.json
```

6. **Restart server:**
```bash
pm2 restart food-delivery
# OR
systemctl restart food-delivery
```

---

## ✅ Verification

### Test 1: Check File Exists on Server
```bash
ssh user@chatoraadda.in
ls -lh /path/to/server/uploads/
# Should show: app-release.apk
```

### Test 2: Check APK Info Endpoint
```bash
curl https://www.chatoraadda.in/api/public/apk-info
```

Expected response:
```json
{
  "name": "app-release.apk",
  "size": "60 MB",
  "url": "/uploads/app-release.apk",
  "available": true
}
```

### Test 3: Download APK
```bash
curl -I https://www.chatoraadda.in/uploads/app-release.apk
```

Expected headers:
```
HTTP/1.1 200 OK
Content-Type: application/vnd.android.package-archive
Content-Disposition: attachment; filename="app-release.apk"
Content-Length: 63000000
```

### Test 4: Browser Test
Open: `https://www.chatoraadda.in/uploads/app-release.apk`

Should: **Start downloading the APK file** ✅

---

## 🔧 Server Configuration (Already Fixed)

### Updated `server/src/app.js`:
```javascript
// Serve uploaded files with proper MIME type for APK
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  setHeaders: (res, filepath) => {
    if (filepath.endsWith('.apk')) {
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Content-Disposition', 'attachment; filename="app-release.apk"');
    }
  }
}));
```

**What This Does:**
- ✅ Serves files from `server/uploads/` folder
- ✅ Sets correct MIME type for `.apk` files
- ✅ Forces download (not preview) with `Content-Disposition`

---

## 📊 Folder Structure on Server

After deployment, your server should have:

```
server/
├── uploads/
│   └── app-release.apk          ← APK file here
├── apk-info.json                 ← Metadata here
├── dist/                          ← Web app files
│   ├── index.html
│   └── assets/
├── src/
│   └── app.js
└── server.js
```

---

## 🚨 Common Issues

### Issue 1: 404 Not Found
**Cause:** APK file not uploaded
**Fix:** Upload APK via admin panel or SSH

### Issue 2: Permission Denied
**Cause:** Wrong file permissions
**Fix:**
```bash
chmod 644 uploads/app-release.apk
chmod 755 uploads/
```

### Issue 3: Wrong Content-Type
**Cause:** Old server code without MIME type
**Fix:** Update `server/src/app.js` with code above, restart server

### Issue 4: File Corrupted
**Cause:** Incomplete upload
**Fix:** Re-upload APK file (ensure full transfer)

---

## 📝 Quick Checklist

Production server needs:
- [ ] `server/uploads/` folder exists
- [ ] `app-release.apk` uploaded to `server/uploads/`
- [ ] `apk-info.json` exists in `server/` root
- [ ] File permissions: 644 for files, 755 for folder
- [ ] `server/src/app.js` updated with new code
- [ ] Server restarted
- [ ] APK downloads successfully from browser

---

## 🎯 Recommended Approach

**Use Admin Panel Upload** (Option A):
1. Build APK locally: ✅ (Already done)
2. Login to admin panel
3. Upload via UI
4. Test download
5. Done!

**Total Time:** < 5 minutes

---

## 📞 If Still Not Working

1. **Check server logs:**
```bash
pm2 logs food-delivery
# Look for errors related to /uploads/
```

2. **Check Nginx logs (if using):**
```bash
tail -f /var/log/nginx/error.log
```

3. **Verify route registration:**
```bash
curl -I https://www.chatoraadda.in/uploads/
# Should return 404 (folder listing disabled) or 403 (forbidden)
# NOT "Cannot GET" - that means route not registered
```

4. **Check if uploads folder is in .gitignore:**
```bash
cat server/.gitignore | grep uploads
# Should show: uploads/
```

---

## ✅ Final Status

**Code Changes:** ✅ Complete
- APK MIME type added
- Content-Disposition header added
- Static serving configured

**Next Step:** 📤 **Upload APK to production server**

**Use:** Admin panel upload at `/admin/app-settings`

---

**Status: Code Fixed ✅ | Deployment Pending ⏳**
