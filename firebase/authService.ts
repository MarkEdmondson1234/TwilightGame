/**
 * Firebase Authentication Service
 *
 * Handles user authentication for TwilightGame:
 * - Email/password sign up and sign in
 * - Google sign in
 * - Anonymous sign in (play without account)
 * - Account linking (convert anonymous to permanent)
 * - User profile management
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signInAnonymously as firebaseSignInAnonymously,
  linkWithCredential,
  EmailAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  UserCredential,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb, isFirebaseInitialized } from './config';
import { UserProfile, FIRESTORE_PATHS } from './types';

// ============================================
// Types
// ============================================

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAnonymous: boolean;
}

type AuthStateListener = (state: AuthState) => void;

// ============================================
// AuthService Class
// ============================================

class AuthService {
  private currentUser: User | null = null;
  private isLoading = true;
  private listeners: Set<AuthStateListener> = new Set();
  private unsubscribeAuth: (() => void) | null = null;

  /**
   * Initialize auth state listener
   * Call this after Firebase is initialized
   */
  initialize(): void {
    if (!isFirebaseInitialized()) {
      console.warn('[AuthService] Firebase not initialized');
      this.isLoading = false;
      this.notifyListeners();
      return;
    }

    const auth = getFirebaseAuth();

    // Set up auth state listener
    this.unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      console.log('[AuthService] Auth state changed:', user ? user.uid : 'signed out');
      this.currentUser = user;
      this.isLoading = false;
      this.notifyListeners();
    });
  }

  /**
   * Clean up auth listener
   */
  destroy(): void {
    if (this.unsubscribeAuth) {
      this.unsubscribeAuth();
      this.unsubscribeAuth = null;
    }
  }

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback: AuthStateListener): () => void {
    this.listeners.add(callback);
    // Immediately call with current state
    callback(this.getState());
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach((cb) => cb(state));
  }

  /**
   * Get current auth state
   */
  getState(): AuthState {
    return {
      user: this.currentUser,
      isLoading: this.isLoading,
      isAuthenticated: this.currentUser !== null,
      isAnonymous: this.currentUser?.isAnonymous ?? false,
    };
  }

  // ============================================
  // Sign Up / Sign In Methods
  // ============================================

  /**
   * Create a new account with email and password
   */
  async signUp(email: string, password: string, displayName: string): Promise<User> {
    const auth = getFirebaseAuth();
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await this.createUserProfile(user, displayName);
    console.log('[AuthService] User signed up:', user.uid);
    return user;
  }

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<User> {
    const auth = getFirebaseAuth();
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    await this.updateLastLogin(user.uid);
    console.log('[AuthService] User signed in:', user.uid);
    return user;
  }

  /**
   * Sign in with Google
   */
  async signInWithGoogle(): Promise<User> {
    const auth = getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    const { user } = await signInWithPopup(auth, provider);

    // Check if profile exists, create if not
    const profileExists = await this.profileExists(user.uid);
    if (!profileExists) {
      await this.createUserProfile(user, user.displayName || 'Player');
    } else {
      await this.updateLastLogin(user.uid);
    }

    console.log('[AuthService] User signed in with Google:', user.uid);
    return user;
  }

  /**
   * Sign in anonymously (play without creating an account)
   */
  async signInAnonymously(): Promise<User> {
    const auth = getFirebaseAuth();
    const { user } = await firebaseSignInAnonymously(auth);
    console.log('[AuthService] Anonymous user signed in:', user.uid);
    return user;
  }

  /**
   * Convert anonymous account to permanent account with email/password
   */
  async linkAnonymousAccount(email: string, password: string, displayName: string): Promise<User> {
    if (!this.currentUser?.isAnonymous) {
      throw new Error('Current user is not anonymous');
    }

    const credential = EmailAuthProvider.credential(email, password);
    const result: UserCredential = await linkWithCredential(this.currentUser, credential);
    await this.createUserProfile(result.user, displayName);

    console.log('[AuthService] Anonymous account linked:', result.user.uid);
    return result.user;
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    const auth = getFirebaseAuth();
    await firebaseSignOut(auth);
    console.log('[AuthService] User signed out');
  }

  // ============================================
  // User Profile Methods
  // ============================================

  /**
   * Create user profile in Firestore
   */
  private async createUserProfile(user: User, displayName: string): Promise<void> {
    const db = getFirebaseDb();
    const profileRef = doc(db, FIRESTORE_PATHS.userProfile(user.uid));

    const profile: Omit<UserProfile, 'createdAt' | 'lastLoginAt'> & {
      createdAt: ReturnType<typeof serverTimestamp>;
      lastLoginAt: ReturnType<typeof serverTimestamp>;
    } = {
      displayName,
      email: user.email,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      settings: {
        musicVolume: 0.7,
        sfxVolume: 1.0,
        preferredLanguage: 'en-GB',
      },
    };

    await setDoc(profileRef, profile, { merge: true });
    console.log('[AuthService] User profile created for:', user.uid);
  }

  /**
   * Update last login timestamp
   */
  private async updateLastLogin(userId: string): Promise<void> {
    const db = getFirebaseDb();
    const profileRef = doc(db, FIRESTORE_PATHS.userProfile(userId));
    await setDoc(
      profileRef,
      {
        lastLoginAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  /**
   * Check if user profile exists
   */
  private async profileExists(userId: string): Promise<boolean> {
    const db = getFirebaseDb();
    const profileRef = doc(db, FIRESTORE_PATHS.userProfile(userId));
    const snapshot = await getDoc(profileRef);
    return snapshot.exists();
  }

  /**
   * Get user profile from Firestore
   */
  async getUserProfile(): Promise<UserProfile | null> {
    if (!this.currentUser) {
      return null;
    }

    const db = getFirebaseDb();
    const profileRef = doc(db, FIRESTORE_PATHS.userProfile(this.currentUser.uid));
    const snapshot = await getDoc(profileRef);

    if (!snapshot.exists()) {
      return null;
    }

    return snapshot.data() as UserProfile;
  }

  /**
   * Update user profile settings
   */
  async updateUserSettings(settings: Partial<UserProfile['settings']>): Promise<void> {
    if (!this.currentUser) {
      throw new Error('Not authenticated');
    }

    const db = getFirebaseDb();
    const profileRef = doc(db, FIRESTORE_PATHS.userProfile(this.currentUser.uid));
    await setDoc(
      profileRef,
      {
        settings,
      },
      { merge: true }
    );
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Get current user (or null if not signed in)
   */
  getUser(): User | null {
    return this.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  /**
   * Check if current user is anonymous
   */
  isAnonymous(): boolean {
    return this.currentUser?.isAnonymous ?? false;
  }

  /**
   * Get user ID (or null if not signed in)
   */
  getUserId(): string | null {
    return this.currentUser?.uid ?? null;
  }
}

// Singleton instance
export const authService = new AuthService();
