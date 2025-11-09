// firebaseConfig.js
import { getAnalytics } from "firebase/analytics";
import { initializeApp } from "firebase/app";

// Firebase config using environment variables for Expo Web deployment
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_AUTH_DOMAIN,
  databaseURL: process.env.EXPO_PUBLIC_DATABASE_URL,
  projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_MEASUREMENT_ID, // optional
};

// Initialize Firebase
export const firebaseApp = initializeApp(firebaseConfig);

// Optional: Analytics
// Only call getAnalytics if running in a browser environment
let analytics;
if (typeof window !== "undefined") {
  analytics = getAnalytics(firebaseApp);
}

export { analytics };
