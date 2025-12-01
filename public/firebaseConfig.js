// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCJBsxnJQyFb5KNK35BhHNqnbHRJlksptw",
  authDomain: "pilltick-b8213.firebaseapp.com",
  projectId: "pilltick-b8213",
  storageBucket: "pilltick-b8213.firebasestorage.app",
  messagingSenderId: "221398812448",
  appId: "1:221398812448:web:59981bacd8d42a1fc53945",
  measurementId: "G-DYFX0F77B4"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export { app, analytics, auth, db, provider };
