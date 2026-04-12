# Quick CORS Setup Instructions

## Step-by-Step Guide

### Step 1: Install Google Cloud SDK

**For Windows:**
1. Download the Google Cloud SDK installer from: https://cloud.google.com/sdk/docs/install
2. Run the installer and follow the prompts
3. Or use PowerShell to install:
   ```powershell
   (New-Object Net.WebClient).DownloadFile("https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe", "$env:Temp\GoogleCloudSDKInstaller.exe")
   & $env:Temp\GoogleCloudSDKInstaller.exe
   ```

**For Mac/Linux:**
```bash
# Download and install
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

**Alternative: Using Python (if you have Python installed):**
```bash
pip install gsutil
```

### Step 2: Authenticate with Google Cloud

Open your terminal/PowerShell and run:
```bash
gcloud auth login
```

This will open a browser window for you to sign in with your Google account (the one associated with your Firebase project).

### Step 3: Set Your Project

```bash
gcloud config set project ro7mbms
```

### Step 4: Navigate to Your Project Directory

```bash
cd C:\Users\Itachi\Desktop\r7communications
```

### Step 5: Apply CORS Configuration

Now run the command:
```bash
gsutil cors set cors.json gs://ro7mbms.firebasestorage.app
```

If that doesn't work, try the default bucket name:
```bash
gsutil cors set cors.json gs://ro7mbms.appspot.com
```

### Step 6: Verify CORS is Set

Check that CORS was applied correctly:
```bash
gsutil cors get gs://ro7mbms.firebasestorage.app
```

You should see the JSON configuration you set.

---

## Alternative: Using Google Cloud Console (No Command Line Needed)

If you prefer a GUI approach:

1. Go to: https://console.cloud.google.com/
2. Select project: **ro7mbms**
3. Navigate to: **Cloud Storage** > **Buckets**
4. Click on your bucket (likely named `ro7mbms.firebasestorage.app` or `ro7mbms.appspot.com`)
5. Click the **Configuration** tab
6. Scroll down to **CORS configuration**
7. Click **Edit CORS configuration**
8. Paste this JSON:
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
9. Click **Save**

---

## Troubleshooting

**"gsutil: command not found"**
- Make sure Google Cloud SDK is installed
- Restart your terminal/PowerShell after installation
- On Windows, you may need to add it to PATH manually

**"Access Denied" or "Permission Denied"**
- Make sure you're logged in: `gcloud auth login`
- Make sure you have the correct project selected: `gcloud config set project ro7mbms`
- You need to be the project owner or have Storage Admin permissions

**"Bucket not found"**
- Try the alternative bucket name: `gs://ro7mbms.appspot.com`
- Check your Firebase Console > Storage to see the exact bucket name

**Still getting CORS errors after setup?**
- Wait 2-5 minutes for changes to propagate
- Clear your browser cache
- Make sure your domain is exactly in the CORS config (check for typos, http vs https)

---

## Quick Test

After setting CORS, test your download function again. The CORS errors should be resolved!
