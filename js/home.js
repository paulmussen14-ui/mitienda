import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import { db } from "./firebase.js";
import { obtenerIniciales } from "./negocios.js";


/* ============================================================
   MITIENDA — MARKETPLACE
   ============================================================ */

let tiendas = [];
let filtroTexto = "";


/* ============================================================
   CARGAR TIENDAS DESDE FIREBASE
   ============================================================ */

async function cargarTiendas() {

    const contenedor =
        document.getElementById("grid-tiendas");

    const cargando =
        document.getElementById("tiendas-cargando");

    if (!contenedor) {
        console.error("❌ No existe #grid-tiendas");
        return;
    }

    try {

        const referencia =
            collection(db, "negocios");

        const resultado =
            await getDocs(referencia);


        tiendas = resultado.docs.map(documento => ({
            id: documento.id,
            ...documento.data()
        }));


        console.log("🏪 Tiendas encontradas:", tiendas);


        if (cargando) {
            cargando.style.display = "none";
        }


        aplicarFiltros();


    } catch (error) {

        console.error(
            "❌ Error cargando tiendas:",
            error
        );


        if (cargando) {

            cargando.innerHTML = `
                <p>
                    ❌ No se pudieron cargar las tiendas.
                </p>
            `;

        }

    }
}


/* ============================================================
   FILTRAR TIENDAS
   ============================================================ */

function aplicarFiltros() {

    const contenedor =
        document.getElementById("grid-tiendas");

    const sinTiendas =
        document.getElementById("sin-tiendas");

    const contador =
        document.getElementById("contador-tiendas");


    if (!contenedor) return;


    const texto =
        filtroTexto
            .toLowerCase()
            .trim();


    const resultado =
        tiendas.filter(tienda => {

            if (!texto) {
                return true;
            }


            const nombre =
                String(
                    tienda.nombre || ""
                ).toLowerCase();


            const descripcion =
                String(
                    tienda.descripcion || ""
                ).toLowerCase();


            const categoria =
                String(
                    tienda.categoria || ""
                ).toLowerCase();


            return (
                nombre.includes(texto) ||
                descripcion.includes(texto) ||
                categoria.includes(texto)
            );

        });


    contenedor.innerHTML = "";


    /* ========================================================
       CONTADOR
       ======================================================== */

    if (contador) {

        contador.textContent =
            `${resultado.length} tienda${
                resultado.length === 1
                    ? ""
                    : "s"
            }`;

    }


    /* ========================================================
       SIN RESULTADOS
       ======================================================== */

    if (resultado.length === 0) {

        if (sinTiendas) {
            sinTiendas.style.display = "block";
        }

        return;
    }


    if (sinTiendas) {
        sinTiendas.style.display = "none";
    }


    /* ========================================================
       CREAR TARJETAS
       ======================================================== */

    resultado.forEach(tienda => {

        const tarjeta =
            crearTarjetaTienda(tienda);

        if (tarjeta) {
            contenedor.appendChild(tarjeta);
        }

    });

}


/* ============================================================
   CREAR TARJETA DE TIENDA
   ============================================================ */

function crearTarjetaTienda(tienda) {

    const plantilla =
        document.getElementById(
            "plantilla-tienda"
        );


    if (!plantilla) {

        console.error(
            "❌ No existe #plantilla-tienda"
        );

        return null;
    }


    const nodo =
        plantilla.content.cloneNode(true);


    const tarjeta =
        nodo.querySelector(
            ".tienda-card"
        );


    const nombre =
        nodo.querySelector(
            '[data-campo="nombre"]'
        );


    const descripcion =
        nodo.querySelector(
            '[data-campo="descripcion"]'
        );


    const direccion =
        nodo.querySelector(
            '[data-campo="direccion"]'
        );


    const horario =
        nodo.querySelector(
            '[data-campo="horario"]'
        );


    const iniciales =
        nodo.querySelector(
            '[data-campo="iniciales"]'
        );


    const boton =
        nodo.querySelector(
            '[data-campo="boton"]'
        );


    /* ========================================================
       DATOS
       ======================================================== */

    nombre.textContent =
        tienda.nombre ||
        "Tienda sin nombre";


    descripcion.textContent =
        tienda.descripcion ||
        "Compra productos en esta tienda.";


    direccion.textContent =
        `📍 ${
            tienda.direccion ||
            "Dirección no disponible"
        }`;


    horario.textContent =
        `🕐 ${
            tienda.horario ||
            "Horario no disponible"
        }`;


    iniciales.textContent =
        obtenerIniciales(
            tienda.nombre ||
            "Tienda"
        );


    /* ========================================================
       COLORES DINÁMICOS
       ======================================================== */

    const colores =
        tienda.colores || {};


    const primario =
        colores.primario ||
        "#1F5C4A";


    const acento =
        colores.acento ||
        "#E8A23D";


    const secundario =
        colores.secundario ||
        "#FFFFFF";


    tarjeta.style.setProperty(
        "--tienda-primario",
        primario
    );


    tarjeta.style.setProperty(
        "--tienda-acento",
        acento
    );


    tarjeta.style.setProperty(
        "--tienda-secundario",
        secundario
    );


    /* ========================================================
       LOGO REAL
       ======================================================== */

if (
    tienda.logoUrl &&
    tienda.logoUrl.trim() !== ""
) {

    iniciales.innerHTML = `
        <img
            src="${tienda.logoUrl}"
            alt="${tienda.nombre || "Tienda"}"
        >
    `;

}

/* ========================================================
   PORTADA (banner superior, si existe)
   ======================================================== */

if (
    tienda.portadaUrl &&
    tienda.portadaUrl.trim() !== ""
) {

    const portada = document.createElement("img");
    portada.src = tienda.portadaUrl;
    portada.alt = `Portada de ${tienda.nombre || "la tienda"}`;
    portada.className = "tienda-portada";

    tarjeta.insertBefore(portada, tarjeta.firstChild);
}


    /* ========================================================
       URL DE LA TIENDA
       ======================================================== */

    const slug =
        tienda.slug ||
        tienda.id;


    boton.href =
        `pages/productos.html?negocio=${
            encodeURIComponent(slug)
        }`;


    return nodo;
}


/* ============================================================
   BUSCADOR
   ============================================================ */

function configurarBuscador() {

    const input =
        document.getElementById(
            "buscar-negocio"
        );


    if (!input) return;


    input.addEventListener(
        "input",
        event => {

            filtroTexto =
                event.target.value;

            aplicarFiltros();

        }
    );

}


/* ============================================================
   INICIAR MARKETPLACE
   ============================================================ */

async function iniciarHome() {

    console.log(
        "🚀 Iniciando MiTienda Marketplace..."
    );


    configurarBuscador();

    await cargarTiendas();

}


iniciarHome();