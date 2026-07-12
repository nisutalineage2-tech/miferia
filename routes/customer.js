const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

// Middleware: check customer is logged in for this store
function requireCustomer(req, res, next) {
  if (req.session && req.session.customerId && req.session.customerStoreId) {
    return next();
  }
  const slug = req.params.slug || req.body.slug;
  res.redirect(`/${slug || ''}/login`);
}

// ============ REGISTER ============
router.get('/:slug/registro', (req, res) => {
  const { slug } = req.params;
  const store = db.prepare('SELECT * FROM stores WHERE slug = ? AND active = 1').get(slug);
  if (!store) return res.status(404).send('Tienda no encontrada');

  const categories = db.prepare('SELECT * FROM categories WHERE store_id = ? AND active = 1 ORDER BY sort_order').all(store.id);
  let sessionId = req.session.cartSessionId;
  if (!sessionId) { sessionId = uuidv4(); req.session.cartSessionId = sessionId; }
  const cartItems = db.prepare('SELECT * FROM cart_items WHERE store_id = ? AND session_id = ?').all(store.id, sessionId);
  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = cartItems.reduce((s, i) => s + (i.price * i.quantity), 0);

  res.render(`storefront/${store.template}/layout`, {
    title: `Registro - ${store.name}`, store, categories,
    products: [], featured: [], combos: [], cartItems, cartCount, cartTotal,
    currentSection: 'register', page: 'register', layout: false, error: null, locals: {}
  });
});

router.post('/:slug/registro', (req, res) => {
  const { slug } = req.params;
  const store = db.prepare('SELECT * FROM stores WHERE slug = ? AND active = 1').get(slug);
  if (!store) return res.status(404).send('Tienda no encontrada');

  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) {
    const categories = db.prepare('SELECT * FROM categories WHERE store_id = ? AND active = 1 ORDER BY sort_order').all(store.id);
    return res.render(`storefront/${store.template}/layout`, {
      title: `Registro - ${store.name}`, store, categories,
      products: [], featured: [], combos: [], cartItems: [], cartCount: 0, cartTotal: 0,
      currentSection: 'register', page: 'register', layout: false,
      error: 'Completa todos los campos requeridos', locals: {}
    });
  }

  if (password.length < 6) {
    const categories = db.prepare('SELECT * FROM categories WHERE store_id = ? AND active = 1 ORDER BY sort_order').all(store.id);
    return res.render(`storefront/${store.template}/layout`, {
      title: `Registro - ${store.name}`, store, categories,
      products: [], featured: [], combos: [], cartItems: [], cartCount: 0, cartTotal: 0,
      currentSection: 'register', page: 'register', layout: false,
      error: 'La contraseña debe tener al menos 6 caracteres', locals: {}
    });
  }

  const existing = db.prepare('SELECT id FROM store_customers WHERE store_id = ? AND email = ?').get(store.id, email);
  if (existing) {
    const categories = db.prepare('SELECT * FROM categories WHERE store_id = ? AND active = 1 ORDER BY sort_order').all(store.id);
    return res.render(`storefront/${store.template}/layout`, {
      title: `Registro - ${store.name}`, store, categories,
      products: [], featured: [], combos: [], cartItems: [], cartCount: 0, cartTotal: 0,
      currentSection: 'register', page: 'register', layout: false,
      error: 'Este email ya está registrado en esta tienda', locals: {}
    });
  }

  const id = uuidv4();
  const hashedPassword = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO store_customers (id, store_id, email, password, name, phone) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, store.id, email, hashedPassword, name, phone || '');

  req.session.customerId = id;
  req.session.customerStoreId = store.id;
  res.redirect(`/${slug}/micuenta`);
});

// ============ LOGIN ============
router.get('/:slug/login', (req, res) => {
  const { slug } = req.params;
  const store = db.prepare('SELECT * FROM stores WHERE slug = ? AND active = 1').get(slug);
  if (!store) return res.status(404).send('Tienda no encontrada');

  const categories = db.prepare('SELECT * FROM categories WHERE store_id = ? AND active = 1 ORDER BY sort_order').all(store.id);
  let sessionId = req.session.cartSessionId;
  if (!sessionId) { sessionId = uuidv4(); req.session.cartSessionId = sessionId; }
  const cartItems = db.prepare('SELECT * FROM cart_items WHERE store_id = ? AND session_id = ?').all(store.id, sessionId);
  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = cartItems.reduce((s, i) => s + (i.price * i.quantity), 0);

  res.render(`storefront/${store.template}/layout`, {
    title: `Iniciar Sesión - ${store.name}`, store, categories,
    products: [], featured: [], combos: [], cartItems, cartCount, cartTotal,
    currentSection: 'login', page: 'login', layout: false, error: null, locals: {}
  });
});

router.post('/:slug/login', (req, res) => {
  const { slug } = req.params;
  const store = db.prepare('SELECT * FROM stores WHERE slug = ? AND active = 1').get(slug);
  if (!store) return res.status(404).send('Tienda no encontrada');

  const { email, password } = req.body;
  const customer = db.prepare('SELECT * FROM store_customers WHERE store_id = ? AND email = ?').get(store.id, email);

  if (!customer || !bcrypt.compareSync(password, customer.password)) {
    const categories = db.prepare('SELECT * FROM categories WHERE store_id = ? AND active = 1 ORDER BY sort_order').all(store.id);
    return res.render(`storefront/${store.template}/layout`, {
      title: `Iniciar Sesión - ${store.name}`, store, categories,
      products: [], featured: [], combos: [], cartItems: [], cartCount: 0, cartTotal: 0,
      currentSection: 'login', page: 'login', layout: false,
      error: 'Email o contraseña incorrectos', locals: {}
    });
  }

  req.session.customerId = customer.id;
  req.session.customerStoreId = store.id;
  res.redirect(`/${slug}/micuenta`);
});

// ============ LOGOUT ============
router.get('/:slug/logout', (req, res) => {
  const { slug } = req.params;
  req.session.customerId = null;
  req.session.customerStoreId = null;
  res.redirect(`/${slug}`);
});

// ============ DASHBOARD ============
router.get('/:slug/micuenta', requireCustomer, (req, res) => {
  const { slug } = req.params;
  const store = db.prepare('SELECT * FROM stores WHERE slug = ? AND active = 1').get(slug);
  if (!store) return res.status(404).send('Tienda no encontrada');

  const customer = db.prepare('SELECT * FROM store_customers WHERE id = ?').get(req.session.customerId);
  if (!customer) { req.session.customerId = null; req.session.customerStoreId = null; return res.redirect(`/${slug}/login`); }

  const categories = db.prepare('SELECT * FROM categories WHERE store_id = ? AND active = 1 ORDER BY sort_order').all(store.id);
  const orders = db.prepare("SELECT * FROM orders WHERE store_id = ? AND customer_id = ? ORDER BY created_at DESC").all(store.id, customer.id);

  let sessionId = req.session.cartSessionId;
  if (!sessionId) { sessionId = uuidv4(); req.session.cartSessionId = sessionId; }
  const cartItems = db.prepare('SELECT * FROM cart_items WHERE store_id = ? AND session_id = ?').all(store.id, sessionId);
  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = cartItems.reduce((s, i) => s + (i.price * i.quantity), 0);

  res.render(`storefront/${store.template}/layout`, {
    title: `Mi Cuenta - ${store.name}`, store, categories, customer, orders,
    products: [], featured: [], combos: [], cartItems, cartCount, cartTotal,
    currentSection: 'account', page: 'account', layout: false,
    msg: req.query.msg || null, error: null, locals: {}
  });
});

// Update customer profile
router.post('/:slug/micuenta', requireCustomer, (req, res) => {
  const { slug } = req.params;
  const store = db.prepare('SELECT * FROM stores WHERE slug = ? AND active = 1').get(slug);
  if (!store) return res.status(404).send('Tienda no encontrada');

  const { name, phone, email, address_street, address_number, address_floor, address_zip, address_neighborhood, address_city, address_province } = req.body;

  db.prepare(`UPDATE store_customers SET name=?, phone=?, email=?, address_street=?, address_number=?, address_floor=?, address_zip=?, address_neighborhood=?, address_city=?, address_province=? WHERE id=? AND store_id=?`)
    .run(name, phone || '', email, address_street || '', address_number || '', address_floor || '', address_zip || '', address_neighborhood || '', address_city || '', address_province || '', req.session.customerId, store.id);

  res.redirect(`/${slug}/micuenta?msg=ok`);
});

module.exports = router;
