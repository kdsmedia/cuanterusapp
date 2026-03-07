import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyDBM_PPd7uEAyGg8d2ILQ1bTx3A6KKFjBk",
  authDomain: "altomedia-8f793.firebaseapp.com",
  projectId: "altomedia-8f793",
  storageBucket: "altomedia-8f793.firebasestorage.app",
  messagingSenderId: "327513974065",
  appId: "1:327513974065:web:1c0f9249ba0b801a91bc10",
  measurementId: "G-W02VMH4S56",
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);

export const ADMIN_EMAIL = "appsidhanie@gmail.com";
export const APP_ID = "altomedia-8f793";
export const MIN_WITHDRAW = 50_000;
export const CHECKIN_REWARD = 100;
export const REFERRAL_REWARD = 500;

export const USERS_PATH = `artifacts/${APP_ID}/public/data/users`;

// Package: com.altomedia.cuanterusapp
