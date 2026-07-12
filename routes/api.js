const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/db');
const { requireAuth } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|svg|ico/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    cb(null, ext && mime);
  }
});

// Upload image
router.post('/upload', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se pudo subir la imagen' });
  }
  res.json({ url: `/uploads/${req.file.filename}`, filename: req.file.filename });
});

// Upload banner
router.post('/upload/banner', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se pudo subir la imagen' });

  const storeId = req.body.store_id;
  if (storeId) {
    db.prepare('UPDATE stores SET banner = ? WHERE id = ?').run(`/uploads/${req.file.filename}`, storeId);
  }

  res.json({ url: `/uploads/${req.file.filename}` });
});

// Upload logo
router.post('/upload/logo', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se pudo subir la imagen' });

  const storeId = req.body.store_id;
  if (storeId) {
    db.prepare('UPDATE stores SET logo = ? WHERE id = ?').run(`/uploads/${req.file.filename}`, storeId);
  }

  res.json({ url: `/uploads/${req.file.filename}` });
});

// Upload product image
router.post('/upload/product', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se pudo subir la imagen' });

  const url = `/uploads/${req.file.filename}`;
  const productId = req.body.product_id;
  
  if (productId) {
    const product = db.prepare('SELECT image, images FROM products WHERE id = ?').get(productId);
    // If no main image yet, set this as main
    if (!product.image) {
      db.prepare('UPDATE products SET image = ?, images = ? WHERE id = ?').run(url, JSON.stringify([url]), productId);
    } else {
      let images = [];
      try { images = JSON.parse(product.images || '[]'); } catch(e) {}
      images.push(url);
      db.prepare('UPDATE products SET images = ? WHERE id = ?').run(JSON.stringify(images), productId);
    }
  }

  res.json({ url });
});

// Set product main image
router.post('/product/main-image', requireAuth, (req, res) => {
  const { product_id, url } = req.body;
  if (!product_id || !url) return res.status(400).json({ error: 'Faltan datos' });
  db.prepare('UPDATE products SET image = ? WHERE id = ?').run(url, product_id);
  res.json({ success: true });
});

// Remove product image
router.post('/product/remove-image', requireAuth, (req, res) => {
  const { product_id, url } = req.body;
  if (!product_id || !url) return res.status(400).json({ error: 'Faltan datos' });
  
  const product = db.prepare('SELECT image, images FROM products WHERE id = ?').get(product_id);
  if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
  
  let images = [];
  try { images = JSON.parse(product.images || '[]'); } catch(e) {}
  images = images.filter(i => i !== url);
  
  let newMain = product.image;
  if (newMain === url) {
    newMain = images.length > 0 ? images[0] : null;
  }
  
  db.prepare('UPDATE products SET image = ?, images = ? WHERE id = ?').run(newMain, JSON.stringify(images), product_id);
  res.json({ success: true });
});

// ============ CART API ============

// Add to cart
router.post('/cart/add', (req, res) => {
  const { store_id, product_id, variant_id, combo_id, quantity } = req.body;
  let sessionId = req.session.cartSessionId;
  if (!sessionId) {
    sessionId = uuidv4();
    req.session.cartSessionId = sessionId;
  }

  let name, price, image;

  if (combo_id) {
    const combo = db.prepare('SELECT * FROM combos WHERE id = ? AND store_id = ?').get(combo_id, store_id);
    if (!combo) return res.status(404).json({ error: 'Combo no encontrado' });
    name = combo.name;
    price = combo.price;
    image = combo.image;
  } else if (variant_id) {
    const variant = db.prepare('SELECT pv.*, p.name as pname, p.image as pimage FROM product_variants pv JOIN products p ON pv.product_id = p.id WHERE pv.id = ?').get(variant_id);
    if (!variant) return res.status(404).json({ error: 'Variante no encontrada' });
    name = `${variant.pname} - ${variant.name}`;
    price = variant.price || variant.price === 0 ? variant.price : db.prepare('SELECT price FROM products WHERE id = ?').get(variant.product_id).price;
    image = variant.pimage;
  } else {
    const product = db.prepare('SELECT * FROM products WHERE id = ? AND store_id = ?').get(product_id, store_id);
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
    name = product.name;
    price = product.price;
    image = product.image;
  }

  // Check if item already in cart
  let existingItem = null;
  if (product_id) {
    existingItem = db.prepare('SELECT * FROM cart_items WHERE store_id = ? AND session_id = ? AND product_id = ? AND variant_id IS ? AND combo_id IS ?').get(store_id, sessionId, product_id, variant_id || null, combo_id || null);
  } else if (combo_id) {
    existingItem = db.prepare('SELECT * FROM cart_items WHERE store_id = ? AND session_id = ? AND combo_id = ?').get(store_id, sessionId, combo_id);
  }

  // Calculate volume discount price
  let effectivePrice = price;
  if (product_id && !combo_id) {
    const volumeDiscounts = db.prepare('SELECT * FROM volume_discounts WHERE product_id = ? ORDER BY min_qty DESC').all(product_id);
    if (volumeDiscounts.length > 0) {
      const existingQty = existingItem ? existingItem.quantity : 0;
      const totalQty = existingQty + parseInt(quantity || 1);
      for (const d of volumeDiscounts) {
        if (totalQty >= d.min_qty) {
          effectivePrice = d.discount_type === 'percentage'
            ? Math.round(price * (1 - d.discount_value / 100) * 100) / 100
            : d.discount_value;
          break;
        }
      }
    }
  }

  if (existingItem) {
    const newQty = existingItem.quantity + parseInt(quantity || 1);
    db.prepare('UPDATE cart_items SET quantity = ?, price = ? WHERE id = ?').run(newQty, effectivePrice, existingItem.id);
  } else {
    db.prepare(`
      INSERT INTO cart_items (id, store_id, session_id, product_id, variant_id, combo_id, quantity, name, price, image)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), store_id, sessionId, product_id || null, variant_id || null, combo_id || null, parseInt(quantity || 1), name, effectivePrice, image || null);
  }

  const cartItems = db.prepare('SELECT * FROM cart_items WHERE store_id = ? AND session_id = ?').all(store_id, sessionId);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  res.json({ success: true, cartCount, cartTotal });
});

// Update cart item quantity
router.post('/cart/update', (req, res) => {
  const { item_id, quantity, store_id } = req.body;
  const sessionId = req.session.cartSessionId;
  if (!sessionId) return res.status(400).json({ error: 'No hay carrito' });

  if (parseInt(quantity) <= 0) {
    db.prepare('DELETE FROM cart_items WHERE id = ? AND session_id = ?').run(item_id, sessionId);
  } else {
    // Recalculate volume discount for updated quantity
    const item = db.prepare('SELECT * FROM cart_items WHERE id = ? AND session_id = ?').get(item_id, sessionId);
    if (item && item.product_id) {
      const volumeDiscounts = db.prepare('SELECT * FROM volume_discounts WHERE product_id = ? ORDER BY min_qty DESC').all(item.product_id);
      let effectivePrice = item.price;
      if (volumeDiscounts.length > 0) {
        const baseProduct = db.prepare('SELECT price FROM products WHERE id = ?').get(item.product_id);
        effectivePrice = baseProduct ? baseProduct.price : item.price;
        for (const d of volumeDiscounts) {
          if (parseInt(quantity) >= d.min_qty) {
            effectivePrice = d.discount_value;
            break;
          }
        }
      }
      db.prepare('UPDATE cart_items SET quantity = ?, price = ? WHERE id = ? AND session_id = ?').run(parseInt(quantity), effectivePrice, item_id, sessionId);
    } else {
      db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ? AND session_id = ?').run(parseInt(quantity), item_id, sessionId);
    }
  }

  const cartItems = db.prepare('SELECT * FROM cart_items WHERE store_id = ? AND session_id = ?').all(store_id, sessionId);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  res.json({ success: true, cartCount, cartTotal });
});

// Remove from cart
router.post('/cart/remove', (req, res) => {
  const { item_id, store_id } = req.body;
  const sessionId = req.session.cartSessionId;
  if (!sessionId) return res.status(400).json({ error: 'No hay carrito' });

  db.prepare('DELETE FROM cart_items WHERE id = ? AND session_id = ?').run(item_id, sessionId);

  const cartItems = db.prepare('SELECT * FROM cart_items WHERE store_id = ? AND session_id = ?').all(store_id, sessionId);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  res.json({ success: true, cartCount, cartTotal });
});

// Place order
router.post('/order/place', (req, res) => {
  const { store_id, customer_name, customer_lastname, customer_email, customer_phone, customer_dni, notes, local_pickup,
    address_street, address_number, address_floor, address_zip, address_neighborhood, address_city, address_province,
    payment_method } = req.body;
  const sessionId = req.session.cartSessionId;
  if (!sessionId) return res.status(400).json({ error: 'No hay carrito' });

  const cartItems = db.prepare('SELECT * FROM cart_items WHERE store_id = ? AND session_id = ?').all(store_id, sessionId);
  if (cartItems.length === 0) return res.status(400).json({ error: 'El carrito está vacío' });

  if (!customer_name || !customer_email) return res.status(400).json({ error: 'Nombre y email son requeridos' });

  const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(store_id);
  if (store) {
    const minPurchase = parseFloat(store.min_purchase || 0);
    const rawTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    if (minPurchase > 0 && rawTotal < minPurchase) {
      return res.status(400).json({ error: `El pedido mínimo es de $${minPurchase.toFixed(2)}` });
    }
  }

  const isPickup = local_pickup === '1' || local_pickup === 1 || local_pickup === true;
  const pickupDiscount = isPickup && store ? parseFloat(store.pickup_discount || 0) : 0;
  let total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Apply pickup discount
  if (pickupDiscount > 0) {
    total = Math.max(0, total - pickupDiscount);
  }

  // Apply payment method discount
  if (payment_method && store) {
    let paymentDiscounts = {};
    try { paymentDiscounts = JSON.parse(store.payment_discounts || '{}'); } catch(e) {}
    const paymentDiscountPercent = paymentDiscounts[payment_method] || 0;
    if (paymentDiscountPercent > 0) {
      total = Math.round(total * (1 - paymentDiscountPercent / 100) * 100) / 100;
    }
  }

  const finalTotal = total;
  const pickupAddress = isPickup ? (store ? store.local_pickup_address : null) : null;
  const orderId = uuidv4();

  // Find customer_id if customer is logged in for this store
  let customerId = null;
  if (req.session.customerId && req.session.customerStoreId === store_id) {
    customerId = req.session.customerId;
  } else if (customer_email) {
    const existingCustomer = db.prepare('SELECT id FROM store_customers WHERE store_id = ? AND email = ?').get(store_id, customer_email);
    if (existingCustomer) customerId = existingCustomer.id;
  }

  let addressStr = null;
  if (!isPickup) {
    const parts = [address_street, address_number, address_floor, address_neighborhood, address_city, address_province, address_zip].filter(Boolean);
    addressStr = parts.join(', ');
  }

  db.prepare(`
    INSERT INTO orders (id, store_id, customer_name, customer_lastname, customer_email, customer_phone, customer_dni, 
      customer_address, address_street, address_number, address_floor, address_zip, address_neighborhood, address_city, address_province,
      items, total, status, notes, local_pickup, pickup_address, payment_status, customer_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, 'unpaid', ?)
  `).run(orderId, store_id, customer_name, customer_lastname || null, customer_email, customer_phone || null, customer_dni || null,
    isPickup ? pickupAddress : addressStr,
    isPickup ? null : (address_street || null),
    isPickup ? null : (address_number || null),
    isPickup ? null : (address_floor || null),
    isPickup ? null : (address_zip || null),
    isPickup ? null : (address_neighborhood || null),
    isPickup ? pickupAddress : (address_city || null),
    isPickup ? null : (address_province || null),
    JSON.stringify(cartItems), finalTotal, notes || null,
    isPickup ? 1 : 0, isPickup ? pickupAddress : null, customerId);

  // Clear cart
  db.prepare('DELETE FROM cart_items WHERE store_id = ? AND session_id = ?').run(store_id, sessionId);
  delete req.session.cartSessionId;

  res.json({ success: true, orderId });
});

// Get cart count
router.get('/cart/count/:storeId', (req, res) => {
  const sessionId = req.session.cartSessionId;
  if (!sessionId) return res.json({ count: 0, total: 0 });

  const cartItems = db.prepare('SELECT * FROM cart_items WHERE store_id = ? AND session_id = ?').all(req.params.storeId, sessionId);
  res.json({
    count: cartItems.reduce((sum, item) => sum + item.quantity, 0),
    total: cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  });
});

// Newsletter subscription
router.post('/newsletter/subscribe', (req, res) => {
  const { store_id, email } = req.body;
  if (!store_id || !email) return res.status(400).json({ error: 'Faltan datos' });

  // Check if already subscribed
  const existing = db.prepare('SELECT id FROM store_newsletter_subscribers WHERE store_id = ? AND email = ?').get(store_id, email);
  if (!existing) {
    db.prepare('INSERT INTO store_newsletter_subscribers (id, store_id, email) VALUES (?, ?, ?)')
      .run(uuidv4(), store_id, email);
  }

  res.json({ success: true, message: '¡Gracias por suscribirte!' });
});

// Get products for combos
router.get('/products/:storeId', (req, res) => {
  const products = db.prepare(`SELECT id, name, price FROM products WHERE store_id = ? AND status = 'active'`).all(req.params.storeId);
  res.json(products);
});

module.exports = router;
