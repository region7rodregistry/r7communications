# Firebase Storage Rules Deployment Guide

## Problem
You're getting a 403 Forbidden error when trying to upload PDF files. This is caused by Firebase Storage security rules that don't allow uploads.

## Solution
Deploy the Firebase Storage rules to allow authenticated users to upload files.

## Steps to Deploy

### Option 1: Using Firebase CLI (Recommended)

1. **Install Firebase CLI** (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Initialize Firebase in your project** (if not already done):
   ```bash
   firebase init
   ```
   - Select "Storage" when prompted
   - Use the existing project: `ro7mbms`

4. **Deploy Storage Rules**:
   ```bash
   firebase deploy --only storage
   ```

### Option 2: Using Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `ro7mbms`
3. Go to **Storage** in the left sidebar
4. Click on **Rules** tab
5. Replace the existing rules with the content from `firebase-storage.rules`
6. Click **Publish**

## What the Rules Do

The rules allow:
- ✅ Authenticated users to upload PDF files to the `memos/{memoId}/` folder
- ✅ Authenticated users to read uploaded files
- ✅ Proper security by requiring authentication

## Testing

After deploying the rules:
1. Refresh your admin dashboard
2. Try uploading a PDF file
3. Check the browser console for authentication status
4. The upload should now work without 403 errors

## Troubleshooting

If you still get errors:
1. Check that you're logged in (the page should redirect to login if not)
2. Check browser console for authentication status
3. Verify the Firebase project ID matches your configuration
4. Make sure the storage bucket is correctly configured

## Security Notes

- These rules allow any authenticated user to upload files
- For production, consider adding more specific rules based on user roles
- The current rules are suitable for development/testing 