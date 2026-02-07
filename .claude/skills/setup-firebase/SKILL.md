# Setup Firebase Skill

Helps set up Firebase cloud saves for TwilightGame. Use this when a contributor needs to enable Firebase on their machine.

## Usage

Use this skill when the user asks to:
- Set up Firebase / cloud saves
- Configure Firestore
- Fix Firebase not working
- Check Firebase status
- Enable cloud saves

## Prerequisites

Firebase infrastructure is already in the codebase (`firebase/` directory, `firebase` npm package). This skill just configures the local environment.

## Steps

### 1. Check Current Status

```bash
# Check if .env.local exists and has Firebase config
if [ -f .env.local ]; then
  echo "✅ .env.local exists"
  grep -c "VITE_FIREBASE" .env.local && echo "Firebase vars found" || echo "⚠️ No Firebase vars"
else
  echo "❌ .env.local missing — needs creating"
fi

# Check if firebase package is installed
node -e "require('firebase/app')" 2>/dev/null && echo "✅ firebase package installed" || echo "❌ Run: npm install"
```

### 2. Create .env.local (if missing)

Copy from example and fill in credentials:

```bash
cp .env.example .env.local
```

Then edit `.env.local` with the actual Firebase credentials:

```
VITE_FIREBASE_API_KEY=<get from Firebase Console>
VITE_FIREBASE_AUTH_DOMAIN=twiightgame.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=twiightgame
VITE_FIREBASE_STORAGE_BUCKET=twiightgame.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=<get from Firebase Console>
VITE_FIREBASE_APP_ID=<get from Firebase Console>
```

**Where to find credentials:**
1. Go to https://console.firebase.google.com
2. Select project **twiightgame**
3. Click gear icon → Project settings
4. Scroll to "Your apps" → Web app
5. Copy the `firebaseConfig` values

### 3. Verify Firebase Works

```bash
# Restart dev server (env vars only load on startup)
npm run dev:reload
```

Then in the browser:
1. Open game at http://localhost:4000/TwilightGame/
2. Press **F1** to open Help Browser
3. Go to **Settings** tab
4. Look for **Account & Cloud Saves** section
5. Try signing in or creating an account

### 4. Check Console for Firebase Status

Open browser DevTools (F12) → Console. Look for:
- `[Firebase] App initialized for project: twiightgame` → ✅ Working
- `[Firebase] Not configured - cloud saves disabled` → ❌ Missing env vars
- `[Firebase] Disabled via VITE_FIREBASE_ENABLED=false` → ❌ Explicitly disabled

## Troubleshooting

### "Cloud saves disabled" in console
- Check `.env.local` has `VITE_FIREBASE_API_KEY` and `VITE_FIREBASE_PROJECT_ID` set (not placeholder values)
- Restart dev server after changing `.env.local`

### "Account & Cloud Saves" section not visible in F1 menu
- The auth UI is in `components/HelpBrowser.tsx` — check it imports `authService` from `firebase/index`
- Run `npx tsc --noEmit` to check for compile errors

### Firebase package missing
```bash
npm install
```

### Want to disable Firebase locally
Add to `.env.local`:
```
VITE_FIREBASE_ENABLED=false
```

## Architecture

```
firebase/
├── config.ts              — Firebase init, env var checks
├── authService.ts         — Email/password + Google auth
├── cloudSaveService.ts    — Save/load game state to Firestore
├── sharedDataService.ts   — Cross-player NPC gossip sharing
├── syncManager.ts         — Local ↔ Cloud save sync
├── types.ts               — TypeScript types
└── index.ts               — Barrel exports
```

**UI entry points:**
- `components/HelpBrowser.tsx` — Account management UI (F1 → Settings)
- `components/AIDialogueBox.tsx` — NPC gossip injection from shared data

**Config:** `firebase/config.ts` reads `VITE_FIREBASE_*` from `.env.local`. If vars are missing, all Firebase features silently disable — the game works fully offline.
