import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import { firebaseConfig } from "./firebase.js";


const appCliente = initializeApp(firebaseConfig, "cliente-tienda");

export const dbCliente = getFirestore(appCliente);
export const authCliente = getAuth(appCliente);