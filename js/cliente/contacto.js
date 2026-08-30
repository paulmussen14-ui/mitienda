import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import { db } from "../config/firebase.js";
import { obtenerIniciales } from "../services/negocios.js";


let negocios = [];


/* =====================================================
   CARGAR TIENDAS
===================================================== */

async function cargarTiendas() {

    const lista = document.getElementById("lista-tiendas");
    const cargando = document.getElementById("tiendas-cargando");
    const vacio = document.getElementById("sin-tiendas");
    const cantidad = document.getElementById("cantidad-tiendas");
    const plantilla = document.getElementById("plantilla-tienda");

    try {

        const resultado = await getDocs(collection(db, "negocios"));

        negocios = resultado.docs.map(documento => ({
            id: documento.id,
            ...documento.data()
        }));

        if (cargando) cargando.style.display = "none";

        mostrarTiendas(negocios, lista, vacio, cantidad, plantilla);

    } catch (error) {

        console.error("❌ Error cargando tiendas:", error);

        if (cargando) {
            cargando.textContent = "No se pudieron cargar las tiendas.";
        }
    }
}


/* =====================================================
   MOSTRAR TIENDAS
===================================================== */

function mostrarTiendas(tiendas, lista, vacio, cantidad, plantilla) {

    lista.innerHTML = "";

    if (cantidad) {
        cantidad.textContent =
            `${tiendas.length} tienda${tiendas.length === 1 ? "" : "s"} disponible${tiendas.length === 1 ? "" : "s"}`;
    }

    if (tiendas.length === 0) {
        vacio.style.display = "block";
        return;
    }

    vacio.style.display = "none";

    tiendas.forEach(negocio => {

        const nodo = plantilla.content.cloneNode(true);

        const logo = nodo.querySelector('[data-campo="logo"]');
        const nombre = nodo.querySelector('[data-campo="nombre"]');
        const direccion = nodo.querySelector('[data-campo="direccion"]');
        const horario = nodo.querySelector('[data-campo="horario"]');
        const boton = nodo.querySelector('[data-campo="boton"]');

        logo.textContent = obtenerIniciales(negocio.nombre || "MiTienda");
        nombre.textContent = negocio.nombre || "Sin nombre";
        direccion.textContent = negocio.direccion || "Ubicación no disponible";
        horario.textContent = `🕐 ${negocio.horario || "Horario no disponible"}`;

        boton.href = `productos.html?negocio=${encodeURIComponent(negocio.slug)}`;

        lista.appendChild(nodo);
    });
}


/* =====================================================
   BUSCAR TIENDA
===================================================== */

const buscador = document.getElementById("buscar-tienda");

if (buscador) {

    buscador.addEventListener("input", () => {

        const texto = buscador.value.toLowerCase().trim();

        const filtradas = negocios.filter(negocio =>
            (negocio.nombre || "").toLowerCase().includes(texto)
        );

        mostrarTiendas(
            filtradas,
            document.getElementById("lista-tiendas"),
            document.getElementById("sin-tiendas"),
            document.getElementById("cantidad-tiendas"),
            document.getElementById("plantilla-tienda")
        );
    });
}


/* =====================================================
   INICIAR
===================================================== */

cargarTiendas();