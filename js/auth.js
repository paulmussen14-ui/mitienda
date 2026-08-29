import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import { auth } from "./firebase.js";

/**
 * Iniciar sesión
 */
export async function iniciarSesion(correo, contraseña) {
    try {
        const resultado = await signInWithEmailAndPassword(
            auth,
            correo,
            contraseña
        );

        return {
            correcto: true,
            usuario: resultado.user
        };

    } catch (error) {

        console.error("Error al iniciar sesión:", error);

        let mensaje = "No se pudo iniciar sesión.";

        switch (error.code) {
            case "auth/invalid-credential":
                mensaje = "El correo o la contraseña son incorrectos.";
                break;

            case "auth/user-disabled":
                mensaje = "Esta cuenta está deshabilitada.";
                break;

            case "auth/too-many-requests":
                mensaje = "Demasiados intentos. Intenta nuevamente más tarde.";
                break;

            case "auth/invalid-email":
                mensaje = "El correo electrónico no es válido.";
                break;
        }

        return {
            correcto: false,
            mensaje
        };
    }
}

/**
 * Cerrar sesión
 */
export async function cerrarSesion() {
    try {
        await signOut(auth);
        return true;

    } catch (error) {
        console.error("Error al cerrar sesión:", error);
        return false;
    }
}

/**
 * Escuchar cambios de autenticación
 */
export function observarSesion(callback) {
    return onAuthStateChanged(auth, callback);
}

/**
 * Obtener usuario actualmente autenticado
 */
export function obtenerUsuarioActual() {
    return auth.currentUser;
}