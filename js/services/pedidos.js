import { obtenerNegocioActual } from "./negocios.js";
import { obtenerClienteId, obtenerPerfilCliente } from "../cliente/auth-cliente.js";
import { llamarApi } from "../config/api.js";
import { authCliente } from "../config/firebase-cliente.js";

/* =====================================================
   CREAR PEDIDO
   La lógica de negocio (validar carrito, numerar el pedido
   y convertir el carrito) vive en mitienda-api.
===================================================== */

export async function crearPedido() {

    const negocio = await obtenerNegocioActual();

    if (!negocio) {
        throw new Error("No se encontró la tienda actual.");
    }

    // Espera a que haya sesión (anónima o registrada) y toma su token:
    // la API deduce el cliente desde el token, ya no desde el body.
    const clienteId = await obtenerClienteId();

    // Solo los clientes registrados (con su perfil completo) pueden hacer pedidos.
    const usuarioActual = authCliente.currentUser;
    const perfil = usuarioActual && !usuarioActual.isAnonymous
        ? await obtenerPerfilCliente(clienteId)
        : null;

    if (!perfil) {
        const falla = new Error("Crea tu cuenta o inicia sesión para confirmar tu pedido.");
        falla.codigo = "REQUIERE_CUENTA";
        throw falla;
    }

    const token = await authCliente.currentUser.getIdToken();

    const respuesta = await llamarApi("/pedidos", {
        metodo: "POST",
        token,
        cuerpo: {
            negocio_id: negocio.id
        }
    });

    return {
        correcto: true,
        pedidoId: respuesta.pedido_id,
        numeroPedido: respuesta.numero_pedido,
        total: respuesta.total,
        clienteId: clienteId,
        negocioId: negocio.id
    };
}
