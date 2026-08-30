import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    deleteUser,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import { auth } from "../config/firebase.js";

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
 * Registrar un nuevo dueño de tienda en Firebase Auth.
 * Solo crea la cuenta de autenticación — la creación de los
 * documentos en Firestore (negocio, usuario) se hace aparte,
 * para poder revertir con revertirRegistro() si algo falla.
 */
export async function registrarUsuarioAuth(correo, contraseña) {
    try {
        const resultado = await createUserWithEmailAndPassword(
            auth,
            correo,
            contraseña
        );

        return {
            correcto: true,
            usuario: resultado.user
        };

    } catch (error) {

        console.error("Error al registrar usuario:", error);

        let mensaje = "No se pudo crear la cuenta.";

        switch (error.code) {
            case "auth/email-already-in-use":
                mensaje = "Ya existe una cuenta con ese correo.";
                break;

            case "auth/invalid-email":
                mensaje = "El correo electrónico no es válido.";
                break;

            case "auth/weak-password":
                mensaje = "La contraseña debe tener al menos 6 caracteres.";
                break;
        }

        return {
            correcto: false,
            mensaje
        };
    }
}

/**
 * Revertir un registro a medio camino: si la cuenta de Auth se
 * creó pero falló la escritura en Firestore (negocio o usuario),
 * eliminamos la cuenta para no dejar un usuario huérfano.
 */
export async function revertirRegistro(usuario) {
    try {
        await deleteUser(usuario);
        return true;

    } catch (error) {
        console.error("❌ No se pudo revertir el registro:", error);
        return false;
    }
}

/**
 * Enviar correo de restablecimiento de contraseña.
 * Siempre devuelve correcto:true salvo por un correo con formato
 * inválido — no revelamos si la cuenta existe o no, por seguridad.
 */
export async function enviarRecuperacion(correo) {
    try {
        await sendPasswordResetEmail(auth, correo);
        return { correcto: true };

    } catch (error) {

        console.error("Error al enviar recuperación:", error);

        if (error.code === "auth/invalid-email") {
            return {
                correcto: false,
                mensaje: "El correo electrónico no es válido."
            };
        }

        // Para cualquier otro caso (incluido "user-not-found"),
        // respondemos como si hubiera funcionado.
        return { correcto: true };
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