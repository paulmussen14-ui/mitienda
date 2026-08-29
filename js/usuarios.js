import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import { db } from "./firebase.js";

/**
 * Obtener un usuario por su UID
 */
export async function obtenerUsuario(uid) {
    try {
        const referencia = doc(db, "usuarios", uid);
        const resultado = await getDoc(referencia);

        if (!resultado.exists()) {
            return null;
        }

        return {
            id: resultado.id,
            ...resultado.data()
        };

    } catch (error) {
        console.error("Error obteniendo usuario:", error);
        throw error;
    }
}


/**
 * Crear usuario en Firestore
 */
export async function crearUsuario(uid, datos) {
    try {
        const referencia = doc(db, "usuarios", uid);

        await setDoc(referencia, {
            nombre: datos.nombre,
            correo: datos.correo,
            rol: datos.rol ?? "empleado",
            negocio_id: datos.negocio_id,
            activo: datos.activo ?? true,
            fecha_creacion: serverTimestamp()
        });

        return true;

    } catch (error) {
        console.error("Error creando usuario:", error);
        throw error;
    }
}


/**
 * Actualizar usuario
 */
export async function actualizarUsuario(uid, datos) {
    try {
        const referencia = doc(db, "usuarios", uid);

        await updateDoc(referencia, datos);

        return true;

    } catch (error) {
        console.error("Error actualizando usuario:", error);
        throw error;
    }
}


/**
 * Verificar si un usuario está activo
 */
export async function usuarioEstaActivo(uid) {
    const usuario = await obtenerUsuario(uid);

    if (!usuario) {
        return false;
    }

    return usuario.activo === true;
}


/**
 * Obtener el negocio asociado al usuario
 */
export async function obtenerNegocioIdUsuario(uid) {
    const usuario = await obtenerUsuario(uid);

    if (!usuario || !usuario.negocio_id) {
        return null;
    }

    return usuario.negocio_id;
}