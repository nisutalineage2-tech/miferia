# AGENTS - Backend / API

## Arquitectura de Rutas

El backend esta organizado en 5 archivos de rutas, cada uno con un dominio de responsabilidad:

```
app.js
├── /auth        → routes/auth.js        (autenticacion administradores)
├── /dashboard   → routes/dashboard.js   (panel administrativo)
├── /            → routes/storefront.js  (tienda publica)
├── /api         → routes/api.js         (API REST)
└── /customer    → routes/customer.js    (clientes de tiendas)
```

---

## Middleware de Autenticacion (`middleware/auth.js`)

3 funciones exportadas:

```javascript
requireAuth          // Verifica session.userId → redirige a /auth/login
requireStoreAuth     // Verifica session.userId + session.storeId → redirige a /dashboard/setup o /auth/login
guestOnly            // Si esta logueado → redirige a /dashboard
```

**Uso en rutas:**
```javascript
router.use(requireAuth);           // Todas las rutas del dashboard requieren auth
function ensureStore(req, res, next) { ... }  // Verifica que la tienda exista
```

---

## Autenticacion (`routes/auth.js`)

### Flujo de Login
```
POST /auth/login
  → Buscar usuario por email en BD
  → Comparar password con bcrypt.compareSync
  → Guardar userId en session
  → Si tiene tienda → redirect /dashboard
  → Si no tiene tienda → redirect /dashboard/setup
```

### Flujo de Registro
```
POST /auth/register
  → Validar campos (name, email, password, confirm_password)
  → Verificar password >= 6 caracteres
  → Verificar email no duplicado
  → Hash password con bcrypt.hashSync(password, 10)
  → Insertar en tabla users
  → Guardar userId en session
  → Redirect /dashboard/setup
```

---

## API REST (`routes/api.js`)

### Upload de Imagenes (Multer)

**Configuracion:**
- Destino: `public/uploads/`
- Nombre: `{uuid}.{ext}`
- Max tamano: 5MB
- Formatos: jpeg, jpg, png, gif, webp, svg, ico

**Endpoints de upload:**
```
POST /api/upload           → Subir imagen generica
POST /api/upload/banner    → Subir banner (actualiza store.banner)
POST /api/upload/logo      → Subir logo (actualiza store.logo)
POST /api/upload/product   → Subir imagen de producto (agrega a gallery)
```

### Gestion de Imagenes de Producto
```
POST /api/product/main-image    → Establecer imagen principal (body: product_id, url)
POST /api/product/remove-image  → Eliminar imagen (body: product_id, url)
```

### API de Carrito

El carrito se identifica por `session.cartSessionId` (UUID generado en la sesion).

```
POST /api/cart/add      → Agregar item (store_id, product_id, variant_id, combo_id, quantity)
POST /api/cart/update   → Actualizar cantidad (item_id, quantity, store_id)
POST /api/cart/remove   → Eliminar item (item_id, store_id)
GET  /api/cart/count/:storeId  → Conteo y total del carrito
```

**Logica de descuentos por volumen:**
- Al agregar/actualizar, busca `volume_discounts` para el producto
- Si la cantidad total alcanza un umbral, aplica el precio con descuento
- Los descuentos se ordenan por `min_qty DESC` y se aplica el primero que cumpla

### API de Ordenes
```
POST /api/order/place   → Crear orden desde el carrito
```

**Campos requeridos:** store_id, customer_name, customer_email
**Campos opcionales:** customer_lastname, customer_phone, customer_dni, notes, local_pickup, address_*

**Logica:**
1. Verificar que el carrito no este vacio
2. Verificar compra minima (`store.min_purchase`)
3. Si es retiro en local, aplicar descuento (`store.pickup_discount`)
4. Insertar orden con items en JSON
5. Limpiar carrito y eliminar cartSessionId

### Newsletter
```
POST /api/newsletter/subscribe   → Suscribir email (store_id, email)
```

### Productos
```
GET /api/products/:storeId   → Listar productos activos de una tienda
```

---

## Storefront (`routes/storefront.js`)

### Patron de Renderizado
Cada ruta del storefront:
1. Busca la tienda por slug
2. Carga datos (categorias, productos, combos)
3. Obtiene/crea cartSessionId
4. Carga items del carrito
5. Renderiza el template correcto: `storefront/${store.template}/layout`

### Tienda con Filtros (`/:slug/tienda`)

Soporta filtros via query string:
- `category` - Filtrar por category_id
- `min_price` / `max_price` - Rango de precios
- `search` - Buscar en nombre/descripcion (LIKE)
- `brand` - Filtrar por marca
- `variant` - Filtrar por variante ( JOIN con product_variants)
- `gender` - Filtrar por genero
- `free_shipping=1` - Solo envio gratis
- `order_by` - price_asc, price_desc, name, default (featured + created_at)

**Datos para UI de filtros:**
- `filterData.brands` - Marcas distintas
- `filterData.variants` - Nombres de variantes
- `filterData.genders` - Generos distintos
- `priceRange` - Min y max precio
- `filterSettings` - Que filtros mostrar (configurable por tienda)

---

## Customer (`routes/customer.js`)

### Sistema de Clientes por Tienda

Cada tienda tiene sus propios clientes (tabla `store_customers`). La sesion del cliente usa `session.customerId` y `session.customerStoreId`.

**Rutas:**
```
GET/POST /:slug/registro     → Registro de cliente
GET/POST /:slug/login        → Login de cliente
GET      /:slug/logout       → Logout de cliente
GET/POST /:slug/micuenta     → Dashboard del cliente (perfil + historial)
```

### Middleware `requireCustomer`
```javascript
function requireCustomer(req, res, next) {
  if (req.session.customerId && req.session.customerStoreId) return next();
  res.redirect(`/${slug}/login`);
}
```

---

## Patron de Queries SQL

Todas las queries son SQL directo via `better-sqlite3`:

```javascript
// Select uno
const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);

// Select varios
const products = db.prepare('SELECT * FROM products WHERE store_id = ?').all(storeId);

// Insert
db.prepare('INSERT INTO products (id, store_id, name) VALUES (?, ?, ?)').run(uuid, storeId, name);

// Update
db.prepare('UPDATE products SET name = ? WHERE id = ?').run(name, id);

// Delete
db.prepare('DELETE FROM products WHERE id = ?').run(id);

// Transaccion
db.instance.transaction(() => {
  db.prepare('DELETE FROM ...').run();
  db.prepare('INSERT INTO ...').run();
})();
```

### Proxy de DB (`config/db.js`)

El modulo `db` exporta un Proxy que:
- Expone metodos `init()`, `save()`, `prepare()`, `exec()`
- Para cualquier otra propiedad, la delega a la instancia `_db` de better-sqlite3
- `db.save()` es un no-op (better-sqlite3 escribe inmediatamente)
- Incluye cleanup en `process.exit`, `SIGINT`, `SIGTERM`
