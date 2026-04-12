# Firebase Storage CORS Configuration Guide

## Problem
When downloading PDFs from Firebase Storage, you may encounter CORS errors like:
```
Access to XMLHttpRequest at 'https://firebasestorage.googleapis.com/...' from origin 'https://yourdomain.com' has been blocked by CORS policy
```

## Solution
Configure CORS on your Firebase Storage bucket to allow your domain to access files.

## Steps to Configure CORS

### Option 1: Using Firebase CLI (Recommended)

1. **Install Firebase CLI** (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Create a CORS configuration file** (`cors.json`):
   ```json
   [
     {
       "origin": [
         "https://r7communications.vercel.app",
         "http://localhost:5500",
         "http://127.0.0.1:5500",
         "http://localhost:3000"
       ],
       "method": ["GET", "HEAD"],
       "responseHeader": ["Content-Type", "Content-Length"],
       "maxAgeSeconds": 3600
     }
   ]
   ```

   **Note**: Add all domains where your app will be accessed from.

4. **Apply CORS configuration**:
   ```bash
   gsutil cors set cors.json gs://ro7mbms.firebasestorage.app
   ```

   Or if using the default bucket:
   ```bash
   gsutil cors set cors.json gs://ro7mbms.appspot.com
   ```

### Option 2: Using Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: `ro7mbms`
3. Navigate to **Cloud Storage** > **Buckets**
4. Click on your storage bucket
5. Go to the **Configuration** tab
6. Scroll to **CORS configuration**
7. Click **Edit CORS configuration**
8. Add the following JSON:
   ```json
   [
     {
       "origin": [
         "https://r7communications.vercel.app",
         "http://localhost:5500",
         "http://127.0.0.1:5500"
       ],
       "method": ["GET", "HEAD"],
       "responseHeader": ["Content-Type", "Content-Length"],
       "maxAgeSeconds": 3600
     }
   ]
   ```
9. Click **Save**

### Option 3: Using gcloud CLI

1. **Install Google Cloud SDK** (if not installed)
2. **Authenticate**:
   ```bash
   gcloud auth login
   ```
3. **Set your project**:
   ```bash
   gcloud config set project ro7mbms
   ```
4. **Create and apply CORS config**:
   ```bash
   # Create cors.json file (same content as Option 1)
   gsutil cors set cors.json gs://ro7mbms.firebasestorage.app
   ```

## Verify CORS Configuration

Check your current CORS settings:
```bash
gsutil cors get gs://ro7mbms.firebasestorage.app
```

## Important Notes

1. **Allow all origins (development only)**: For testing, you can use `"origin": ["*"]`, but this is **NOT recommended for production**.

2. **Production domains**: Make sure to add your production domain (e.g., `https://r7communications.vercel.app`) to the allowed origins.

3. **Local development**: Add `http://localhost:5500` and `http://127.0.0.1:5500` for local testing.

4. **Changes take effect**: CORS changes may take a few minutes to propagate.

## Troubleshooting

- **Still getting CORS errors?**: 
  - Wait a few minutes for changes to propagate
  - Clear browser cache
  - Check that your domain is exactly in the CORS config (including https/http and www/non-www)
  
- **"gsutil: command not found"**:
  - Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install
  - Or use Google Cloud Console method instead

- **Bucket name not found**:
  - Check your Firebase project settings for the correct bucket name
  - It might be `ro7mbms.appspot.com` instead of `ro7mbms.firebasestorage.app`

## Alternative: Use Firebase Storage Rules

You can also ensure your Firebase Storage security rules allow read access:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /memos/{memoId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

However, Storage Rules and CORS are different - you need both configured correctly.
