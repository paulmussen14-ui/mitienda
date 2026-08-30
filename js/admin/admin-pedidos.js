import {
    collection,
    doc,
    updateDoc,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import { db } from "../config/firebase.js";
import { protegerPanelAdmin } from "./admin-guard.js";
import { cerrarSesion } from "../services/auth.js";
import { registrarVenta } from "../services/ventas.js";


let negocioActual = null;
let pedidos = [];
let filtroEstado = "todos";


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

    configurarFiltros();

    await cargarPedidos();
}


/* ============================================================
   FILTROS DE ESTADO
============================================================ */

function configurarFiltros() {

    const botones = document.querySelectorAll("#filtro-estados .chip");

    botones.forEach(boton => {

        boton.addEventListener("click", () => {

            botones.forEach(b => b.classList.remove("on"));
            boton.classList.add("on");

            filtroEstado = boton.dataset.estado;

            renderizarPedidos();
        });
    });
}


/* ============================================================
   CARGAR PEDIDOS DEL NEGOCIO
============================================================ */

async function cargarPedidos() {

    const cargando = document.getElementById("pedidos-cargando");

    try {

        const referencia = query(
            collection(db, "pedidos"),
            where("negocio_id", "==", negocioActual.id)
        );

        const resultado = await getDocs(referencia);

        pedidos = resultado.docs.map(d => ({ id: d.id, ...d.data() }));

        // Más recientes primero
        pedidos.sort((a, b) => {
            const fechaA = a.fecha?.toMillis ? a.fecha.toMillis() : 0;
            const fechaB = b.fecha?.toMillis ? b.fecha.toMillis() : 0;
            return fechaB - fechaA;
        });

        cargando.style.display = "none";

        renderizarPedidos();

    } catch (error) {
        console.error("❌ Error cargando pedidos:", error);
        cargando.textContent = "No se pudieron cargar los pedidos.";
    }
}


/* ============================================================
   RENDERIZAR SEGÚN FILTRO
============================================================ */

function renderizarPedidos() {

    const lista = document.getElementById("lista-pedidos-admin");
    const sinPedidos = document.getElementById("sin-pedidos");
    const plantilla = document.getElementById("plantilla-pedido-admin");

    const filtrados = filtroEstado === "todos"
        ? pedidos
        : pedidos.filter(p => (p.estado || "Pendiente") === filtroEstado);

    lista.innerHTML = "";

    if (filtrados.length === 0) {
        lista.style.display = "none";
        sinPedidos.style.display = "block";
        return;
    }

    sinPedidos.style.display = "none";
    lista.style.display = "block";

    filtrados.forEach(pedido => {
        lista.appendChild(crearTarjetaPedido(pedido, plantilla));
    });
}


/* ============================================================
   CREAR TARJETA DE PEDIDO
============================================================ */

function crearTarjetaPedido(pedido, plantilla) {

    const nodo = plantilla.content.cloneNode(true);

    const estado = pedido.estado || "Pendiente";

    nodo.querySelector('[data-campo="id"]').textContent = `#${pedido.id}`;

    const estadoEl = nodo.querySelector('[data-campo="estado"]');
    estadoEl.textContent = estado;
    estadoEl.className = `pedido-estado estado-${estado.toLowerCase()}`;

    nodo.querySelector('[data-campo="cliente"]').textContent = pedido.cliente_id || "-";

    const fechaEl = nodo.querySelector('[data-campo="fecha"]');
    fechaEl.textContent = pedido.fecha?.toDate
        ? pedido.fecha.toDate().toLocaleString("es-PE")
        : "Fecha no disponible";

    // Detalle de productos
    const detalleEl = nodo.querySelector('[data-campo="detalle"]');
    const plantillaProducto = document.getElementById("plantilla-producto-pedido-admin");

    (pedido.detalle_pedido || []).forEach(item => {

        const nodoItem = plantillaProducto.content.cloneNode(true);

        nodoItem.querySelector('[data-campo="nombre"]').textContent = item.nombre || "Producto";
        nodoItem.querySelector('[data-campo="cantidad"]').textContent = `x${item.cantidad || 0}`;
        nodoItem.querySelector('[data-campo="subtotal"]').textContent =
            `S/ ${Number(item.subtotal || 0).toFixed(2)}`;

        detalleEl.appendChild(nodoItem);
    });

    nodo.querySelector('[data-campo="total"]').textContent =
        `S/ ${Number(pedido.total || 0).toFixed(2)}`;

    // Acciones según estado actual
    const accionesEl = nodo.querySelector('[data-campo="acciones"]');
    agregarAcciones(accionesEl, pedido, estado);

    return nodo;
}


/* ============================================================
   ACCIONES SEGÚN ESTADO
============================================================ */

function agregarAcciones(contenedor, pedido, estado) {

    contenedor.innerHTML = "";

    if (estado === "Pendiente") {
        contenedor.appendChild(
            crearBoton("Marcar en preparación", () => cambiarEstado(pedido.id, "Preparando"))
        );
        contenedor.appendChild(
            crearBoton("Cancelar", () => cambiarEstado(pedido.id, "Cancelado"), true)
        );
    }

    else if (estado === "Preparando") {
        contenedor.appendChild(
            crearBoton("Marcar como listo", () => cambiarEstado(pedido.id, "Listo"))
        );
        contenedor.appendChild(
            crearBoton("Cancelar", () => cambiarEstado(pedido.id, "Cancelado"), true)
        );
    }

    else if (estado === "Listo") {
        contenedor.appendChild(
            crearBoton("✅ Completar venta", () => completarVenta(pedido.id))
        );
        contenedor.appendChild(
            crearBoton("Cancelar", () => cambiarEstado(pedido.id, "Cancelado"), true)
        );
    }

    // Entregado y Cancelado no tienen acciones (estado final)
}

function crearBoton(texto, accion, esPeligroso = false) {

    const boton = document.createElement("button");
    boton.type = "button";
    boton.textContent = texto;
    boton.className = esPeligroso ? "btn-eliminar" : "btn-editar";

    boton.addEventListener("click", async () => {
        boton.disabled = true;
        await accion();
    });

    return boton;
}


/* ============================================================
   CAMBIAR ESTADO (Preparando / Listo / Cancelado)
============================================================ */

async function cambiarEstado(pedidoId, nuevoEstado) {

    try {
        await updateDoc(doc(db, "pedidos", pedidoId), { estado: nuevoEstado });
        await cargarPedidos();
    } catch (error) {
        console.error("❌ Error cambiando estado:", error);
        alert("No se pudo actualizar el pedido.");
    }
}


/* ============================================================
   COMPLETAR VENTA (descuenta stock + crea venta + Entregado)
============================================================ */

async function completarVenta(pedidoId) {

    try {
        await registrarVenta(pedidoId);
        await cargarPedidos();
    } catch (error) {
        console.error("❌ Error completando venta:", error);
        alert(error.message || "No se pudo completar la venta.");
    }
}


/* ============================================================
   EJECUTAR
============================================================ */

iniciar();