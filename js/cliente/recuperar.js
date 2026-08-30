import { enviarRecuperacion } from "../services/auth.js";

const formulario = document.getElementById("form-recuperar");
const botonRecuperar = document.getElementById("btn-recuperar");
const errorBox = document.getElementById("recuperar-error");
const exitoBox = document.getElementById("recuperar-exito");

function mostrarError(mensaje) {
    exitoBox.style.display = "none";
    errorBox.textContent = mensaje;
    errorBox.style.display = "block";
}

function mostrarExito() {
    errorBox.style.display = "none";
    exitoBox.textContent = "Si el correo existe, te enviamos un enlace para restablecer tu contraseña.";
    exitoBox.style.display = "block";
}

formulario.addEventListener("submit", async (evento) => {

    evento.preventDefault();

    errorBox.style.display = "none";
    exitoBox.style.display = "none";

    botonRecuperar.disabled = true;
    botonRecuperar.textContent = "Enviando...";

    const correo = document.getElementById("correo").value.trim();

    try {

        const resultado = await enviarRecuperacion(correo);

        if (!resultado.correcto) {
            mostrarError(resultado.mensaje);
            return;
        }

        mostrarExito();
        formulario.reset();

    } catch (error) {
        console.error("❌ Error en recuperación:", error);
        mostrarError("Ocurrió un error al enviar el enlace.");

    } finally {
        botonRecuperar.disabled = false;
        botonRecuperar.textContent = "Enviar enlace →";
    }

});