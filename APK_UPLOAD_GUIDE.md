# 📱 APK Upload Guide - Fix "Cannot GET /uploads/app-release.apk"

## 🔴 **Current Issue:**
```
Cannot GET /uploads/app-release.apk
```

### **Root Cause:**
The APK file **does NOT exist** on the production server!

**What's Fixed:**
- ✅ Backend code (server/src/app.js) - MIME types, static serving
- ✅ Frontend code (web/src/pages/*) - Download button, API calls
- ✅ APK built locally: `D:\food_delivery_v1\client\android\app\build\outputs\apk\release\app-release.apk`

**What's Missing:**
- ❌ APK file not uploaded to server

---

## ✅ **SOLUTION: Upload APK to Server**

### **🎯 Method 1: Admin Panel Upload (EASIEST)** ⭐

**This is the recommended method!**

#### **Steps:**

1. **Open APK Folder:**
   ```
   Location: D:\food_delivery_v1\client\android\app\build\outputs\apk\release\
   File: app-release.apk (61.06 MB)
   ```
   *(Folder already opened in Windows Explorer)*

2. **Login to Admin Panel:**
   ```
   URL: https://www.chatoraadda.in/admin/login
   ```
   Enter your admin credentials

3. **Navigate to App Settings:**
   - Look for **"App Settings"** or **gear icon** in sidebar
   - Click to open App Settings page

4. **Upload APK:**
   - Click **"Upload APK"** or **"Choose File"** button
   - Select: `app-release.apk` from the opened folder
   - Click **"Upload"** or **"Submit"**

5. **Wait for Upload:**
   - Progress bar will show upload status
   - Upload time: 1-3 minutes (depends on internet speed)
   - File size: 61.06 MB

6. **Verify Upload:**
   - After successful upload, refresh the page
   - You should see APK info displayed
   - Try downloading from landing page

7. **Test Download:**
   ```
   URL: https://www.chatoraadda.in/uploads/app-release.apk
   ```
   - Open this URL in browser
   - Should start downloading APK file ✅
   - File size should be ~61 MB

---

### **🔧 Method 2: SCP Upload via Terminal**

**If admin panel doesn't work, use this:**

#### **Prerequisites:**
- SSH access to server
- Know server path

#### **Steps:**

1. **Find Server Upload Path:**
   ```bash
   ssh your_username@www.chatoraadda.in
   cd /path/to/your/app
   pwd
   # Output: /home/user/food-delivery or similar
   ```

2. **Upload APK:**
   ```bash
   # From your local machine
   scp "D:\food_delivery_v1\client\android\app\build\outputs\apk\release\app-release.apk" \
       your_username@www.chatoraadda.in:/home/user/food-delivery/server/uploads/app-release.apk
   ```

3. **Create Metadata File:**
   ```bash
   ssh your_username@www.chatoraadda.in
   cd /home/user/food-delivery/server
   
   cat > apk-info.json << 'EOF'
   {
     "name": "app-release.apk",
     "size": "61.06 MB",
     "uploadDate": "2026-01-24T16:30:00.000Z",
     "url": "/uploads/app-release.apk",
     "available": true,
     "filename": "app-release.apk",
     "path": "/home/user/food-delivery/server/uploads/app-release.apk"
   }
   EOF
   ```

4. **Set Permissions:**
   ```bash
   chmod 644 uploads/app-release.apk
   chmod 644 apk-info.json
   ```

5. **Restart Server:**
   ```bash
   pm2 restart food-delivery
   # OR
   systemctl restart food-delivery
   ```

6. **Verify:**
   ```bash
   # Check file exists
   ls -lh uploads/app-release.apk
   
   # Test download
   curl -I https://www.chatoraadda.in/uploads/app-release.apk
   ```

---

### **🖥️ Method 3: FileZilla/WinSCP (GUI Tool)**

**If you prefer a GUI:**

#### **Using FileZilla:**

1. **Install FileZilla Client:**
   ```
   Download: https://filezilla-project.org/download.php?type=client
   ```

2. **Connect to Server:**
   - Host: `sftp://www.chatoraadda.in`
   - Username: Your SSH username
   - Password: Your SSH password
   - Port: 22
   - Click **"Quickconnect"**

3. **Navigate on Server:**
   - Remote site: `/path/to/your/app/server/uploads/`

4. **Upload APK:**
   - Local site: `D:\food_delivery_v1\client\android\app\build\outputs\apk\release\`
   - Drag `app-release.apk` from local to remote
   - Wait for upload to complete

5. **Create Metadata:**
   - Create a new file `apk-info.json` in `/path/to/your/app/server/`
   - Copy content from above

6. **Restart Server** (via SSH)

---

## 🧪 **Verification Checklist:**

After uploading, verify these:

### **1. File Exists on Server:**
```bash
ssh user@www.chatoraadda.in
ls -lh /path/to/server/uploads/app-release.apk
# Should show: -rw-r--r-- 1 user user 61M Jan 24 21:48 app-release.apk
```

### **2. Metadata File Exists:**
```bash
ls -lh /path/to/server/apk-info.json
cat /path/to/server/apk-info.json
# Should show JSON with available: true
```

### **3. API Endpoint Works:**
```bash
curl https://www.chatoraadda.in/api/public/apk-info
# Should return JSON with APK info
```

### **4. Direct Download Works:**
```bash
curl -I https://www.chatoraadda.in/uploads/app-release.apk
# Should return: HTTP/1.1 200 OK
#                Content-Type: application/vnd.android.package-archive
#                Content-Length: 64022592
```

### **5. Browser Download:**
Open in browser:
```
https://www.chatoraadda.in/uploads/app-release.apk
```
Should start downloading immediately ✅

---

## 🚨 **Common Issues & Fixes:**

### **Issue 1: 404 Not Found**
**Cause:** File doesn't exist
**Fix:** Reupload APK to correct path

### **Issue 2: 403 Forbidden**
**Cause:** Wrong file permissions
**Fix:**
```bash
chmod 644 uploads/app-release.apk
chmod 755 uploads/
```

### **Issue 3: Wrong File Size**
**Cause:** Incomplete upload
**Fix:** Delete and reupload

### **Issue 4: Server Not Serving Static Files**
**Cause:** Server not restarted after code update
**Fix:**
```bash
pm2 restart food-delivery
```

---

## 📊 **Expected Server Structure:**

```
server/
├── uploads/
│   └── app-release.apk          ← 61.06 MB
├── apk-info.json                 ← Metadata
├── dist/                          ← Web build
│   ├── index.html
│   └── assets/
├── src/
│   └── app.js                    ← Already updated ✅
└── server.js
```

---

## 🎯 **Quick Summary:**

| Step | Action | Status |
|------|--------|--------|
| 1. Code Fix | Update app.js | ✅ Done |
| 2. Build APK | Run Gradle | ✅ Done (61.06 MB) |
| 3. **Upload APK** | **Use Admin Panel** | **⏳ PENDING** |
| 4. Test Download | Browser test | ⏳ After upload |

---

## ✅ **Recommended Action NOW:**

**Do this right now:**

1. ✅ APK folder is already open in Explorer
2. 📱 Open: `https://www.chatoraadda.in/admin/login`
3. 🔐 Login with admin credentials
4. ⚙️ Click "App Settings"
5. 📤 Upload `app-release.apk`
6. ⏳ Wait 1-3 minutes
7. ✅ Test download

**That's it! Problem solved!** 🎉

---

## 📞 **Need Server Access?**

If you don't have:
- Admin panel access
- SSH credentials
- Server path info

**Then ask your hosting provider or check:**
- Hosting dashboard (cPanel, Plesk, etc.)
- Server documentation
- Previous deployment notes

---

**Status:** Code is ready ✅ | Just need to upload APK! 📤
