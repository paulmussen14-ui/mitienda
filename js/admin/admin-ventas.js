import {
    collection,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import { db } from "../config/firebase.js";
import { protegerPanelAdmin } from "./admin-guard.js";
import { cerrarSesion } from "../services/auth.js";


let negocioActual = null;
let ventas = [];
let rangoActual = "todos";


/* ============================================================
   INICIAR
============================================================ */

async function iniciar() {

    const { negocio } = await protegerPanelAdmin();

    negocioActual = negocio;

    document.getElementById("admin-cargando").style.display = "none";
    document.getElementById("admin-contenido").style.display = "block";
    document.getElementById("admin-nombre-negocio").textContent = `🏪 ${negocio.nombre}`;

    document.getElementById("btn-cerrar-sesion").addEventListener("click", async () => {
        await cerrarSesion();
        window.location.href = "login.html";
    });

    configurarFiltroFechas();

    await cargarVentas();
}


/* ============================================================
   FILTRO DE FECHAS
============================================================ */

function configurarFiltroFechas() {

    const botones = document.querySelectorAll("#filtro-fechas .chip");

    botones.forEach(boton => {

        boton.addEventListener("click", () => {

            botones.forEach(b => b.classList.remove("on"));
            boton.classList.add("on");

            rangoActual = boton.dataset.rango;

            renderizarVentas();
        });
    });
}


/* ============================================================
   CARGAR VENTAS DEL NEGOCIO
============================================================ */

async function cargarVentas() {

    const cargando = document.getElementById("ventas-cargando");

    try {

        const referencia = query(
            collection(db, "ventas"),
            where("negocio_id", "==", negocioActual.id)
        );

        const resultado = await getDocs(referencia);

        ventas = resultado.docs.map(d => ({ id: d.id, ...d.data() }));

        ventas.sort((a, b) => {
            const fechaA = a.fecha?.toMillis ? a.fecha.toMillis() : 0;
            const fechaB = b.fecha?.toMillis ? b.fecha.toMillis() : 0;
            return fechaB - fechaA;
        });

        cargando.style.display = "none";

        renderizarVentas();

    } catch (error) {
        console.error("❌ Error cargando ventas:", error);
        cargando.textContent = "No se pudieron cargar las ventas.";
    }
}


/* ============================================================
   FILTRAR POR RANGO DE FECHA
============================================================ */

function filtrarPorRango(lista) {

    if (rangoActual === "todos") return lista;

    const ahora = Date.now();

    const limites = {
        hoy: 24 * 60 * 60 * 1000,
        semana: 7 * 24 * 60 * 60 * 1000,
        mes: 30 * 24 * 60 * 60 * 1000
    };

    const limiteMs = limites[rangoActual];

    return lista.filter(venta => {

        if (!venta.fecha?.toMillis) return false;

        const diferencia = ahora - venta.fecha.toMillis();

        return diferencia <= limiteMs;
    });
}


/* ============================================================
   RENDERIZAR
============================================================ */

function renderizarVentas() {

    const filtradas = filtrarPorRango(ventas);

    actualizarResumen(filtradas);

    const tabla = document.getElementById("tabla-ventas");
    const lista = document.getElementById("lista-ventas");
    const sinVentas = document.getElementById("sin-ventas");

    lista.innerHTML = "";

    if (filtradas.length === 0) {
        tabla.style.display = "none";
        sinVentas.style.display = "block";
        return;
    }

    sinVentas.style.display = "none";
    tabla.style.display = "table";

    filtradas.forEach(venta => {
        lista.appendChild(crearFilaVenta(venta));
    });
}


/* ============================================================
   RESUMEN (cantidad, total, promedio)
============================================================ */

function actualizarResumen(lista) {

    const cantidad = lista.length;

    const total = lista.reduce(
        (suma, venta) => suma + Number(venta.total || 0),
        0
    );

    const promedio = cantidad > 0 ? total / cantidad : 0;

    document.getElementById("resumen-cantidad").textContent = cantidad;
    document.getElementById("resumen-total").textContent = `S/ ${total.toFixed(2)}`;
    document.getElementById("resumen-promedio").textContent = `S/ ${promedio.toFixed(2)}`;
}


/* ============================================================
   CREAR FILA
============================================================ */

function crearFilaVenta(venta) {

    const fila = document.createElement("tr");

    const fecha = venta.fecha?.toDate
        ? venta.fecha.toDate().toLocaleString("es-PE")
        : "-";

    const productos = Array.isArray(venta.detalle_venta)
        ? venta.detalle_venta.map(item => `${item.nombre} x${item.cantidad}`).join(", ")
        : "-";

    fila.innerHTML = `
        <td>${fecha}</td>
        <td>${venta.cliente_id || "-"}</td>
        <td>${productos}</td>
        <td>S/ ${Number(venta.total || 0).toFixed(2)}</td>
        <td>#${venta.pedido_id || "-"}</td>
    `;

    return fila;
}


/* ============================================================
   EJECUTAR
============================================================ */

iniciar();