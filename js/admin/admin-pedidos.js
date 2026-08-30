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
   ACTUALIZAR CONTADORES EN LOS CHIPS DE FILTRO
   Muestra cuántos pedidos hay en cada estado, ej:
   "Pendiente (3)", para que el admin vea de un vistazo
   dónde necesita actuar sin tener que hacer clic en cada chip.
============================================================ */

function actualizarContadoresChips() {

    const botones = document.querySelectorAll("#filtro-estados .chip");

    botones.forEach(boton => {

        const estado = boton.dataset.estado;
        const etiquetaBase = boton.dataset.etiquetaBase || boton.textContent.trim();

        // Guardamos la etiqueta original la primera vez, para no
        // ir acumulando "(3) (3) (3)" en cada re-render.
        if (!boton.dataset.etiquetaBase) {
            boton.dataset.etiquetaBase = etiquetaBase;
        }

        const cantidad = estado === "todos"
            ? pedidos.length
            : pedidos.filter(p => (p.estado || "Pendiente") === estado).length;

        boton.textContent = cantidad > 0
            ? `${boton.dataset.etiquetaBase} (${cantidad})`
            : boton.dataset.etiquetaBase;
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

        actualizarContadoresChips();

        renderizarPedidos();

    } catch (error) {
        console.error("❌ Error cargando pedidos:", error);
        cargando.textContent = "No se pudieron cargar los pedidos.";
    }
}


/* ============================================================
   ORDEN DE PRIORIDAD VISUAL
   Dentro de un mismo filtro, los pedidos que requieren acción
   del admin (Pendiente, Preparando, Listo) se muestran antes
   que los que ya están cerrados (Entregado, Cancelado), para
   que lo urgente salte a la vista primero.
============================================================ */

const PRIORIDAD_ESTADO = {
    "Pendiente": 0,
    "Preparando": 1,
    "Listo": 2,
    "Entregado": 3,
    "Cancelado": 4
};


/* ============================================================
   RENDERIZAR SEGÚN FILTRO
============================================================ */

function renderizarPedidos() {

    const lista = document.getElementById("lista-pedidos-admin");
    const sinPedidos = document.getElementById("sin-pedidos");
    const plantilla = document.getElementById("plantilla-pedido-admin");

    let filtrados = filtroEstado === "todos"
        ? [...pedidos]
        : pedidos.filter(p => (p.estado || "Pendiente") === filtroEstado);

    // Solo reordenamos por prioridad cuando se ven "todos" los
    // estados juntos; dentro de un filtro específico se respeta
    // el orden por fecha que ya trae el arreglo.
    if (filtroEstado === "todos") {
        filtrados.sort((a, b) => {
            const prioridadA = PRIORIDAD_ESTADO[a.estado || "Pendiente"] ?? 9;
            const prioridadB = PRIORIDAD_ESTADO[b.estado || "Pendiente"] ?? 9;
            return prioridadA - prioridadB;
        });
    }

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

    /* ------------------------------------------------------
       NÚMERO DE PEDIDO CORTO
       #0001, #0002... en vez del ID largo de Firestore.
       Los pedidos creados antes de este cambio no tienen
       numero_pedido, así que muestran un ID corto como respaldo.
    ------------------------------------------------------ */

    const idEl = nodo.querySelector('[data-campo="id"]');

    idEl.textContent = pedido.numero_pedido
        ? `#${String(pedido.numero_pedido).padStart(4, "0")}`
        : `#${pedido.id.slice(0, 6).toUpperCase()}`;

    const estadoEl = nodo.querySelector('[data-campo="estado"]');
    estadoEl.textContent = estado;
    estadoEl.className = `pedido-estado estado-${estado.toLowerCase()}`;

    /* ------------------------------------------------------
       CLIENTE (versión corta y legible del UID anónimo)
    ------------------------------------------------------ */

    const clienteEl = nodo.querySelector('[data-campo="cliente"]');

    clienteEl.textContent = pedido.cliente_id
        ? `Cliente #${pedido.cliente_id.slice(0, 6).toUpperCase()}`
        : "-";

    const fechaEl = nodo.querySelector('[data-campo="fecha"]');
    fechaEl.textContent = pedido.fecha?.toDate
        ? pedido.fecha.toDate().toLocaleString("es-PE")
        : "Fecha no disponible";

    // Marca visual: si el pedido lleva más de 20 minutos en
    // "Pendiente" sin atenderse, resaltamos la tarjeta completa
    // para que el admin lo note de inmediato.
    const article = nodo.querySelector(".pedido-card");
    if (estado === "Pendiente" && pedido.fecha?.toMillis) {
        const minutosEsperando = (Date.now() - pedido.fecha.toMillis()) / 60000;
        if (minutosEsperando > 20) {
            article.classList.add("pedido-urgente");
        }
    }

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