/* =====================================================
   CHECKOUT: datos de entrega y pago SIMULADO
   Los pagos son una simulación académica: no se cobra nada.
   Del formulario de tarjeta solo se envía a la API el
   método y los últimos 4 dígitos; el resto nunca sale
   del navegador ni se guarda.
===================================================== */

const $ = (id) => document.getElementById(id);

function metodoPagoElegido() {
    return document.querySelector('input[name="pago"]:checked')?.value || "efectivo";
}

function entregaElegida() {
    return document.querySelector('input[name="entrega"]:checked')?.value || "recojo";
}

// Algoritmo de Luhn: valida que el número de tarjeta de prueba sea coherente.
function luhnValido(numero) {
    let suma = 0;
    let doble = false;
    for (let i = numero.length - 1; i >= 0; i--) {
        let digito = Number(numero[i]);
        if (doble) {
            digito *= 2;
            if (digito > 9) digito -= 9;
        }
        suma += digito;
        doble = !doble;
    }
    return suma % 10 === 0;
}

function vencimientoValido(texto) {
    const m = /^(\d{2})\/(\d{2})$/.exec(texto);
    if (!m) return false;
    const mes = Number(m[1]);
    const anio = 2000 + Number(m[2]);
    if (mes < 1 || mes > 12) return false;
    const finDeMes = new Date(anio, mes, 0, 23, 59, 59);
    return finDeMes >= new Date();
}

function actualizarPaneles() {
    const metodo = metodoPagoElegido();
    $("pago-operacion").style.display = (metodo === "yape" || metodo === "plin") ? "block" : "none";
    $("pago-tarjeta").style.display = metodo === "tarjeta" ? "block" : "none";
    $("campo-direccion").style.display = entregaElegida() === "delivery" ? "block" : "none";

    const etiqueta = $("etiqueta-operacion");
    if (etiqueta) etiqueta.textContent = metodo === "plin" ? "Plin" : "Yape";
}

export function iniciarCheckout() {

    if (!$("checkout")) return;

    document.querySelectorAll('input[name="pago"], input[name="entrega"]').forEach((radio) => {
        radio.addEventListener("change", actualizarPaneles);
    });

    // Formato amigable mientras escribe.
    $("co-tarjeta").addEventListener("input", (e) => {
        const digitos = e.target.value.replace(/\D/g, "").slice(0, 16);
        e.target.value = digitos.replace(/(.{4})/g, "$1 ").trim();
    });
    $("co-vence").addEventListener("input", (e) => {
        const digitos = e.target.value.replace(/\D/g, "").slice(0, 4);
        e.target.value = digitos.length > 2 ? `${digitos.slice(0, 2)}/${digitos.slice(2)}` : digitos;
    });

    actualizarPaneles();
}

/* Lee y valida el formulario. Devuelve { entrega, pago } listo para la API,
   o lanza un Error con un mensaje claro para el cliente. */
export function leerCheckout() {

    const tipo = entregaElegida();
    const entrega = { tipo, nota: $("co-nota").value.trim() };

    if (tipo === "delivery") {
        entrega.direccion = $("co-direccion").value.trim();
        if (entrega.direccion.length < 5) {
            throw new Error("Escribe la dirección de entrega.");
        }
    }

    const metodo = metodoPagoElegido();
    const pago = { metodo };

    if (metodo === "yape" || metodo === "plin") {
        const codigo = $("co-operacion").value.trim();
        if (!/^\d{6,12}$/.test(codigo)) {
            throw new Error("Ingresa el código de operación (6 a 12 dígitos).");
        }
        pago.codigo_operacion = codigo;
    }

    if (metodo === "tarjeta") {
        const numero = $("co-tarjeta").value.replace(/\s/g, "");
        if (!/^\d{16}$/.test(numero) || !luhnValido(numero)) {
            throw new Error("El número de tarjeta no es válido. Para la simulación usa 4242 4242 4242 4242.");
        }
        if (!vencimientoValido($("co-vence").value.trim())) {
            throw new Error("La fecha de vencimiento no es válida (MM/AA).");
        }
        if (!/^\d{3,4}$/.test($("co-cvv").value.trim())) {
            throw new Error("El CVV no es válido.");
        }
        pago.ultimos4 = numero.slice(-4);
    }

    return { entrega, pago };
}

// Limpia los campos de tarjeta para que no queden datos en pantalla.
export function limpiarDatosTarjeta() {
    ["co-tarjeta", "co-vence", "co-cvv"].forEach((id) => { if ($(id)) $(id).value = ""; });
}

// Pequeña espera para que la simulación se sienta como un pago real.
export function simularProcesamiento(pago) {
    if (pago.metodo === "efectivo") return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, 1200));
}
