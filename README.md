# 🛒 MiTienda

**MiTienda** es una aplicación web tipo *marketplace* pensada para dar soporte a micro y pequeños emprendimientos (minimarkets, bodegas de barrio, negocios personales, etc.), permitiéndoles crear su propia tienda en línea y gestionar productos, pedidos e inventario desde un panel administrativo.

Proyecto desarrollado para la Unidad Didáctica **Desarrollo y soporte de aplicaciones multiplataforma** — Actividad de Aprendizaje 1 (AA1): *"Mi emprendimiento online"*.

---

## 📌 Descripción

Ante la necesidad de que pequeños negocios encuentren canales de venta alternativos, MiTienda funciona como una plataforma **multi-tienda**: cada negocio puede registrarse, obtener su propio espacio dentro del marketplace y ofrecer sus productos a sus clientes a través de una tienda en línea con carrito de compras, gestión de pedidos y panel de administración propio.

## ✨ Funcionalidades principales

### Lado cliente
- 🏠 Página de inicio (marketplace) con navegación a las tiendas
- 🛍️ Catálogo de productos por categoría (abarrotes, bebidas, snacks, limpieza, etc.)
- 🛒 Carrito de compras
- 📦 Seguimiento de pedidos
- 🏪 Registro y creación de tienda propia (nuevo emprendimiento)
- 🔑 Recuperación de contraseña
- ✉️ Formulario de contacto

### Panel administrativo (por negocio)
- 🔐 Login de administrador
- 📊 Dashboard / resumen general
- 📦 Gestión de inventario
- 🛒 Gestión de productos
- 📋 Gestión de pedidos
- 💰 Registro de ventas
- 👥 Gestión de usuarios
- ⚙️ Configuración del negocio

## 🧱 Arquitectura y tecnologías

| Capa | Tecnología |
|---|---|
| **Presentación** | HTML5, CSS3 (estilos propios, sin frameworks CSS) |
| **Lógica de cliente** | JavaScript (ES Modules) |
| **Backend / Base de datos** | Firebase (Firestore como base de datos NoSQL) |
| **Autenticación** | Firebase Authentication |
| **Almacenamiento de archivos** | Firebase Storage |
| **Hosting local de desarrollo** | live-server |

El proyecto sigue una arquitectura de n-capas apoyada en **Firebase como Backend-as-a-Service (BaaS)**: el cliente (HTML/CSS/JS) se comunica directamente con los servicios de Firebase (Firestore, Auth, Storage) sin necesidad de un servidor propio intermedio.

## 🗂️ Estructura del proyecto

```
mitienda/
├── index.html                 # Página principal (marketplace)
├── pages/                     # Páginas del cliente
│   ├── carrito.html
│   ├── contacto.html
│   ├── pedidos.html
│   ├── productos.html
│   ├── recuperar.html
│   ├── registro.html
│   └── admin/                 # Panel administrativo
│       ├── login.html
│       ├── index.html
│       ├── productos.html
│       ├── inventario.html
│       ├── pedidos.html
│       ├── ventas.html
│       ├── usuarios.html
│       └── configuracion.html
├── css/                        # Estilos por sección
├── js/                         # Lógica de la aplicación
│   ├── firebase.js             # Configuración de Firebase
│   ├── auth.js / auth-cliente.js
│   ├── negocios.js             # Manejo de tienda/negocio actual
│   ├── productos.js / carrito.js / pedidos.js / ventas.js
│   └── admin-*.js              # Lógica del panel administrativo
├── assets/icons/                # Íconos y favicon
└── package.json
```

## 🗃️ Entidades de almacenamiento (Firestore)

- **Negocios** — datos de cada tienda/emprendimiento registrado
- **Usuarios** — clientes y administradores
- **Productos** — catálogo por negocio, con categoría
- **Pedidos** — órdenes generadas desde el carrito
- **Ventas** — registro de transacciones concretadas
- **Inventario** — stock disponible por producto

## 🚀 Nueva tendencia propuesta

Como propuesta de mejora futura, se plantea incorporar **recomendaciones personalizadas basadas en analítica de compras** (sugerencia de productos según historial del cliente), lo que potenciaría la fidelización dentro del marketplace. *(Simulación / propuesta, no implementada aún.)*

## 👥 Autores

Proyecto grupal — Actividad de Aprendizaje 1 (AA1)
Jean Paul Moncada Nateros
