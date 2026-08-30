import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDocs,
    query,
    where,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import { db } from "../config/firebase.js";
import { protegerPanelAdmin } from "./admin-guard.js";
import { cerrarSesion } from "../services/auth.js";


let negocioActual = null;
let productos = [];


/* ============================================================
   INICIAR
============================================================ */

async function iniciar() {

    const { usuario, negocio } = await protegerPanelAdmin();

    negocioActual = negocio;

    document.getElementById("admin-cargando").style.display = "none";
    document.getElementById("admin-contenido").style.display = "block";
    document.getElementById("admin-nombre-negocio").textContent = `🏪 ${negocio.nombre}`;

    document.getElementById("btn-cerrar-sesion").addEventListener("click", async () => {
        await cerrarSesion();
        window.location.href = "login.html";
    });

    document.getElementById("btn-nuevo-producto").addEventListener("click", () => abrirModal());
    document.getElementById("btn-cancelar-producto").addEventListener("click", cerrarModal);
    document.getElementById("form-producto").addEventListener("submit", guardarProducto);

    await cargarProductos();
}


/* ============================================================
   CARGAR PRODUCTOS DEL NEGOCIO
============================================================ */

async function cargarProductos() {

    const cargando = document.getElementById("productos-cargando");
    const tabla = document.getElementById("tabla-productos");
    const sinProductos = document.getElementById("sin-productos");
    const lista = document.getElementById("lista-productos-admin");

    try {

        const referencia = query(
            collection(db, "productos"),
            where("negocio_id", "==", negocioActual.id)
        );

        const resultado = await getDocs(referencia);

        productos = resultado.docs.map(d => ({ id: d.id, ...d.data() }));

        cargando.style.display = "none";

        if (productos.length === 0) {
            tabla.style.display = "none";
            sinProductos.style.display = "block";
            return;
        }

        sinProductos.style.display = "none";
        tabla.style.display = "table";
        lista.innerHTML = "";

        productos.forEach(producto => {
            lista.appendChild(crearFila(producto));
        });

    } catch (error) {
        console.error("❌ Error cargando productos:", error);
        cargando.textContent = "No se pudieron cargar los productos.";
    }
}


/* ============================================================
   CREAR FILA DE LA TABLA
============================================================ */

function crearFila(producto) {

    const fila = document.createElement("tr");

    fila.innerHTML = `
        <td>${producto.nombre || "Sin nombre"}</td>
        <td>${producto.categoria || "-"}</td>
        <td>S/ ${Number(producto.precio || 0).toFixed(2)}</td>
        <td>${Number(producto.stock || 0)}</td>
        <td>
            <button class="btn-editar" type="button">Editar</button>
            <button class="btn-eliminar" type="button">Eliminar</button>
        </td>
    `;

    fila.querySelector(".btn-editar")
        .addEventListener("click", () => abrirModal(producto));

    fila.querySelector(".btn-eliminar")
        .addEventListener("click", () => confirmarEliminar(producto));

    return fila;
}


/* ============================================================
   ABRIR / CERRAR MODAL
============================================================ */

function abrirModal(producto = null) {

    document.getElementById("modal-producto").style.display = "flex";
    document.getElementById("producto-error").style.display = "none";

    document.getElementById("modal-titulo").textContent =
        producto ? "Editar producto" : "Nuevo producto";

    document.getElementById("producto-id").value = producto?.id || "";
    document.getElementById("producto-nombre").value = producto?.nombre || "";
    document.getElementById("producto-categoria").value = producto?.categoria || "abarrotes";
    document.getElementById("producto-precio").value = producto?.precio ?? "";
    document.getElementById("producto-stock").value = producto?.stock ?? "";
    document.getElementById("producto-descripcion").value = producto?.descripcion || "";
    document.getElementById("producto-imagen").value = producto?.imagen || "";
}

function cerrarModal() {
    document.getElementById("modal-producto").style.display = "none";
}


/* ============================================================
   GUARDAR (CREAR O EDITAR)
============================================================ */

async function guardarProducto(evento) {

    evento.preventDefault();

    const errorBox = document.getElementById("producto-error");
    errorBox.style.display = "none";

    const id = document.getElementById("producto-id").value;

    const datos = {
        nombre: document.getElementById("producto-nombre").value.trim(),
        categoria: document.getElementById("producto-categoria").value,
        precio: Number(document.getElementById("producto-precio").value),
        stock: Number(document.getElementById("producto-stock").value),
        descripcion: document.getElementById("producto-descripcion").value.trim(),
        imagen: document.getElementById("producto-imagen").value.trim(),
        negocio_id: negocioActual.id
    };

    if (!datos.nombre) {
        errorBox.textContent = "El nombre es obligatorio.";
        errorBox.style.display = "block";
        return;
    }

    if (datos.precio < 0 || datos.stock < 0) {
        errorBox.textContent = "Precio y stock no pueden ser negativos.";
        errorBox.style.display = "block";
        return;
    }

    try {

        if (id) {
            // EDITAR
            await updateDoc(doc(db, "productos", id), datos);
        } else {
            // CREAR
            datos.fecha_creacion = serverTimestamp();
            await addDoc(collection(db, "productos"), datos);
        }

        cerrarModal();
        await cargarProductos();

    } catch (error) {
        console.error("❌ Error guardando producto:", error);
        errorBox.textContent = "No se pudo guardar el producto.";
        errorBox.style.display = "block";
    }
}


/* ============================================================
   ELIMINAR
============================================================ */

async function confirmarEliminar(producto) {

    const confirmado = confirm(
        `¿Eliminar "${producto.nombre}"? Esta acción no se puede deshacer.`
    );

    if (!confirmado) return;

    try {
        await deleteDoc(doc(db, "productos", producto.id));
        await cargarProductos();
    } catch (error) {
        console.error("❌ Error eliminando producto:", error);
        alert("No se pudo eliminar el producto.");
    }
}


/* ============================================================
   EJECUTAR
============================================================ */

iniciar();