import {
    collection,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import { db } from "../config/firebase.js";
import { obtenerNegocioActual, configurarNavegacionNegocio } from "../services/negocios.js";


let negocioActual = null;


/* ============================================================
   INICIAR
============================================================ */

async function iniciarContacto() {

    try {

        negocioActual =
            await obtenerNegocioActual();


        if (!negocioActual) {

            mostrarError(
                "No se encontró esta tienda."
            );

            return;
        }


        configurarEncabezado();

        configurarNavegacionNegocio(negocioActual);

        configurarFormulario();


    } catch (error) {

        console.error(
            "❌ Error iniciando contacto:",
            error
        );

        mostrarError(
            "No se pudo cargar la tienda."
        );

    }

}


/* ============================================================
   ENCABEZADO
============================================================ */

function configurarEncabezado() {

    const nombre =
        negocioActual.nombre ||
        "Tienda";


    document.title =
        `Contacto · ${nombre}`;


    const nombreElemento =
        document.getElementById(
            "nombre-negocio"
        );


    if (nombreElemento) {

        nombreElemento.textContent =
            `Escríbele a ${nombre}`;

    }


    const direccionElemento =
        document.getElementById(
            "info-direccion"
        );

    if (direccionElemento) {

        direccionElemento.textContent =
            negocioActual.direccion ||
            "Dirección no disponible";

    }


    const horarioElemento =
        document.getElementById(
            "info-horario"
        );

    if (horarioElemento) {

        horarioElemento.textContent =
            negocioActual.horario ||
            "Horario no disponible";

    }

}


/* ============================================================
   FORMULARIO
============================================================ */

function configurarFormulario() {

    const form =
        document.getElementById(
            "form-contacto"
        );

    const errorElemento =
        document.getElementById(
            "contacto-error"
        );

    const exitoElemento =
        document.getElementById(
            "contacto-exito"
        );

    const boton =
        document.getElementById(
            "btn-enviar-contacto"
        );


    if (!form) return;


    function mostrarErrorFormulario(texto) {

        if (errorElemento) {

            errorElemento.textContent = texto;
            errorElemento.style.display = "block";

        }

    }


    form.addEventListener(
        "submit",
        async (evento) => {

            evento.preventDefault();

            if (errorElemento) {
                errorElemento.style.display = "none";
            }


            const nombre =
                document.getElementById("contacto-nombre").value.trim();

            const contactoInfo =
                document.getElementById("contacto-email").value.trim();

            const tipo =
                document.getElementById("contacto-tipo").value;

            const mensaje =
                document.getElementById("contacto-mensaje").value.trim();


            if (!nombre || !contactoInfo || !mensaje) {

                mostrarErrorFormulario(
                    "Completa todos los campos."
                );

                return;

            }


            try {

                boton.disabled = true;
                boton.textContent = "Enviando...";


                await addDoc(
                    collection(db, "mensajes"),
                    {
                        negocio_id: negocioActual.id,
                        nombre,
                        contacto: contactoInfo,
                        tipo,
                        mensaje,
                        estado: "nuevo",
                        creadoEn: serverTimestamp()
                    }
                );


                form.style.display = "none";

                if (exitoElemento) {
                    exitoElemento.style.display = "block";
                }


            } catch (error) {

                console.error(
                    "❌ Error enviando mensaje:",
                    error
                );

                mostrarErrorFormulario(
                    "No se pudo enviar tu mensaje. Intenta de nuevo."
                );

                boton.disabled = false;
                boton.textContent = "Enviar mensaje";

            }

        }
    );

}


/* ============================================================
   MOSTRAR ERROR
============================================================ */

function mostrarError(mensaje) {

    const main =
        document.querySelector("main.page");


    if (main) {

        main.innerHTML = `
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

iniciarContacto();