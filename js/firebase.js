// Import the functions you need from the SDKs you need
//import { initializeApp } from "firebase/app";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCykh1aBotBtpvHj1JddOU69P7rzh51pbY",
  authDomain: "mitienda-ee0e8.firebaseapp.com",
  projectId: "mitienda-ee0e8",
  storageBucket: "mitienda-ee0e8.firebasestorage.app",
  messagingSenderId: "832792558075",
  appId: "1:832792558075:web:3ff5afebd2a252a023735e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);