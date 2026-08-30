import { iniciarSesion } from "../services/auth.js";
import { obtenerUsuario } from "../services/usuarios.js";

const formulario = document.getElementById("form-login");
const botonLogin = document.getElementById("btn-login");
const errorBox = document.getElementById("login-error");

function mostrarError(mensaje) {
    errorBox.textContent = mensaje;
    errorBox.style.display = "block";
}

formulario.addEventListener("submit", async (evento) => {

    evento.preventDefault();

    errorBox.style.display = "none";
    botonLogin.disabled = true;
    botonLogin.textContent = "Ingresando...";

    const correo = document.getElementById("correo").value.trim();
    const contrasena = document.getElementById("contrasena").value;

    try {

        const resultado = await iniciarSesion(correo, contrasena);

        if (!resultado.correcto) {
            mostrarError(resultado.mensaje);
            return;
        }

        const usuario = await obtenerUsuario(resultado.usuario.uid);

        if (!usuario) {
            mostrarError("Tu cuenta no tiene un perfil asociado. Contacta al administrador.");
            return;
        }

        if (!usuario.activo) {
            mostrarError("Tu cuenta está deshabilitada.");
            return;
        }

        // Todo correcto → al dashboard
        window.location.href = "index.html";

    } catch (error) {
        console.error("❌ Error en login:", error);
        mostrarError("Ocurrió un error al iniciar sesión.");

    } finally {
        botonLogin.disabled = false;
        botonLogin.textContent = "Ingresar →";
    }

});