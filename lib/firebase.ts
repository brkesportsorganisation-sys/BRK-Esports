import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyAlJ36Qn5PyjcDe2GY3BySpwk2j0qoXolU',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'esports-website-7496f.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'esports-website-7496f',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'esports-website-7496f.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '574580375779',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:574580375779:web:b8a1943b51ff52ae57c5d6',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-LK79LHFL51'
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let googleProvider: GoogleAuthProvider = new GoogleAuthProvider();

export function getFirebaseAuth(): { auth: Auth; googleProvider: GoogleAuthProvider } | null {
  try {
    if (typeof window === 'undefined') return null;

    if (!app) {
      app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    }
    if (!auth) {
      auth = getAuth(app);
      googleProvider = new GoogleAuthProvider();
      googleProvider.setCustomParameters({
        prompt: 'select_account'
      });
    }
    return { auth, googleProvider };
  } catch (err) {
    console.error('Failed to initialize Firebase Auth:', err);
    return null;
  }
}

// Initial client boot
if (typeof window !== 'undefined' && firebaseConfig.apiKey) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });
  } catch (e) {
    console.warn('Firebase client boot notice:', e);
  }
}

export { app, auth, googleProvider, signInWithPopup, signInWithRedirect, getRedirectResult };
