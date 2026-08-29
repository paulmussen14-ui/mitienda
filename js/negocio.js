import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    limit
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import { db } from "./firebase.js";


const NEGOCIO_STORAGE_KEY = "mitienda_negocio_actual";


/* =====================================================
   OBTENER NEGOCIO ACTUAL
   Prioridad: ?negocio= en la URL → último negocio visitado
===================================================== */

export async function obtenerNegocioActual() {

    const params = new URLSearchParams(window.location.search);
    let slug = params.get("negocio");

    if (!slug) {
        slug = localStorage.getItem(NEGOCIO_STORAGE_KEY);
    }

    if (!slug) {
        return null;
    }

    try {

        const referencia = query(
            collection(db, "negocios"),
            where("slug", "==", slug),
            limit(1)
        );

        const resultado = await getDocs(referencia);

        if (resultado.empty) {
            console.warn(`No existe ningún negocio con slug "${slug}"`);
            return null;
        }

        const documento = resultado.docs[0];

        localStorage.setItem(NEGOCIO_STORAGE_KEY, slug);

        return {
            id: documento.id,
            ...documento.data()
        };

    } catch (error) {
        console.error("❌ Error buscando negocio:", error);
        return null;
    }
}


/* =====================================================
   CONFIGURAR NAVEGACIÓN DINÁMICA
   Reescribe los enlaces internos del navbar para que
   conserven ?negocio=<slug>.
   Requiere ids: nav-productos, nav-carrito, nav-pedidos, nav-contacto
   (el enlace "Inicio" se deja tal cual, sin negocio)
===================================================== */

export function configurarNavegacionNegocio(negocio) {

    if (!negocio) return;

    const slug = negocio.slug || negocio.id;
    const negocioParam = encodeURIComponent(slug);

    const mapaEnlaces = {
        "nav-productos": `productos.html?negocio=${negocioParam}`,
        "nav-carrito": `carrito.html?negocio=${negocioParam}`,
        "nav-pedidos": `pedidos.html?negocio=${negocioParam}`,
        "nav-contacto": `contacto.html?negocio=${negocioParam}`
    };

    Object.entries(mapaEnlaces).forEach(([id, href]) => {
        const enlace = document.getElementById(id);
        if (enlace) {
            enlace.href = href;
        }
    });
}

/* =====================================================
   OBTENER NEGOCIO POR ID
===================================================== */

export async function obtenerNegocioPorId(negocioId) {

    if (!negocioId) return null;

    try {
        const referencia = doc(db, "negocios", negocioId);
        const snap = await getDoc(referencia);

        if (!snap.exists()) {
            return null;
        }

        return { id: snap.id, ...snap.data() };

    } catch (error) {
        console.error("❌ Error obteniendo negocio por id:", error);
        return null;
    }
}


/* =====================================================
   OBTENER INICIALES
===================================================== */

export function obtenerIniciales(nombre) {

    if (!nombre) return "--";

    return nombre
        .split(" ")
        .filter(palabra => palabra.length > 0)
        .map(palabra => palabra[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
}