// js/admin-dashboard.js
import { protegerPanelAdmin } from "./admin-guard.js";
import { cerrarSesion } from "./auth.js";

async function iniciar() {

    const { usuario, negocio } = await protegerPanelAdmin();

    document.getElementById("admin-cargando").style.display = "none";
    document.getElementById("admin-contenido").style.display = "block";

    document.getElementById("admin-nombre-negocio").textContent = `🏪 ${negocio.nombre}`;
    document.getElementById("admin-usuario-nombre").textContent = usuario.nombre || "Administrador";

    document.getElementById("btn-cerrar-sesion").addEventListener("click", async () => {
        await cerrarSesion();
        window.location.href = "login.html";
    });
}

iniciar();