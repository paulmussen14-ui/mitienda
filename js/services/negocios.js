import {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    query,
    where,
    limit,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import { db } from "../config/firebase.js";


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
   ACTUALIZAR NEGOCIO
   Guarda cambios parciales (ej. logo, banner, colores)
   sobre un negocio ya existente.
   IMPORTANTE: la regla de Firestore para update exige que
   el documento ya tenga un campo `plan` válido
   ("basico" | "pro" | "premium"); si falta, cualquier
   update fallará con "Missing or insufficient permissions"
   aunque no se esté tocando ese campo.
===================================================== */

export async function actualizarNegocio(negocioId, datos) {

    if (!negocioId || !datos) return false;

    try {
        const referencia = doc(db, "negocios", negocioId);
        await updateDoc(referencia, datos);
        return true;

    } catch (error) {
        console.error("❌ Error actualizando negocio:", error);
        return false;
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


/* =====================================================
   GENERAR SLUG
   "Bodega Luz" → "bodega-luz"
===================================================== */

export function generarSlug(nombre) {

    if (!nombre) return "";

    return nombre
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")   // quita tildes
        .replace(/[^a-z0-9\s-]/g, "")      // quita símbolos raros
        .replace(/\s+/g, "-")              // espacios → guiones
        .replace(/-+/g, "-")               // colapsa guiones repetidos
        .replace(/^-|-$/g, "");            // sin guion al inicio/final
}


/* =====================================================
   VERIFICAR SLUG DISPONIBLE
===================================================== */

export async function verificarSlugDisponible(slug) {

    if (!slug) return false;

    try {

        const referencia = query(
            collection(db, "negocios"),
            where("slug", "==", slug),
            limit(1)
        );

        const resultado = await getDocs(referencia);

        return resultado.empty;

    } catch (error) {
        console.error("❌ Error verificando slug:", error);
        return false;
    }
}


/* =====================================================
   CREAR NEGOCIO
   Crea el documento en /negocios con colores por defecto
   y devuelve el ID generado.
   Nota: usa `logo` y `banner` (no logoUrl/portadaUrl) para
   ser consistente con admin-config.js y con el marketplace,
   que leen esos mismos nombres de campo.
===================================================== */

export async function crearNegocio(datos) {

    const referencia = await addDoc(collection(db, "negocios"), {
        nombre: datos.nombre,
        slug: datos.slug,
        direccion: datos.direccion,
        horario: datos.horario,
        plan: datos.plan,
        ownerUid: datos.ownerUid,
        logo: datos.logo || "",
        banner: datos.banner || "",
        colores: {
            primario: "#1F5C4A",
            acento: "#E8A23D",
            secundario: "#ffffff"
        },
        creadoEn: serverTimestamp()
    });

    return referencia.id;
}