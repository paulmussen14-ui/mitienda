// js/admin-config.js
import { protegerPanelAdmin } from "./admin-guard.js";
import { renderSidebar } from "./admin-sidebar.js";
import { actualizarNegocio } from "../services/negocios.js";

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

const PORTADA_MAX_ANCHO = 1600;
const PORTADA_MAX_ALTO = 500;
const PORTADA_CALIDAD = 0.75;

/* =====================================================
   PALETAS DISPONIBLES
   Cada opción define un color primario (header, banner,
   botones) y un color de acento (precios, CTAs).
===================================================== */

const PALETAS = [
    { id: "verde", primario: "#1F5C4A", oscuro: "#123B2F", acento: "#E8A23D" },
    { id: "magenta", primario: "#A3195B", oscuro: "#6E0F3D", acento: "#F2A6C7" },
    { id: "azul", primario: "#1D4E89", oscuro: "#123457", acento: "#7FB2E5" },
    { id: "naranja", primario: "#B4530A", oscuro: "#7A3707", acento: "#F2B366" }
];

let negocioActual = null;
let logoBase64 = null;
let portadaBase64 = null;
let paletaSeleccionada = null;

const elCargando = document.getElementById("admin-cargando");
const elContenido = document.getElementById("admin-contenido");

const inputLogo = document.getElementById("input-logo");
const inputPortada = document.getElementById("input-portada");
const previewLogo = document.getElementById("preview-logo");
const previewLogoVacio = document.getElementById("preview-logo-vacio");
const previewPortada = document.getElementById("preview-portada");
const previewPortadaVacio = document.getElementById("preview-portada-vacio");

const contenedorSwatches = document.getElementById("color-swatches");
const inputNombre = document.getElementById("input-nombre-negocio");
const inputDireccion = document.getElementById("input-direccion");
const inputHorario = document.getElementById("input-horario");
const previewBanner = document.getElementById("preview-banner");
const previewBannerNombre = document.getElementById("preview-banner-nombre");

const btnGuardar = document.getElementById("btn-guardar-config");
const elMensaje = document.getElementById("config-mensaje");


async function iniciar() {

    const { negocio } = await protegerPanelAdmin();
    negocioActual = negocio;

    renderSidebar(negocioActual, "configuracion");
    mostrarPreviewActual();
    construirSwatches();
    precargarDatosNegocio();

    elCargando.style.display = "none";
    elContenido.style.display = "flex";
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
   PERSONALIZACIÓN — colores, nombre, dirección, horario
===================================================== */

function precargarDatosNegocio() {

    inputNombre.value = negocioActual?.nombre || "";
    inputDireccion.value = negocioActual?.direccion || "";
    inputHorario.value = negocioActual?.horario || "";

    // Si el negocio ya tiene un color primario guardado, tratamos
    // de encontrar a qué paleta corresponde; si no coincide con
    // ninguna (color personalizado viejo), usamos la primera.
    const primarioActual = negocioActual?.colores?.primario;
    const coincide = PALETAS.find(p => p.primario.toLowerCase() === (primarioActual || "").toLowerCase());

    paletaSeleccionada = coincide || PALETAS[0];

    marcarSwatchSeleccionado();
    actualizarPreviewBanner();
}

function construirSwatches() {

    contenedorSwatches.innerHTML = "";

    PALETAS.forEach(paleta => {

        const boton = document.createElement("button");
        boton.type = "button";
        boton.className = "color-swatch";
        boton.style.background = paleta.primario;
        boton.dataset.paletaId = paleta.id;
        boton.setAttribute("aria-label", `Color ${paleta.id}`);

        boton.addEventListener("click", () => {
            paletaSeleccionada = paleta;
            marcarSwatchSeleccionado();
            actualizarPreviewBanner();
        });

        contenedorSwatches.appendChild(boton);
    });
}

function marcarSwatchSeleccionado() {

    const botones = contenedorSwatches.querySelectorAll(".color-swatch");

    botones.forEach(boton => {
        boton.classList.toggle(
            "color-swatch--activo",
            boton.dataset.paletaId === paletaSeleccionada?.id
        );
    });
}

function actualizarPreviewBanner() {

    if (!paletaSeleccionada) return;

    previewBanner.style.setProperty("--preview-primario", paletaSeleccionada.primario);
    previewBanner.style.setProperty("--preview-oscuro", paletaSeleccionada.oscuro);

    previewBannerNombre.textContent = inputNombre.value.trim() || "Tu negocio";
}

inputNombre.addEventListener("input", actualizarPreviewBanner);


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

    const nombre = inputNombre.value.trim();

    if (!nombre) {
        elMensaje.textContent = "❌ El nombre del negocio no puede estar vacío.";
        return;
    }

    btnGuardar.disabled = true;
    elMensaje.textContent = "Guardando...";

    try {

        const cambios = {
            nombre,
            direccion: inputDireccion.value.trim(),
            horario: inputHorario.value.trim(),
            colores: {
                primario: paletaSeleccionada.primario,
                acento: paletaSeleccionada.acento,
                secundario: negocioActual?.colores?.secundario || "#ffffff"
            }
        };

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

        const exito = await actualizarNegocio(negocioActual.id, cambios);

        if (exito) {
            negocioActual = { ...negocioActual, ...cambios };
            renderSidebar(negocioActual, "configuracion");
            elMensaje.textContent = "✅ Cambios guardados";
        } else {
            elMensaje.textContent = "❌ No se pudo guardar. Revisa la consola (probablemente sean las reglas de Firestore).";
        }

    } catch (error) {
        console.error("❌ Error guardando configuración:", error);
        elMensaje.textContent = "❌ Ocurrió un error al guardar. Revisa la consola.";
    } finally {
        btnGuardar.disabled = false;
    }
});