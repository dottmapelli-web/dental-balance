
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAnalytics, type Analytics } from "firebase/analytics";
// import { getAuth, type Auth } from 'firebase/auth'; // Se useremo l'autenticazione
// import { getStorage, type FirebaseStorage } from 'firebase/storage'; // Se useremo Storage

const firebaseConfig = {
  apiKey: "AIzaSyAkOZvcwoOIFOwlona3JI6aZ930W-3MX0Y",
  authDomain: "studio-dvo-dentalbalance-5268a.firebaseapp.com",
  projectId: "studio-dvo-dentalbalance-5268a",
  storageBucket: "studio-dvo-dentalbalance-5268a.firebasestorage.app",
  messagingSenderId: "48639551990",
  appId: "1:48639551990:web:1269469079284227c8bfd7",
  measurementId: "G-C8T0852YP3"
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
