import { obtenerNegocioActual } from "./negocios.js";

/* =====================================================
   ¿ES UNA IMAGEN VÁLIDA?
===================================================== */

function esImagenValida(valor) {
    return typeof valor === "string" && valor.trim() !== "" && valor.trim() !== '""';
}


/* =====================================================
   FOOTER GENÉRICO (marketplace, registro, etc.)
===================================================== */

function footerGenerico() {

    return `
        <div class="footer-inner">

            <div class="footer-top">

                <div class="footer-marca">
                    <div>
                        <h3>🛒 MiTienda</h3>
                        <p>El marketplace de los negocios de tu barrio.</p>
                    </div>
                </div>

                <div class="footer-columnas">
                    <div class="footer-columna">
                        <h4>Navegación</h4>
                        <ul>
                            <li><a href="/index.html">Inicio</a></li>
                            <li><a href="/pages/cliente/tienda.html">Tiendas</a></li>
                            <li><a href="/pages/cliente/registro.html">Crear cuenta</a></li>
                        </ul>
                    </div>
                </div>

            </div>

            <div class="footer-bottom">
                <span>© ${new Date().getFullYear()} <strong>MiTienda</strong>. Todos los derechos reservados.</span>
            </div>

        </div>
    `;

}


/* =====================================================
   FOOTER DE UNA TIENDA ESPECÍFICA
===================================================== */

function footerTienda(negocio) {

    const nombre = negocio.nombre || "Tienda";
    const direccion = negocio.direccion || "Dirección no disponible";
    const horario = negocio.horario || "Horario no disponible";
    const slug = negocio.slug || negocio.id;
    const negocioParam = encodeURIComponent(slug);

    let logoHtml = `<span class="footer-logo-iniciales">${(nombre[0] || "T").toUpperCase()}</span>`;

    if (esImagenValida(negocio.logo)) {
        logoHtml = `<img src="${negocio.logo}" alt="${nombre}" class="footer-logo-img">`;
    }

    return `
        <div class="footer-inner">

            <div class="footer-top">

                <div class="footer-marca">
                    ${logoHtml}
                    <div>
                        <h3>${nombre}</h3>
                        <p>${direccion}</p>
                    </div>
                </div>

                <div class="footer-columnas">
                    <div class="footer-columna">
                        <h4>Horario</h4>
                        <ul>
                            <li><span>🕐 ${horario}</span></li>
                        </ul>
                    </div>
                </div>

                <a class="footer-cta" href="contacto.html?negocio=${negocioParam}">✉️ Contáctanos</a>

            </div>

            <div class="footer-bottom">
                <span>© ${new Date().getFullYear()} <strong>${nombre}</strong> · Impulsado por MiTienda</span>
            </div>

        </div>
    `;

}


/* =====================================================
   RENDERIZAR FOOTER
   opciones.forzarGenerico = true → usar siempre el footer
   genérico (para páginas del marketplace, sin negocio).
===================================================== */

export async function renderFooter(opciones = {}) {

    const contenedor = document.getElementById("footer-mitienda");

    if (!contenedor) return;

    if (opciones.forzarGenerico) {
        contenedor.innerHTML = footerGenerico();
        return;
    }

    try {

        const negocio = await obtenerNegocioActual();

        if (negocio) {

            contenedor.innerHTML = footerTienda(negocio);

            const primario = negocio.colores?.primario;

            if (primario) {
                contenedor.style.setProperty("--tienda-primario", primario);
            }

        } else {

            contenedor.innerHTML = footerGenerico();

        }

    } catch (error) {

        console.error("❌ Error cargando footer:", error);
        contenedor.innerHTML = footerGenerico();

    }

}


/* =====================================================
   EJECUTAR
   Lee window.__FOOTER_OPCIONES__ si la página lo definió
   antes de este <script>; si no, usa las opciones por defecto.
===================================================== */

renderFooter(window.__FOOTER_OPCIONES__ || {});