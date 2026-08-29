// js/admin-dashboard.js
import {
    collection,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import { db } from "./firebase.js";
import { protegerPanelAdmin } from "./admin-guard.js";
import { renderSidebar } from "./admin-sidebar.js";
import { obtenerMovimientos } from "./inventario.js";

const STOCK_BAJO_UMBRAL = 5;
const MOVIMIENTOS_RECIENTES_MAX = 8;


async function iniciar() {

    const { usuario, negocio } = await protegerPanelAdmin();

    document.getElementById("admin-cargando").style.display = "none";
    document.getElementById("admin-contenido").style.display = "flex";

    document.getElementById("admin-nombre-negocio").textContent = `🏪 ${negocio.nombre}`;
    document.getElementById("admin-usuario-nombre").textContent = usuario.nombre || "Administrador";

    renderSidebar(negocio, "dashboard");
    aplicarBannerNegocio(negocio);

    await cargarResumen(negocio.id);
}

iniciar();


/* ============================================================
   BANNER — portada del negocio en el header grande.
   Misma estructura para cualquier negocio: si tiene portada
   subida en Configuración, se usa como imagen de fondo; si no,
   cae a un color plano con su color principal.
============================================================ */

function aplicarBannerNegocio(negocio) {

    const banner = document.getElementById("admin-banner");
    if (!banner) return;

    // Color de marca de respaldo: se ve mientras carga la imagen
    // o si el negocio todavía no subió portada.
    banner.style.backgroundColor = negocio?.colores?.primario || "#1F5C4A";

    if (negocio?.banner) {
        banner.style.backgroundImage = `url(${negocio.banner})`;
        banner.classList.remove("admin-banner--sin-imagen");
    } else {
        banner.style.backgroundImage = "none";
        banner.classList.add("admin-banner--sin-imagen");
    }
}


/* ============================================================
   CARGAR RESUMEN (ventas de hoy, pedidos pendientes,
   productos, stock bajo, movimientos de inventario)
============================================================ */

async function cargarResumen(negocioId) {

    try {

        const [productos, pedidos, ventas, movimientos] = await Promise.all([
            obtenerColeccionDelNegocio("productos", negocioId),
            obtenerColeccionDelNegocio("pedidos", negocioId),
            obtenerColeccionDelNegocio("ventas", negocioId),
            obtenerMovimientos(negocioId)
        ]);

        actualizarStatProductos(productos);
        actualizarStatPedidos(pedidos);
        actualizarStatVentasHoy(ventas);
        actualizarTablaMovimientos(movimientos, productos);

    } catch (error) {
        console.error("❌ Error cargando el resumen del dashboard:", error);
    }
}


async function obtenerColeccionDelNegocio(nombreColeccion, negocioId) {

    const referencia = query(
        collection(db, nombreColeccion),
        where("negocio_id", "==", negocioId)
    );

    const resultado = await getDocs(referencia);

    return resultado.docs.map(d => ({ id: d.id, ...d.data() }));
}


function actualizarStatProductos(productos) {

    document.getElementById("stat-productos-activos").textContent = productos.length;

    const stockBajo = productos.filter(
        producto => Number(producto.stock || 0) <= STOCK_BAJO_UMBRAL
    ).length;

    document.getElementById("stat-stock-bajo").textContent = stockBajo;
}


function actualizarStatPedidos(pedidos) {

    const pendientes = pedidos.filter(
        pedido => (pedido.estado || "Pendiente") === "Pendiente"
    ).length;

    document.getElementById("stat-pedidos-pendientes").textContent = pendientes;

    const descripcion = document.getElementById("accion-pedidos-desc");

    descripcion.textContent = pendientes > 0
        ? `${pendientes} pedido${pendientes === 1 ? "" : "s"} esperando confirmación`
        : "No hay pedidos pendientes";
}


function actualizarStatVentasHoy(ventas) {

    const inicioDeHoy = new Date();
    inicioDeHoy.setHours(0, 0, 0, 0);

    const totalHoy = ventas
        .filter(venta => {
            const fechaMs = venta.fecha?.toMillis ? venta.fecha.toMillis() : 0;
            return fechaMs >= inicioDeHoy.getTime();
        })
        .reduce((suma, venta) => suma + Number(venta.total || 0), 0);

    document.getElementById("stat-ventas-hoy").textContent = `S/ ${totalHoy.toFixed(2)}`;
}


/* ============================================================
   TABLA DE MOVIMIENTOS DE INVENTARIO RECIENTES
============================================================ */

function actualizarTablaMovimientos(movimientos, productos) {

    const lista = document.getElementById("lista-movimientos-dashboard");
    if (!lista) return;

    const recientes = [...movimientos]
        .sort((a, b) => {
            const fechaA = a.fecha?.toMillis ? a.fecha.toMillis() : 0;
            const fechaB = b.fecha?.toMillis ? b.fecha.toMillis() : 0;
            return fechaB - fechaA;
        })
        .slice(0, MOVIMIENTOS_RECIENTES_MAX);

    lista.innerHTML = "";

    if (recientes.length === 0) {
        lista.innerHTML = `<tr><td colspan="5">Aún no hay movimientos registrados.</td></tr>`;
        return;
    }

    recientes.forEach(mov => {
        lista.appendChild(crearFilaMovimiento(mov, productos));
    });
}


function crearFilaMovimiento(mov, productos) {

    const producto = productos.find(p => p.id === mov.producto_id);
    const nombreProducto = producto?.nombre || mov.producto_id || "-";

    const fecha = mov.fecha?.toDate
        ? mov.fecha.toDate().toLocaleString("es-PE")
        : "-";

    const esEntrada = mov.tipo === "entrada";

    const fila = document.createElement("tr");

    fila.innerHTML = `
        <td>${fecha}</td>
        <td>${nombreProducto}</td>
        <td class="${esEntrada ? "mov-entrada" : "mov-salida"}">${esEntrada ? "➕ Entrada" : "➖ Salida"}</td>
        <td>${mov.cantidad ?? "-"}</td>
        <td>${mov.motivo || "-"}</td>
    `;

    return fila;
}