import {
    ref,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";

import { storage } from "./firebase.js";


const TAMANIO_MAXIMO = 3 * 1024 * 1024; // 3 MB


/* =====================================================
   VALIDAR ARCHIVO DE IMAGEN
===================================================== */

export function validarArchivoImagen(archivo) {

    if (!archivo) {
        return { valido: false, mensaje: "No se seleccionó ningún archivo." };
    }

    if (!archivo.type.startsWith("image/")) {
        return { valido: false, mensaje: "El archivo debe ser una imagen." };
    }

    if (archivo.size > TAMANIO_MAXIMO) {
        return { valido: false, mensaje: "La imagen no puede pesar más de 3 MB." };
    }

    return { valido: true };
}


/* =====================================================
   VALIDAR URL DE IMAGEN
   Validación básica de formato (no confirma que cargue).
===================================================== */

export function validarUrlImagen(url) {

    if (!url) {
        return { valido: false, mensaje: "Ingresa una URL." };
    }

    try {
        const analizada = new URL(url);

        if (analizada.protocol !== "http:" && analizada.protocol !== "https:") {
            return { valido: false, mensaje: "La URL debe empezar con http:// o https://" };
        }

    } catch {
        return { valido: false, mensaje: "La URL no es válida." };
    }

    return { valido: true };
}


/* =====================================================
   SUBIR LOGO DE NEGOCIO
   Ruta: logos/{uid}/logo.<extensión>
   Requiere que el usuario ya esté autenticado (uid = su propio uid).
===================================================== */

export async function subirLogoNegocio(archivo, uid) {

    const extension = archivo.name.split(".").pop() || "jpg";
    const referencia = ref(storage, `logos/${uid}/logo.${extension}`);

    await uploadBytes(referencia, archivo);

    return await getDownloadURL(referencia);
}