import {
    collection,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import { db, firebaseConfig } from "./firebase.js";
import { protegerPanelAdmin } from "./admin-guard.js";
import { cerrarSesion } from "./auth.js";
import { crearUsuario, actualizarUsuario } from "./usuarios.js";


let negocioActual = null;
let usuarioActualUid = null;   // el admin que está logueado ahora
let usuarios = [];


/* ============================================================
   INICIAR
============================================================ */

async function iniciar() {

    const { usuario, usuarioAuth, negocio } = await protegerPanelAdmin();

    negocioActual = negocio;
    usuarioActualUid = usuarioAuth.uid;

    document.getElementById("admin-cargando").style.display = "none";
    document.getElementById("admin-contenido").style.display = "block";
    document.getElementById("admin-nombre-negocio").textContent = `🏪 ${negocio.nombre}`;

    document.getElementById("btn-cerrar-sesion").addEventListener("click", async () => {
        await cerrarSesion();
        window.location.href = "login.html";
    });

    document.getElementById("btn-nuevo-usuario").addEventListener("click", () => abrirModal());
    document.getElementById("btn-cancelar-usuario").addEventListener("click", cerrarModal);
    document.getElementById("form-usuario").addEventListener("submit", guardarUsuario);

    await cargarUsuarios();
}


/* ============================================================
   CARGAR USUARIOS DEL NEGOCIO
============================================================ */

async function cargarUsuarios() {

    const cargando = document.getElementById("usuarios-cargando");
    const tabla = document.getElementById("tabla-usuarios");
    const lista = document.getElementById("lista-usuarios");

    try {

        const referencia = query(
            collection(db, "usuarios"),
            where("negocio_id", "==", negocioActual.id)
        );

        const resultado = await getDocs(referencia);

        usuarios = resultado.docs.map(d => ({ id: d.id, ...d.data() }));

        cargando.style.display = "none";
        tabla.style.display = "table";
        lista.innerHTML = "";

        usuarios.forEach(usuario => {
            lista.appendChild(crearFila(usuario));
        });

    } catch (error) {
        console.error("❌ Error cargando usuarios:", error);
        cargando.textContent = "No se pudieron cargar los usuarios.";
    }
}


/* ============================================================
   CREAR FILA
============================================================ */

function crearFila(usuario) {

    const fila = document.createElement("tr");

    const esUsuarioActual = usuario.id === usuarioActualUid;

    fila.innerHTML = `
        <td>${usuario.nombre || "Sin nombre"} ${esUsuarioActual ? "(tú)" : ""}</td>
        <td>${usuario.correo || "-"}</td>
        <td>${usuario.rol === "admin" ? "Administrador" : "Empleado"}</td>
        <td>${usuario.activo ? "✅ Activo" : "🚫 Inactivo"}</td>
        <td>
            <button class="btn-editar" type="button">Editar</button>
        </td>
    `;

    fila.querySelector(".btn-editar")
        .addEventListener("click", () => abrirModal(usuario));

    return fila;
}


/* ============================================================
   ABRIR / CERRAR MODAL
============================================================ */

function abrirModal(usuario = null) {

    document.getElementById("modal-usuario").style.display = "flex";
    document.getElementById("usuario-error").style.display = "none";

    document.getElementById("modal-usuario-titulo").textContent =
        usuario ? "Editar usuario" : "Nuevo usuario";

    document.getElementById("usuario-uid").value = usuario?.id || "";
    document.getElementById("usuario-nombre").value = usuario?.nombre || "";
    document.getElementById("usuario-correo").value = usuario?.correo || "";
    document.getElementById("usuario-rol").value = usuario?.rol || "empleado";
    document.getElementById("usuario-activo").checked = usuario?.activo ?? true;

    // La contraseña y el correo solo se piden al CREAR
    const grupoContrasena = document.getElementById("grupo-contrasena");
    const inputContrasena = document.getElementById("usuario-contrasena");
    const inputCorreo = document.getElementById("usuario-correo");

    if (usuario) {
        grupoContrasena.style.display = "none";
        inputContrasena.required = false;
        inputCorreo.disabled = true;   // no se puede cambiar el correo desde aquí
    } else {
        grupoContrasena.style.display = "block";
        inputContrasena.required = true;
        inputContrasena.value = "";
        inputCorreo.disabled = false;
    }
}

function cerrarModal() {
    document.getElementById("modal-usuario").style.display = "none";
}


/* ============================================================
   GUARDAR (CREAR O EDITAR)
============================================================ */

async function guardarUsuario(evento) {

    evento.preventDefault();

    const errorBox = document.getElementById("usuario-error");
    errorBox.style.display = "none";

    const uid = document.getElementById("usuario-uid").value;
    const nombre = document.getElementById("usuario-nombre").value.trim();
    const correo = document.getElementById("usuario-correo").value.trim();
    const contrasena = document.getElementById("usuario-contrasena").value;
    const rol = document.getElementById("usuario-rol").value;
    const activo = document.getElementById("usuario-activo").checked;

    if (!nombre) {
        errorBox.textContent = "El nombre es obligatorio.";
        errorBox.style.display = "block";
        return;
    }

    const boton = document.getElementById("btn-guardar-usuario");
    boton.disabled = true;
    boton.textContent = "Guardando...";

    try {

        if (uid) {
            // ================= EDITAR =================
            // No se puede tocar el propio rol/estado desde aquí para evitar
            // que un admin se bloquee a sí mismo por accidente.
            if (uid === usuarioActualUid) {
                await actualizarUsuario(uid, { nombre });
            } else {
                await actualizarUsuario(uid, { nombre, rol, activo });
            }

        } else {
            // ================= CREAR =================

            if (!contrasena || contrasena.length < 6) {
                throw new Error("La contraseña debe tener al menos 6 caracteres.");
            }

            const nuevoUid = await crearUsuarioAuthSinCerrarSesion(correo, contrasena);

            await crearUsuario(nuevoUid, {
                nombre,
                correo,
                rol,
                negocio_id: negocioActual.id,
                activo
            });
        }

        cerrarModal();
        await cargarUsuarios();

    } catch (error) {
        console.error("❌ Error guardando usuario:", error);
        errorBox.textContent = traducirError(error);
        errorBox.style.display = "block";

    } finally {
        boton.disabled = false;
        boton.textContent = "Guardar";
    }
}


/* ============================================================
   CREAR USUARIO EN AUTH SIN CERRAR LA SESIÓN DEL ADMIN
   (usa una instancia secundaria de Firebase que se descarta después)
============================================================ */

async function crearUsuarioAuthSinCerrarSesion(correo, contrasena) {

    const appSecundaria = initializeApp(firebaseConfig, "AppSecundariaCrearUsuario");
    const authSecundaria = getAuth(appSecundaria);

    try {

        const resultado = await createUserWithEmailAndPassword(
            authSecundaria,
            correo,
            contrasena
        );

        const uid = resultado.user.uid;

        await signOut(authSecundaria);

        return uid;

    } finally {
        await deleteApp(appSecundaria);
    }
}


/* ============================================================
   TRADUCIR ERRORES DE FIREBASE AUTH
============================================================ */

function traducirError(error) {

    switch (error.code) {
        case "auth/email-already-in-use":
            return "Ya existe una cuenta con ese correo.";
        case "auth/invalid-email":
            return "El correo no es válido.";
        case "auth/weak-password":
            return "La contraseña es demasiado débil.";
        default:
            return error.message || "No se pudo guardar el usuario.";
    }
}


/* ============================================================
   EJECUTAR
============================================================ */

iniciar();