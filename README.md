![Logo MiTienda](img/logo.png)

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

## 🎨 Identidad visual

Paleta de colores definida para la tienda de ejemplo **Bodega Pepe**, pensada para transmitir identidad local (bodegas/minimarkets de barrio) y mantener buen contraste en las vistas de cliente y administrador:

| Color | Código | Uso |
|---|---|---|
| 🟩 Verde toldo | `#1F5C4A` | Header, navbar, banner del negocio, botones principales, chips activos |
| 🟧 Mostaza | `#E8973E` | Botones de acción (Agregar, Realizar pedido, Continuar), precios, badges de estado |

**¿Por qué estos colores?**
- **Verde toldo** evoca los toldos de lona típicos de las bodegas de barrio en Perú, dando identidad local inmediata.
- **Mostaza** funciona como acento cálido para llamadas a la acción y precios, de modo que el ojo del cliente los ubique rápido en el catálogo.
- La combinación verde oscuro + mostaza + fondo crema mantiene buen contraste (AA) para texto y botones, y se aplica de forma consistente en las 8 pantallas del bosquejo (vista cliente y vista administrador), cumpliendo el requisito de "mismo estilo visual".

## 📱 Bosquejo navegable (capturas)

![Capturas del bosquejo navegable de MiTienda en móvil](img/capturas-movil.png)

Vistas del bosquejo navegable — Evidencia AA1:

1. **Home** — landing del negocio (Bodega Pepe) con destacados y datos de contacto
2. **Catálogo** — productos filtrables por categoría
3. **Carrito** — resumen de pedido con subtotal y total
4. **Login/Registro** — acceso de cliente y acceso como administrador
5. **Panel admin** — resumen de ventas, pedidos y stock
6. **Productos** (admin) — administración del catálogo
7. **Pedidos** (admin) — estado de pedidos de los clientes
8. **Personalización** (admin) — configuración de colores, nombre, dirección y horario de la tienda

## 🧱 Arquitectura y tecnologías

| Capa | Tecnología |
|---|---|
| **Presentación** | HTML5, CSS3 (estilos propios, sin frameworks CSS) |
| **Lógica de cliente** | JavaScript (ES Modules) |
| **Backend / Base de datos** | Firebase (Firestore como base de datos NoSQL) |
| **Autenticación** | Firebase Authentication |
| **Almacenamiento de archivos** | Firebase Storage |
| **Entorno de ejecución** | live-server (desarrollo local) — servicios de datos, auth y storage siempre en la nube vía Firebase |

El proyecto sigue una arquitectura de n-capas apoyada en **Firebase como Backend-as-a-Service (BaaS)**: el cliente (HTML/CSS/JS) se comunica directamente con los servicios de Firebase (Firestore, Auth, Storage) sin necesidad de un servidor propio intermedio.

> ☁️ **Cloud Computing:** toda la base de datos, autenticación y almacenamiento de archivos corren en la nube (Google Cloud, a través de Firebase). En esta etapa del proyecto (AA1) el enfoque es únicamente el uso de servicios en la nube; la parte de pipelines, contenedores (Docker) y despliegue automatizado corresponde a etapas posteriores (AA2 en adelante).

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

- Jean Paul Moncada

Proyecto grupal — Actividad de Aprendizaje 1 (AA1)
Jean Paul Moncada Nateros