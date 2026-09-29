import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, signInAnonymously, type Auth } from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
  // Optional: only needed when the Realtime Database (presence) isn't in the default US region.
  ...(import.meta.env.VITE_FIREBASE_DATABASE_URL ? { databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL as string } : {}),
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
