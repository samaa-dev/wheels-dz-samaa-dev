import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env['VITE_FIREBASE_API_KEY'],
  authDomain: import.meta.env['VITE_FIREBASE_AUTH_DOMAIN'],
  projectId: import.meta.env['VITE_FIREBASE_PROJECT_ID'],
  storageBucket: import.meta.env['VITE_FIREBASE_STORAGE_BUCKET'],
  messagingSenderId: import.meta.env['VITE_FIREBASE_MESSAGING_SENDER_ID'],
  appId: import.meta.env['VITE_FIREBASE_APP_ID'],
};

// Validate configuration
const validateConfig = () => {
  const requiredKeys = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN', 
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID'
  ];

  const missing = requiredKeys.filter(key => !import.meta.env[key]);
  if (missing.length > 0) {
    console.error('Missing Firebase configuration:', missing);
    throw new Error(`Missing Firebase environment variables: ${missing.join(', ')}`);
  }
};

// Initialize Firebase (client-side only, SSR-safe)
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;
let storage: FirebaseStorage | null = null;

export const initializeFirebase = () => {
  // Only initialize in browser
  if (typeof window === 'undefined') {
    return { app: null, auth: null, firestore: null, storage: null };
  }

  try {
    validateConfig();
    
    // Use existing app if available
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    firestore = getFirestore(app);
    storage = getStorage(app);

    console.log('✅ Firebase initialized successfully');
    
    return { app, auth, firestore, storage };
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    throw error;
  }
};

// Getters with lazy initialization
export const getFirebaseApp = (): FirebaseApp => {
  if (!app && typeof window !== 'undefined') {
    initializeFirebase();
  }
  if (!app) {
    throw new Error('Firebase not initialized - make sure to call initializeFirebase() first');
  }
  return app;
};

export const getFirebaseAuth = (): Auth => {
  if (!auth && typeof window !== 'undefined') {
    initializeFirebase();
  }
  if (!auth) {
    throw new Error('Firebase Auth not initialized');
  }
  return auth;
};

export const getFirebaseFirestore = (): Firestore => {
  if (!firestore && typeof window !== 'undefined') {
    initializeFirebase();
  }
  if (!firestore) {
    throw new Error('Firestore not initialized');
  }
  return firestore;
};

export const getFirebaseStorage = (): FirebaseStorage => {
  if (!storage && typeof window !== 'undefined') {
    initializeFirebase();
  }
  if (!storage) {
    throw new Error('Firebase Storage not initialized');
  }
  return storage;
};

// Check if Firebase is available (client-side)
export const isFirebaseAvailable = (): boolean => {
  return typeof window !== 'undefined' && app !== null;
};