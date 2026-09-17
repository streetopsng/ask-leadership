import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = () => {
  return (
    !!firebaseConfig.apiKey &&
    !!firebaseConfig.projectId &&
    firebaseConfig.apiKey !== '' &&
    firebaseConfig.projectId !== ''
  );
};

export const isDemoMode = () => {
  return import.meta.env.VITE_DEMO_MODE === 'true';
};

// Only initialize Firebase when configured — otherwise import fails
let app = null;
let db = null;
let auth = null;

if (isFirebaseConfigured()) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  db = getFirestore(app);
  auth = getAuth(app);

  if (typeof window !== 'undefined') {
    isSupported().then((supported) => {
      if (supported) {
        getAnalytics(app);
      }
    }).catch(() => {});
  }
}

export { app, db, auth };

export async function signInAnonymouslyToFirebase() {
  if (!isFirebaseConfigured()) return null;

  try {
    const result = await signInAnonymously(auth);
    return result.user.uid;
  } catch (err) {
    console.error('Anonymous auth failed:', err);
    return null;
  }
}
