import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    updateDoc,
    addDoc,
    increment,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import { db } from "../config/firebase.js";

/**
 * Obtener el stock actual de un producto
 */
export async function obtenerStock(productoId) {
    try {
        const referencia = doc(db, "productos", productoId);
        const resultado = await getDoc(referencia);

        if (!resultado.exists()) {
            return null;
        }

        return Number(resultado.data().stock) || 0;

    } catch (error) {
        console.error("❌ Error obteniendo stock:", error);
        throw error;
    }
}


/**
 * Registrar entrada de inventario
 */
export async function registrarEntrada(
    productoId,
    negocioId,
    cantidad,
    motivo = "Compra"
) {
    try {

        if (cantidad <= 0) {
            throw new Error("La cantidad debe ser mayor que 0.");
        }

        const productoRef = doc(db, "productos", productoId);

        // Aumentar stock
        await updateDoc(productoRef, {
            stock: increment(cantidad)
        });

        // Registrar movimiento
        await addDoc(collection(db, "movimientos_inventario"), {
            producto_id: productoId,
            negocio_id: negocioId,
            tipo: "entrada",
            cantidad: cantidad,
            motivo: motivo,
            fecha: serverTimestamp()
        });

        return true;

    } catch (error) {
        console.error("❌ Error registrando entrada:", error);
        throw error;
    }
}


/**
 * Registrar salida de inventario
 */
export async function registrarSalida(
    productoId,
    negocioId,
    cantidad,
    motivo = "Salida"
) {
    try {

        if (cantidad <= 0) {
            throw new Error("La cantidad debe ser mayor que 0.");
        }

        const productoRef = doc(db, "productos", productoId);

        // Obtener stock actual
        const producto = await getDoc(productoRef);

        if (!producto.exists()) {
            throw new Error("El producto no existe.");
        }

        const stockActual = Number(producto.data().stock) || 0;

        if (cantidad > stockActual) {
            throw new Error("No hay suficiente stock disponible.");
        }

        // Disminuir stock
        await updateDoc(productoRef, {
            stock: increment(-cantidad)
        });

        // Registrar movimiento
        await addDoc(collection(db, "movimientos_inventario"), {
            producto_id: productoId,
            negocio_id: negocioId,
            tipo: "salida",
            cantidad: cantidad,
            motivo: motivo,
            fecha: serverTimestamp()
        });

        return true;

    } catch (error) {
        console.error("❌ Error registrando salida:", error);
        throw error;
    }
}


/**
 * Obtener movimientos de inventario de un negocio
 */
export async function obtenerMovimientos(negocioId) {
    try {

        const referencia = query(
            collection(db, "movimientos_inventario"),
            where("negocio_id", "==", negocioId)
        );

        const resultado = await getDocs(referencia);

        return resultado.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

    } catch (error) {
        console.error("❌ Error obteniendo movimientos:", error);
        throw error;
    }
}