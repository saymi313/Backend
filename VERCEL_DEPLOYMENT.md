# Vercel Deployment Guide

## ✅ Bug Fixes Applied

The following issues have been fixed:

1. **Removed `process.exit(1)` from module-level code** - This was causing the serverless function to crash during initialization
2. **Moved validation to appropriate locations**:
   - `server.js` - Validates and exits for local development
   - `api/index.js` - Validates and returns error response for serverless
3. **Fixed double `module.exports` bug** - Now properly exports either error handler OR app, never both
4. **Added comprehensive error handling** - Catches all initialization errors and returns helpful JSON responses

## 🚀 Deployment Steps

### 1. Set Environment Variables in Vercel

Go to your Vercel project → Settings → Environment Variables and add:

**Required:**
```
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_here
SESSION_SECRET=your_session_secret_here
```

**Optional (for Google OAuth & Meet):**
```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=https://your-domain.vercel.app/api/auth/google/callback
GOOGLE_REDIRECT_URI=https://your-frontend-domain.com/mentor/google-meet/callback
GOOGLE_FALLBACK_REDIRECT_URI=https://your-frontend-domain.com/mentor/google-meet/callback
```

**Optional (for Stripe payments):**
```
STRIPE_SECRET_KEY=sk_live_your_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_SUCCESS_URL=https://your-frontend-domain.com/payment/success
STRIPE_CANCEL_URL=https://your-frontend-domain.com/payment/cancel
PLATFORM_FEE_PERCENTAGE=10
```

**Optional (for frontend):**
```
FRONTEND_URL=https://your-frontend-domain.com
```

### 2. Deploy to Vercel

#### Option A: Using Vercel CLI
```bash
npm i -g vercel
vercel login
vercel --prod
```

#### Option B: Using Git Integration
1. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "Fix serverless function initialization"
   git push origin main
   ```
2. Import the repository in Vercel dashboard
3. Vercel will auto-deploy on every push to main

### 3. Verify Deployment

After deployment, test these endpoints:

```bash
# Health check
curl https://your-app.vercel.app/health

# Root endpoint
curl https://your-app.vercel.app/

# Expected response:
{
  "success": true,
  "message": "Scholarslee Backend API",
  "version": "1.0.0",
  "timestamp": "2025-11-28T..."
}
```

## 🔍 Troubleshooting

### If you still see 500 errors:

1. **Check Vercel Logs:**
   - Go to Vercel Dashboard → Your Project → Deployments
   - Click on the latest deployment → Runtime Logs
   - Look for error messages starting with "❌"

2. **Common Issues:**

   **Missing Environment Variables:**
   ```
   Error: Environment validation failed: Missing required environment variables: MONGODB_URI
   ```
   → Add the missing variables in Vercel dashboard

   **MongoDB Connection Error:**
   ```
   Database connection error in serverless function
   ```
   → Check your MongoDB URI and ensure IP whitelist includes `0.0.0.0/0` for Vercel

   **Module Not Found:**
   ```
   Cannot find module 'some-package'
   ```
   → Ensure all dependencies are in `package.json` and run `npm install` locally

3. **Test Locally First:**
   ```bash
   # Ensure all env vars are in .env file
   npm start
   
   # Test health endpoint
   curl http://localhost:5000/health
   ```

### If you see "Module initialization error":

The serverless function will now return a helpful error message:
```json
{
  "success": false,
  "message": "Server initialization error",
  "error": "Detailed error message here"
}
```

Check the error message to identify the issue.

## 📊 What Changed

### Before (❌ Broken):
```javascript
// app.js
validateEnvironment(); // Called process.exit(1) → crashed serverless

// api/index.js
module.exports = errorHandler; // First export
// ...more code...
module.exports = app; // Overwrote the error handler!
```

### After (✅ Fixed):
```javascript
// app.js
// No validation here - safe for serverless imports

// server.js
validateEnvironment(); // Only validates when running local server

// api/index.js
try {
  validateEnvironment();
  app = require('../app');
} catch (error) {
  // Caught and handled
}

if (error) {
  module.exports = errorHandler; // Export error handler
} else {
  module.exports = app; // Export app
}
// No duplicate exports!
```

## 🎯 Architecture Summary

**Local Development** (`npm start`):
```
server.js → validates env → loads app → starts HTTP server → connects DB
```

**Vercel Serverless**:
```
api/index.js → validates env → loads app → exports to Vercel → connects DB async
```

Both paths now work correctly without crashing!

## 📝 Next Steps

1. Set all required environment variables in Vercel
2. Deploy the updated code
3. Test all endpoints
4. Update CORS origins in `app.js` to include your production domain
5. Monitor Vercel logs for any issues
