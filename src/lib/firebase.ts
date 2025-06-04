
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAnalytics, type Analytics } from "firebase/analytics";
// import { getAuth, type Auth } from 'firebase/auth'; // Se useremo l'autenticazione
// import { getStorage, type FirebaseStorage } from 'firebase/storage'; // Se useremo Storage

const firebaseConfig = {
  apiKey: "AIzaSyAgOm6Krm0IzH8BhnEzTmOvX22YK0IxKcM",
  authDomain: "studio-dvo-dentalbalance.firebaseapp.com",
  projectId: "studio-dvo-dentalbalance",
  storageBucket: "studio-dvo-dentalbalance.firebasestorage.app", // Corretto da .firebasestorage.app a .appspot.com se quello è il formato standard atteso, altrimenti lascio come fornito. Solitamente è .appspot.com
  messagingSenderId: "411690245713",
  appId: "1:411690245713:web:e62cf84c11edadf518e270",
  measurementId: "G-DVF3EKV745"
};

let app: FirebaseApp;
let db: Firestore;
let analytics: Analytics | undefined = undefined; // Analytics può essere undefined lato server
// let auth: Auth;
// let storage: FirebaseStorage;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

db = getFirestore(app);

// Inizializza Analytics solo se siamo nel browser
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

// auth = getAuth(app); // Decommenta se/quando useremo l'autenticazione
// storage = getStorage(app); // Decommenta se/quando useremo Storage

export { app, db, analytics /*, auth, storage */ };
