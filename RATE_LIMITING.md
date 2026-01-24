# 🛡️ Rate Limiting & Error Handling Guide

## 📋 Overview

The application implements comprehensive rate limiting and error handling to protect against abuse and provide a smooth user experience.

---

## 🚦 Rate Limiting Configuration

### Server-Side (Express)

**Location:** `server/src/app.js`

```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes window
  max: 100,                   // Max 100 requests per window per IP
  standardHeaders: true,      // Modern RateLimit-* headers
  legacyHeaders: false,       // Disable old X-RateLimit-* headers
});
```

### Rate Limit Details

| Setting | Value | Description |
|---------|-------|-------------|
| **Window** | 15 minutes | Time window for rate limiting |
| **Max Requests** | 100 | Maximum requests per IP per window |
| **Scope** | All `/api/*` routes | Rate limiting applies here |
| **Excluded** | `/health`, `/api/public/apk-info` | Public endpoints excluded |

---

## 🎯 Response Headers

When a request is made, the server includes rate limit information:

```http
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1706103600
```

**Headers Explained:**
- `RateLimit-Limit`: Maximum requests allowed
- `RateLimit-Remaining`: Requests remaining in current window
- `RateLimit-Reset`: Unix timestamp when limit resets

---

## 🚨 HTTP 429 - Too Many Requests

### Server Response Format

When rate limit is exceeded (429 error):

```json
{
  "error": "Too Many Requests",
  "message": "You have exceeded the rate limit. Please try again later.",
  "retryAfter": 300,
  "limit": 100,
  "remaining": 0,
  "resetTime": "2026-01-24T14:30:00.000Z"
}
```

**Fields:**
- `retryAfter`: Seconds until rate limit resets
- `limit`: Maximum allowed requests
- `remaining`: Requests left (0 when limited)
- `resetTime`: ISO timestamp of reset

---

## 📱 Client-Side Handling

### React Native App (`client/src/api/api.ts`)

**Automatic 429 Handling:**

```typescript
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 429) {
      const retryAfter = error.response.data?.retryAfter || 60;
      const minutes = Math.ceil(retryAfter / 60);
      
      Alert.alert(
        'Too Many Requests',
        `You've made too many requests. Please wait ${minutes} minute(s) and try again.`,
        [{ text: 'OK' }]
      );
    }
    return Promise.reject(error);
  }
);
```

**User Experience:**
- ✅ Friendly alert message
- ✅ Shows wait time in minutes
- ✅ Non-intrusive error handling
- ✅ Request fails gracefully

### Web Admin (`web/src/api/adminApi.js`)

**Automatic 429 Handling:**

```javascript
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 429) {
      const retryAfter = error.response.data?.retryAfter || 60;
      const minutes = Math.ceil(retryAfter / 60);
      
      window.antMessage.warning(
        `Too many requests. Please wait ${minutes} minute(s) and try again.`,
        5
      );
    }
    return Promise.reject(error);
  }
);
```

**User Experience:**
- ✅ Ant Design message notification
- ✅ Auto-dismisses after 5 seconds
- ✅ Non-blocking UI
- ✅ Professional appearance

---

## 🔄 Retry Logic (Optional)

### Exponential Backoff

**Location:** `client/src/utils/retryWithBackoff.ts`

**Usage Example:**

```typescript
import { retryWithBackoff } from '../utils/retryWithBackoff';

// Retry on server errors (5xx), not on rate limits (429)
const data = await retryWithBackoff(
  () => api.get('/user/profile'),
  { 
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2
  }
);
```

**Strategy:**
- ✅ Retries on network errors
- ✅ Retries on server errors (500-599)
- ❌ **Does NOT retry on 429** (respects rate limit)
- ❌ Does not retry on client errors (400-499)

**Retry Schedule:**
1. First retry: after 1 second
2. Second retry: after 2 seconds
3. Third retry: after 4 seconds

---

## 🔒 Trust Proxy Configuration

**Why Important:**
- App runs behind Nginx reverse proxy
- Express needs to trust `X-Forwarded-For` header
- Accurate IP tracking for rate limiting

**Configuration:**

```javascript
app.set('trust proxy', 1); // Trust first proxy (Nginx)
```

**Security:**
- Only trusts first proxy
- Prevents IP spoofing
- Accurate rate limiting per real client IP

---

## 📊 Rate Limit Scenarios

### Scenario 1: Normal Usage ✅

```
User makes 50 requests in 15 minutes
→ All succeed (50 < 100 limit)
→ RateLimit-Remaining: 50
```

### Scenario 2: Heavy Usage ⚠️

```
User makes 100 requests in 15 minutes
→ All succeed (exactly at limit)
→ RateLimit-Remaining: 0
→ Next request will be limited
```

### Scenario 3: Rate Limited 🚫

```
User makes 101st request in same window
→ Server returns 429 error
→ User sees: "Wait 8 minutes and try again"
→ After 15 minutes from first request: limit resets
```

---

## 🛠️ Adjusting Rate Limits

### For Development

**Increase limits:**

```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // Increase to 1000 for testing
  skip: (req) => {
    // Skip for development
    return process.env.NODE_ENV === 'development';
  },
});
```

### For Production

**Stricter limits for auth endpoints:**

```javascript
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Only 5 login attempts per 15 min
});

app.use("/api/auth/send-email-otp", authLimiter);
app.use("/api/auth/verify-email-otp", authLimiter);
```

**Different limits per endpoint:**

```javascript
const readLimiter = rateLimit({ max: 1000 }); // Read operations
const writeLimiter = rateLimit({ max: 100 });  // Write operations

app.use("/api/user", readLimiter);    // GET requests
app.use("/api/admin", writeLimiter);  // POST/PUT/DELETE
```

---

## 🧪 Testing Rate Limits

### Manual Testing

```bash
# Send 101 requests rapidly
for i in {1..101}; do
  curl -X GET https://www.chatoraadda.in/api/user/profile \
    -H "Authorization: Bearer YOUR_TOKEN"
done
```

**Expected:**
- First 100: Success (200)
- Request 101: Rate limited (429)

### Check Headers

```bash
curl -I https://www.chatoraadda.in/api/user/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response Headers:**
```
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1706103600
```

---

## 📝 Best Practices

### ✅ DO

1. **Respect rate limits** - Don't retry immediately on 429
2. **Show user-friendly messages** - Explain wait time
3. **Monitor usage** - Track how often users hit limits
4. **Use retry logic** - For server errors (5xx) only
5. **Cache responses** - Reduce redundant API calls

### ❌ DON'T

1. **Don't retry on 429** - Wait for `retryAfter` period
2. **Don't hide errors** - Always inform the user
3. **Don't increase limits arbitrarily** - Consider server capacity
4. **Don't expose raw errors** - Sanitize error messages
5. **Don't ignore headers** - Use `RateLimit-*` info

---

## 🔍 Debugging Rate Limits

### Check Server Logs

```bash
# If using PM2
pm2 logs food-delivery

# Look for rate limit hits
# No logs by default - limits happen silently
```

### Monitor Client Side

**React Native:**
```typescript
api.interceptors.response.use(
  (response) => {
    console.log('Rate Limit Remaining:', 
      response.headers['ratelimit-remaining']);
    return response;
  }
);
```

**Web Admin:**
```javascript
api.interceptors.response.use(
  (response) => {
    console.log('Rate Limit Info:', {
      limit: response.headers['ratelimit-limit'],
      remaining: response.headers['ratelimit-remaining'],
      reset: response.headers['ratelimit-reset'],
    });
    return response;
  }
);
```

---

## 🎯 Summary

### Server Protection
- ✅ 100 requests per 15 minutes per IP
- ✅ Automatic blocking on excess
- ✅ Proper error responses
- ✅ Configurable per endpoint

### Client Experience
- ✅ Friendly error messages
- ✅ Wait time displayed
- ✅ Non-intrusive alerts
- ✅ Graceful degradation

### Security
- ✅ Trust proxy configuration
- ✅ Accurate IP tracking
- ✅ No bypass via spoofing
- ✅ Production-ready

---

## 📞 Further Configuration

Need to adjust rate limits? Edit `server/src/app.js`:

```javascript
const limiter = rateLimit({
  windowMs: 30 * 60 * 1000, // Change: 30 minutes
  max: 200,                  // Change: 200 requests
  // ... other options
});
```

Restart server after changes:
```bash
pm2 restart food-delivery
```

---

**Status: ✅ Fully Implemented & Production Ready**
