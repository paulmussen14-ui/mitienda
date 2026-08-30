import {
    onAuthStateChanged,
    signInAnonymously
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import { authCliente as auth } from "../config/firebase-cliente.js";

/* =====================================================
   AUTENTICACIÓN ANÓNIMA DEL CLIENTE (COMPARTIDA)

   Este es el ÚNICO lugar donde se resuelve el cliente_id.
   Tanto carrito.js como pedidos.js (y cualquier otro
   archivo que necesite saber "quién es el cliente actual")
   deben importar obtenerClienteId() desde aquí, en vez de
   tener su propia copia — así evitamos que un archivo se
   quede con la lógica vieja de localStorage mientras otro
   ya usa Firebase Auth (que fue justo el bug que causó el
   error "Missing or insufficient permissions" en el carrito).

   Usa la Auth de la app AISLADA (firebase-cliente.js), no la
   del panel de admin, para que nunca choquen sesiones.

   ⚠️ Requiere el proveedor "Anónimo" habilitado en
   Firebase Console → Authentication → Sign-in method.
===================================================== */

let clienteIdPromise = null;

export function obtenerClienteId() {

    if (clienteIdPromise) {
        return clienteIdPromise;
    }

    clienteIdPromise = new Promise((resolve, reject) => {

        const cancelarListener = onAuthStateChanged(
            auth,
            (usuario) => {

                if (usuario) {
                    cancelarListener();
                    console.log("👤 Cliente (anon uid):", usuario.uid);
                    resolve(usuario.uid);
                    return;
                }

                // Todavía no hay sesión: inicia una anónima.
                // onAuthStateChanged se volverá a disparar cuando
                // Firebase confirme el login y entrará al `if` de arriba.
                signInAnonymously(auth).catch((error) => {
                    cancelarListener();
                    reject(error);
                });

            },
            (error) => {
                reject(error);
            }
        );

    });

    return clienteIdPromise;
}