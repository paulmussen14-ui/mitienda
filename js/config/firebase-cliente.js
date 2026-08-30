import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import { firebaseConfig } from "./firebase.js";

/* =====================================================
   APP AISLADA PARA LA TIENDA PÚBLICA (CLIENTE ANÓNIMO)

   Usamos el MISMO proyecto de Firebase (mismo firebaseConfig,
   mismo backend, mismos datos), pero una instancia de Firebase
   App separada y con nombre propio ("cliente-tienda").

   ¿Por qué? Porque Firebase Auth solo permite UNA sesión
   activa por instancia de app. Si la tienda pública (auth
   anónima) compartiera la misma instancia que el panel de
   admin (auth.js, login con correo/contraseña), podría haber
   conflicto de sesiones si ambos corren en el mismo dominio.

   Con una app separada, la sesión anónima del cliente vive
   completamente aislada de la sesión del admin, sin importar
   en qué dominio/subdominio esté cada uno.

   IMPORTANTE: db y auth aquí son DISTINTOS de los que exporta
   firebase.js. Cualquier archivo que use auth anónima de
   cliente (carrito.js, pedidos.js) debe usar el "dbCliente" de
   este archivo para leer/escribir "carritos" y "pedidos" —
   usar el "db" de firebase.js ahí NO funcionaría, porque no
   vería la sesión anónima.
===================================================== */

const appCliente = initializeApp(firebaseConfig, "cliente-tienda");

export const dbCliente = getFirestore(appCliente);
export const authCliente = getAuth(appCliente);