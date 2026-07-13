/**
 * Database module using better-sqlite3
 * Writes directly to disk — no save interval, no data loss risk.
 * API compatible with previous sql.js version: db.prepare(sql).run()/.get()/.all()
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'tuferia.db');

let _db = null;

function initDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  _db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  _db.exec(`
    CREATE TABLE IF NOT EXISTS stores (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      template TEXT DEFAULT 'template1',
      logo TEXT,
      banner TEXT,
      favicon TEXT,
      primary_color TEXT DEFAULT '#4f46e5',
      accent_color TEXT DEFAULT '#7c3aed',
      description TEXT DEFAULT 'Mi tienda online',
      about_text TEXT,
      whatsapp TEXT,
      instagram TEXT,
      facebook TEXT,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  _db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      store_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      image TEXT,
      sort_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
    )
  `);
  _db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      store_id TEXT NOT NULL,
      category_id TEXT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      compare_price REAL,
      image TEXT,
      images TEXT DEFAULT '[]',
      stock INTEGER DEFAULT 0,
      sku TEXT,
      status TEXT DEFAULT 'active',
      featured INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    )
  `);
  _db.exec(`
    CREATE TABLE IF NOT EXISTS product_variants (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      name TEXT NOT NULL,
      price REAL,
      stock INTEGER DEFAULT 0,
      sku TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `);
  _db.exec(`
    CREATE TABLE IF NOT EXISTS combos (
      id TEXT PRIMARY KEY,
      store_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      image TEXT,
      products TEXT DEFAULT '[]',
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
    )
  `);
  _db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      store_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT,
      customer_address TEXT,
      items TEXT DEFAULT '[]',
      total REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
    )
  `);
  _db.exec(`
    CREATE TABLE IF NOT EXISTS cart_items (
      id TEXT PRIMARY KEY,
      store_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      product_id TEXT,
      variant_id TEXT,
      combo_id TEXT,
      quantity INTEGER DEFAULT 1,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      image TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
    )
  `);
  _db.exec(`
    CREATE TABLE IF NOT EXISTS volume_discounts (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      min_qty INTEGER NOT NULL,
      discount_type TEXT DEFAULT 'fixed',
      discount_value REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `);

  // Safe migrations — add columns if they don't exist
  const migrations = [
    'ALTER TABLE stores ADD COLUMN min_purchase REAL DEFAULT 0',
    'ALTER TABLE stores ADD COLUMN payment_methods TEXT DEFAULT \'[]\'',
    'ALTER TABLE stores ADD COLUMN local_pickup INTEGER DEFAULT 0',
    'ALTER TABLE stores ADD COLUMN local_pickup_address TEXT',
    'ALTER TABLE stores ADD COLUMN pickup_discount REAL DEFAULT 0',
    'ALTER TABLE stores ADD COLUMN payment_discounts TEXT DEFAULT \'{}\'',
    'ALTER TABLE orders ADD COLUMN local_pickup INTEGER DEFAULT 0',
    'ALTER TABLE orders ADD COLUMN pickup_address TEXT',
    'ALTER TABLE orders ADD COLUMN customer_lastname TEXT',
    'ALTER TABLE orders ADD COLUMN customer_dni TEXT',
    'ALTER TABLE orders ADD COLUMN address_street TEXT',
    'ALTER TABLE orders ADD COLUMN address_number TEXT',
    'ALTER TABLE orders ADD COLUMN address_floor TEXT',
    'ALTER TABLE orders ADD COLUMN address_zip TEXT',
    'ALTER TABLE orders ADD COLUMN address_neighborhood TEXT',
    'ALTER TABLE orders ADD COLUMN address_city TEXT',
    'ALTER TABLE orders ADD COLUMN address_province TEXT',
    'ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT \'pending\'',
    'ALTER TABLE products ADD COLUMN cost REAL',
    'ALTER TABLE products ADD COLUMN product_type TEXT DEFAULT \'physical\'',
    'ALTER TABLE products ADD COLUMN stock_type TEXT DEFAULT \'limited\'',
    'ALTER TABLE products ADD COLUMN barcode TEXT',
    'ALTER TABLE products ADD COLUMN weight REAL',
    'ALTER TABLE products ADD COLUMN depth REAL',
    'ALTER TABLE products ADD COLUMN width REAL',
    'ALTER TABLE products ADD COLUMN height REAL',
    'ALTER TABLE products ADD COLUMN tags TEXT DEFAULT \'[]\'',
    'ALTER TABLE products ADD COLUMN brand TEXT',
    'ALTER TABLE products ADD COLUMN meta_title TEXT',
    'ALTER TABLE products ADD COLUMN meta_description TEXT',
    'ALTER TABLE products ADD COLUMN free_shipping INTEGER DEFAULT 0',
    'ALTER TABLE products ADD COLUMN mpn TEXT',
    'ALTER TABLE products ADD COLUMN age_range TEXT',
    'ALTER TABLE products ADD COLUMN gender TEXT',
    'ALTER TABLE stores ADD COLUMN theme_settings TEXT DEFAULT \'{}\'',
    'ALTER TABLE stores ADD COLUMN advanced_css TEXT DEFAULT \'\'',
    'CREATE TABLE IF NOT EXISTS store_customers (id TEXT PRIMARY KEY, store_id TEXT NOT NULL, email TEXT NOT NULL, password TEXT NOT NULL, name TEXT NOT NULL, phone TEXT, address_street TEXT, address_number TEXT, address_floor TEXT, address_zip TEXT, address_neighborhood TEXT, address_city TEXT, address_province TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE, UNIQUE(store_id, email))',
    'ALTER TABLE orders ADD COLUMN customer_id TEXT',
    'CREATE TABLE IF NOT EXISTS store_contact_messages (id TEXT PRIMARY KEY, store_id TEXT NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL, message TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE)',
    'CREATE TABLE IF NOT EXISTS store_newsletter_subscribers (id TEXT PRIMARY KEY, store_id TEXT NOT NULL, email TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE, UNIQUE(store_id, email))',
    'ALTER TABLE stores ADD COLUMN filter_settings TEXT DEFAULT \'{}\'',
    'ALTER TABLE stores ADD COLUMN hero_images TEXT DEFAULT \'[]\'',
    'ALTER TABLE stores ADD COLUMN smtp_host TEXT DEFAULT \'\'',
    'ALTER TABLE stores ADD COLUMN smtp_port INTEGER DEFAULT 587',
    'ALTER TABLE stores ADD COLUMN smtp_user TEXT DEFAULT \'\'',
    'ALTER TABLE stores ADD COLUMN smtp_pass TEXT DEFAULT \'\'',
    'ALTER TABLE stores ADD COLUMN smtp_from_email TEXT DEFAULT \'\'',
    'ALTER TABLE stores ADD COLUMN smtp_from_name TEXT DEFAULT \'\'',
    'ALTER TABLE stores ADD COLUMN whatsapp_notifications INTEGER DEFAULT 0',
    'ALTER TABLE stores ADD COLUMN email_notifications INTEGER DEFAULT 0',
    'ALTER TABLE stores ADD COLUMN custom_domain TEXT',
    'ALTER TABLE stores ADD COLUMN cloudflare_record_id TEXT',
  ];

  // System settings table for Cloudflare and other configs
  _db.exec(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  for (const sql of migrations) {
    try { _db.exec(sql); } catch (e) { /* column already exists */ }
  }

  console.log('✅ DB initialized (better-sqlite3 — writes are immediate)');
}

const db = new Proxy({
  /**
   * Initialize the database. Async for backward compatibility with existing code.
   * With better-sqlite3, initialization is synchronous but we return a resolved promise.
   */
  init: async function () {
    if (_db) return;
    initDb();
  },

  /**
   * No-op for backward compatibility. With better-sqlite3, every write is
   * immediately persisted to disk — no periodic save needed.
   */
  save: function () {
    // All writes are immediate with better-sqlite3
  },

  /**
   * Prepare a SQL statement. Returns a better-sqlite3 Statement object
   * with .get(), .all(), .run() — same API as the old sql.js wrapper.
   */
  prepare: function (sql) {
    if (!_db) throw new Error('Database not initialized yet');
    return _db.prepare(sql);
  },

  /**
   * Execute raw SQL. Returns this for chaining.
   */
  exec: function (sql) {
    if (!_db) throw new Error('Database not initialized yet');
    _db.exec(sql);
    return this;
  },

  /**
   * Get the underlying Database instance for advanced use.
   */
  get instance() {
    return _db;
  },
}, {
  get(target, prop) {
    if (prop in target) return target[prop];
    if (!_db) throw new Error('Database not initialized yet');
    const val = _db[prop];
    return typeof val === 'function' ? val.bind(_db) : val;
  },
});

// Clean shutdown — close the database connection
function closeDb() {
  if (_db) {
    try { _db.close(); } catch (e) { /* ignore */ }
    _db = null;
  }
}

process.on('exit', closeDb);
process.on('SIGINT', () => { closeDb(); process.exit(); });
process.on('SIGTERM', () => { closeDb(); process.exit(); });

module.exports = db;
