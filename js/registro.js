import {
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import { db } from "./firebase.js";
import { registrarUsuarioAuth, revertirRegistro } from "./auth.js";
import { generarSlug, verificarSlugDisponible, crearNegocio } from "./negocios.js";
import { validarArchivoImagen, validarUrlImagen, subirLogoNegocio } from "./imagenes.js";


/* =====================================================
   ELEMENTOS
===================================================== */

const formulario = document.getElementById("form-registro");
const botonRegistro = document.getElementById("btn-registro");
const errorBox = document.getElementById("registro-error");

const inputNombreDuenio = document.getElementById("nombre-duenio");
const inputCorreo = document.getElementById("correo");
const inputContrasena = document.getElementById("contrasena");
const inputConfirmar = document.getElementById("confirmar-contrasena");
const inputNombreTienda = document.getElementById("nombre-tienda");
const inputDireccion = document.getElementById("direccion");
const inputHorario = document.getElementById("horario");

const tarjetasPlan = document.querySelectorAll(".plan-card");
const inputPlan = document.getElementById("plan-elegido");

const botonesTabLogo = document.querySelectorAll(".logo-tab");
const modoArchivo = document.getElementById("logo-modo-archivo");
const modoUrl = document.getElementById("logo-modo-url");
const inputLogoArchivo = document.getElementById("logo-archivo");
const inputLogoUrl = document.getElementById("logo-url");
const logoPreview = document.getElementById("logo-preview");

let modoLogoActual = "archivo";


/* =====================================================
   PESTAÑAS DE LOGO: archivo / URL
===================================================== */

botonesTabLogo.forEach((boton) => {
    boton.addEventListener("click", () => {

        modoLogoActual = boton.dataset.modo;

        botonesTabLogo.forEach((b) => b.classList.toggle("on", b === boton));

        modoArchivo.style.display = modoLogoActual === "archivo" ? "block" : "none";
        modoUrl.style.display = modoLogoActual === "url" ? "block" : "none";

        logoPreview.style.display = "none";
        logoPreview.src = "";
    });
});

inputLogoArchivo.addEventListener("change", () => {

    const archivo = inputLogoArchivo.files[0];
    if (!archivo) return;

    const validacion = validarArchivoImagen(archivo);
    if (!validacion.valido) {
        mostrarError(validacion.mensaje);
        inputLogoArchivo.value = "";
        return;
    }

    ocultarError();
    logoPreview.src = URL.createObjectURL(archivo);
    logoPreview.style.display = "block";
});

inputLogoUrl.addEventListener("input", () => {

    const url = inputLogoUrl.value.trim();

    if (!url) {
        logoPreview.style.display = "none";
        return;
    }

    logoPreview.src = url;
    logoPreview.style.display = "block";
});


/* =====================================================
   PRESELECCIONAR PLAN DESDE ?plan=
===================================================== */

function preseleccionarPlan() {

    const params = new URLSearchParams(window.location.search);
    const planUrl = params.get("plan");

    const planesValidos = ["basico", "pro", "premium"];
    const planInicial = planesValidos.includes(planUrl) ? planUrl : "basico";

    seleccionarPlan(planInicial);
}

function seleccionarPlan(plan) {

    inputPlan.value = plan;

    tarjetasPlan.forEach((tarjeta) => {
        tarjeta.classList.toggle("on", tarjeta.dataset.plan === plan);
    });
}

tarjetasPlan.forEach((tarjeta) => {
    tarjeta.addEventListener("click", () => {
        seleccionarPlan(tarjeta.dataset.plan);
    });
});

preseleccionarPlan();


/* =====================================================
   HELPERS DE UI
===================================================== */

function mostrarError(mensaje) {
    errorBox.textContent = mensaje;
    errorBox.style.display = "block";
}

function ocultarError() {
    errorBox.style.display = "none";
}

function bloquearFormulario(bloqueado, textoBoton) {
    botonRegistro.disabled = bloqueado;
    botonRegistro.textContent = textoBoton;
}


/* =====================================================
   ENVÍO DEL FORMULARIO
===================================================== */

formulario.addEventListener("submit", async (evento) => {

    evento.preventDefault();
    ocultarError();

    const nombreDuenio = inputNombreDuenio.value.trim();
    const correo = inputCorreo.value.trim();
    const contrasena = inputContrasena.value;
    const confirmar = inputConfirmar.value;
    const nombreTienda = inputNombreTienda.value.trim();
    const direccion = inputDireccion.value.trim();
    const horario = inputHorario.value.trim();
    const plan = inputPlan.value;

    // Validaciones de formulario
    if (contrasena.length < 6) {
        mostrarError("La contraseña debe tener al menos 6 caracteres.");
        return;
    }

    if (contrasena !== confirmar) {
        mostrarError("Las contraseñas no coinciden.");
        return;
    }

    if (!nombreTienda) {
        mostrarError("Ingresa el nombre de tu tienda.");
        return;
    }

    bloquearFormulario(true, "Verificando disponibilidad...");

    // 1. Generar y verificar el slug ANTES de crear la cuenta,
    //    para no dejar cuentas huérfanas por un slug repetido.
    const slug = generarSlug(nombreTienda);

    if (!slug) {
        mostrarError("El nombre de la tienda no es válido.");
        bloquearFormulario(false, "Crear mi tienda →");
        return;
    }

    const slugDisponible = await verificarSlugDisponible(slug);

    if (!slugDisponible) {
        mostrarError("Ya existe una tienda con un nombre muy similar. Prueba con otro nombre.");
        bloquearFormulario(false, "Crear mi tienda →");
        return;
    }

    // 2. Crear la cuenta en Firebase Auth
    bloquearFormulario(true, "Creando tu cuenta...");

    const resultadoAuth = await registrarUsuarioAuth(correo, contrasena);

    if (!resultadoAuth.correcto) {
        mostrarError(resultadoAuth.mensaje);
        bloquearFormulario(false, "Crear mi tienda →");
        return;
    }

    const usuario = resultadoAuth.usuario;

    // 3. Crear negocio + usuario en Firestore. Si algo falla acá,
    //    revertimos la cuenta de Auth para no dejarla huérfana.
    try {

        // 3a. Resolver el logo, si el usuario puso uno.
        let logoUrl = "";

        if (modoLogoActual === "archivo" && inputLogoArchivo.files[0]) {

            bloquearFormulario(true, "Subiendo logo...");
            logoUrl = await subirLogoNegocio(inputLogoArchivo.files[0], usuario.uid);

        } else if (modoLogoActual === "url" && inputLogoUrl.value.trim()) {

            const url = inputLogoUrl.value.trim();
            const validacionUrl = validarUrlImagen(url);

            if (!validacionUrl.valido) {
                throw new Error(validacionUrl.mensaje);
            }

            logoUrl = url;
        }

        bloquearFormulario(true, "Creando tu tienda...");

        const negocioId = await crearNegocio({
            nombre: nombreTienda,
            slug,
            direccion,
            horario,
            plan,
            ownerUid: usuario.uid,
            logoUrl
        });

        await setDoc(doc(db, "usuarios", usuario.uid), {
            nombre: nombreDuenio,
            correo,
            rol: "admin",
            activo: true,
            negocio_id: negocioId,
            creadoEn: serverTimestamp()
        });

        // Todo listo → al panel administrativo
        window.location.href = "admin/index.html";

    } catch (error) {

        console.error("❌ Error creando negocio/usuario:", error);

        await revertirRegistro(usuario);

        mostrarError(error.message || "Ocurrió un problema creando tu tienda. Intenta de nuevo.");
        bloquearFormulario(false, "Crear mi tienda →");
    }

});