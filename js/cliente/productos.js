import {
    collection,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import { db } from "../config/firebase.js";
import { agregarAlCarrito } from "./carrito.js";
import { obtenerNegocioActual, configurarNavegacionNegocio } from "../services/negocios.js";

/* ============================================================
   CONFIGURACIÓN
============================================================ */

const EMOJI_POR_CATEGORIA = {

    abarrotes: "🍚",
    bebidas: "🥤",
    snacks: "🍪",
    limpieza: "🧴",

    default: "🛒"

};


/* ============================================================
   VARIABLES
============================================================ */

let productos = [];

let filtroTexto = "";

let filtroCategoria = "todos";

let negocioActual = null;


/* ============================================================
   INICIAR
============================================================ */

async function iniciarProductos() {

    try {

        negocioActual =
            await obtenerNegocioActual();


        if (!negocioActual) {

            mostrarError(
                "No se encontró esta tienda."
            );

            return;
        }


        console.log(
            "🏪 Negocio actual:",
            negocioActual
        );


        configurarNegocio();


        configurarNavegacion();

        configurarLogoYBanner();


        configurarBuscador();


        configurarCategorias();


        await cargarProductos();


    } catch (error) {

        console.error(
            "❌ Error iniciando productos:",
            error
        );

        mostrarError(
            "No se pudo cargar la tienda."
        );

    }

}


/* ============================================================
   INFORMACIÓN DEL NEGOCIO
============================================================ */

function configurarNegocio() {

    const nombre =
        negocioActual.nombre ||
        "Tienda";


    const descripcion =
        negocioActual.descripcion ||
        "Compra productos en esta tienda.";


    document.title =
        `Productos · ${nombre}`;


    /* ---------- Nombre ---------- */

    const nombreElemento =
        document.getElementById(
            "nombre-negocio"
        );


    if (nombreElemento) {

        nombreElemento.textContent =
            nombre;

    }


    /* ---------- Descripción ---------- */

    const descripcionElemento =
        document.getElementById(
            "descripcion-negocio"
        );


    if (descripcionElemento) {

        descripcionElemento.textContent =
            descripcion;

    }


    /* ========================================================
       COLORES DINÁMICOS
    ======================================================== */

    const colores =
        negocioActual.colores || {};


    const primario =
        colores.primario ||
        "#1F5C4A";


    const acento =
        colores.acento ||
        "#E8A23D";


    const secundario =
        colores.secundario ||
        "#FFFFFF";


    document.documentElement.style.setProperty(
        "--tienda-primario",
        primario
    );


    document.documentElement.style.setProperty(
        "--tienda-acento",
        acento
    );


    document.documentElement.style.setProperty(
        "--tienda-secundario",
        secundario
    );


    console.log(
        "🎨 Colores:",
        {
            primario,
            acento,
            secundario
        }
    );

}


/* ============================================================
   NAVEGACIÓN
============================================================ */

function configurarNavegacion() {

    const slug =
        negocioActual.slug ||
        negocioActual.id;


    const negocioParam =
        encodeURIComponent(slug);


    const navCarrito =
        document.getElementById(
            "nav-carrito"
        );


    const navPedidos =
        document.getElementById(
            "nav-pedidos"
        );


    const navContacto =
        document.getElementById(
            "nav-contacto"
        );


    const navProductos =
        document.getElementById(
            "nav-productos"
        );


    if (navProductos) {

        navProductos.href =
            `productos.html?negocio=${negocioParam}`;

    }


    if (navCarrito) {

        navCarrito.href =
            `carrito.html?negocio=${negocioParam}`;

    }


    if (navPedidos) {

        navPedidos.href =
            `pedidos.html?negocio=${negocioParam}`;

    }


    if (navContacto) {

        navContacto.href =
            `contacto.html?negocio=${negocioParam}`;

    }

}


/* ============================================================
   ¿ES UNA IMAGEN VÁLIDA?
============================================================ */

function esImagenValida(valor) {
    return typeof valor === "string" && valor.trim() !== "" && valor.trim() !== '""';
}


/* ============================================================
   LOGO Y BANNER DE LA TIENDA
============================================================ */

function configurarLogoYBanner() {

    const logoElemento =
        document.getElementById("logo-negocio");

    const bannerElemento =
        document.getElementById("banner-negocio");


    if (logoElemento && esImagenValida(negocioActual.logo)) {

        logoElemento.src = negocioActual.logo;
        logoElemento.alt = negocioActual.nombre || "Logo";
        logoElemento.style.display = "block";

    }


    if (bannerElemento && esImagenValida(negocioActual.banner)) {

        bannerElemento.src = negocioActual.banner;
        bannerElemento.alt = `Portada de ${negocioActual.nombre || "la tienda"}`;
        bannerElemento.style.display = "block";

    }

}


/* ============================================================
   CARGAR PRODUCTOS
============================================================ */

async function cargarProductos() {

    const contenedor =
        document.getElementById(
            "grid-productos"
        );


    const cargando =
        document.getElementById(
            "productos-cargando"
        );


    if (!contenedor) {

        console.error(
            "❌ No existe #grid-productos"
        );

        return;

    }


    try {

        const referencia =
            query(
                collection(
                    db,
                    "productos"
                ),
                where(
                    "negocio_id",
                    "==",
                    negocioActual.id
                )
            );


        const resultado =
            await getDocs(
                referencia
            );


        productos =
            resultado.docs.map(doc => ({

                id: doc.id,

                ...doc.data()

            }));


        console.log(
            "📦 Productos encontrados:",
            productos
        );


        if (cargando) {

            cargando.style.display =
                "none";

        }


        aplicarFiltros();


    } catch (error) {

        console.error(
            "❌ Error cargando productos:",
            error
        );


        if (cargando) {

            cargando.innerHTML = `
                <p>
                    ❌ No se pudieron cargar
                    los productos.
                </p>
            `;

        }

    }

}


/* ============================================================
   FILTRAR PRODUCTOS
============================================================ */

function aplicarFiltros() {

    const contenedor =
        document.getElementById(
            "grid-productos"
        );


    const sinResultados =
        document.getElementById(
            "sin-resultados"
        );


    const contador =
        document.getElementById(
            "contador-productos"
        );


    if (!contenedor) return;


    const texto =
        filtroTexto
            .toLowerCase()
            .trim();


    const resultado =
        productos.filter(producto => {


            /* ---------- BUSCADOR ---------- */

            const nombre =
                String(
                    producto.nombre || ""
                ).toLowerCase();


            const descripcion =
                String(
                    producto.descripcion || ""
                ).toLowerCase();


            const coincideTexto =
                !texto ||
                nombre.includes(texto) ||
                descripcion.includes(texto);


            /* ---------- CATEGORÍA ---------- */

            const categoria =
                String(
                    producto.categoria || ""
                )
                    .toLowerCase()
                    .trim();


            const coincideCategoria =
                filtroCategoria === "todos" ||
                categoria === filtroCategoria;


            return (
                coincideTexto &&
                coincideCategoria
            );

        });


    contenedor.innerHTML = "";


    /* ========================================================
       CONTADOR
    ======================================================== */

    if (contador) {

        contador.textContent =
            `${resultado.length} producto${
                resultado.length === 1
                    ? ""
                    : "s"
            }`;

    }


    /* ========================================================
       SIN RESULTADOS
    ======================================================== */

    if (resultado.length === 0) {

        if (sinResultados) {

            sinResultados.style.display =
                "block";

        }

        return;

    }


    if (sinResultados) {

        sinResultados.style.display =
            "none";

    }


    /* ========================================================
       MOSTRAR PRODUCTOS
    ======================================================== */

    const plantilla =
        document.getElementById(
            "plantilla-producto"
        );


    if (!plantilla) {

        console.error(
            "❌ No existe #plantilla-producto"
        );

        return;

    }


    resultado.forEach(producto => {

        contenedor.appendChild(

            crearTarjeta(
                producto,
                plantilla
            )

        );

    });

}


/* ============================================================
   CREAR TARJETA
============================================================ */

function crearTarjeta(
    producto,
    plantilla
) {

    const nodo =
        plantilla.content.cloneNode(
            true
        );


    const tarjeta =
        nodo.querySelector(
            ".gcard"
        );


    if (!tarjeta) {

        console.error(
            "❌ La plantilla no contiene .gcard"
        );

        return nodo;

    }


    tarjeta.dataset.id =
        producto.id;


    /* ========================================================
       STOCK
    ======================================================== */

    const stock =
        Number(
            producto.stock
        ) || 0;


    const stockBajo =
        stock > 0 &&
        stock <= 5;


    const sinStock =
        stock <= 0;


    /* ========================================================
       IMAGEN / EMOJI
    ======================================================== */

    const mediaEl =
        tarjeta.querySelector(
            '[data-campo="imagen"]'
        );


    const tieneImagen =
        typeof producto.imagen === "string" &&
        producto.imagen.trim() !== "";


    if (mediaEl) {

        if (tieneImagen) {

            mediaEl.classList.add(
                "has-img"
            );


            const imagen =
                document.createElement(
                    "img"
                );


            imagen.src =
                producto.imagen;


            imagen.alt =
                producto.nombre ||
                "Producto";


            imagen.loading =
                "lazy";


            mediaEl.innerHTML =
                "";


            mediaEl.appendChild(
                imagen
            );

        } else {

            const categoria =
                String(
                    producto.categoria || ""
                )
                    .toLowerCase()
                    .trim();


            mediaEl.textContent =
                EMOJI_POR_CATEGORIA[
                    categoria
                ] ||
                EMOJI_POR_CATEGORIA.default;

        }

    }


    /* ========================================================
       NOMBRE
    ======================================================== */

    const nombreEl =
        tarjeta.querySelector(
            '[data-campo="nombre"]'
        );


    if (nombreEl) {

        nombreEl.textContent =
            producto.nombre ||
            "Producto";

    }


    /* ========================================================
       STOCK
    ======================================================== */

    const stockEl =
        tarjeta.querySelector(
            '[data-campo="stock"]'
        );


    if (stockEl) {

        stockEl.textContent =
            `Stock: ${stock}`;


        if (stockBajo) {

            stockEl.classList.add(
                "bajo"
            );

        }

    }


    /* ========================================================
       PRECIO
    ======================================================== */

    const precio =
        Number(
            producto.precio
        ) || 0;


    const precioEl =
        tarjeta.querySelector(
            '[data-campo="precio"]'
        );


    if (precioEl) {

        precioEl.textContent =
            `S/ ${precio.toFixed(2)}`;

    }


    /* ========================================================
       BOTÓN
    ======================================================== */

    const boton =
        tarjeta.querySelector(
            '[data-campo="boton"]'
        );


    if (!boton) {

        return nodo;

    }


    if (sinStock) {

        boton.textContent =
            "Sin stock";


        boton.disabled =
            true;


        return nodo;

    }


    boton.textContent =
        "Agregar 🛒";


    boton.disabled =
        false;


    /* ========================================================
       AGREGAR AL CARRITO
    ======================================================== */

    boton.addEventListener(
        "click",
        async () => {

            try {

                boton.disabled =
                    true;


                boton.textContent =
                    "Agregando...";


                await agregarAlCarrito(
                    producto
                );


                boton.textContent =
                    "✓ Agregado";


                setTimeout(
                    () => {

                        boton.textContent =
                            "Agregar 🛒";


                        boton.disabled =
                            false;

                    },
                    1000
                );


            } catch (error) {

                console.error(
                    "❌ Error carrito:",
                    error
                );


                alert(
                    error.message ||
                    "No se pudo agregar el producto."
                );


                boton.textContent =
                    "Agregar 🛒";


                boton.disabled =
                    false;

            }

        }
    );


    return nodo;

}


/* ============================================================
   BUSCADOR
============================================================ */

function configurarBuscador() {

    const input =
        document.getElementById(
            "buscar-producto"
        );


    if (!input) return;


    input.addEventListener(
        "input",
        event => {

            filtroTexto =
                event.target.value;


            aplicarFiltros();

        }
    );

}


/* ============================================================
   CATEGORÍAS
============================================================ */

function configurarCategorias() {

    const botones =
        document.querySelectorAll(
            "[data-categoria]"
        );


    botones.forEach(
        boton => {

            boton.addEventListener(
                "click",
                () => {


                    botones.forEach(
                        otroBoton => {

                            otroBoton.classList.remove(
                                "on"
                            );

                        }
                    );


                    boton.classList.add(
                        "on"
                    );


                    filtroCategoria =
                        String(
                            boton.dataset.categoria ||
                            "todos"
                        )
                            .toLowerCase()
                            .trim();


                    aplicarFiltros();

                }
            );

        }
    );

}


/* ============================================================
   MOSTRAR ERROR
============================================================ */

function mostrarError(
    mensaje
) {

    const contenedor =
        document.getElementById(
            "grid-productos"
        );


    const cargando =
        document.getElementById(
            "productos-cargando"
        );


    if (cargando) {

        cargando.style.display =
            "none";

    }


    if (contenedor) {

        contenedor.innerHTML = `
            <div class="sin-resultados">
                <h3>⚠️ ${mensaje}</h3>
                <p>
                    Regresa al marketplace
                    para seleccionar una tienda.
                </p>
            </div>
        `;

    }

}


/* ============================================================
   EJECUTAR
============================================================ */

iniciarProductos();