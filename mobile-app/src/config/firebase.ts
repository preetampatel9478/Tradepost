import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "YOUR_FIREBASE_API_KEY",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "YOUR_FIREBASE_AUTH_DOMAIN",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "YOUR_FIREBASE_PROJECT_ID",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "YOUR_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "YOUR_FIREBASE_MESSAGING_SENDER_ID",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "YOUR_FIREBASE_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with React Native AsyncStorage for persistent sessions
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export { app, auth };
