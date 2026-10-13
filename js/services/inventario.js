import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import { db, auth } from "../config/firebase.js";
import { llamarApi } from "../config/api.js";


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
 * Registrar una entrada o salida manual de inventario.
 * La lógica (validar, cambiar el stock y crear el movimiento en una sola
 * transacción) vive en mitienda-api; aquí solo se envía el token de
 * Firebase del personal del negocio. El negocio lo determina la API
 * a partir del token, no el navegador.
 */
async function registrarMovimiento(productoId, tipo, cantidad, motivo) {

    try {

        if (!(Number(cantidad) > 0)) {
            throw new Error("La cantidad debe ser mayor que 0.");
        }

        await auth.authStateReady();

        if (!auth.currentUser) {
            throw new Error("Tu sesión expiró. Inicia sesión nuevamente.");
        }

        const token = await auth.currentUser.getIdToken();

        await llamarApi("/inventario/movimientos", {
            metodo: "POST",
            token,
            cuerpo: {
                producto_id: productoId,
                tipo,
                cantidad: Number(cantidad),
                motivo
            }
        });

        return true;

    } catch (error) {
        console.error(`❌ Error registrando ${tipo}:`, error);
        throw error;
    }
}


/**
 * Registrar entrada de inventario
 */
export function registrarEntrada(
    productoId,
    _negocioId,
    cantidad,
    motivo = "Compra"
) {
    return registrarMovimiento(productoId, "entrada", cantidad, motivo);
}


/**
 * Registrar salida de inventario
 */
export function registrarSalida(
    productoId,
    _negocioId,
    cantidad,
    motivo = "Salida"
) {
    return registrarMovimiento(productoId, "salida", cantidad, motivo);
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