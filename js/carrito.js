import {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    query,
    where,
    limit,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import { dbCliente as db } from "./firebase-cliente.js";
import { obtenerNegocioActual, configurarNavegacionNegocio } from "./negocios.js";
import { obtenerClienteId } from "./auth-cliente.js";

/*
 * NOTA: "db" aquí es el Firestore de la app AISLADA del
 * cliente (firebase-cliente.js), no el de firebase.js. Es
 * necesario para que la sesión anónima del cliente y las
 * operaciones de Firestore usen la misma app de Firebase.
 */

/* ============================================================
   CLIENTE ACTUAL (uid anónimo de Firebase Auth)

   Antes: cada navegador se inventaba un cliente_id con
   localStorage, sin verificación real.

   Ahora: obtenerClienteId() (importado de auth-cliente.js)
   devuelve el uid real dado por Firebase Anonymous Auth, el
   mismo que usan las reglas de Firestore para autorizar.

   Nota: obtenerClienteId() es ASÍNCRONO ahora. Si algún otro
   archivo importa obtenerClienteActual() esperando un string
   inmediato (no una Promise), hay que actualizarlo para que
   haga "await obtenerClienteActual()".
============================================================ */

export async function obtenerClienteActual() {

    return obtenerClienteId();

}


/* ============================================================
   OBTENER NEGOCIO ACTUAL
============================================================ */

async function obtenerNegocioSeguro() {

    const negocio =
        await obtenerNegocioActual();


    if (!negocio) {

        throw new Error(
            "No se encontró la tienda actual."
        );

    }


    if (!negocio.id) {

        throw new Error(
            "La tienda actual no tiene un ID válido."
        );

    }


    return negocio;

}


/* ============================================================
   OBTENER CARRITO DEL CLIENTE + NEGOCIO
============================================================ */

export async function obtenerCarrito() {

    const clienteId =
        await obtenerClienteId();


    const negocio =
        await obtenerNegocioSeguro();


    /*
     * BUSCAMOS EL CARRITO POR:
     *
     * cliente_id
     * negocio_id
     * estado = activo
     *
     * Esto evita mezclar:
     *
     * Cliente A + Tienda A
     *
     * con:
     *
     * Cliente B + Tienda A
     *
     * o:
     *
     * Cliente A + Tienda B
     */

    const referencia =
        query(

            collection(
                db,
                "carritos"
            ),

            where(
                "cliente_id",
                "==",
                clienteId
            ),

            where(
                "negocio_id",
                "==",
                negocio.id
            ),

            where(
                "estado",
                "==",
                "activo"
            ),

            limit(1)

        );


    const resultado =
        await getDocs(
            referencia
        );


    if (resultado.empty) {

        return null;

    }


    const carritoDoc =
        resultado.docs[0];


    const carrito = {

        id:
            carritoDoc.id,

        ...carritoDoc.data()

    };


    /*
     * VALIDACIÓN EXTRA
     *
     * Aunque la consulta ya filtró estos valores,
     * verificamos nuevamente los datos del documento.
     */

    if (
        carrito.cliente_id !==
        clienteId
    ) {

        console.error(
            "❌ El carrito no pertenece al cliente actual."
        );

        return null;

    }


    if (
        carrito.negocio_id !==
        negocio.id
    ) {

        console.error(
            "❌ El carrito no pertenece al negocio actual."
        );

        return null;

    }


    return carrito;

}


/* ============================================================
   AGREGAR PRODUCTO AL CARRITO
============================================================ */

export async function agregarAlCarrito(
    producto
) {

    try {

        /* ----------------------------------------------------
           VALIDAR PRODUCTO
        ---------------------------------------------------- */

        if (!producto) {

            throw new Error(
                "No se recibió el producto."
            );

        }


        if (!producto.id) {

            throw new Error(
                "El producto no tiene un ID válido."
            );

        }


        /* ----------------------------------------------------
           OBTENER STOCK
        ---------------------------------------------------- */

        const stock =
            Number(
                producto.stock || 0
            );


        if (stock <= 0) {

            throw new Error(
                "Este producto no tiene stock."
            );

        }


        /* ----------------------------------------------------
           CLIENTE
        ---------------------------------------------------- */

        const clienteId =
            await obtenerClienteId();


        /* ----------------------------------------------------
           NEGOCIO
        ---------------------------------------------------- */

        const negocio =
            await obtenerNegocioSeguro();


        /* ----------------------------------------------------
           VALIDAR QUE EL PRODUCTO PERTENEZCA AL NEGOCIO
        ---------------------------------------------------- */

        if (
            !producto.negocio_id
        ) {

            throw new Error(
                "El producto no tiene negocio_id."
            );

        }


        if (
            producto.negocio_id !==
            negocio.id
        ) {

            throw new Error(
                "Este producto no pertenece a la tienda actual."
            );

        }


        /* ----------------------------------------------------
           BUSCAR CARRITO EXISTENTE
        ---------------------------------------------------- */

        const carrito =
            await obtenerCarrito();


        /* ====================================================
           CARRITO EXISTENTE
        ==================================================== */

        if (carrito) {

            const items =
                Array.isArray(
                    carrito.items
                )
                    ? [...carrito.items]
                    : [];


            const indice =
                items.findIndex(
                    item =>
                        item.producto_id ===
                        producto.id
                );


            /* -----------------------------------------------
               PRODUCTO YA EXISTE
            ----------------------------------------------- */

            if (indice !== -1) {

                const cantidadActual =
                    Number(
                        items[indice].cantidad || 0
                    );


                const nuevaCantidad =
                    cantidadActual + 1;


                if (
                    nuevaCantidad >
                    stock
                ) {

                    throw new Error(
                        `Solo hay ${stock} unidades disponibles de ${producto.nombre}.`
                    );

                }


                const precio =
                    Number(
                        producto.precio || 0
                    );


                items[indice] = {

                    ...items[indice],

                    nombre:
                        producto.nombre ||
                        items[indice].nombre ||
                        "Producto",

                    precio:
                        precio,

                    cantidad:
                        nuevaCantidad,

                    subtotal:
                        precio *
                        nuevaCantidad

                };

            }


            /* -----------------------------------------------
               PRODUCTO NUEVO
            ----------------------------------------------- */

            else {

                const precio =
                    Number(
                        producto.precio || 0
                    );


                items.push({

                    producto_id:
                        producto.id,

                    nombre:
                        producto.nombre ||
                        "Producto",

                    precio:
                        precio,

                    cantidad:
                        1,

                    subtotal:
                        precio

                });

            }


            /* -----------------------------------------------
               TOTAL
            ----------------------------------------------- */

            const total =
                calcularTotal(
                    items
                );


            /* -----------------------------------------------
               ACTUALIZAR FIREBASE
            ----------------------------------------------- */

            await updateDoc(

                doc(
                    db,
                    "carritos",
                    carrito.id
                ),

                {

                    cliente_id:
                        clienteId,

                    negocio_id:
                        negocio.id,

                    items:
                        items,

                    total:
                        total,

                    estado:
                        "activo",

                    fecha_actualizacion:
                        serverTimestamp()

                }

            );


            console.log(
                "🛒 Carrito actualizado:",
                carrito.id
            );


            console.log(
                "👤 Cliente:",
                clienteId
            );


            console.log(
                "🏪 Negocio:",
                negocio.id
            );


            return {

                correcto:
                    true,

                carritoId:
                    carrito.id,

                clienteId:
                    clienteId,

                negocioId:
                    negocio.id,

                items:
                    items,

                total:
                    total

            };

        }


        /* ====================================================
           CREAR NUEVO CARRITO
        ==================================================== */

        const precio =
            Number(
                producto.precio || 0
            );


        const nuevoCarrito = {

            /*
             * DUEÑO
             */

            cliente_id:
                clienteId,


            /*
             * TIENDA
             */

            negocio_id:
                negocio.id,


            /*
             * PRODUCTOS
             */

            items: [

                {

                    producto_id:
                        producto.id,

                    nombre:
                        producto.nombre ||
                        "Producto",

                    precio:
                        precio,

                    cantidad:
                        1,

                    subtotal:
                        precio

                }

            ],


            /*
             * ESTADO
             */

            estado:
                "activo",


            /*
             * TOTAL
             */

            total:
                precio,


            /*
             * FECHAS
             */

            fecha:
                serverTimestamp(),

            fecha_actualizacion:
                serverTimestamp()

        };


        const referencia =
            await addDoc(

                collection(
                    db,
                    "carritos"
                ),

                nuevoCarrito

            );


        console.log(
            "🛒 Nuevo carrito:",
            referencia.id
        );


        console.log(
            "👤 Cliente:",
            clienteId
        );


        console.log(
            "🏪 Negocio:",
            negocio.id
        );


        return {

            correcto:
                true,

            carritoId:
                referencia.id,

            clienteId:
                clienteId,

            negocioId:
                negocio.id,

            items:
                nuevoCarrito.items,

            total:
                nuevoCarrito.total

        };

    }

    catch (error) {

        console.error(
            "❌ Error agregando al carrito:",
            error
        );

        throw error;

    }

}


/* ============================================================
   CALCULAR TOTAL
============================================================ */

function calcularTotal(
    items
) {

    return items.reduce(

        (
            total,
            item
        ) => {

            const precio =
                Number(
                    item.precio || 0
                );


            const cantidad =
                Number(
                    item.cantidad || 0
                );


            return (
                total +
                precio *
                cantidad
            );

        },

        0

    );

}


/* ============================================================
   ACTUALIZAR CANTIDAD
============================================================ */

async function actualizarCantidad(
    carrito,
    productoId,
    nuevaCantidad
) {

    const items =
        Array.isArray(
            carrito.items
        )
            ? [...carrito.items]
            : [];


    const indice =
        items.findIndex(
            item =>
                item.producto_id ===
                productoId
        );


    if (indice === -1) {

        throw new Error(
            "El producto no está en el carrito."
        );

    }


    /* --------------------------------------------------------
       ELIMINAR SI LLEGA A CERO
    -------------------------------------------------------- */

    if (
        nuevaCantidad <= 0
    ) {

        items.splice(
            indice,
            1
        );

    }

    else {

        items[indice] = {

            ...items[indice],

            cantidad:
                nuevaCantidad,

            subtotal:
                Number(
                    items[indice].precio || 0
                ) *
                nuevaCantidad

        };

    }


    const total =
        calcularTotal(
            items
        );


    await updateDoc(

        doc(
            db,
            "carritos",
            carrito.id
        ),

        {

            items:
                items,

            total:
                total,

            fecha_actualizacion:
                serverTimestamp()

        }

    );

}


/* ============================================================
   ELIMINAR PRODUCTO
============================================================ */

async function eliminarProducto(
    carrito,
    productoId
) {

    const items =
        Array.isArray(
            carrito.items
        )
            ? carrito.items.filter(
                item =>
                    item.producto_id !==
                    productoId
            )
            : [];


    const total =
        calcularTotal(
            items
        );


    await updateDoc(

        doc(
            db,
            "carritos",
            carrito.id
        ),

        {

            items:
                items,

            total:
                total,

            fecha_actualizacion:
                serverTimestamp()

        }

    );

}


/* ============================================================
   RENDERIZAR CARRITO
============================================================ */

async function renderizarCarrito() {

    const cargando =
        document.getElementById(
            "carrito-cargando"
        );


    const vacio =
        document.getElementById(
            "carrito-vacio"
        );


    const contenido =
        document.getElementById(
            "contenido-carrito"
        );


    const lista =
        document.getElementById(
            "lista-carrito"
        );


    const resumen =
        document.getElementById(
            "resumen-carrito"
        );


    const subtotalEl =
        document.getElementById(
            "subtotal-carrito"
        );


    const totalEl =
        document.getElementById(
            "total-carrito"
        );


    const cantidadItemsEl =
        document.getElementById(
            "cantidad-items"
        );


    const plantilla =
        document.getElementById(
            "plantilla-item-carrito"
        );


    try {

        const carrito =
            await obtenerCarrito();


        /* ----------------------------------------------------
           OCULTAR CARGANDO
        ---------------------------------------------------- */

        if (cargando) {

            cargando.style.display =
                "none";

        }


        /* ====================================================
           CARRITO VACÍO
        ==================================================== */

        if (
            !carrito ||
            !Array.isArray(
                carrito.items
            ) ||
            carrito.items.length === 0
        ) {

            if (contenido) {

                contenido.style.display =
                    "none";

            }


            if (lista) {

                lista.innerHTML =
                    "";

            }


            if (vacio) {

                vacio.style.display =
                    "block";

            }


            return;

        }


        /* ====================================================
           MOSTRAR CONTENIDO
        ==================================================== */

        if (vacio) {

            vacio.style.display =
                "none";

        }


        if (contenido) {

            contenido.style.display =
                "grid";

        }


        if (lista) {

            lista.innerHTML =
                "";

        }


        /* ====================================================
           CANTIDAD TOTAL DE PRODUCTOS
        ==================================================== */

        const cantidadTotal =
            carrito.items.reduce(

                (
                    suma,
                    item
                ) => {

                    return (
                        suma +
                        Number(
                            item.cantidad || 0
                        )
                    );

                },

                0

            );


        if (cantidadItemsEl) {

            cantidadItemsEl.textContent =
                `${cantidadTotal} producto${
                    cantidadTotal === 1
                        ? ""
                        : "s"
                }`;

        }


        /* ====================================================
           MOSTRAR PRODUCTOS
        ==================================================== */

        carrito.items.forEach(
            item => {

                const nodo =
                    plantilla.content.cloneNode(
                        true
                    );


                const tarjeta =
                    nodo.querySelector(
                        ".carrito-item"
                    );


                const imagen =
                    nodo.querySelector(
                        '[data-campo="imagen"]'
                    );


                const nombre =
                    nodo.querySelector(
                        '[data-campo="nombre"]'
                    );


                const precio =
                    nodo.querySelector(
                        '[data-campo="precio"]'
                    );


                const subtotal =
                    nodo.querySelector(
                        '[data-campo="subtotal"]'
                    );


                const cantidad =
                    nodo.querySelector(
                        '[data-campo="cantidad"]'
                    );


                const menos =
                    nodo.querySelector(
                        '[data-campo="menos"]'
                    );


                const mas =
                    nodo.querySelector(
                        '[data-campo="mas"]'
                    );


                const eliminar =
                    nodo.querySelector(
                        '[data-campo="eliminar"]'
                    );


                /* ------------------------------------------------
                   ID
                ------------------------------------------------ */

                if (tarjeta) {

                    tarjeta.dataset.productoId =
                        item.producto_id;

                }


                /* ------------------------------------------------
                   IMAGEN / EMOJI
                ------------------------------------------------ */

                if (imagen) {

                    imagen.textContent =
                        "🛒";

                }


                /* ------------------------------------------------
                   NOMBRE
                ------------------------------------------------ */

                if (nombre) {

                    nombre.textContent =
                        item.nombre ||
                        "Producto";

                }


                /* ------------------------------------------------
                   PRECIO
                ------------------------------------------------ */

                if (precio) {

                    precio.textContent =
                        Number(
                            item.precio || 0
                        ).toFixed(2);

                }


                /* ------------------------------------------------
                   SUBTOTAL
                ------------------------------------------------ */

                if (subtotal) {

                    subtotal.textContent =
                        `S/ ${Number(
                            item.subtotal || 0
                        ).toFixed(2)}`;

                }


                /* ------------------------------------------------
                   CANTIDAD
                ------------------------------------------------ */

                if (cantidad) {

                    cantidad.textContent =
                        Number(
                            item.cantidad || 0
                        );

                }


                /* =================================================
                   MENOS
                ================================================= */

                if (menos) {

                    menos.addEventListener(
                        "click",
                        async () => {

                            try {

                                menos.disabled =
                                    true;


                                const cantidadActual =
                                    Number(
                                        item.cantidad || 1
                                    );


                                await actualizarCantidad(

                                    carrito,

                                    item.producto_id,

                                    cantidadActual - 1

                                );


                                await renderizarCarrito();


                            }

                            catch (error) {

                                console.error(
                                    "❌ Error reduciendo cantidad:",
                                    error
                                );


                                alert(
                                    error.message ||
                                    "No se pudo actualizar el carrito."
                                );


                                menos.disabled =
                                    false;

                            }

                        }
                    );

                }


                /* =================================================
                   MÁS
                ================================================= */

                if (mas) {

                    mas.addEventListener(
                        "click",
                        async () => {

                            try {

                                mas.disabled =
                                    true;


                                const cantidadActual =
                                    Number(
                                        item.cantidad || 0
                                    );


                                /*
                                 * Obtener producto actualizado
                                 * para verificar stock.
                                 */

                                const productoRef =
                                    doc(
                                        db,
                                        "productos",
                                        item.producto_id
                                    );


                                const productoSnap =
                                    await getDoc(
                                        productoRef
                                    );


                                if (
                                    !productoSnap.exists()
                                ) {

                                    throw new Error(
                                        "El producto ya no existe."
                                    );

                                }


                                const producto =
                                    productoSnap.data();


                                /*
                                 * Verificar negocio
                                 */

                                const negocio =
                                    await obtenerNegocioSeguro();


                                if (
                                    producto.negocio_id !==
                                    negocio.id
                                ) {

                                    throw new Error(
                                        "El producto ya no pertenece a esta tienda."
                                    );

                                }


                                /*
                                 * Verificar stock
                                 */

                                const stock =
                                    Number(
                                        producto.stock || 0
                                    );


                                if (
                                    cantidadActual + 1 >
                                    stock
                                ) {

                                    throw new Error(
                                        `Solo hay ${stock} unidades disponibles.`
                                    );

                                }


                                await actualizarCantidad(

                                    carrito,

                                    item.producto_id,

                                    cantidadActual + 1

                                );


                                await renderizarCarrito();


                            }

                            catch (error) {

                                console.error(
                                    "❌ Error aumentando cantidad:",
                                    error
                                );


                                alert(
                                    error.message ||
                                    "No se pudo aumentar la cantidad."
                                );


                                mas.disabled =
                                    false;

                            }

                        }
                    );

                }


                /* =================================================
                   ELIMINAR
                ================================================= */

                if (eliminar) {

                    eliminar.addEventListener(
                        "click",
                        async () => {

                            try {

                                eliminar.disabled =
                                    true;


                                await eliminarProducto(

                                    carrito,

                                    item.producto_id

                                );


                                await renderizarCarrito();


                            }

                            catch (error) {

                                console.error(
                                    "❌ Error eliminando producto:",
                                    error
                                );


                                alert(
                                    error.message ||
                                    "No se pudo eliminar el producto."
                                );


                                eliminar.disabled =
                                    false;

                            }

                        }
                    );

                }


                if (lista) {

                    lista.appendChild(
                        nodo
                    );

                }

            }
        );


        /* ====================================================
           RESUMEN
        ==================================================== */

        const total =
            calcularTotal(
                carrito.items
            );


        if (subtotalEl) {

            subtotalEl.textContent =
                `S/ ${total.toFixed(2)}`;

        }


        if (totalEl) {

            totalEl.textContent =
                `S/ ${total.toFixed(2)}`;

        }


        if (resumen) {

            resumen.style.display =
                "block";

        }

    }

    catch (error) {

        console.error(
            "❌ Error renderizando carrito:",
            error
        );


        if (cargando) {

            cargando.innerHTML = `
                <div class="carrito-icono">
                    ⚠️
                </div>

                <h3>
                    No se pudo cargar el carrito
                </h3>

                <p>
                    ${error.message || "Ocurrió un error inesperado."}
                </p>
            `;


            cargando.style.display =
                "block";

        }

    }

}


/* ============================================================
   CONFIRMAR PEDIDO
============================================================ */

function configurarConfirmarPedido() {

    const boton =
        document.getElementById(
            "btn-confirmar-pedido"
        );


    if (!boton) {

        return;

    }


    boton.addEventListener(
        "click",
        async () => {

            try {

                boton.disabled =
                    true;


                boton.textContent =
                    "Creando pedido...";


                const carrito =
                    await obtenerCarrito();


                if (
                    !carrito ||
                    !Array.isArray(
                        carrito.items
                    ) ||
                    carrito.items.length === 0
                ) {

                    throw new Error(
                        "El carrito está vacío."
                    );

                }


                /*
                 * Importación dinámica para evitar
                 * dependencia circular.
                 */

                const modulo =
                    await import(
                        "./pedidos.js"
                    );


                const resultado =
                    await modulo.crearPedido();


                if (
                    resultado &&
                    resultado.correcto
                ) {

                    alert(
                        "✅ Pedido creado correctamente."
                    );


                    /*
                     * Obtener negocio actual
                     * para mantener el contexto.
                     */

                    const negocio =
                        await obtenerNegocioSeguro();


                    if (negocio) {

                        const slug =
                            negocio.slug ||
                            negocio.id;


                        window.location.href =
                            `pedidos.html?negocio=${encodeURIComponent(
                                slug
                            )}`;

                    }

                }

            }

            catch (error) {

                console.error(
                    "❌ Error confirmando pedido:",
                    error
                );


                alert(
                    error.message ||
                    "No se pudo crear el pedido."
                );


                boton.disabled =
                    false;


                boton.textContent =
                    "Confirmar pedido →";

            }

        }
    );

}


/* ============================================================
   INICIAR
============================================================ */

async function iniciarCarrito() {

    const lista =
        document.getElementById(
            "lista-carrito"
        );


    /*
     * Solo ejecutar en carrito.html.
     */

    if (!lista) {

        return;

    }


    try {

        const clienteId =
            await obtenerClienteId();


        console.log(
            "👤 Cliente actual:",
            clienteId
        );


        const negocio =
            await obtenerNegocioActual();


        if (negocio) {
            configurarNavegacionNegocio(negocio)
            console.log(
                "🏪 Negocio actual:",
                negocio.id
            );

            console.log(
                "🔗 Slug:",
                negocio.slug
            );

        }


        configurarConfirmarPedido();


        await renderizarCarrito();

    }

    catch (error) {

        console.error(
            "❌ Error iniciando carrito:",
            error
        );

    }

}


/* ============================================================
   EJECUTAR
============================================================ */

iniciarCarrito();