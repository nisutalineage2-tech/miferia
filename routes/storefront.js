const express = require('express');
const router = express.Router();
const db = require('../config/db');

// List all stores
router.get('/tiendas', (req, res) => {
  const stores = db.prepare('SELECT * FROM stores WHERE active = 1').all();
  res.render('public/stores', { title: 'Tiendas en TuFerIA', stores, layout: false });
});

// View store by slug
router.get('/:slug', (req, res) => {
  const { slug } = req.params;
  const store = db.prepare('SELECT * FROM stores WHERE slug = ? AND active = 1').get(slug);
  if (!store) return res.status(404).render('public/404', { title: 'Tienda no encontrada', layout: false });

  const categories = db.prepare('SELECT * FROM categories WHERE store_id = ? AND active = 1 ORDER BY sort_order').all(store.id);
  const products = db.prepare(`SELECT * FROM products WHERE store_id = ? AND status = 'active' ORDER BY featured DESC, created_at DESC`).all(store.id);
  const combos = db.prepare('SELECT * FROM combos WHERE store_id = ? AND active = 1').all(store.id);
  const featured = products.filter(p => p.featured);

  let sessionId = req.session.cartSessionId;
  if (!sessionId) { sessionId = require('uuid').v4(); req.session.cartSessionId = sessionId; }

  const cartItems = db.prepare('SELECT * FROM cart_items WHERE store_id = ? AND session_id = ?').all(store.id, sessionId);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  let heroImages = [];
  try { heroImages = JSON.parse(store.hero_images || '[]'); } catch(e) {}

  res.render(`storefront/${store.template}/layout`, {
    title: store.name, store, categories, products, combos, featured,
    cartItems, cartCount, cartTotal, currentSection: 'home', page: 'home', layout: false,
    order: req.query.order || null, heroImages
  });
});

// View category
router.get('/:slug/categoria/:categorySlug', (req, res) => {
  const { slug, categorySlug } = req.params;
  const store = db.prepare('SELECT * FROM stores WHERE slug = ? AND active = 1').get(slug);
  if (!store) return res.status(404).render('public/404', { title: 'Tienda no encontrada', layout: false });

  const category = db.prepare("SELECT * FROM categories WHERE store_id = ? AND LOWER(name) = LOWER(?)").get(store.id, categorySlug.replace(/-/g, ' '));
  if (!category) return res.status(404).render('public/404', { title: 'Categoría no encontrada', layout: false });

  const categories = db.prepare('SELECT * FROM categories WHERE store_id = ? AND active = 1 ORDER BY sort_order').all(store.id);
  const products = db.prepare(`SELECT * FROM products WHERE store_id = ? AND category_id = ? AND status = 'active' ORDER BY created_at DESC`).all(store.id, category.id);

  let sessionId = req.session.cartSessionId;
  if (!sessionId) { sessionId = require('uuid').v4(); req.session.cartSessionId = sessionId; }
  const cartItems = db.prepare('SELECT * FROM cart_items WHERE store_id = ? AND session_id = ?').all(store.id, sessionId);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  res.render(`storefront/${store.template}/layout`, {
    title: `${category.name} - ${store.name}`, store, categories, products, category,
    combos: [], featured: [], cartItems, cartCount, cartTotal,
    currentSection: 'category', page: 'category', layout: false
  });
});

// View product
router.get('/:slug/producto/:productId', (req, res) => {
  const { slug, productId } = req.params;
  const store = db.prepare('SELECT * FROM stores WHERE slug = ? AND active = 1').get(slug);
  if (!store) return res.status(404).render('public/404', { title: 'Tienda no encontrada', layout: false });

  const product = db.prepare(`SELECT * FROM products WHERE store_id = ? AND id = ? AND status = 'active'`).get(store.id, productId);
  if (!product) return res.status(404).render('public/404', { title: 'Producto no encontrado', layout: false });

  const variants = db.prepare('SELECT * FROM product_variants WHERE product_id = ?').all(product.id);
  const volumeDiscounts = db.prepare('SELECT * FROM volume_discounts WHERE product_id = ? ORDER BY min_qty ASC').all(product.id);
  const category = product.category_id ? db.prepare('SELECT * FROM categories WHERE id = ?').get(product.category_id) : null;
  const categories = db.prepare('SELECT * FROM categories WHERE store_id = ? AND active = 1 ORDER BY sort_order').all(store.id);
  const related = db.prepare(`SELECT * FROM products WHERE store_id = ? AND category_id = ? AND id != ? AND status = 'active' LIMIT 4`).all(store.id, product.category_id, product.id);

  let sessionId = req.session.cartSessionId;
  if (!sessionId) { sessionId = require('uuid').v4(); req.session.cartSessionId = sessionId; }
  const cartItems = db.prepare('SELECT * FROM cart_items WHERE store_id = ? AND session_id = ?').all(store.id, sessionId);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  let productImages = [];
  try { productImages = JSON.parse(product.images || '[]'); } catch(e) {}
  if (product.image) productImages = [product.image, ...productImages.filter(i => i !== product.image)];

  res.render(`storefront/${store.template}/layout`, {
    title: `${product.name} - ${store.name}`, store, product, productImages, variants, volumeDiscounts,
    category, categories, related, cartItems, cartCount, cartTotal,
    currentSection: 'product', page: 'product', layout: false
  });
});

// Cart page
router.get('/:slug/carrito', (req, res) => {
  const { slug } = req.params;
  const store = db.prepare('SELECT * FROM stores WHERE slug = ? AND active = 1').get(slug);
  if (!store) return res.status(404).render('public/404', { title: 'Tienda no encontrada', layout: false });

  let sessionId = req.session.cartSessionId;
  if (!sessionId) { sessionId = require('uuid').v4(); req.session.cartSessionId = sessionId; }

  const categories = db.prepare('SELECT * FROM categories WHERE store_id = ? AND active = 1 ORDER BY sort_order').all(store.id);
  const cartItems = db.prepare('SELECT * FROM cart_items WHERE store_id = ? AND session_id = ?').all(store.id, sessionId);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  res.render(`storefront/${store.template}/layout`, {
    title: `Carrito - ${store.name}`, store, categories, cartItems, cartCount, cartTotal,
    currentSection: 'cart', page: 'cart', layout: false
  });
});

// ============ NEW PAGES: Shop, Subscriptions, About, Contact ============

// Shop page with filters
router.get('/:slug/tienda', (req, res) => {
  const { slug } = req.params;
  const store = db.prepare('SELECT * FROM stores WHERE slug = ? AND active = 1').get(slug);
  if (!store) return res.status(404).render('public/404', { title: 'Tienda no encontrada', layout: false });

  // Read filter settings from store
  let filterSettings = {};
  try { filterSettings = JSON.parse(store.filter_settings || '{}'); } catch(e) {}

  const categories = db.prepare('SELECT * FROM categories WHERE store_id = ? AND active = 1 ORDER BY sort_order').all(store.id);
  const { category: catFilter, min_price, max_price, search, order_by, brand, variant, gender, free_shipping } = req.query;

  let sql = "SELECT * FROM products WHERE store_id = ? AND status = 'active'";
  const params = [store.id];

  if (catFilter) { sql += ' AND category_id = ?'; params.push(catFilter); }
  if (min_price) { sql += ' AND price >= ?'; params.push(parseFloat(min_price)); }
  if (max_price) { sql += ' AND price <= ?'; params.push(parseFloat(max_price)); }
  if (search) { sql += ' AND (name LIKE ? OR description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  if (brand) { sql += ' AND brand = ?'; params.push(brand); }
  if (gender) { sql += ' AND gender = ?'; params.push(gender); }
  if (free_shipping === '1') { sql += ' AND free_shipping = 1'; }

  if (order_by === 'price_asc') sql += ' ORDER BY price ASC';
  else if (order_by === 'price_desc') sql += ' ORDER BY price DESC';
  else if (order_by === 'name') sql += ' ORDER BY name ASC';
  else sql += ' ORDER BY featured DESC, created_at DESC';

  const products = db.prepare(sql).all(...params);

  // If variant filter is applied, further filter products by variant
  let filteredProducts = products;
  if (variant) {
    const variantProducts = db.prepare(`
      SELECT DISTINCT p.* FROM products p
      INNER JOIN product_variants pv ON pv.product_id = p.id
      WHERE p.store_id = ? AND p.status = 'active' AND pv.name = ?
    `).all(store.id, variant);
    const vpIds = new Set(variantProducts.map(v => v.id));
    filteredProducts = products.filter(p => vpIds.has(p.id));
  }

  // Get filter data from DB for filter UI
  const filterData = {};
  
  // Brands (from products)
  const brands = db.prepare("SELECT DISTINCT brand FROM products WHERE store_id = ? AND status = 'active' AND brand IS NOT NULL AND brand != '' ORDER BY brand").all(store.id);
  if (brands.length > 0) filterData.brands = brands.map(b => b.brand);
  
  // Colors / Sizes (from variants)
  const variantNames = db.prepare("SELECT DISTINCT pv.name FROM product_variants pv INNER JOIN products p ON p.id = pv.product_id WHERE p.store_id = ? AND p.status = 'active' ORDER BY pv.name").all(store.id);
  if (variantNames.length > 0) filterData.variants = variantNames.map(v => v.name);
  
  // Gender values
  const genders = db.prepare("SELECT DISTINCT gender FROM products WHERE store_id = ? AND status = 'active' AND gender IS NOT NULL AND gender != '' ORDER BY gender").all(store.id);
  if (genders.length > 0) filterData.genders = genders.map(g => g.gender);

  // Price range
  const priceRange = db.prepare("SELECT MIN(price) as min_price, MAX(price) as max_price FROM products WHERE store_id = ? AND status = 'active'").get(store.id);

  let sessionId = req.session.cartSessionId;
  if (!sessionId) { sessionId = require('uuid').v4(); req.session.cartSessionId = sessionId; }
  const cartItems = db.prepare('SELECT * FROM cart_items WHERE store_id = ? AND session_id = ?').all(store.id, sessionId);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  res.render(`storefront/${store.template}/layout`, {
    title: `Tienda - ${store.name}`, store, categories, products: filteredProducts, featured: [], combos: [],
    cartItems, cartCount, cartTotal, currentSection: 'shop', page: 'shop', layout: false,
    priceRange, query: req.query, filterSettings, filterData, locals: {}
  });
});

// Newsletter subscription page
router.get('/:slug/suscripciones', (req, res) => {
  const { slug } = req.params;
  const store = db.prepare('SELECT * FROM stores WHERE slug = ? AND active = 1').get(slug);
  if (!store) return res.status(404).render('public/404', { title: 'Tienda no encontrada', layout: false });

  const categories = db.prepare('SELECT * FROM categories WHERE store_id = ? AND active = 1 ORDER BY sort_order').all(store.id);
  const combos = db.prepare('SELECT * FROM combos WHERE store_id = ? AND active = 1').all(store.id);
  let sessionId = req.session.cartSessionId;
  if (!sessionId) { sessionId = require('uuid').v4(); req.session.cartSessionId = sessionId; }
  const cartItems = db.prepare('SELECT * FROM cart_items WHERE store_id = ? AND session_id = ?').all(store.id, sessionId);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  res.render(`storefront/${store.template}/layout`, {
    title: `Suscripciones - ${store.name}`, store, categories, combos,
    products: [], featured: [], cartItems, cartCount, cartTotal,
    currentSection: 'subscriptions', page: 'subscriptions', layout: false, locals: {}
  });
});

// About page
router.get('/:slug/nosotros', (req, res) => {
  const { slug } = req.params;
  const store = db.prepare('SELECT * FROM stores WHERE slug = ? AND active = 1').get(slug);
  if (!store) return res.status(404).render('public/404', { title: 'Tienda no encontrada', layout: false });

  const categories = db.prepare('SELECT * FROM categories WHERE store_id = ? AND active = 1 ORDER BY sort_order').all(store.id);
  let sessionId = req.session.cartSessionId;
  if (!sessionId) { sessionId = require('uuid').v4(); req.session.cartSessionId = sessionId; }
  const cartItems = db.prepare('SELECT * FROM cart_items WHERE store_id = ? AND session_id = ?').all(store.id, sessionId);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  res.render(`storefront/${store.template}/layout`, {
    title: `Nosotros - ${store.name}`, store, categories,
    products: [], featured: [], combos: [], cartItems, cartCount, cartTotal,
    currentSection: 'about', page: 'about', layout: false, locals: {}
  });
});

// Contact page
router.get('/:slug/contacto', (req, res) => {
  const { slug } = req.params;
  const store = db.prepare('SELECT * FROM stores WHERE slug = ? AND active = 1').get(slug);
  if (!store) return res.status(404).render('public/404', { title: 'Tienda no encontrada', layout: false });

  const categories = db.prepare('SELECT * FROM categories WHERE store_id = ? AND active = 1 ORDER BY sort_order').all(store.id);
  let sessionId = req.session.cartSessionId;
  if (!sessionId) { sessionId = require('uuid').v4(); req.session.cartSessionId = sessionId; }
  const cartItems = db.prepare('SELECT * FROM cart_items WHERE store_id = ? AND session_id = ?').all(store.id, sessionId);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const msg = req.query.msg || null;

  res.render(`storefront/${store.template}/layout`, {
    title: `Contacto - ${store.name}`, store, categories,
    products: [], featured: [], combos: [], cartItems, cartCount, cartTotal,
    currentSection: 'contact', page: 'contact', layout: false, locals: {}, msg
  });
});

// Contact form submit
router.post('/:slug/contacto', (req, res) => {
  const { slug } = req.params;
  const store = db.prepare('SELECT * FROM stores WHERE slug = ? AND active = 1').get(slug);
  if (!store) return res.status(404).render('public/404', { title: 'Tienda no encontrada', layout: false });

  const { name, email, message } = req.body;
  if (name && email && message) {
    // Store contact message in DB
    const { v4: uuidv4 } = require('uuid');
    db.prepare('INSERT INTO store_contact_messages (id, store_id, name, email, message) VALUES (?, ?, ?, ?, ?)')
      .run(uuidv4(), store.id, name, email, message);
  }

  res.redirect(`/${slug}/contacto?msg=ok`);
});

// ============ CHECKOUT ============

router.get('/:slug/checkout', (req, res) => {
  const { slug } = req.params;
  const store = db.prepare('SELECT * FROM stores WHERE slug = ? AND active = 1').get(slug);
  if (!store) return res.status(404).render('public/404', { title: 'Tienda no encontrada', layout: false });

  let sessionId = req.session.cartSessionId;
  if (!sessionId) return res.redirect(`/${slug}/carrito`);

  const cartItems = db.prepare('SELECT * FROM cart_items WHERE store_id = ? AND session_id = ?').all(store.id, sessionId);
  if (cartItems.length === 0) return res.redirect(`/${slug}/carrito`);

  const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const categories = db.prepare('SELECT * FROM categories WHERE store_id = ? AND active = 1 ORDER BY sort_order').all(store.id);

  res.render(`storefront/${store.template}/layout`, {
    title: `Finalizar Compra - ${store.name}`, store, categories, cartItems,
    cartCount: cartItems.reduce((sum, item) => sum + item.quantity, 0), cartTotal,
    currentSection: 'checkout', page: 'checkout', layout: false
  });
});

module.exports = router;
