import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyB1qXYRGbxyTuc1kV3U_8nXAW32-cOMkKc",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ask-leadership.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://ask-leadership-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ask-leadership",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ask-leadership.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "112022798727",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:112022798727:web:15f22b428b18b3a9095322",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-D9LJ6SR5B2"
};

// Initialize Firebase only if not already initialized
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);

export let analytics = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {});
}

export const isFirebaseConfigured = () => {
  return (
    firebaseConfig.apiKey !== "YOUR_API_KEY" &&
    firebaseConfig.projectId !== "YOUR_PROJECT_ID"
  );
};

