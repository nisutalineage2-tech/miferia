# AGENTS - Base de Datos

## Motor

- **SQLite** via `better-sqlite3` (libreria nativa, no WASM)
- **Archivo:** `data/tuferia.db`
- **Modo WAL** (Write-Ahead Logging) para mejor rendimiento concurrente
- **Foreign Keys** activadas
- **Escritura inmediata** - no hay intervalos de guardado, cada `run()` persiste a disco

---

## Configuracion (`config/db.js`)

### Inicializacion
```javascript
const db = require('./config/db');
await db.init();  // Crea tablas + migra columnas
```

### API de DB
```javascript
db.init()                    // Inicializar (async por compatibilidad)
db.save()                    // No-op (better-sqlite3 escribe inmediatamente)
db.prepare(sql).get(params)  // Select uno
db.prepare(sql).all(params)  // Select varios
db.prepare(sql).run(params)  // Insert/Update/Delete
db.exec(sql)                 // SQL crudo
db.instance                  // Instancia nativa de better-sqlite3
```

### Proxy
El modulo exporta un **Proxy** que delega propiedades desconocidas a la instancia `_db` de better-sqlite3. Esto permite usar `db.pragma()`, `db.transaction()`, etc.

### Cleanup
```javascript
process.on('exit', closeDb);
process.on('SIGINT', () => { closeDb(); process.exit(); });
process.on('SIGTERM', () => { closeDb(); process.exit(); });
```

---

## Esquema de Tablas

### `users`
Administradores de tiendas.

| Columna | Tipo | Constraints |
|---|---|---|
| id | TEXT | PRIMARY KEY (UUID) |
| email | TEXT | UNIQUE NOT NULL |
| password | TEXT | NOT NULL (bcrypt hash) |
| name | TEXT | NOT NULL |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

### `stores`
Tiendas de los usuarios.

| Columna | Tipo | Default |
|---|---|---|
| id | TEXT | PRIMARY KEY (UUID) |
| user_id | TEXT | NOT NULL → users.id ON DELETE CASCADE |
| name | TEXT | NOT NULL |
| slug | TEXT | UNIQUE NOT NULL |
| template | TEXT | 'template1' |
| logo | TEXT | NULL |
| banner | TEXT | NULL |
| favicon | TEXT | NULL |
| primary_color | TEXT | '#4f46e5' |
| accent_color | TEXT | '#7c3aed' |
| description | TEXT | 'Mi tienda online' |
| about_text | TEXT | NULL |
| whatsapp | TEXT | NULL |
| instagram | TEXT | NULL |
| facebook | TEXT | NULL |
| active | INTEGER | 1 |
| created_at | DATETIME | CURRENT_TIMESTAMP |
| min_purchase | REAL | 0 |
| payment_methods | TEXT | '[]' |
| local_pickup | INTEGER | 0 |
| local_pickup_address | TEXT | NULL |
| pickup_discount | REAL | 0 |
| payment_discounts | TEXT | '{}' |
| theme_settings | TEXT | '{}' |
| advanced_css | TEXT | '' |
| filter_settings | TEXT | '{}' |
| hero_images | TEXT | '[]' |

### `categories`
| Columna | Tipo | Constraints |
|---|---|---|
| id | TEXT | PRIMARY KEY |
| store_id | TEXT | NOT NULL → stores.id ON DELETE CASCADE |
| name | TEXT | NOT NULL |
| description | TEXT | NULL |
| image | TEXT | NULL |
| sort_order | INTEGER | DEFAULT 0 |
| active | INTEGER | 1 |
| created_at | DATETIME | CURRENT_TIMESTAMP |

### `products`
| Columna | Tipo | Default |
|---|---|---|
| id | TEXT | PRIMARY KEY |
| store_id | TEXT | NOT NULL → stores.id ON DELETE CASCADE |
| category_id | TEXT | NULL → categories.id ON DELETE SET NULL |
| name | TEXT | NOT NULL |
| description | TEXT | '' |
| price | REAL | NOT NULL |
| compare_price | REAL | NULL |
| image | TEXT | NULL |
| images | TEXT | '[]' |
| stock | INTEGER | 0 |
| sku | TEXT | NULL |
| status | TEXT | 'active' |
| featured | INTEGER | 0 |
| created_at | DATETIME | CURRENT_TIMESTAMP |
| cost | REAL | NULL |
| product_type | TEXT | 'physical' |
| stock_type | TEXT | 'limited' |
| barcode | TEXT | NULL |
| weight | REAL | NULL |
| depth | REAL | NULL |
| width | REAL | NULL |
| height | REAL | NULL |
| tags | TEXT | '[]' |
| brand | TEXT | NULL |
| meta_title | TEXT | NULL |
| meta_description | TEXT | NULL |
| free_shipping | INTEGER | 0 |
| mpn | TEXT | NULL |
| age_range | TEXT | NULL |
| gender | TEXT | NULL |

### `product_variants`
| Columna | Tipo | Constraints |
|---|---|---|
| id | TEXT | PRIMARY KEY |
| product_id | TEXT | NOT NULL → products.id ON DELETE CASCADE |
| name | TEXT | NOT NULL (ej: "Rojo - M") |
| price | REAL | NULL (si NULL, usa precio del producto padre) |
| stock | INTEGER | 0 |
| sku | TEXT | NULL |
| created_at | DATETIME | CURRENT_TIMESTAMP |

### `combos`
| Columna | Tipo | Default |
|---|---|---|
| id | TEXT | PRIMARY KEY |
| store_id | TEXT | NOT NULL → stores.id ON DELETE CASCADE |
| name | TEXT | NOT NULL |
| description | TEXT | '' |
| price | REAL | NOT NULL |
| image | TEXT | NULL |
| products | TEXT | '[]' (JSON array de product IDs) |
| active | INTEGER | 1 |
| created_at | DATETIME | CURRENT_TIMESTAMP |

### `orders`
| Columna | Tipo | Default |
|---|---|---|
| id | TEXT | PRIMARY KEY |
| store_id | TEXT | NOT NULL → stores.id ON DELETE CASCADE |
| customer_name | TEXT | NOT NULL |
| customer_email | TEXT | NOT NULL |
| customer_phone | TEXT | NULL |
| customer_address | TEXT | NULL |
| items | TEXT | '[]' (JSON array de cart items) |
| total | REAL | NOT NULL |
| status | TEXT | 'pending' (pending/completed/cancelled) |
| notes | TEXT | NULL |
| created_at | DATETIME | CURRENT_TIMESTAMP |
| local_pickup | INTEGER | 0 |
| pickup_address | TEXT | NULL |
| customer_lastname | TEXT | NULL |
| customer_dni | TEXT | NULL |
| address_street | TEXT | NULL |
| address_number | TEXT | NULL |
| address_floor | TEXT | NULL |
| address_zip | TEXT | NULL |
| address_neighborhood | TEXT | NULL |
| address_city | TEXT | NULL |
| address_province | TEXT | NULL |
| payment_status | TEXT | 'pending' (pending/paid/unpaid) |
| customer_id | TEXT | NULL |

### `cart_items`
| Columna | Tipo | Constraints |
|---|---|---|
| id | TEXT | PRIMARY KEY |
| store_id | TEXT | NOT NULL → stores.id ON DELETE CASCADE |
| session_id | TEXT | NOT NULL (UUID de sesion) |
| product_id | TEXT | NULL |
| variant_id | TEXT | NULL |
| combo_id | TEXT | NULL |
| quantity | INTEGER | 1 |
| name | TEXT | NOT NULL |
| price | REAL | NOT NULL |
| image | TEXT | NULL |
| created_at | DATETIME | CURRENT_TIMESTAMP |

### `volume_discounts`
| Columna | Tipo | Constraints |
|---|---|---|
| id | TEXT | PRIMARY KEY |
| product_id | TEXT | NOT NULL → products.id ON DELETE CASCADE |
| min_qty | INTEGER | NOT NULL |
| discount_type | TEXT | 'fixed' |
| discount_value | REAL | NOT NULL |
| created_at | DATETIME | CURRENT_TIMESTAMP |

### `store_customers`
| Columna | Tipo | Constraints |
|---|---|---|
| id | TEXT | PRIMARY KEY |
| store_id | TEXT | NOT NULL → stores.id ON DELETE CASCADE |
| email | TEXT | NOT NULL |
| password | TEXT | NOT NULL (bcrypt hash) |
| name | TEXT | NOT NULL |
| phone | TEXT | '' |
| address_* | TEXT | '' (7 campos de direccion) |
| created_at | DATETIME | CURRENT_TIMESTAMP |
| | | UNIQUE(store_id, email) |

### `store_contact_messages`
| Columna | Tipo | Constraints |
|---|---|---|
| id | TEXT | PRIMARY KEY |
| store_id | TEXT | NOT NULL → stores.id ON DELETE CASCADE |
| name | TEXT | NOT NULL |
| email | TEXT | NOT NULL |
| message | TEXT | NOT NULL |
| created_at | DATETIME | CURRENT_TIMESTAMP |

### `store_newsletter_subscribers`
| Columna | Tipo | Constraints |
|---|---|---|
| id | TEXT | PRIMARY KEY |
| store_id | TEXT | NOT NULL → stores.id ON DELETE CASCADE |
| email | TEXT | NOT NULL |
| created_at | DATETIME | CURRENT_TIMESTAMP |
| | | UNIQUE(store_id, email) |

---

## Relaciones

```
users 1──N stores (user_id)
stores 1──N categories (store_id)
stores 1──N products (store_id)
stores 1──N combos (store_id)
stores 1──N orders (store_id)
stores 1──N store_customers (store_id)
stores 1──N store_contact_messages (store_id)
stores 1──N store_newsletter_subscribers (store_id)

categories 1──N products (category_id, ON DELETE SET NULL)
products 1──N product_variants (product_id, ON DELETE CASCADE)
products 1──N volume_discounts (product_id, ON DELETE CASCADE)
```

---

## Migraciones

El sistema usa migraciones incrementales en `config/db.js:157-200`. Cada migracion es un `ALTER TABLE ADD COLUMN` envuelto en try/catch:

```javascript
const migrations = [
  'ALTER TABLE stores ADD COLUMN min_purchase REAL DEFAULT 0',
  'ALTER TABLE stores ADD COLUMN payment_methods TEXT DEFAULT \'[]\'',
  // ... ~25 migraciones mas
];
for (const sql of migrations) {
  try { _db.exec(sql); } catch (e) { /* column already exists */ }
}
```

**Para agregar una nueva migracion:** Agregar el SQL al array `migrations` al final.

---

## Seed Scripts

### `seed.js` - Tienda SportZone
- Crea usuario `demo@tuferia.com` / `demo123`
- Tienda "SportZone Argentina" con slug `sportzone`
- 44 productos, 10 categorias, variantes, combos, descuentos por volumen
- 1 pedido demo
- Limpia datos existentes del usuario antes de crear

### `seed_tienda001.js` - Tienda secundaria
- Crea usuario `tienda001@tienda001.com.ar` / `tienda001`
- Catalogo de 40+ productos
- Limpia catalogo existente primero

### `add_images.js` - Placeholder images
- Asigna imagenes de `picsum.photos` a productos de tienda001
