import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, signInAnonymously, type Auth } from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Public web config (not secret); env vars still win when set.
const firebaseConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string) || 'AIzaSyB1qXYRGbxyTuc1kV3U_8nXAW32-cOMkKc',
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string) || 'ask-leadership.firebaseapp.com',
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string) || 'ask-leadership',
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string) || 'ask-leadership.firebasestorage.app',
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || '112022798727',
  appId: (import.meta.env.VITE_FIREBASE_APP_ID as string) || '1:112022798727:web:15f22b428b18b3a9095322',
  databaseURL: (import.meta.env.VITE_FIREBASE_DATABASE_URL as string) || 'https://ask-leadership-default-rtdb.europe-west1.firebasedatabase.app',
};

const REQUIRED_ENV: [string, string | undefined][] = [
  ['VITE_FIREBASE_API_KEY', firebaseConfig.apiKey],
  ['VITE_FIREBASE_AUTH_DOMAIN', firebaseConfig.authDomain],
  ['VITE_FIREBASE_PROJECT_ID', firebaseConfig.projectId],
  ['VITE_FIREBASE_STORAGE_BUCKET', firebaseConfig.storageBucket],
  ['VITE_FIREBASE_MESSAGING_SENDER_ID', firebaseConfig.messagingSenderId],
  ['VITE_FIREBASE_APP_ID', firebaseConfig.appId],
];

export const missingFirebaseEnvVars = (): string[] =>
  REQUIRED_ENV.filter(([, value]) => !value).map(([name]) => name);

export const isFirebaseConfigured = (): boolean => {
  return (
    !!firebaseConfig.apiKey &&
    !!firebaseConfig.projectId &&
    firebaseConfig.apiKey !== '' &&
    firebaseConfig.projectId !== ''
  );
};

export const isDemoMode = (): boolean => {
  return import.meta.env.VITE_DEMO_MODE === 'true';
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

if (isFirebaseConfigured()) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  db = getFirestore(app);
  auth = getAuth(app);

  if (typeof window !== 'undefined') {
    isSupported().then((supported) => {
      if (supported) {
        getAnalytics(app!);
      }
    }).catch(() => {});
  }
}

export { app, db, auth };

export async function signInAnonymouslyToFirebase(): Promise<string | null> {
  if (!isFirebaseConfigured()) return null;

  try {
    const result = await signInAnonymously(auth!);
    return result.user.uid;
  } catch (err) {
    console.error('Anonymous auth failed:', err);
    return null;
  }
}
