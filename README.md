# 🎬 Vertext — Android App

TikTok clone built with Expo React Native. GitHub Actions builds the APK automatically on every push.

---

## 📦 Files in this project

```
vertext-android/
├── .github/
│   └── workflows/
│       └── build-android.yml   ← GitHub Actions APK builder
├── src/
│   ├── context/AuthContext.js  ← JWT auth + API calls
│   ├── navigation/
│   │   ├── AppNavigator.js     ← Bottom tabs
│   │   └── AuthStack.js        ← Login/Register flow
│   ├── screens/
│   │   ├── FeedScreen.js       ← Video feed (auto-play, preload 5)
│   │   ├── SearchScreen.js     ← Search + trending
│   │   ├── UploadScreen.js     ← Video upload
│   │   ├── EarningsScreen.js   ← Monetization dashboard
│   │   ├── ProfileScreen.js    ← Profile + settings
│   │   ├── LoginScreen.js
│   │   └── RegisterScreen.js
│   └── components/
│       └── CommentsModal.js    ← Slide-up comments
├── assets/                     ← Icons and splash screen
├── App.js                      ← Entry point
├── app.json                    ← Expo config
├── eas.json                    ← EAS Build config
├── package.json
└── babel.config.js
```

---

## 🚀 Step-by-step: Termux → GitHub → APK

### STEP 1 — Unzip in Termux

After transferring the zip to your phone, open Termux and run:

```bash
# Install unzip if you don't have it
pkg install unzip -y

# Unzip the file (adjust path to where you saved it)
unzip ~/storage/downloads/vertext-android.zip -d ~/vertext-android

# OR if you copied it to Termux home:
unzip ~/vertext-android.zip -d ~/vertext-android

cd ~/vertext-android
ls   # confirm files are there
```

### STEP 2 — Setup storage access (first time only)

```bash
termux-setup-storage
# Grant permission when prompted
```

### STEP 3 — Install Git in Termux

```bash
pkg install git -y
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

### STEP 4 — Create GitHub repository

1. Open **github.com** in browser on your phone
2. Click **+** → **New repository**
3. Name it: `vertext-android`
4. Set to **Public** (required for free Actions minutes)
5. **DO NOT** add README or .gitignore (keep it empty)
6. Click **Create repository**
7. Copy the repo URL e.g. `https://github.com/YOUR_USERNAME/vertext-android.git`

### STEP 5 — Push code from Termux

```bash
cd ~/vertext-android

# Initialize git
git init
git add .
git commit -m "🎬 Initial Vertext Android app"

# Add your GitHub repo (replace with YOUR actual URL)
git remote add origin https://github.com/YOUR_USERNAME/vertext-android.git

# Push to GitHub
git branch -M main
git push -u origin main
```

When asked for credentials:
- **Username**: your GitHub username
- **Password**: your GitHub **Personal Access Token** (NOT your password)
  - Go to GitHub → Settings → Developer Settings → Personal Access Tokens → Tokens (classic)
  - Generate token with `repo` and `workflow` scopes

### STEP 6 — Watch the build

1. Go to your repo on GitHub
2. Click the **Actions** tab
3. You'll see **"Build Vertext Android APK"** running
4. Wait ~10-15 minutes for the build to complete
5. Click the completed workflow → **Artifacts** section
6. Download **Vertext-Android-APK-v1**

The APK will also be in **Releases** (tagged automatically).

### STEP 7 — Install the APK

1. Download the APK to your phone
2. Open it — Android will ask to allow installation from unknown sources
3. Allow → Install → Open **Vertext**!

---

## ⚙️ Connect to your Django backend

Edit `src/context/AuthContext.js` line 3:

```js
// For Android emulator (localhost):
const API = 'http://10.0.2.2:8000/api';

// For real device on same WiFi as your backend:
const API = 'http://192.168.1.YOUR_IP:8000/api';

// For production (hosted backend):
const API = 'https://yourdomain.com/api';
```

Then commit and push — GitHub Actions will rebuild automatically.

---

## 🔑 Optional: Sign APK with your keystore

To get a properly signed APK (needed for Play Store), add these GitHub Secrets:

Go to repo → **Settings** → **Secrets and variables** → **Actions** → **New secret**:

| Secret name | Value |
|---|---|
| `KEYSTORE_BASE64` | Your .jks file encoded in base64 |
| `KEY_ALIAS` | Your key alias |
| `KEY_PASSWORD` | Key password |
| `STORE_PASSWORD` | Keystore password |

Generate a keystore in Termux:
```bash
pkg install openjdk-17 -y
keytool -genkeypair -v \
  -keystore vertext-release.jks \
  -alias vertext \
  -keyalg RSA -keysize 2048 \
  -validity 10000

# Encode to base64 for the secret
base64 vertext-release.jks | tr -d '\n'
# Copy that output as KEYSTORE_BASE64 secret
```

---

## 🔄 Rebuild after changes

Any time you edit code and push, the APK rebuilds automatically:

```bash
cd ~/vertext-android
git add .
git commit -m "Your change description"
git push
```

Then check the **Actions** tab on GitHub for the new build.

---

## 📱 App Features

| Feature | Status |
|---|---|
| Auto-playing feed | ✅ |
| 5 videos preloaded ahead | ✅ |
| Double-tap to like | ✅ |
| Single tap mute/unmute | ✅ |
| Comments modal | ✅ |
| Save to favourites | ✅ |
| Share button | ✅ |
| Video upload (gallery) | ✅ |
| Search + trending tags | ✅ |
| Earnings dashboard | ✅ |
| Profile + settings | ✅ |
| JWT authentication | ✅ |
| Ad badges in feed | ✅ |
| Haptic feedback | ✅ |

---

Built with ❤️ by Vertext Digital
