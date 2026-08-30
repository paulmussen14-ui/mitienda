import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import { db } from "../config/firebase.js";
import { obtenerIniciales } from "../services/negocios.js";


let todasLasTiendas = [];


/* =====================================================
   ¿ES UNA IMAGEN VÁLIDA?
===================================================== */

function esImagenValida(valor) {
    return typeof valor === "string" && valor.trim() !== "" && valor.trim() !== '""';
}


/* ============================================================
   INICIAR
============================================================ */

async function iniciarTiendas() {

    const cargando = document.getElementById("tiendas-cargando");
    const lista = document.getElementById("lista-tiendas");
    const sinTiendas = document.getElementById("sin-tiendas");

    try {

        const referencia = collection(db, "negocios");
        const resultado = await getDocs(referencia);

        todasLasTiendas = resultado.docs.map((documento) => ({
            id: documento.id,
            ...documento.data()
        }));

        if (cargando) cargando.style.display = "none";

        renderizarTiendas(todasLasTiendas);

        configurarBuscador();

    } catch (error) {

        console.error("❌ Error cargando tiendas:", error);

        if (cargando) cargando.textContent = "No se pudieron cargar las tiendas.";

    }

}


/* ============================================================
   RENDERIZAR TARJETAS
============================================================ */

function renderizarTiendas(tiendas) {

    const lista = document.getElementById("lista-tiendas");
    const sinTiendas = document.getElementById("sin-tiendas");
    const cantidad = document.getElementById("cantidad-tiendas");
    const plantilla = document.getElementById("plantilla-tienda");

    if (!lista || !plantilla) return;

    lista.innerHTML = "";

    if (cantidad) {
        cantidad.textContent = tiendas.length === 1
            ? "1 tienda disponible"
            : `${tiendas.length} tiendas disponibles`;
    }

    if (tiendas.length === 0) {
        lista.style.display = "none";
        if (sinTiendas) sinTiendas.style.display = "block";
        return;
    }

    lista.style.display = "grid";
    if (sinTiendas) sinTiendas.style.display = "none";

    tiendas.forEach((negocio) => {

        const nodo = plantilla.content.cloneNode(true);

        const nombre = negocio.nombre || "Tienda";
        const slug = negocio.slug || negocio.id;
        const negocioParam = encodeURIComponent(slug);

        const bannerElemento = nodo.querySelector(".tienda-banner");

        if (bannerElemento && esImagenValida(negocio.banner)) {
            bannerElemento.style.backgroundImage = `url("${negocio.banner}")`;
            bannerElemento.classList.add("tiene-banner");
        }

        const logoElemento = nodo.querySelector('[data-campo="logo"]');

        if (logoElemento) {

            if (esImagenValida(negocio.logo)) {

                const imagenLogo = document.createElement("img");
                imagenLogo.src = negocio.logo;
                imagenLogo.alt = nombre;
                imagenLogo.className = "tienda-logo tienda-logo-img";

                logoElemento.replaceWith(imagenLogo);

            } else {

                logoElemento.textContent = obtenerIniciales(nombre);

            }

        }

        const nombreElemento = nodo.querySelector('[data-campo="nombre"]');
        if (nombreElemento) nombreElemento.textContent = nombre;

        const direccionElemento = nodo.querySelector('[data-campo="direccion"]');
        if (direccionElemento) {
            direccionElemento.textContent = negocio.direccion || "Dirección no disponible";
        }

        const horarioElemento = nodo.querySelector('[data-campo="horario"]');
        if (horarioElemento) {
            horarioElemento.textContent = `🕐 ${negocio.horario || "Horario no disponible"}`;
        }

        const botonElemento = nodo.querySelector('[data-campo="boton"]');
        if (botonElemento) {
            botonElemento.href = `productos.html?negocio=${negocioParam}`;
        }

        lista.appendChild(nodo);

    });

}


/* ============================================================
   BUSCADOR
============================================================ */

function configurarBuscador() {

    const input = document.getElementById("buscar-tienda");

    if (!input) return;

    input.addEventListener("input", () => {

        const texto = input.value.trim().toLowerCase();

        const filtradas = todasLasTiendas.filter((negocio) =>
            (negocio.nombre || "").toLowerCase().includes(texto)
        );

        renderizarTiendas(filtradas);

    });

}


/* ============================================================
   EJECUTAR
============================================================ */

iniciarTiendas();