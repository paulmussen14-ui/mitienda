import { obtenerIniciales } from "./negocios.js";

/* =====================================================
   ITEMS DEL MENÚ
   Un solo lugar para agregar/quitar secciones del panel.
===================================================== */

const ITEMS_MENU = [
    { id: "dashboard", label: "Inicio", icono: "🏠", href: "index.html" },
    { id: "productos", label: "Productos", icono: "📦", href: "productos.html" },
    { id: "pedidos", label: "Pedidos", icono: "🧾", href: "pedidos.html" },
    { id: "inventario", label: "Inventario", icono: "📊", href: "inventario.html" },
    { id: "ventas", label: "Ventas", icono: "💰", href: "ventas.html" },
    { id: "usuarios", label: "Usuarios", icono: "👥", href: "usuarios.html" },
    { id: "configuracion", label: "Configuración", icono: "⚙️", href: "configuracion.html" }
];


/* =====================================================
   RENDER SIDEBAR
   negocio: objeto del negocio (o null si aún no carga)
   paginaActiva: id de ITEMS_MENU que debe marcarse activo
===================================================== */

export function renderSidebar(negocio, paginaActiva) {

    const contenedor = document.getElementById("admin-sidebar");

    if (!contenedor) {
        console.warn("No se encontró #admin-sidebar en esta página. Agrega <div id=\"admin-sidebar\"></div>.");
        return;
    }

    contenedor.innerHTML = "";

    const aside = document.createElement("aside");
    aside.className = "admin-sidebar";

    aside.appendChild(construirIdentidad(negocio));
    aside.appendChild(construirNav(paginaActiva));

    contenedor.appendChild(aside);
}


function construirIdentidad(negocio) {

    const identidad = document.createElement("div");
    identidad.className = "sidebar-identidad";

    if (negocio?.logoUrl) {
        const img = document.createElement("img");
        img.src = negocio.logoUrl;
        img.alt = negocio.nombre || "Logo del negocio";
        img.className = "sidebar-logo";
        identidad.appendChild(img);
    } else {
        const iniciales = document.createElement("div");
        iniciales.className = "sidebar-logo sidebar-logo--iniciales";
        iniciales.textContent = obtenerIniciales(negocio?.nombre);
        identidad.appendChild(iniciales);
    }

    const nombreNegocio = document.createElement("p");
    nombreNegocio.className = "sidebar-nombre-negocio";
    nombreNegocio.textContent = negocio?.nombre || "Mi negocio";
    identidad.appendChild(nombreNegocio);

    return identidad;
}


function construirNav(paginaActiva) {

    const nav = document.createElement("nav");
    nav.className = "sidebar-nav";

    ITEMS_MENU.forEach(item => {
        const enlace = document.createElement("a");

        // href asignado como string plano — nunca vía JSON.stringify
        // ni concatenación con datos que puedan venir vacíos/indefinidos.
        enlace.href = item.href;
        enlace.className = "sidebar-link" + (item.id === paginaActiva ? " sidebar-link--activo" : "");

        const icono = document.createElement("span");
        icono.className = "sidebar-icono";
        icono.textContent = item.icono;

        const texto = document.createElement("span");
        texto.textContent = item.label;

        enlace.appendChild(icono);
        enlace.appendChild(texto);
        nav.appendChild(enlace);
    });

    return nav;
}