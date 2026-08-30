import {
    collection,
    doc,
    getDoc,
    runTransaction,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import { db } from "../config/firebase.js";
import { obtenerNegocioActual } from "./negocios.js";


/**
 * Registrar una venta a partir de un pedido.
 *
 * Esta operación:
 * 1. Busca el pedido.
 * 2. Verifica que pertenezca al negocio actual.
 * 3. Verifica el stock de todos los productos.
 * 4. Descuenta el stock.
 * 5. Registra el movimiento de inventario.
 * 6. Crea la venta.
 * 7. Actualiza el estado del pedido.
 *
 * Todo se realiza dentro de una transacción.
 */
export async function registrarVenta(pedidoId) {

    try {

        const negocio = await obtenerNegocioActual();

        if (!negocio) {
            throw new Error("No se encontró el negocio.");
        }

        const pedidoRef = doc(
            db,
            "pedidos",
            pedidoId
        );

        const ventaRef = doc(
            collection(db, "ventas")
        );

        const resultado = await runTransaction(
            db,
            async (transaction) => {

                // --------------------------------
                // 1. OBTENER PEDIDO
                // --------------------------------

                const pedidoSnap =
                    await transaction.get(pedidoRef);

                if (!pedidoSnap.exists()) {
                    throw new Error(
                        "El pedido no existe."
                    );
                }

                const pedido = pedidoSnap.data();


                // --------------------------------
                // 2. VERIFICAR NEGOCIO
                // --------------------------------

                if (
                    pedido.negocio_id !== negocio.id
                ) {
                    throw new Error(
                        "El pedido pertenece a otro negocio."
                    );
                }


                // --------------------------------
                // 3. VERIFICAR ESTADO
                // --------------------------------

                if (
                    pedido.estado === "Cancelado"
                ) {
                    throw new Error(
                        "No se puede registrar una venta de un pedido cancelado."
                    );
                }

                if (
                    pedido.estado === "Entregado"
                ) {
                    throw new Error(
                        "Este pedido ya fue entregado."
                    );
                }


                // --------------------------------
                // 4. OBTENER DETALLE
                // --------------------------------

                const detalle =
                    pedido.detalle_pedido || [];

                if (detalle.length === 0) {
                    throw new Error(
                        "El pedido no contiene productos."
                    );
                }


                const productos = [];


                // --------------------------------
                // 5. VERIFICAR STOCK
                // --------------------------------

                for (const item of detalle) {

                    const productoRef = doc(
                        db,
                        "productos",
                        item.producto_id
                    );

                    const productoSnap =
                        await transaction.get(
                            productoRef
                        );

                    if (!productoSnap.exists()) {
                        throw new Error(
                            `El producto "${item.nombre}" no existe.`
                        );
                    }

                    const producto =
                        productoSnap.data();


                    // Verificar que pertenece
                    // al negocio correcto
                    if (
                        producto.negocio_id !== negocio.id
                    ) {
                        throw new Error(
                            `El producto "${item.nombre}" pertenece a otro negocio.`
                        );
                    }


                    const stockActual =
                        Number(producto.stock) || 0;

                    const cantidad =
                        Number(item.cantidad) || 0;


                    if (cantidad <= 0) {
                        throw new Error(
                            `Cantidad inválida para "${item.nombre}".`
                        );
                    }


                    if (cantidad > stockActual) {
                        throw new Error(
                            `Stock insuficiente para "${item.nombre}". Disponible: ${stockActual}.`
                        );
                    }


                    productos.push({
                        productoId: item.producto_id,
                        productoRef: productoRef,
                        stockActual: stockActual,
                        cantidad: cantidad,
                        nombre: item.nombre
                    });
                }


                // --------------------------------
                // 6. DESCONTAR STOCK
                // --------------------------------

                for (const producto of productos) {

                    const nuevoStock =
                        producto.stockActual -
                        producto.cantidad;

                    transaction.update(
                        producto.productoRef,
                        {
                            stock: nuevoStock
                        }
                    );


                    // --------------------------------
                    // 7. REGISTRAR MOVIMIENTO
                    // --------------------------------

                    const movimientoRef = doc(
                        collection(
                            db,
                            "movimientos_inventario"
                        )
                    );

                    transaction.set(
                        movimientoRef,
                        {
                            producto_id:
                                producto.productoId,

                            negocio_id:
                                negocio.id,

                            tipo:
                                "salida",

                            cantidad:
                                producto.cantidad,

                            motivo:
                                "Venta",

                            fecha:
                                serverTimestamp()
                        }
                    );
                }


                // --------------------------------
                // 8. CREAR VENTA
                // --------------------------------

                const venta = {

                    cliente_id:
                        pedido.cliente_id || null,

                    negocio_id:
                        pedido.negocio_id,

                    detalle_venta:
                        detalle,

                    subtotal:
                        Number(pedido.subtotal) || 0,

                    total:
                        Number(pedido.total) || 0,

                    estado:
                        "Completada",

                    fecha:
                        serverTimestamp(),

                    pedido_id:
                        pedidoId
                };


                transaction.set(
                    ventaRef,
                    venta
                );


                // --------------------------------
                // 9. ACTUALIZAR PEDIDO
                // --------------------------------

                transaction.update(
                    pedidoRef,
                    {
                        estado: "Entregado"
                    }
                );


                return venta;
            }
        );


        return {

            correcto: true,

            venta_id:
                ventaRef.id,

            venta:
                resultado
        };


    } catch (error) {

        console.error(
            "❌ Error registrando venta:",
            error
        );

        throw error;
    }
}


/**
 * Obtener una venta por ID
 */
export async function obtenerVenta(ventaId) {

    try {

        const referencia = doc(
            db,
            "ventas",
            ventaId
        );

        const resultado =
            await getDoc(referencia);

        if (!resultado.exists()) {
            return null;
        }

        return {
            id: resultado.id,
            ...resultado.data()
        };

    } catch (error) {

        console.error(
            "❌ Error obteniendo venta:",
            error
        );

        throw error;
    }
}