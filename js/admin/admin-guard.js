import { observarSesion, cerrarSesion } from "../services/auth.js";
import { obtenerUsuario } from "../services/usuarios.js";
import { obtenerNegocioPorId } from "../services/negocios.js";


/**
 * Llamar al inicio de CADA página del panel admin.
 * Devuelve { usuarioAuth, usuario, negocio } cuando todo es válido,
 * o redirige a login.html si algo falla.
 */
export function protegerPanelAdmin() {

    return new Promise((resolve) => {

        observarSesion(async (usuarioAuth) => {

            if (!usuarioAuth) {
                window.location.href = "login.html";
                return;
            }

            try {

                const usuario = await obtenerUsuario(usuarioAuth.uid);

                if (!usuario) {
                    alert("No se encontró tu perfil de usuario.");
                    await cerrarSesion();
                    window.location.href = "login.html";
                    return;
                }

                if (!usuario.activo) {
                    alert("Tu cuenta está deshabilitada.");
                    await cerrarSesion();
                    window.location.href = "login.html";
                    return;
                }

                const negocio = await obtenerNegocioPorId(usuario.negocio_id);

                if (!negocio) {
                    alert("Tu usuario no está asociado a ninguna tienda.");
                    await cerrarSesion();
                    window.location.href = "login.html";
                    return;
                }

                resolve({ usuarioAuth, usuario, negocio });

            } catch (error) {
                console.error("❌ Error validando sesión admin:", error);
                window.location.href = "login.html";
            }

        });

    });
}