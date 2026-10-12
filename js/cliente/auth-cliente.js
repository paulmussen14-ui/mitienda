import {
    onAuthStateChanged,
    signInAnonymously,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    linkWithCredential,
    EmailAuthProvider,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import { authCliente as auth, dbCliente } from "../config/firebase-cliente.js";

let clienteIdPromise = null;

/* =====================================================
   SESIÓN DEL CLIENTE
   Todo visitante tiene una sesión (anónima al inicio).
   Al crear su cuenta, esa MISMA sesión se convierte en
   registrada (mismo uid), así que conserva su carrito.
===================================================== */

export function obtenerClienteId() {

    if (clienteIdPromise) {
        return clienteIdPromise;
    }

    clienteIdPromise = new Promise((resolve, reject) => {

        const cancelarListener = onAuthStateChanged(
            auth,
            (usuario) => {

                if (usuario) {
                    cancelarListener();
                    console.log("👤 Cliente (uid):", usuario.uid);
                    resolve(usuario.uid);
                    return;
                }

                // Todavía no hay sesión: inicia una anónima.
                // onAuthStateChanged se volverá a disparar cuando
                // Firebase confirme el login y entrará al `if` de arriba.
                signInAnonymously(auth).catch((error) => {
                    cancelarListener();
                    reject(error);
                });

            },
            (error) => {
                reject(error);
            }
        );

    });

    return clienteIdPromise;
}

// Después de iniciar o cerrar sesión, el uid cambia: hay que olvidar el anterior.
export function reiniciarClienteId() {
    clienteIdPromise = null;
}

// Devuelve el usuario actual (o null) una vez que Firebase terminó de restaurar la sesión.
export async function obtenerSesionCliente() {
    await auth.authStateReady();
    return auth.currentUser;
}

export async function esClienteRegistrado() {
    const usuario = await obtenerSesionCliente();
    return !!usuario && !usuario.isAnonymous;
}


/* =====================================================
   PERFIL (colección "clientes", documento = uid)
===================================================== */

export async function obtenerPerfilCliente(uid) {
    const snap = await getDoc(doc(dbCliente, "clientes", uid));
    return snap.exists() ? snap.data() : null;
}

export async function guardarPerfilCliente(uid, { nombre, telefono, correo }) {
    await setDoc(doc(dbCliente, "clientes", uid), {
        nombre,
        telefono,
        correo,
        creado_en: serverTimestamp()
    });
}


/* =====================================================
   REGISTRO / LOGIN / LOGOUT
===================================================== */

export async function registrarCliente({ nombre, telefono, correo, contrasena }) {

    await auth.authStateReady();

    const actual = auth.currentUser;
    let usuario;

    if (actual && actual.isAnonymous) {
        // Convierte la sesión anónima en cuenta real (conserva uid, carrito y pedidos).
        const credencial = EmailAuthProvider.credential(correo, contrasena);
        const resultado = await linkWithCredential(actual, credencial);
        usuario = resultado.user;
    } else {
        const resultado = await createUserWithEmailAndPassword(auth, correo, contrasena);
        usuario = resultado.user;
    }

    // Refresca el token para que ya figure como cuenta de correo (no anónima).
    await usuario.getIdToken(true);
    reiniciarClienteId();

    try {
        await guardarPerfilCliente(usuario.uid, { nombre, telefono, correo });
    } catch (error) {
        console.error("❌ No se pudo guardar el perfil:", error);
        const falla = new Error(
            "Tu cuenta se creó, pero no se pudieron guardar tus datos. " +
            "Completa tus datos para continuar."
        );
        falla.codigo = "PERFIL_PENDIENTE";
        throw falla;
    }

    return usuario;
}

export async function iniciarSesionCliente(correo, contrasena) {

    const resultado = await signInWithEmailAndPassword(auth, correo, contrasena);
    reiniciarClienteId();

    const perfil = await obtenerPerfilCliente(resultado.user.uid);
    return { usuario: resultado.user, perfil };
}

export async function cerrarSesionCliente() {
    await signOut(auth);
    reiniciarClienteId();
}

export function traducirErrorAuth(error) {

    switch (error?.code) {
        case "auth/email-already-in-use":
        case "auth/credential-already-in-use":
            return "Ese correo ya tiene una cuenta. Usa la pestaña \"Ingresar\".";
        case "auth/invalid-email":
            return "El correo no es válido.";
        case "auth/weak-password":
            return "La contraseña es muy débil (mínimo 6 caracteres).";
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
            return "Correo o contraseña incorrectos.";
        case "auth/too-many-requests":
            return "Demasiados intentos. Espera unos minutos e intenta de nuevo.";
        case "auth/network-request-failed":
            return "No hay conexión. Revisa tu internet.";
        default:
            return error?.message || "Ocurrió un error. Intenta de nuevo.";
    }
}
