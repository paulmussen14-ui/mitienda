import {
    collection,
    doc,
    addDoc,
    getDocs,
    query,
    where,
    limit,
    updateDoc,
    runTransaction,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import { dbCliente as db } from "../config/firebase-cliente.js";
import { obtenerNegocioActual, configurarNavegacionNegocio } from "../services/negocios.js";
import { obtenerClienteId } from "./auth-cliente.js";

/* =====================================================
   CLIENTE ACTUAL

   La lógica de autenticación anónima vive ahora en
   auth-cliente.js (compartida con carrito.js), para que
   ambos archivos siempre estén sincronizados.

   NOTA: "db" aquí es el Firestore de la app AISLADA del
   cliente (firebase-cliente.js), no el de firebase.js.
===================================================== */


/* =====================================================
   NÚMERO DE PEDIDO CORTO (secuencial por negocio)

   Genera un número legible (#0001, #0002...) en vez del
   ID largo y aleatorio que asigna Firestore. Se guarda un
   contador dentro del propio documento del negocio y se
   incrementa de forma atómica con una transacción para
   evitar números repetidos si hay pedidos simultáneos.
===================================================== */

async function obtenerSiguienteNumeroPedido(negocioId) {

    const negocioRef = doc(db, "negocios", negocioId);

    return await runTransaction(db, async (transaction) => {

        const negocioSnap = await transaction.get(negocioRef);
        const actual = negocioSnap.data()?.ultimo_numero_pedido || 0;
        const siguiente = actual + 1;

        transaction.update(negocioRef, { ultimo_numero_pedido: siguiente });

        return siguiente;
    });
}


/* =====================================================
   OBTENER CARRITO ACTIVO
===================================================== */

async function obtenerCarritoActivo() {

    const negocio =
        await obtenerNegocioActual();


    if (!negocio) {

        throw new Error(
            "No se encontró la tienda actual."
        );

    }


    const clienteId =
        await obtenerClienteId();


    /*
     * IMPORTANTE:
     *
     * El carrito pertenece a:
     *
     * cliente_id
     * +
     * negocio_id
     * +
     * estado activo
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


    return {

        id:
            carritoDoc.id,

        ...carritoDoc.data()

    };

}


/* =====================================================
   CREAR PEDIDO
===================================================== */

export async function crearPedido() {

    try {

        /* -------------------------------------------------
           NEGOCIO
        ------------------------------------------------- */

        const negocio =
            await obtenerNegocioActual();


        if (!negocio) {

            throw new Error(
                "No se encontró la tienda actual."
            );

        }


        /* -------------------------------------------------
           CLIENTE
        ------------------------------------------------- */

        const clienteId =
            await obtenerClienteId();


        /* -------------------------------------------------
           CARRITO
        ------------------------------------------------- */

        const carrito =
            await obtenerCarritoActivo();


        if (
            !carrito ||
            !Array.isArray(carrito.items) ||
            carrito.items.length === 0
        ) {

            throw new Error(
                "El carrito está vacío."
            );

        }


        /*
         * Verificación adicional:
         *
         * El carrito debe pertenecer
         * al cliente actual.
         */

        if (
            carrito.cliente_id !==
            clienteId
        ) {

            throw new Error(
                "Este carrito no pertenece al cliente actual."
            );

        }


        /*
         * Verificación adicional:
         *
         * El carrito debe pertenecer
         * a la tienda actual.
         */

        if (
            carrito.negocio_id !==
            negocio.id
        ) {

            throw new Error(
                "Este carrito no pertenece a la tienda actual."
            );

        }


        /* =================================================
           DETALLE DEL PEDIDO
        ================================================= */

        const detallePedido =
            carrito.items.map(
                item => {

                    const precio =
                        Number(
                            item.precio || 0
                        );


                    const cantidad =
                        Number(
                            item.cantidad || 0
                        );


                    return {

                        producto_id:
                            item.producto_id,

                        nombre:
                            item.nombre ||
                            "Producto",

                        precio:
                            precio,

                        cantidad:
                            cantidad,

                        subtotal:
                            precio *
                            cantidad

                    };

                }
            );


        /* =================================================
           TOTAL
        ================================================= */

        const total =
            detallePedido.reduce(

                (
                    suma,
                    item
                ) =>
                    suma +
                    item.subtotal,

                0

            );


        /* =================================================
           NÚMERO DE PEDIDO CORTO
        ================================================= */

        const numeroPedido =
            await obtenerSiguienteNumeroPedido(
                negocio.id
            );


        /* =================================================
           CREAR PEDIDO
        ================================================= */

        const pedidoRef =
            await addDoc(

                collection(
                    db,
                    "pedidos"
                ),

                {

                    /*
                     * 🔢 NÚMERO CORTO
                     */

                    numero_pedido:
                        numeroPedido,


                    /*
                     * 👤 DUEÑO DEL PEDIDO
                     */

                    cliente_id:
                        clienteId,


                    /*
                     * 🏪 TIENDA
                     */

                    negocio_id:
                        negocio.id,


                    /*
                     * 📦 PRODUCTOS
                     */

                    detalle_pedido:
                        detallePedido,


                    /*
                     * ESTADO
                     */

                    estado:
                        "Pendiente",


                    /*
                     * FECHA
                     */

                    fecha:
                        serverTimestamp(),

                    subtotal:
                        total,
                    /*
                     * TOTAL
                     */

                    total:
                        total

                }

            );


        /* =================================================
           CONVERTIR CARRITO
        ================================================= */

        await updateDoc(

            doc(
                db,
                "carritos",
                carrito.id
            ),

            {

                estado:
                    "convertido",

                fecha_actualizacion:
                    serverTimestamp()

            }

        );


        console.log(
            "✅ Pedido creado:",
            pedidoRef.id,
            "→ #" + String(numeroPedido).padStart(4, "0")
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

            pedidoId:
                pedidoRef.id,

            numeroPedido:
                numeroPedido,

            clienteId:
                clienteId,

            negocioId:
                negocio.id

        };


    } catch (error) {

        console.error(
            "❌ Error creando pedido:",
            error
        );

        throw error;

    }

}


/* =====================================================
   CARGAR PEDIDOS
===================================================== */

async function cargarPedidos() {

    const lista =
        document.getElementById(
            "lista-pedidos"
        );


    const vacios =
        document.getElementById(
            "pedidos-vacios"
        );


    const cargando =
        document.getElementById(
            "pedidos-cargando"
        );


    const plantilla =
        document.getElementById(
            "plantilla-pedido"
        );


    const plantillaProducto =
        document.getElementById(
            "plantilla-producto-pedido"
        );


    /* -------------------------------------------------
       COMPROBAR HTML
    ------------------------------------------------- */

    if (
        !lista ||
        !plantilla ||
        !plantillaProducto
    ) {

        return;

    }


    try {

        /* =================================================
           NEGOCIO
        ================================================= */

        const negocio =
            await obtenerNegocioActual();


        if (!negocio) {

            if (cargando) {

                cargando.textContent =
                    "No se encontró la tienda.";

            }

            return;

        }

        configurarNavegacionNegocio(negocio);
        /* =================================================
           CLIENTE
        ================================================= */

        const clienteId =
            await obtenerClienteId();


        console.log(
            "👤 Cliente actual:",
            clienteId
        );


        console.log(
            "🏪 Negocio actual:",
            negocio.id
        );


        /* =================================================
           BUSCAR PEDIDOS
        ================================================= */

        /*
         * MUY IMPORTANTE:
         *
         * Ahora solamente se buscan pedidos
         * del cliente actual dentro de la tienda actual.
         */

        const referencia =
            query(

                collection(
                    db,
                    "pedidos"
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
                )

            );


        const resultado =
            await getDocs(
                referencia
            );


        const pedidos =
            resultado.docs.map(

                documento => ({

                    id:
                        documento.id,

                    ...documento.data()

                })

            );


        console.log(
            "📦 Pedidos del cliente:",
            pedidos
        );


        /* =================================================
           OCULTAR CARGANDO
        ================================================= */

        if (cargando) {

            cargando.style.display =
                "none";

        }


        /* =================================================
           SIN PEDIDOS
        ================================================= */

        if (
            pedidos.length === 0
        ) {

            lista.innerHTML =
                "";


            lista.style.display =
                "none";


            if (vacios) {

                vacios.style.display =
                    "block";

            }


            return;

        }


        /* =================================================
           MOSTRAR LISTA
        ================================================= */

        if (vacios) {

            vacios.style.display =
                "none";

        }


        lista.style.display =
            "block";


        /* =================================================
           ORDENAR POR FECHA
        ================================================= */

        pedidos.sort(

            (a, b) => {

                const fechaA =
                    a.fecha?.toMillis
                        ? a.fecha.toMillis()
                        : 0;


                const fechaB =
                    b.fecha?.toMillis
                        ? b.fecha.toMillis()
                        : 0;


                return (
                    fechaB -
                    fechaA
                );

            }

        );


        lista.innerHTML =
            "";


        /* =================================================
           MOSTRAR PEDIDOS
        ================================================= */

        pedidos.forEach(

            pedido => {

                const nodo =
                    plantilla.content
                        .cloneNode(true);


                /* =================================================
                   ID / NÚMERO DE PEDIDO
                ================================================= */

                const idElemento =
                    nodo.querySelector(
                        '[data-campo="id"]'
                    );


                if (idElemento) {

                    idElemento.textContent =
                        pedido.numero_pedido
                            ? `#${String(pedido.numero_pedido).padStart(4, "0")}`
                            : `#${pedido.id.slice(0, 6).toUpperCase()}`;

                }


                /* =================================================
                   ESTADO
                ================================================= */

                const estadoElemento =
                    nodo.querySelector(
                        '[data-campo="estado"]'
                    );


                if (estadoElemento) {

                    const estado =
                        pedido.estado ||
                        "Pendiente";


                    estadoElemento.textContent =
                        estado;


                    estadoElemento.className =
                        `pedido-estado estado-${estado
                            .toLowerCase()
                            .replace(
                                /\s+/g,
                                "-"
                            )}`;

                }


                /* =================================================
                   FECHA
                ================================================= */

                const fechaElemento =
                    nodo.querySelector(
                        '[data-campo="fecha"]'
                    );


                if (fechaElemento) {

                    if (
                        pedido.fecha &&
                        pedido.fecha.toDate
                    ) {

                        const fecha =
                            pedido.fecha.toDate();


                        fechaElemento.textContent =
                            fecha.toLocaleString(
                                "es-PE"
                            );

                    }

                    else {

                        fechaElemento.textContent =
                            "Fecha no disponible";

                    }

                }


                /* =================================================
                   DETALLE
                ================================================= */

                const detalle =
                    nodo.querySelector(
                        '[data-campo="detalle"]'
                    );


                if (detalle) {

                    detalle.innerHTML =
                        "";


                    const productos =
                        Array.isArray(
                            pedido.detalle_pedido
                        )
                            ? pedido.detalle_pedido
                            : [];


                    productos.forEach(

                        item => {

                            const productoNodo =
                                plantillaProducto
                                    .content
                                    .cloneNode(true);


                            const nombre =
                                productoNodo.querySelector(
                                    '[data-campo="nombre"]'
                                );


                            const cantidad =
                                productoNodo.querySelector(
                                    '[data-campo="cantidad"]'
                                );


                            const subtotal =
                                productoNodo.querySelector(
                                    '[data-campo="subtotal"]'
                                );


                            if (nombre) {

                                nombre.textContent =
                                    item.nombre ||
                                    "Producto";

                            }


                            if (cantidad) {

                                cantidad.textContent =
                                    `x${Number(
                                        item.cantidad || 0
                                    )}`;

                            }


                            if (subtotal) {

                                subtotal.textContent =
                                    `S/ ${Number(
                                        item.subtotal || 0
                                    ).toFixed(2)}`;

                            }


                            detalle.appendChild(
                                productoNodo
                            );

                        }

                    );

                }


                /* =================================================
                   TOTAL
                ================================================= */

                const totalElemento =
                    nodo.querySelector(
                        '[data-campo="total"]'
                    );


                if (totalElemento) {

                    totalElemento.textContent =
                        `S/ ${Number(
                            pedido.total || 0
                        ).toFixed(2)}`;

                }


                /* =================================================
                   AGREGAR PEDIDO
                ================================================= */

                lista.appendChild(
                    nodo
                );

            }

        );


    } catch (error) {

        console.error(
            "❌ Error cargando pedidos:",
            error
        );


        if (cargando) {

            cargando.textContent =
                "No se pudieron cargar los pedidos.";

            cargando.style.display =
                "block";

        }

    }

}


/* =====================================================
   INICIAR
===================================================== */

cargarPedidos();