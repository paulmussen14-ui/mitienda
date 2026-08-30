import { obtenerNegocioActual, obtenerIniciales } from "./negocios.js";


/* =====================================================
   ¿ES UNA IMAGEN VÁLIDA?
===================================================== */

function esImagenValida(valor) {
    return typeof valor === "string" && valor.trim() !== "" && valor.trim() !== '""';
}


/* =====================================================
   RENDERIZAR INDICADOR DE TIENDA
   Muestra qué tienda se está viendo (recordada en este
   navegador o pasada por ?negocio=) y un enlace para
   cambiarla. Se inserta antes del <main> de la página.
===================================================== */

export async function renderTiendaIndicador() {

    const contenedor = document.getElementById("tienda-indicador");

    if (!contenedor) return;

    try {

        const negocio = await obtenerNegocioActual();

        if (!negocio) {
            contenedor.style.display = "none";
            return;
        }

        const nombre = negocio.nombre || "Tienda";

        let logoHtml = `<span class="ti-logo-iniciales">${obtenerIniciales(nombre)}</span>`;

        if (esImagenValida(negocio.logo)) {
            logoHtml = `<img src="${negocio.logo}" alt="${nombre}" class="ti-logo-img">`;
        }

        contenedor.innerHTML = `
            <div class="ti-inner">
                <div class="ti-tienda">
                    ${logoHtml}
                    <span class="ti-texto">
                        Viendo <strong>${nombre}</strong>
                    </span>
                </div>
                <a class="ti-cambiar" href="tienda.html">
                    Cambiar tienda
                </a>
            </div>
        `;

    } catch (error) {

        console.error("❌ Error cargando indicador de tienda:", error);
        contenedor.style.display = "none";

    }

}


/* =====================================================
   EJECUTAR
===================================================== */

renderTiendaIndicador();