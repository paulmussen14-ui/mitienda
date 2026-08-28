import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import { db } from "./firebase.js";

async function cargarProductos() {

    try {

        const referencia = collection(db, "productos");
        const resultado = await getDocs(referencia);

        const productos = resultado.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log("✅ Productos:", productos);

        const contenedor = document.getElementById("lista-productos");

        contenedor.innerHTML = "";

        productos.forEach(producto => {

            const tarjeta = document.createElement("div");

            tarjeta.innerHTML = `
                <h2>${producto.nombre}</h2>

                <p>${producto.descripcion}</p>

                <p>
                    <strong>Precio:</strong>
                    S/ ${Number(producto.precio).toFixed(2)}
                </p>

                <p>
                    <strong>Stock:</strong>
                    ${producto.stock}
                </p>

                <p>
                    <strong>Categoría:</strong>
                    ${producto.categoria}
                </p>
            `;

            contenedor.appendChild(tarjeta);
        });

    } catch (error) {

        console.error("❌ Error Firebase:", error);

    }
}

cargarProductos();