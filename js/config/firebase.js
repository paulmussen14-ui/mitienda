// Firebase App
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

// Firestore
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// Authentication
import { getAuth } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

// Storage
import { getStorage } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCykh1aBotBtpvHj1JddOU69P7rzh51pbY",
  authDomain: "mitienda-ee0e8.firebaseapp.com",
  projectId: "mitienda-ee0e8",
  storageBucket: "mitienda-ee0e8.firebasestorage.app",
  messagingSenderId: "832792558075",
  appId: "1:832792558075:web:3ff5afebd2a252a023735e"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Firestore
export const db = getFirestore(app);

// Authentication
export const auth = getAuth(app);

// Storage
export const storage = getStorage(app);

export { firebaseConfig };