import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAlXtFEMWTv2PSFb4StzXKE5Cx8uLwrTOs',
  authDomain: 'school-attack-2130d.firebaseapp.com',
  projectId: 'school-attack-2130d',
  storageBucket: 'school-attack-2130d.firebasestorage.app',
  messagingSenderId: '266132329626',
  appId: '1:266132329626:web:598aad90a9dba23870fb23',
} as const;

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const firebaseAuth = getAuth(app);
export const firestoreDb = getFirestore(app);
