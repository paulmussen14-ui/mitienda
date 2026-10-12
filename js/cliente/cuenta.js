import {
    obtenerSesionCliente,
    obtenerPerfilCliente,
    guardarPerfilCliente,
    registrarCliente,
    iniciarSesionCliente,
    cerrarSesionCliente,
    traducirErrorAuth
} from "./auth-cliente.js";

const parametros = new URLSearchParams(window.location.search);

const paneles = {
    cargando: document.getElementById("panel-cargando"),
    acceso: document.getElementById("panel-acceso"),
    completar: document.getElementById("panel-completar"),
    sesion: document.getElementById("panel-sesion")
};

const errorAcceso = document.getElementById("acceso-error");
const errorCompletar = document.getElementById("completar-error");


/* =====================================================
   UTILIDADES
===================================================== */

function mostrarPanel(nombre) {
    Object.entries(paneles).forEach(([clave, panel]) => {
        panel.style.display = clave === nombre ? "" : "none";
    });
}

function mostrarError(caja, mensaje) {
    caja.textContent = mensaje;
    caja.style.display = "block";
}

function ocultarError(caja) {
    caja.style.display = "none";
}

// Solo se acepta volver a páginas del mismo sitio (evita redirecciones a otros dominios).
function destinoVolver() {
    const valor = parametros.get("volver");
    if (!valor) return null;
    try {
        const url = new URL(valor, window.location.href);
        return url.origin === window.location.origin ? url.href : null;
    } catch {
        return null;
    }
}

function normalizarTelefono(texto) {
    const digitos = texto.replace(/[\s-]/g, "");
    return /^\d{9}$/.test(digitos) ? digitos : null;
}

function terminar() {
    const destino = destinoVolver();
    if (destino) {
        window.location.href = destino;
        return;
    }
    iniciar();
}


/* =====================================================
   PESTAÑAS
===================================================== */

document.querySelectorAll(".tab").forEach((boton) => {
    boton.addEventListener("click", () => {

        const crear = boton.dataset.tab === "crear";

        document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("on", b === boton));
        document.getElementById("form-ingresar").style.display = crear ? "none" : "";
        document.getElementById("form-crear").style.display = crear ? "" : "none";
        ocultarError(errorAcceso);
    });
});


/* =====================================================
   INGRESAR
===================================================== */

document.getElementById("form-ingresar").addEventListener("submit", async (evento) => {

    evento.preventDefault();
    ocultarError(errorAcceso);

    const boton = document.getElementById("btn-ingresar");
    boton.disabled = true;
    boton.textContent = "Ingresando...";

    try {

        const correo = document.getElementById("ing-correo").value.trim();
        const contrasena = document.getElementById("ing-contrasena").value;

        const { perfil } = await iniciarSesionCliente(correo, contrasena);

        if (!perfil) {
            mostrarPanel("completar");
            return;
        }

        terminar();

    } catch (error) {
        console.error("❌ Error al ingresar:", error);
        mostrarError(errorAcceso, traducirErrorAuth(error));

    } finally {
        boton.disabled = false;
        boton.textContent = "Ingresar →";
    }
});


/* =====================================================
   CREAR CUENTA
===================================================== */

document.getElementById("form-crear").addEventListener("submit", async (evento) => {

    evento.preventDefault();
    ocultarError(errorAcceso);

    const nombre = document.getElementById("cre-nombre").value.trim();
    const telefono = normalizarTelefono(document.getElementById("cre-telefono").value);
    const correo = document.getElementById("cre-correo").value.trim();
    const contrasena = document.getElementById("cre-contrasena").value;
    const confirmar = document.getElementById("cre-confirmar").value;

    if (nombre.length < 2) {
        mostrarError(errorAcceso, "Escribe tu nombre completo.");
        return;
    }
    if (!telefono) {
        mostrarError(errorAcceso, "El celular debe tener 9 dígitos.");
        return;
    }
    if (contrasena !== confirmar) {
        mostrarError(errorAcceso, "Las contraseñas no coinciden.");
        return;
    }

    const boton = document.getElementById("btn-crear");
    boton.disabled = true;
    boton.textContent = "Creando cuenta...";

    try {

        await registrarCliente({ nombre, telefono, correo, contrasena });
        terminar();

    } catch (error) {
        console.error("❌ Error al crear la cuenta:", error);

        if (error.codigo === "PERFIL_PENDIENTE") {
            document.getElementById("com-nombre").value = nombre;
            document.getElementById("com-telefono").value = telefono;
            mostrarPanel("completar");
            mostrarError(errorCompletar, error.message);
            return;
        }

        mostrarError(errorAcceso, traducirErrorAuth(error));

    } finally {
        boton.disabled = false;
        boton.textContent = "Crear cuenta →";
    }
});


/* =====================================================
   COMPLETAR DATOS
===================================================== */

document.getElementById("form-completar").addEventListener("submit", async (evento) => {

    evento.preventDefault();
    ocultarError(errorCompletar);

    const nombre = document.getElementById("com-nombre").value.trim();
    const telefono = normalizarTelefono(document.getElementById("com-telefono").value);

    if (nombre.length < 2) {
        mostrarError(errorCompletar, "Escribe tu nombre completo.");
        return;
    }
    if (!telefono) {
        mostrarError(errorCompletar, "El celular debe tener 9 dígitos.");
        return;
    }

    const boton = document.getElementById("btn-completar");
    boton.disabled = true;
    boton.textContent = "Guardando...";

    try {

        const usuario = await obtenerSesionCliente();
        await guardarPerfilCliente(usuario.uid, { nombre, telefono, correo: usuario.email || "" });
        terminar();

    } catch (error) {
        console.error("❌ Error al guardar el perfil:", error);
        mostrarError(errorCompletar, "No se pudieron guardar tus datos. Intenta de nuevo.");

    } finally {
        boton.disabled = false;
        boton.textContent = "Guardar →";
    }
});


/* =====================================================
   CERRAR SESIÓN
===================================================== */

document.getElementById("btn-salir").addEventListener("click", async () => {
    try {
        await cerrarSesionCliente();
    } finally {
        window.location.href = "cuenta.html";
    }
});


/* =====================================================
   INICIAR
===================================================== */

async function iniciar() {

    try {

        const usuario = await obtenerSesionCliente();

        if (!usuario || usuario.isAnonymous) {
            document.getElementById("aviso-pedido").style.display =
                parametros.get("motivo") === "pedido" ? "block" : "none";
            mostrarPanel("acceso");
            return;
        }

        const perfil = await obtenerPerfilCliente(usuario.uid);

        if (!perfil) {
            mostrarPanel("completar");
            return;
        }

        document.getElementById("sesion-saludo").textContent = `Hola, ${perfil.nombre} 👋`;
        document.getElementById("sesion-correo").textContent = perfil.correo || usuario.email || "";
        document.getElementById("sesion-telefono").textContent = `📱 ${perfil.telefono}`;

        const destino = destinoVolver();
        if (destino) document.getElementById("btn-continuar").href = destino;

        mostrarPanel("sesion");

    } catch (error) {
        console.error("❌ Error cargando la cuenta:", error);
        mostrarPanel("acceso");
        mostrarError(errorAcceso, "No se pudo cargar tu sesión. Recarga la página.");
    }
}

iniciar();
