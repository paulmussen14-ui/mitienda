import {
    onAuthStateChanged,
    signInAnonymously
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import { authCliente as auth } from "../config/firebase-cliente.js";

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