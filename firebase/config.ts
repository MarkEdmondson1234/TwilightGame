/**
 * Firebase Configuration
 *
 * Initializes Firebase app, Auth, and Firestore for TwilightGame.
 * Uses environment variables for configuration (set in .env.local).
 *
 * GCP Project: twiightgame
 * Region: europe-west2 (London)
 */

import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  connectFirestoreEmulator,
  enableIndexedDbPersistence,
} from 'firebase/firestore';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'twiightgame',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Singleton instances
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let initialized = false;

/**
 * Check if Firebase is configured (has required env vars)
 */
export function isFirebaseConfigured(): boolean {
  return !!(import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID);
}

/**
 * Initialize Firebase services
 * Call this once at app startup
 */
export async function initializeFirebase(): Promise<{
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}> {
  if (initialized && app && auth && db) {
    return { app, auth, db };
  }

  if (!isFirebaseConfigured()) {
    console.warn('[Firebase] Not configured - cloud saves disabled');
    console.warn('[Firebase] Set VITE_FIREBASE_* env vars in .env.local');
    throw new Error('Firebase not configured');
  }

  try {
    // Initialize Firebase app
    app = initializeApp(firebaseConfig);
    console.log('[Firebase] App initialized for project:', firebaseConfig.projectId);

    // Initialize Auth
    auth = getAuth(app);

    // Initialize Firestore
    db = getFirestore(app);

    // Connect to emulators in development (if configured)
    if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
      console.log('[Firebase] Connecting to local emulators...');
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
      connectFirestoreEmulator(db, 'localhost', 8080);
    }

    // Enable offline persistence for Firestore
    try {
      await enableIndexedDbPersistence(db);
      console.log('[Firebase] Offline persistence enabled');
    } catch (err: unknown) {
      const error = err as { code?: string };
      if (error.code === 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one tab at a time
        console.warn('[Firebase] Offline persistence unavailable - multiple tabs open');
      } else if (error.code === 'unimplemented') {
        // Browser doesn't support required features
        console.warn('[Firebase] Offline persistence not supported in this browser');
      } else {
        console.warn('[Firebase] Offline persistence failed:', error);
      }
    }

    initialized = true;
    console.log('[Firebase] Initialization complete');

    return { app, auth, db };
  } catch (error) {
    console.error('[Firebase] Initialization failed:', error);
    throw error;
  }
}

/**
 * Get Firebase Auth instance (must call initializeFirebase first)
 */
export function getFirebaseAuth(): Auth {
  if (!auth) {
    throw new Error('Firebase not initialized - call initializeFirebase() first');
  }
  return auth;
}

/**
 * Get Firestore instance (must call initializeFirebase first)
 */
export function getFirebaseDb(): Firestore {
  if (!db) {
    throw new Error('Firebase not initialized - call initializeFirebase() first');
  }
  return db;
}

/**
 * Get Firebase App instance (must call initializeFirebase first)
 */
export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    throw new Error('Firebase not initialized - call initializeFirebase() first');
  }
  return app;
}

/**
 * Check if Firebase has been initialized
 */
export function isFirebaseInitialized(): boolean {
  return initialized;
}
