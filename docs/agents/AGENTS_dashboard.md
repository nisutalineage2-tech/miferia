# AGENTS - Dashboard / Panel Administrativo

## Acceso

- **URL:** `http://localhost:8081/dashboard`
- **Auth:** Requiere sesion de administrador (`requireAuth` + `ensureStore`)
- **Layout:** `views/dashboard/layout.ejs` (sidebar + contenido)
- **Tema:** Dark mode con gradientes `#0f0f1a → #1a1a2e`, acentos indigo/purple

---

## Estructura del Panel

```
/dashboard
├── / (overview)              → Estadisticas + pedidos recientes
├── /setup                    → Crear tienda (solo si no tiene)
├── /productos                → Lista de productos
├── /productos/nuevo          → Crear producto
├── /productos/editar/:id     → Editar producto
├── /categorias               → Gestion de categorias
├── /pedidos                  → Gestion de pedidos
├── /combos                   → Gestion de combos/packs
├── /editor                   → Editor visual de tema
├── /preview                  → Vista previa de la tienda
├── /configuracion            → Configuracion general
└── /configuracion/ventas     → Configuracion de ventas
```

---

## Overview (`/dashboard`)

Muestra:
- **Estadisticas:** total productos, categorias, pedidos
- **Pedidos recientes:** ultimos 5 pedidos con status
- **Accesos rapidos** a secciones principales

---

## CRUD de Productos

### Lista (`/dashboard/productos`)
- Tabla con todos los productos de la tienda
- Columnas: imagen, nombre, categoria, precio, stock, status, featured
- Botones: editar, eliminar
- Link a crear nuevo

### Crear/Editar (`/dashboard/productos/nuevo` y `/editar/:id`)

**Campos basicos:**
- Nombre (requerido)
- Descripcion
- Precio (requerido)
- Precio de comparacion (tachado)
- Categoria (select)
- Stock
- SKU
- Featured (checkbox)
- Status (active/inactive)

**Campos avanzados:**
- Costo
- Tipo de producto (fisico/digital)
- Tipo de stock (limitado/ilimitado)
- Codigo de barras
- Peso, profundidad, ancho, alto
- Tags (JSON array)
- Marca
- Genero
- Rango de edad
- MPN
- Envio gratis (checkbox)
- Meta title (SEO)
- Meta description (SEO)

**Variantes:**
- Agregar variantes dinamicamente (nombre, precio, stock, SKU)
- Las variantes se envian como JSON en el campo `variants`
- Se eliminan y re-crean al guardar

**Descuentos por volumen:**
- Agregar descuentos dinamicamente (cantidad minima, tipo, valor)
- Se envian como JSON en `volume_discounts`
- Se eliminan y re-crean al guardar

**Imagenes:**
- Upload via AJAX a `/api/upload/product`
- Imagen principal + galeria de imagenes multiples
- Establecer imagen principal
- Eliminar imagenes

### Eliminar
```
POST /dashboard/productos/eliminar/:id
→ DELETE FROM products WHERE id = ? AND store_id = ?
→ Redirect a /dashboard/productos
```

---

## CRUD de Categorias

### Lista (`/dashboard/categorias`)
- Lista de categorias con conteo de productos
- Botones: editar (inline), eliminar
- Formulario para crear nueva

### Crear
```
POST /dashboard/categorias/nueva
→ Auto-calcula sort_order (MAX + 1)
→ INSERT INTO categories
```

### Editar
```
POST /dashboard/categorias/editar/:id
→ UPDATE categories SET name, description
```

### Eliminar
```
POST /dashboard/categorias/eliminar/:id
→ UPDATE products SET category_id = NULL (desasocia productos)
→ DELETE FROM categories
```

---

## Gestion de Pedidos

### Lista (`/dashboard/pedidos`)
- Todos los pedidos ordenados por fecha descendente
- Columnas: ID, cliente, fecha, total, status, pago
- Botones para cambiar status y estado de pago

### Cambiar Status
```
POST /dashboard/pedidos/status/:id
→ UPDATE orders SET status = ? (pending/completed/cancelled)
```

### Cambiar Estado de Pago
```
POST /dashboard/pedidos/pago/:id
→ UPDATE orders SET payment_status = ? (pending/paid/unpaid)
```

---

## Combos/Packs

### Lista (`/dashboard/combos`)
- Todos los combos de la tienda
- Nombre, descripcion, precio, productos incluidos

### Crear
```
POST /dashboard/combos/nuevo
→ Campos: name, description, price, products (array de IDs)
→ INSERT INTO combos
```

### Eliminar
```
POST /dashboard/combos/eliminar/:id
→ DELETE FROM combos
```

---

## Editor Visual de Tema (`/dashboard/editor`)

El editor es la vista mas extensa del dashboard (~500 lineas). Permite controlar visualmente todos los aspectos de la tienda.

### Secciones del Editor

#### 1. Template
- Selector de template (template1-template10)
- Cambio instantaneo (se guarda en BD)

#### 2. Datos de la Tienda
- Nombre
- Descripcion
- Texto "Nosotros"
- Logo (upload)
- Banner (upload)
- Colores primario/accent

#### 3. Colores
- Menu: links, hover, fondo, borde
- Titulos: texto, fondo
- Body: fondo, texto
- Botones: primario (bg + text), secundario
- Labels: fondo, texto
- Footer: fondo, texto
- Presets predefinidos

#### 4. Fuentes
- Headings
- Menus
- Titulos de productos
- Botones
- Body

#### 5. Header
- Ancho de columna (full/boxed)
- Posicion del logo (left/center/right)
- Tamano del logo
- Color de fondo
- Sticky header
- Busqueda mobile
- Mega menu
- Tab menu mobile
- Barra de anuncios (show, bg, text, link)

#### 6. Background del Sitio
- Imagen de fondo
- Repeticion
- Tamano

#### 7. Homepage
- Hero (on/off)
- Carrusel
- Banners de categorias
- Banners promocionales
- Mensaje institucional
- Productos destacados
- Productos en oferta
- Banner horizontal
- Modulos
- Video
- Posts de Instagram
- Categorias principales
- Info de envio
- Newsletter

#### 8. Listing de Productos
- Scroll infinito
- Variantes por color
- Hover con imagen
- Carousel de imagenes
- Quick buy
- Mostrar cuotas

#### 9. Detalle de Producto
- Color swatches
- Link guia de talles
- Mostrar stock
- Alerta de bajo stock
- Umbral de bajo stock
- Mensaje "ultima unidad"
- Titulo de relacionados
- Titulo de complementarios
- Bloques de info (hasta 3)
- Comentarios de Facebook

#### 10. Carrito
- Ver mas productos
- Compra minima
- Carrito rapido
- Accion del carrito rapido (drawer)
- Recomendaciones
- Cupones
- Calculadora de envio

#### 11. Footer
- Mostrar contacto
- Mostrar redes sociales
- Mostrar metodos de pago

#### 12. Redes Sociales
- WhatsApp
- Instagram
- Facebook
- Twitter
- TikTok
- YouTube

#### 13. Imagenes Hero
- Hasta 5 imagenes para el carrusel hero

#### 14. Filtros de Tienda
- Categorias
- Rango de precios
- Busqueda
- Ordenamiento
- Marcas
- Colores/Talles
- Genero
- Envio gratis

#### 15. CSS Avanzado
- Campo de texto para CSS personalizado

### Guardado
```
POST /dashboard/editor
→ Construye objeto theme con todas las secciones
→ Guarda en stores.theme_settings (JSON)
→ Guarda advanced_css
→ Guarda filter_settings (JSON)
→ Guarda hero_images (JSON)
→ Actualiza campos de la tienda (template, name, description, etc.)
→ Redirect a /dashboard/editor
```

---

## Preview (`/dashboard/preview`)

- Renderiza la tienda publica del usuario
- Soporta `?template=templateN` para cambiar template instantaneamente sin guardar
- Muestra home de la tienda con datos reales

---

## Configuracion General (`/dashboard/configuracion`)

- Nombre de la tienda
- Descripcion
- Texto "Nosotros"
- Logo
- Banner
- Colores primario/accent
- Redes sociales

---

## Configuracion de Ventas (`/dashboard/configuracion/ventas`)

### Compra Minima
- Campo numerico para monto minimo de compra
- Se valida al crear orden (`/api/order/place`)

### Metodos de Pago
Checkboxes para habilitar:
- Efectivo
- Transferencia Bancaria
- Mercado Pago
- Tarjeta de Credito/Debito
- Criptomonedas
- Otro

### Descuentos por Metodo de Pago
- Campo numerico por cada metodo habilitado
- Se aplican en el checkout

### Retiro en Local
- Checkbox para habilitar
- Direccion del local
- Descuento por retiro (monto fijo)

---

## Variables Disponibles en Vistas del Dashboard

```javascript
title         // Titulo de la pagina
store         // Objeto tienda completo
user          // Objeto usuario (id, email, name)
section       // Seccion activa (overview, products, categories, orders, etc.)
currentPath   // Ruta actual

// Especificas por seccion:
products      // Array de productos (en products.ejs)
categories    // Array de categorias (en categories.ejs)
orders        // Array de pedidos (en orders.ejs)
combos        // Array de combos (en combos.ejs)
productsCount // Conteo de productos (en overview)
categoriesCount // Conteo de categorias (en overview)
ordersCount   // Conteo de pedidos (en overview)
recentOrders  // Ultimos 5 pedidos (en overview)
```
