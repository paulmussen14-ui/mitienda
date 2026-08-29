// js/admin-config.js
alert("🚨 VERSION-DIAGNOSTICO-3 CARGADA"); // 🔍 TEMPORAL — borrar al terminar el diagnóstico
import { protegerPanelAdmin } from "./admin-guard.js";
import { cerrarSesion, obtenerUsuarioActual } from "./auth.js";
import { renderSidebar } from "./admin-sidebar.js";
import { actualizarNegocio } from "./negocios.js";

/* =====================================================
   Sin Firebase Storage (requiere plan Blaze de pago).
   En vez de subir archivos, redimensionamos/comprimimos
   la imagen en el navegador y la guardamos como base64
   directo en el documento del negocio en Firestore.
   Firestore permite hasta 1 MB por documento, así que
   mantenemos las imágenes bien chicas (ver límites abajo).
===================================================== */

const LOGO_MAX_ANCHO = 300;
const LOGO_MAX_ALTO = 300;
const LOGO_CALIDAD = 0.85;

const PORTADA_MAX_ANCHO = 800;
const PORTADA_MAX_ALTO = 400;
const PORTADA_CALIDAD = 0.75;

let negocioActual = null;
let logoBase64 = null;
let portadaBase64 = null;

const elCargando = document.getElementById("admin-cargando");
const elContenido = document.getElementById("admin-contenido");

const inputLogo = document.getElementById("input-logo");
const inputPortada = document.getElementById("input-portada");
const previewLogo = document.getElementById("preview-logo");
const previewLogoVacio = document.getElementById("preview-logo-vacio");
const previewPortada = document.getElementById("preview-portada");
const previewPortadaVacio = document.getElementById("preview-portada-vacio");
const btnGuardar = document.getElementById("btn-guardar-config");
const btnCerrarSesion = document.getElementById("btn-cerrar-sesion");
const elMensaje = document.getElementById("config-mensaje");


async function iniciar() {

    const { negocio } = await protegerPanelAdmin();
    negocioActual = negocio;

    renderSidebar(negocioActual, "configuracion");
    mostrarPreviewActual();

    elCargando.style.display = "none";
    elContenido.style.display = "flex";

    btnCerrarSesion.addEventListener("click", async () => {
        await cerrarSesion();
        window.location.href = "login.html";
    });
}

iniciar();


// Considera "sin imagen" tanto un valor vacío/ausente como
// restos de datos mal cargados (ej. el texto literal `""`
// que quedó guardado por error al editar el documento a mano
// en Firestore Console).
function esImagenValida(valor) {
    return typeof valor === "string" && valor.trim() !== "" && valor.trim() !== '""';
}

function mostrarPreviewActual() {

    // Los campos reales en Firestore son "logo" y "banner"
    // (no "logoUrl" / "portadaUrl")
    if (esImagenValida(negocioActual?.logo)) {
        previewLogo.src = negocioActual.logo;
        previewLogo.style.display = "block";
        previewLogoVacio.style.display = "none";
    }

    if (esImagenValida(negocioActual?.banner)) {
        previewPortada.src = negocioActual.banner;
        previewPortada.style.display = "block";
        previewPortadaVacio.style.display = "none";
    }
}


/* =====================================================
   Redimensiona y comprime una imagen usando <canvas>,
   devuelve un data URL (base64) listo para guardar.
===================================================== */

function redimensionarImagen(archivo, maxAncho, maxAlto, calidad) {
    return new Promise((resolve, reject) => {

        const lector = new FileReader();

        lector.onload = (evento) => {

            const img = new Image();

            img.onload = () => {

                let { width, height } = img;
                const escala = Math.min(maxAncho / width, maxAlto / height, 1);

                width = Math.round(width * escala);
                height = Math.round(height * escala);

                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;

                canvas.getContext("2d").drawImage(img, 0, 0, width, height);

                resolve(canvas.toDataURL("image/jpeg", calidad));
            };

            img.onerror = () => reject(new Error("No se pudo leer la imagen"));
            img.src = evento.target.result;
        };

        lector.onerror = () => reject(new Error("No se pudo leer el archivo"));
        lector.readAsDataURL(archivo);
    });
}


inputLogo.addEventListener("change", async (evento) => {

    const archivo = evento.target.files[0];
    if (!archivo) return;

    try {
        logoBase64 = await redimensionarImagen(archivo, LOGO_MAX_ANCHO, LOGO_MAX_ALTO, LOGO_CALIDAD);
        previewLogo.src = logoBase64;
        previewLogo.style.display = "block";
        previewLogoVacio.style.display = "none";

    } catch (error) {
        console.error("❌ Error procesando el logo:", error);
        elMensaje.textContent = "❌ No se pudo procesar esa imagen";
    }
});


inputPortada.addEventListener("change", async (evento) => {

    const archivo = evento.target.files[0];
    if (!archivo) return;

    try {
        portadaBase64 = await redimensionarImagen(archivo, PORTADA_MAX_ANCHO, PORTADA_MAX_ALTO, PORTADA_CALIDAD);
        previewPortada.src = portadaBase64;
        previewPortada.style.display = "block";
        previewPortadaVacio.style.display = "none";

    } catch (error) {
        console.error("❌ Error procesando la portada:", error);
        elMensaje.textContent = "❌ No se pudo procesar esa imagen";
    }
});


btnGuardar.addEventListener("click", async () => {

    if (!negocioActual) {
        elMensaje.textContent = "❌ No se encontró tu negocio. Intenta recargar la página.";
        return;
    }

    // 🔍 DIAGNÓSTICO TEMPORAL — borrar una vez resuelto el problema
    // de permisos. JSON.stringify revela espacios o caracteres
    // invisibles que no se ven en la consola de Firestore.
    console.log("🔍 uid autenticado:", obtenerUsuarioActual()?.uid);
    console.log("🔍 negocioActual.id:", negocioActual.id);
    console.log("🔍 plan (raw):", JSON.stringify(negocioActual.plan), "longitud:", negocioActual.plan?.length);
    console.log("🔍 ownerUid (raw):", JSON.stringify(negocioActual.ownerUid), "longitud:", negocioActual.ownerUid?.length);
    console.log("🔍 TODAS las claves de negocioActual:", Object.keys(negocioActual));
    console.log("🔍 negocioActual completo:", JSON.stringify(negocioActual, null, 2));

    btnGuardar.disabled = true;
    elMensaje.textContent = "Guardando...";

    try {

        const cambios = {};

        // Usamos los nombres de campo reales del documento: "logo" y "banner"
        if (logoBase64) cambios.logo = logoBase64;
        if (portadaBase64) cambios.banner = portadaBase64;

        // Firestore no acepta documentos de más de 1 MB.
        // Con estas dimensiones/calidad debería sobrar margen,
        // pero avisamos si algo se pasó de rosca.
        const pesoAproximado = JSON.stringify(cambios).length;
        if (pesoAproximado > 900000) {
            elMensaje.textContent = "❌ Las imágenes son muy pesadas incluso comprimidas. Prueba con una foto más simple.";
            btnGuardar.disabled = false;
            return;
        }

        if (Object.keys(cambios).length > 0) {
            const exito = await actualizarNegocio(negocioActual.id, cambios);

            if (exito) {
                negocioActual = { ...negocioActual, ...cambios };
                elMensaje.textContent = "✅ Cambios guardados";
            } else {
                elMensaje.textContent = "❌ No se pudo guardar. Revisa la consola (probablemente sean las reglas de Firestore).";
            }
        } else {
            elMensaje.textContent = "No hay cambios para guardar";
        }

    } catch (error) {
        console.error("❌ Error guardando configuración:", error);
        elMensaje.textContent = "❌ Ocurrió un error al guardar. Revisa la consola.";
    } finally {
        btnGuardar.disabled = false;
    }
});