# AGENTS - Vision General de TuFerIA

## Que es TuFerIA

Plataforma SaaS multi-tienda para crear tiendas online. Los usuarios registran cuentas, crean tiendas con slug unico, personalizan diseno, cargan productos y gestionan pedidos.

**Stack:** Node.js + Express + EJS + SQLite + Tailwind CSS + Docker

---

## Convenciones de Codigo

### Estructura MVC
```
routes/   → Controllers (logica de negocio + queries SQL)
views/    → Templates EJS (HTML renderizado en servidor)
config/   → Configuracion (base de datos)
middleware/ → Funciones de autenticacion
```

### Naming
- Archivos de rutas: singular (`auth.js`, `dashboard.js`, `storefront.js`, `api.js`, `customer.js`)
- Vistas: plural o singular segun contexto (`products.ejs`, `orders.ejs`, `settings.ejs`)
- Tablas BD: plural (`users`, `stores`, `products`, `orders`)
- IDs: UUID v4 generados con `uuid` package
- Slugs: generados con `slugify` (lowercase, strict)

### Estilo
- JavaScript vanilla (sin TypeScript, sin Babel)
- CSS via Tailwind CDN (sin build step)
- Templates EJS con `express-ejs-layouts`
- Queries SQL inline en los controllers (sin ORM)
- JSON en columnas de SQLite para datos complejos (items de pedido, variantes, configuracion de tema)

### Patron de Rutas
```javascript
// Rutas GET renderizan vistas
router.get('/productos', ensureStore, (req, res) => {
  const data = db.prepare('SELECT ...').all(params);
  res.render('dashboard/products', { title, store, data, section: 'products' });
});

// Rutas POST procesan formularios y redirigen
router.post('/productos/nuevo', ensureStore, (req, res) => {
  const { field1, field2 } = req.body;
  db.prepare('INSERT INTO ...').run(params);
  res.redirect('/dashboard/productos');
});
```

---

## Como Iniciar

```bash
# Desarrollo (con hot-reload)
npm run dev

# Produccion
npm start

# Docker
docker compose up -d --build

# Datos demo
docker exec tuferia node seed.js
# Credenciales: demo@tuferia.com / demo123
```

Puerto: **8081**

---

## Dependencias Principales

| Paquete | Uso |
|---|---|
| express | Framework web, routing, middleware |
| ejs + express-ejs-layouts | Motor de plantillas con layouts |
| express-session | Sesiones HTTP (cookie-based) |
| better-sqlite3 | Base de datos SQLite (escritura inmediata) |
| bcryptjs | Hashing de passwords |
| multer | Upload de archivos (max 5MB) |
| slugify | Generacion de slugs URL-friendly |
| uuid | Generacion de IDs unicos |

---

## Seguridad

- Passwords: bcryptjs con salt rounds 10
- Sesiones: cookie httpOnly, 7 dias de duracion
- Uploads: filtro de formatos (jpeg/jpg/png/gif/webp/svg/ico), max 5MB
- **Secret de sesion hardcoded** en `app.js:22` - cambiar en produccion
- Sin rate limiting actualmente
- Sin proteccion CSRF actualmente

---

## Archivos Clave

| Archivo | Lineas | Funcion |
|---|---|---|
| `app.js` | 87 | Punto de entrada, config Express, middleware, rutas |
| `config/db.js` | 271 | Inicializacion SQLite, esquema, migraciones, Proxy |
| `middleware/auth.js` | 25 | 3 funciones: requireAuth, requireStoreAuth, guestOnly |
| `routes/auth.js` | 83 | Login/Register/Logout administradores |
| `routes/dashboard.js` | 557 | Panel admin completo |
| `routes/storefront.js` | 295 | Tienda publica |
| `routes/api.js` | 340 | API REST (uploads, carrito, ordenes) |
| `routes/customer.js` | 174 | Clientes de tiendas |
