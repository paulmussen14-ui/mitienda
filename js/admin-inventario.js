import {
    collection,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import { db } from "./firebase.js";
import { protegerPanelAdmin } from "./admin-guard.js";
import { cerrarSesion } from "./auth.js";
import { registrarEntrada, registrarSalida, obtenerMovimientos } from "./inventario.js";


let negocioActual = null;
let productos = [];


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

    document.getElementById("btn-cancelar-movimiento")
        .addEventListener("click", cerrarModal);

    document.getElementById("form-movimiento")
        .addEventListener("submit", guardarMovimiento);

    await cargarStock();
    await cargarMovimientos();
}


/* ============================================================
   CARGAR STOCK (productos del negocio)
============================================================ */

async function cargarStock() {

    const cargando = document.getElementById("stock-cargando");
    const tabla = document.getElementById("tabla-stock");
    const lista = document.getElementById("lista-stock");

    try {

        const referencia = query(
            collection(db, "productos"),
            where("negocio_id", "==", negocioActual.id)
        );

        const resultado = await getDocs(referencia);

        productos = resultado.docs.map(d => ({ id: d.id, ...d.data() }));

        cargando.style.display = "none";
        tabla.style.display = "table";
        lista.innerHTML = "";

        productos.forEach(producto => {
            lista.appendChild(crearFilaStock(producto));
        });

    } catch (error) {
        console.error("❌ Error cargando stock:", error);
        cargando.textContent = "No se pudo cargar el stock.";
    }
}


function crearFilaStock(producto) {

    const fila = document.createElement("tr");

    const stock = Number(producto.stock || 0);

    fila.innerHTML = `
        <td>${producto.nombre || "Sin nombre"}</td>
        <td>${producto.categoria || "-"}</td>
        <td class="${stock <= 5 ? "prod-stock bajo" : ""}">${stock}</td>
        <td>
            <button class="btn-editar" type="button" data-accion="entrada">+ Entrada</button>
            <button class="btn-eliminar" type="button" data-accion="salida">− Salida</button>
        </td>
    `;

    fila.querySelector('[data-accion="entrada"]')
        .addEventListener("click", () => abrirModal(producto, "entrada"));

    fila.querySelector('[data-accion="salida"]')
        .addEventListener("click", () => abrirModal(producto, "salida"));

    return fila;
}


/* ============================================================
   ABRIR / CERRAR MODAL DE MOVIMIENTO
============================================================ */

function abrirModal(producto, tipo) {

    document.getElementById("modal-movimiento").style.display = "flex";
    document.getElementById("movimiento-error").style.display = "none";

    document.getElementById("movimiento-producto-id").value = producto.id;
    document.getElementById("movimiento-tipo").value = tipo;
    document.getElementById("movimiento-producto-nombre").textContent =
        `${tipo === "entrada" ? "➕ Entrada" : "➖ Salida"} — ${producto.nombre}`;

    document.getElementById("modal-movimiento-titulo").textContent =
        tipo === "entrada" ? "Registrar entrada" : "Registrar salida";

    document.getElementById("movimiento-cantidad").value = "";
    document.getElementById("movimiento-motivo").value =
        tipo === "entrada" ? "Compra a proveedor" : "Ajuste de inventario";
}

function cerrarModal() {
    document.getElementById("modal-movimiento").style.display = "none";
}


/* ============================================================
   GUARDAR MOVIMIENTO
============================================================ */

async function guardarMovimiento(evento) {

    evento.preventDefault();

    const errorBox = document.getElementById("movimiento-error");
    errorBox.style.display = "none";

    const productoId = document.getElementById("movimiento-producto-id").value;
    const tipo = document.getElementById("movimiento-tipo").value;
    const cantidad = Number(document.getElementById("movimiento-cantidad").value);
    const motivo = document.getElementById("movimiento-motivo").value.trim() || "Sin especificar";

    if (!cantidad || cantidad <= 0) {
        errorBox.textContent = "La cantidad debe ser mayor a 0.";
        errorBox.style.display = "block";
        return;
    }

    try {

        if (tipo === "entrada") {
            await registrarEntrada(productoId, negocioActual.id, cantidad, motivo);
        } else {
            await registrarSalida(productoId, negocioActual.id, cantidad, motivo);
        }

        cerrarModal();
        await cargarStock();
        await cargarMovimientos();

    } catch (error) {
        console.error("❌ Error registrando movimiento:", error);
        errorBox.textContent = error.message || "No se pudo registrar el movimiento.";
        errorBox.style.display = "block";
    }
}


/* ============================================================
   CARGAR HISTORIAL DE MOVIMIENTOS
============================================================ */

async function cargarMovimientos() {

    const cargando = document.getElementById("movimientos-cargando");
    const tabla = document.getElementById("tabla-movimientos");
    const lista = document.getElementById("lista-movimientos");

    try {

        const movimientos = await obtenerMovimientos(negocioActual.id);

        movimientos.sort((a, b) => {
            const fechaA = a.fecha?.toMillis ? a.fecha.toMillis() : 0;
            const fechaB = b.fecha?.toMillis ? b.fecha.toMillis() : 0;
            return fechaB - fechaA;
        });

        cargando.style.display = "none";
        tabla.style.display = "table";
        lista.innerHTML = "";

        movimientos.forEach(mov => {
            lista.appendChild(crearFilaMovimiento(mov));
        });

    } catch (error) {
        console.error("❌ Error cargando movimientos:", error);
        cargando.textContent = "No se pudieron cargar los movimientos.";
    }
}


function crearFilaMovimiento(mov) {

    const fila = document.createElement("tr");

    const producto = productos.find(p => p.id === mov.producto_id);
    const nombreProducto = producto?.nombre || mov.producto_id;

    const fecha = mov.fecha?.toDate
        ? mov.fecha.toDate().toLocaleString("es-PE")
        : "-";

    const esEntrada = mov.tipo === "entrada";

    fila.innerHTML = `
        <td>${fecha}</td>
        <td>${nombreProducto}</td>
        <td>${esEntrada ? "➕ Entrada" : "➖ Salida"}</td>
        <td>${mov.cantidad}</td>
        <td>${mov.motivo || "-"}</td>
    `;
    return fila;
}


/* ============================================================
   EJECUTAR
============================================================ */

iniciar();