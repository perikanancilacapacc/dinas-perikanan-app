// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Ganti konfigurasi di bawah dengan milik Anda dari Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyA7RUUR5qSS30NB7CDekR5usNlF5NiyHRw",
  authDomain: "sistem-admin-perikanan.firebaseapp.com",
  projectId: "sistem-admin-perikanan",
  storageBucket: "sistem-admin-perikanan.firebasestorage.app",
  messagingSenderId: "862874293018",
  appId: "1:862874293018:web:caceb2714d66b2153792a3"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);

// Inisialisasi layanan Firestore Database
export const db = getFirestore(app);