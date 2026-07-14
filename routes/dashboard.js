const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const slugify = require('slugify');
const db = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const cloudflare = require('../utils/cloudflare');

// Dashboard - require auth for all routes
router.use(requireAuth);

// Ensure user has a store or redirect to setup
function ensureStore(req, res, next) {
  if (!req.session.storeId) return res.redirect('/dashboard/setup');
  const store = db.prepare('SELECT id FROM stores WHERE id = ?').get(req.session.storeId);
  if (!store) {
    req.session.storeId = null;
    return res.redirect('/dashboard/setup');
  }
  next();
}

// Dashboard home
router.get('/', ensureStore, (req, res) => {
  const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.session.storeId);
  if (!store) return res.redirect('/dashboard/setup');

  const productsCount = db.prepare('SELECT COUNT(*) as count FROM products WHERE store_id = ?').get(store.id).count;
  const categoriesCount = db.prepare('SELECT COUNT(*) as count FROM categories WHERE store_id = ?').get(store.id).count;
  const ordersCount = db.prepare('SELECT COUNT(*) as count FROM orders WHERE store_id = ?').get(store.id).count;
  const recentOrders = db.prepare('SELECT * FROM orders WHERE store_id = ? ORDER BY created_at DESC LIMIT 5').all(store.id);

  res.render('dashboard/overview', {
    title: 'Panel de Control',
    store,
    productsCount,
    categoriesCount,
    ordersCount,
    recentOrders,
    section: 'overview'
  });
});

// Setup store page
router.get('/setup', (req, res) => {
  const user = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(req.session.userId);
  const existingStore = db.prepare('SELECT * FROM stores WHERE user_id = ?').get(user.id);
  if (existingStore) {
    req.session.storeId = existingStore.id;
    return res.redirect('/dashboard');
  }
  res.render('auth/setup', { title: 'Crear tu Tienda', error: null, user, store: null, layout: false });
});

// Setup store action
router.post('/setup', async (req, res) => {
  const { name, slug, template } = req.body;
  if (!name || !slug) {
    const user = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(req.session.userId);
    return res.render('auth/setup', { title: 'Crear tu Tienda', error: 'Completa todos los campos', user, store: null, layout: false });
  }

  const cleanSlug = slugify(slug, { lower: true, strict: true });
  const existing = db.prepare('SELECT id FROM stores WHERE slug = ?').get(cleanSlug);
  if (existing) {
    const user = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(req.session.userId);
    return res.render('auth/setup', { title: 'Crear tu Tienda', error: 'Este slug ya está en uso. Elige otro.', user, store: null, layout: false });
  }

  const id = uuidv4();
  const tmpl = template || 'template1';
  db.prepare('INSERT INTO stores (id, user_id, name, slug, template) VALUES (?, ?, ?, ?, ?)').run(id, req.session.userId, name, cleanSlug, tmpl);
  req.session.storeId = id;

  // Auto-create Cloudflare subdomain (DNS CNAME + Tunnel ingress)
  if (cloudflare.isConfigured() && /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(cleanSlug)) {
    try {
      const existingRecord = await cloudflare.getRecordByName(cleanSlug);
      if (!existingRecord) {
        const result = await cloudflare.createSubdomain(cleanSlug);
        db.prepare('UPDATE stores SET custom_domain = ?, cloudflare_record_id = ? WHERE id = ?')
          .run(cleanSlug, result.dns.id, id);
        console.log(`✅ Subdominio creado: ${cleanSlug}.${cloudflare.BASE_DOMAIN()} (DNS + Tunnel)`);
      } else {
        console.log(`⚠️ Subdominio ${cleanSlug} ya existe en Cloudflare, no se creó.`);
      }
    } catch (err) {
      console.error(`❌ Error creando subdominio ${cleanSlug}:`, err.message);
    }
  }

  res.redirect('/dashboard');
});

// ============ PRODUCTS ============
router.get('/productos', ensureStore, (req, res) => {
  const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.session.storeId);
  const products = db.prepare(`
    SELECT p.*, c.name as category_name 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id 
    WHERE p.store_id = ? 
    ORDER BY p.created_at DESC
  `).all(store.id);

  res.render('dashboard/products', { title: 'Productos', store, products, section: 'products' });
});

router.get('/productos/nuevo', ensureStore, (req, res) => {
  const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.session.storeId);
  const categories = db.prepare('SELECT * FROM categories WHERE store_id = ? ORDER BY name').all(store.id);
  res.render('dashboard/product-form', { title: 'Nuevo Producto', store, product: null, categories, variants: [], section: 'products' });
});

router.post('/productos/nuevo', ensureStore, (req, res) => {
  const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.session.storeId);
  const { name, description, price, compare_price, category_id, stock, sku, featured, status } = req.body;

  if (!name || !price) {
    const categories = db.prepare('SELECT * FROM categories WHERE store_id = ? ORDER BY name').all(store.id);
    return res.render('dashboard/product-form', { title: 'Nuevo Producto', store, product: null, categories, variants: [], section: 'products', error: 'Nombre y precio son requeridos' });
  }

  const id = uuidv4();
  const variants = req.body.variants ? JSON.parse(req.body.variants) : [];
  const tags = req.body.tags ? JSON.parse(req.body.tags) : [];

  const image = req.body.image || null;
  const images = req.body.images || '[]';

  db.prepare(`
    INSERT INTO products (id, store_id, name, description, price, compare_price, image, images, category_id, stock, sku, featured, status, cost, product_type, stock_type, barcode, weight, depth, width, height, tags, brand, meta_title, meta_description, free_shipping, mpn, age_range, gender)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, store.id, name, description || '', parseFloat(price), compare_price ? parseFloat(compare_price) : null, image, images, category_id || null, parseInt(stock || 0), sku || null, featured === 'on' ? 1 : 0, status || 'active',
    req.body.cost ? parseFloat(req.body.cost) : null,
    req.body.product_type || 'physical',
    req.body.stock_type || 'limited',
    req.body.barcode || null,
    req.body.weight ? parseFloat(req.body.weight) : null,
    req.body.depth ? parseFloat(req.body.depth) : null,
    req.body.width ? parseFloat(req.body.width) : null,
    req.body.height ? parseFloat(req.body.height) : null,
    JSON.stringify(tags),
    req.body.brand || null,
    req.body.meta_title || null,
    req.body.meta_description || null,
    req.body.free_shipping === 'on' ? 1 : 0,
    req.body.mpn || null,
    req.body.age_range || null,
    req.body.gender || null
  );

  // Insert variants
  if (variants.length > 0) {
    const insertVariant = db.prepare('INSERT INTO product_variants (id, product_id, name, price, stock, sku) VALUES (?, ?, ?, ?, ?, ?)');
    variants.forEach(v => {
      insertVariant.run(uuidv4(), id, v.name, parseFloat(v.price) || null, parseInt(v.stock || 0), v.sku || null);
    });
  }

  // Insert volume discounts
  const volumeDiscounts = req.body.volume_discounts ? JSON.parse(req.body.volume_discounts) : [];
  if (volumeDiscounts.length > 0) {
    const insertDiscount = db.prepare('INSERT INTO volume_discounts (id, product_id, min_qty, discount_type, discount_value) VALUES (?, ?, ?, ?, ?)');
    volumeDiscounts.forEach(d => {
      insertDiscount.run(uuidv4(), id, parseInt(d.min_qty), d.discount_type || 'fixed', parseFloat(d.discount_value));
    });
  }

  res.redirect('/dashboard/productos');
});

router.get('/productos/editar/:id', ensureStore, (req, res) => {
  const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.session.storeId);
  const product = db.prepare('SELECT * FROM products WHERE id = ? AND store_id = ?').get(req.params.id, store.id);
  if (!product) return res.redirect('/dashboard/productos');

  const categories = db.prepare('SELECT * FROM categories WHERE store_id = ? ORDER BY name').all(store.id);
  const variants = db.prepare('SELECT * FROM product_variants WHERE product_id = ?').all(product.id);

  res.render('dashboard/product-form', { title: 'Editar Producto', store, product, categories, variants, section: 'products' });
});

router.post('/productos/editar/:id', ensureStore, (req, res) => {
  const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.session.storeId);
  const { name, description, price, compare_price, category_id, stock, sku, featured, status } = req.body;
  const image = req.body.image || null;
  const images = req.body.images || '[]';
  const tags = req.body.tags ? JSON.parse(req.body.tags) : [];

  db.prepare(`
    UPDATE products SET name=?, description=?, price=?, compare_price=?, image=?, images=?, category_id=?, stock=?, sku=?, featured=?, status=?, cost=?, product_type=?, stock_type=?, barcode=?, weight=?, depth=?, width=?, height=?, tags=?, brand=?, meta_title=?, meta_description=?, free_shipping=?, mpn=?, age_range=?, gender=?
    WHERE id=? AND store_id=?
  `).run(name, description || '', parseFloat(price), compare_price ? parseFloat(compare_price) : null, image, images, category_id || null, parseInt(stock || 0), sku || null, featured === 'on' ? 1 : 0, status || 'active',
    req.body.cost ? parseFloat(req.body.cost) : null,
    req.body.product_type || 'physical',
    req.body.stock_type || 'limited',
    req.body.barcode || null,
    req.body.weight ? parseFloat(req.body.weight) : null,
    req.body.depth ? parseFloat(req.body.depth) : null,
    req.body.width ? parseFloat(req.body.width) : null,
    req.body.height ? parseFloat(req.body.height) : null,
    JSON.stringify(tags),
    req.body.brand || null,
    req.body.meta_title || null,
    req.body.meta_description || null,
    req.body.free_shipping === 'on' ? 1 : 0,
    req.body.mpn || null,
    req.body.age_range || null,
    req.body.gender || null,
    req.params.id, store.id
  );

  // Update variants
  const variants = req.body.variants ? JSON.parse(req.body.variants) : [];
  db.prepare('DELETE FROM product_variants WHERE product_id = ?').run(req.params.id);

  if (variants.length > 0) {
    const insertVariant = db.prepare('INSERT INTO product_variants (id, product_id, name, price, stock, sku) VALUES (?, ?, ?, ?, ?, ?)');
    variants.forEach(v => {
      insertVariant.run(uuidv4(), req.params.id, v.name, parseFloat(v.price) || null, parseInt(v.stock || 0), v.sku || null);
    });
  }

  // Update volume discounts
  const volumeDiscounts = req.body.volume_discounts ? JSON.parse(req.body.volume_discounts) : [];
  db.prepare('DELETE FROM volume_discounts WHERE product_id = ?').run(req.params.id);
  if (volumeDiscounts.length > 0) {
    const insertDiscount = db.prepare('INSERT INTO volume_discounts (id, product_id, min_qty, discount_type, discount_value) VALUES (?, ?, ?, ?, ?)');
    volumeDiscounts.forEach(d => {
      insertDiscount.run(uuidv4(), req.params.id, parseInt(d.min_qty), d.discount_type || 'fixed', parseFloat(d.discount_value));
    });
  }

  res.redirect('/dashboard/productos');
});

router.post('/productos/eliminar/:id', ensureStore, (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ? AND store_id = ?').run(req.params.id, req.session.storeId);
  res.redirect('/dashboard/productos');
});

router.post('/productos/eliminar-lote', ensureStore, (req, res) => {
  const ids = Array.isArray(req.body.product_ids) ? req.body.product_ids : (req.body.product_ids ? [req.body.product_ids] : []);
  if (ids.length > 0) {
    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`DELETE FROM products WHERE id IN (${placeholders}) AND store_id = ?`).run(...ids, req.session.storeId);
  }
  res.redirect('/dashboard/productos');
});

// ============ CATEGORIES ============
router.get('/categorias', ensureStore, (req, res) => {
  const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.session.storeId);
  const categories = db.prepare('SELECT c.*, (SELECT COUNT(*) FROM products WHERE category_id = c.id) as products_count FROM categories c WHERE c.store_id = ? ORDER BY c.sort_order').all(store.id);
  res.render('dashboard/categories', { title: 'Categorías', store, categories, section: 'categories' });
});

router.post('/categorias/nueva', ensureStore, (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.redirect('/dashboard/categorias');

  const id = uuidv4();
  const sortOrder = db.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM categories WHERE store_id = ?').get(req.session.storeId).next;
  db.prepare('INSERT INTO categories (id, store_id, name, description, sort_order) VALUES (?, ?, ?, ?, ?)').run(id, req.session.storeId, name, description || '', sortOrder);
  res.redirect('/dashboard/categorias');
});

router.post('/categorias/editar/:id', ensureStore, (req, res) => {
  const { name, description } = req.body;
  db.prepare('UPDATE categories SET name=?, description=? WHERE id=? AND store_id=?').run(name, description || '', req.params.id, req.session.storeId);
  res.redirect('/dashboard/categorias');
});

router.post('/categorias/eliminar/:id', ensureStore, (req, res) => {
  db.prepare('UPDATE products SET category_id = NULL WHERE category_id = ? AND store_id = ?').run(req.params.id, req.session.storeId);
  db.prepare('DELETE FROM categories WHERE id = ? AND store_id = ?').run(req.params.id, req.session.storeId);
  res.redirect('/dashboard/categorias');
});

router.post('/categorias/eliminar-lote', ensureStore, (req, res) => {
  const ids = Array.isArray(req.body.category_ids) ? req.body.category_ids : (req.body.category_ids ? [req.body.category_ids] : []);
  if (ids.length > 0) {
    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`UPDATE products SET category_id = NULL WHERE category_id IN (${placeholders}) AND store_id = ?`).run(...ids, req.session.storeId);
    db.prepare(`DELETE FROM categories WHERE id IN (${placeholders}) AND store_id = ?`).run(...ids, req.session.storeId);
  }
  res.redirect('/dashboard/categorias');
});

// ============ ORDERS ============
router.get('/pedidos', ensureStore, (req, res) => {
  const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.session.storeId);
  const orders = db.prepare('SELECT * FROM orders WHERE store_id = ? ORDER BY created_at DESC').all(store.id);
  res.render('dashboard/orders', { title: 'Pedidos', store, orders, section: 'orders' });
});

router.post('/pedidos/status/:id', ensureStore, (req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE orders SET status = ? WHERE id = ? AND store_id = ?').run(status, req.params.id, req.session.storeId);
  res.redirect('/dashboard/pedidos');
});

router.post('/pedidos/pago/:id', ensureStore, (req, res) => {
  const { payment_status } = req.body;
  db.prepare('UPDATE orders SET payment_status = ? WHERE id = ? AND store_id = ?').run(payment_status, req.params.id, req.session.storeId);
  res.redirect('/dashboard/pedidos');
});

// ============ COMBOS ============
router.get('/combos', ensureStore, (req, res) => {
  const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.session.storeId);
  const combos = db.prepare('SELECT * FROM combos WHERE store_id = ? ORDER BY created_at DESC').all(store.id);
  res.render('dashboard/combos', { title: 'Combos', store, combos, section: 'combos' });
});

router.post('/combos/nuevo', ensureStore, (req, res) => {
  const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.session.storeId);
  const { name, description, price, products } = req.body;
  if (!name || !price) return res.redirect('/dashboard/combos');

  const id = uuidv4();
  const selectedProducts = products ? (Array.isArray(products) ? products : [products]) : [];
  db.prepare('INSERT INTO combos (id, store_id, name, description, price, products) VALUES (?, ?, ?, ?, ?, ?)').run(id, store.id, name, description || '', parseFloat(price), JSON.stringify(selectedProducts));
  res.redirect('/dashboard/combos');
});

router.post('/combos/eliminar/:id', ensureStore, (req, res) => {
  db.prepare('DELETE FROM combos WHERE id = ? AND store_id = ?').run(req.params.id, req.session.storeId);
  res.redirect('/dashboard/combos');
});

// ============ THEME EDITOR ============
router.get('/editor', ensureStore, (req, res) => {
  res.redirect('/dashboard/editor/plantilla');
});

router.get('/editor/:sub', ensureStore, (req, res) => {
  const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.session.storeId);
  let theme = {};
  try { theme = JSON.parse(store.theme_settings || '{}'); } catch(e) {}
  try { theme.filtros = JSON.parse(store.filter_settings || '{}'); } catch(e) {}
  let heroImages = [];
  try { heroImages = JSON.parse(store.hero_images || '[]'); } catch(e) {}
  
  const validSubs = ['plantilla','colores','anuncio','carrusel','logo','navegacion','tienda','secciones','filtros','whatsapp','instagram','facebook','css'];
  const sub = validSubs.includes(req.params.sub) ? req.params.sub : 'plantilla';
  
  res.render('dashboard/editor', { title: 'Editor de Tienda', store, theme, heroImages, section: 'editor', sub });
});

router.post('/editor', ensureStore, (req, res) => {
  const { advanced_css } = req.body;
  const theme = {};

  // Brand colors
  theme.brand = {
    logo: req.body.brand_logo || null,
    favicon: req.body.brand_favicon || null,
  };

  // Colors
  theme.colors = {
    menu_link: req.body.color_menu_link || '#1f2937',
    menu_link_hover: req.body.color_menu_link_hover || '#4f46e5',
    menu_bg: req.body.color_menu_bg || '#ffffff',
    menu_border: req.body.color_menu_border || '#e5e7eb',
    title_text: req.body.color_title_text || '#111827',
    title_bg: req.body.color_title_bg || '#f9fafb',
    body_bg: req.body.color_body_bg || '#f9fafb',
    body_text: req.body.color_body_text || '#374151',
    btn_primary_bg: req.body.color_btn_primary_bg || '#4f46e5',
    btn_primary_text: req.body.color_btn_primary_text || '#ffffff',
    btn_secondary_bg: req.body.color_btn_secondary_bg || '#e5e7eb',
    label_bg: req.body.color_label_bg || '#ef4444',
    label_text: req.body.color_label_text || '#ffffff',
    footer_bg: req.body.color_footer_bg || '#111827',
    footer_text: req.body.color_footer_text || '#9ca3af',
    preset: req.body.color_preset || null,
  };

  // Fonts
  theme.fonts = {
    headings: req.body.font_headings || 'Inter',
    menus: req.body.font_menus || 'Inter',
    product_titles: req.body.font_product_titles || 'Inter',
    buttons: req.body.font_buttons || 'Inter',
    body: req.body.font_body || 'Inter',
  };

  // Header
  theme.header = {
    column_width: req.body.header_column_width || 'full',
    logo_position: req.body.header_logo_position || 'left',
    logo_size: parseInt(req.body.header_logo_size || 120),
    bg_color: req.body.header_bg_color || '#ffffff',
    sticky: req.body.header_sticky === 'on',
    search_mobile: req.body.header_search_mobile === 'on',
    mega_menu: req.body.header_mega_menu === 'on',
    tab_menu_mobile: req.body.header_tab_menu_mobile === 'on',
    announcement_show: req.body.header_announcement_show === 'on',
    announcement_bg: req.body.header_announcement_bg || '#4f46e5',
    announcement_text: req.body.header_announcement_text || '',
    announcement_link: req.body.header_announcement_link || '',
  };

  // Site background
  theme.site_bg = {
    image: req.body.site_bg_image || null,
    repeat: req.body.site_bg_repeat || 'no-repeat',
    size: req.body.site_bg_size || 'cover',
  };

  // Homepage sections
  theme.homepage = {
    hero: req.body.homepage_hero !== 'off',
    carousel: req.body.homepage_carousel === 'on',
    category_banners: req.body.homepage_category_banners === 'on',
    promo_banners: req.body.homepage_promo_banners === 'on',
    institutional_msg: req.body.homepage_institutional_msg === 'on',
    featured_products: req.body.homepage_featured_products !== 'off',
    sale_products: req.body.homepage_sale_products === 'on',
    horizontal_banner: req.body.homepage_horizontal_banner === 'on',
    modules: req.body.homepage_modules === 'on',
    video: req.body.homepage_video === 'on',
    instagram_posts: req.body.homepage_instagram_posts === 'on',
    main_categories: req.body.homepage_main_categories === 'on',
    shipping_info: req.body.homepage_shipping_info === 'on',
    newsletter: req.body.homepage_newsletter === 'on',
  };

  // Product listing
  theme.product_listing = {
    infinite_scroll: req.body.listing_infinite_scroll === 'on',
    color_variants: req.body.listing_color_variants === 'on',
    hover_image: req.body.listing_hover_image === 'on',
    image_carousel: req.body.listing_image_carousel === 'on',
    quick_buy: req.body.listing_quick_buy === 'on',
    show_installments: req.body.listing_show_installments === 'on',
  };

  // Product detail
  theme.product_detail = {
    color_swatches: req.body.detail_color_swatches === 'on',
    size_guide_link: req.body.detail_size_guide_link || '',
    show_stock: req.body.detail_show_stock === 'on',
    low_stock_warning: req.body.detail_low_stock_warning === 'on',
    low_stock_threshold: parseInt(req.body.detail_low_stock_threshold || 5),
    low_stock_1_msg: req.body.detail_low_stock_1_msg || '¡Última unidad!',
    related_title: req.body.detail_related_title || 'Productos relacionados',
    complementary_title: req.body.detail_complementary_title || 'Completa tu look',
    info_blocks: [],
    facebook_comments: req.body.detail_facebook_comments === 'on',
    facebook_page_id: req.body.detail_facebook_page_id || '',
  };

  // Build info blocks (up to 3)
  for (let i = 1; i <= 3; i++) {
    if (req.body[`detail_info_${i}_show`] === 'on') {
      theme.product_detail.info_blocks.push({
        icon: req.body[`detail_info_${i}_icon`] || '',
        title: req.body[`detail_info_${i}_title`] || '',
        description: req.body[`detail_info_${i}_description`] || '',
      });
    }
  }

  // Cart
  theme.cart = {
    show_view_more: req.body.cart_show_view_more === 'on',
    min_amount: parseFloat(req.body.cart_min_amount || 0),
    quick_cart: req.body.cart_quick_cart === 'on',
    quick_cart_action: req.body.cart_quick_cart_action || 'drawer',
    recommendations: req.body.cart_recommendations === 'on',
    coupons: req.body.cart_coupons === 'on',
    shipping_calculator: req.body.cart_shipping_calculator === 'on',
  };

  // Footer
  theme.footer = {
    show_contact: req.body.footer_show_contact === 'on',
    show_social: req.body.footer_show_social !== 'off',
    show_payment: req.body.footer_show_payment === 'on',
  };

  // Social
  theme.social = {
    whatsapp: req.body.social_whatsapp || '',
    instagram: req.body.social_instagram || '',
    facebook: req.body.social_facebook || '',
    twitter: req.body.social_twitter || '',
    tiktok: req.body.social_tiktok || '',
    youtube: req.body.social_youtube || '',
  };

  // Hero images (up to 5)
  const heroImages = [];
  for (let i = 0; i < 5; i++) {
    const url = req.body['hero_image_' + i];
    if (url && url.trim()) heroImages.push(url.trim());
  }

  // Filter settings — only set if any filter_* fields are actually in the body
  let filterSettings = null;
  const filterDefs = ['categories','price_range','search','sort','brands','colors_sizes','gender','free_shipping'];
  const hasFilterFields = filterDefs.some(k => req.body['filter_' + k] !== undefined);
  if (hasFilterFields) {
    filterSettings = {};
    filterDefs.forEach(k => {
      filterSettings[k] = req.body['filter_' + k] === 'on';
    });
  }

  // If _partial=template flag was sent (from switchTemplate), do a minimal update
  const isPartialTemplate = req.body._partial === 'template';

  if (isPartialTemplate) {
    const tmpl = req.body.template || 'template1';
    db.prepare('UPDATE stores SET template = ? WHERE id = ?').run(tmpl, req.session.storeId);
  } else {
    // Full save: always merge with existing DB data to preserve fields not in the current form section
    const current = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.session.storeId);

    // Read current DB values as defaults — only overwrite with submitted values
    const cName = current ? current.name : '';
    const cDescription = current ? current.description : '';
    const cAbout = current ? current.about_text : '';
    const cLogo = current ? current.logo : null;
    const cBanner = current ? current.banner : null;
    const cPrimary = current ? current.primary_color : '#4f46e5';
    const cAccent = current ? current.accent_color : '#e5e7eb';
    const cWhatsapp = current ? current.whatsapp : '';
    const cInstagram = current ? current.instagram : '';
    const cFacebook = current ? current.facebook : '';
    const cTemplate = current ? current.template : 'template1';

    // Only use submitted value if the field was actually present in the form body
    const has = (key) => req.body[key] !== undefined && req.body[key] !== null;
    const finalName = has('name') ? req.body.name : cName;
    const finalDescription = has('description') ? req.body.description : cDescription;
    const finalAbout = has('about_text') ? req.body.about_text : cAbout;
    const finalLogo = has('brand_logo') ? (req.body.brand_logo || null) : cLogo;
    const finalBanner = has('banner') ? (req.body.banner || null) : cBanner;
    const finalPrimary = has('primary_color') ? (req.body.primary_color || '#4f46e5') : cPrimary;
    const finalAccent = has('accent_color') ? (req.body.accent_color || '#e5e7eb') : cAccent;
    const finalWhatsapp = has('social_whatsapp') ? req.body.social_whatsapp : cWhatsapp;
    const finalInstagram = has('social_instagram') ? req.body.social_instagram : cInstagram;
    const finalFacebook = has('social_facebook') ? req.body.social_facebook : cFacebook;
    const finalTemplate = has('template') ? (req.body.template || cTemplate) : cTemplate;

    // Preserve hero_images if not submitted (carousel section collapsed)
    const finalHeroImages = heroImages.length > 0 ? heroImages : (current ? JSON.parse(current.hero_images || '[]') : []);

    // Merge theme_settings: keep existing values for keys not in the submitted theme
    let finalTheme = theme;
    if (current) {
      try {
        const existingTheme = JSON.parse(current.theme_settings || '{}');
        finalTheme = { ...existingTheme, ...theme };
        if (existingTheme.colors && theme.colors) {
          finalTheme.colors = { ...existingTheme.colors, ...theme.colors };
        }
      } catch(e) {}
    }

    // Merge filter_settings: preserve existing if not in form
    const finalFilter = filterSettings || (current ? (current.filter_settings || {}) : {});

    db.prepare('UPDATE stores SET theme_settings = ?, advanced_css = ?, template = ?, name = ?, description = ?, about_text = ?, logo = ?, banner = ?, primary_color = ?, accent_color = ?, whatsapp = ?, instagram = ?, facebook = ?, filter_settings = ?, hero_images = ? WHERE id = ?')
      .run(JSON.stringify(finalTheme), advanced_css || (current ? current.advanced_css : ''), finalTemplate, finalName, finalDescription, finalAbout, finalLogo, finalBanner, finalPrimary, finalAccent, finalWhatsapp, finalInstagram, finalFacebook, JSON.stringify(finalFilter), JSON.stringify(finalHeroImages), req.session.storeId);
  }

  res.redirect('/dashboard/editor');
});

// ============ PREVIEW ============
router.get('/preview', ensureStore, (req, res) => {
  const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.session.storeId);
  if (!store) return res.status(404).send('Store not found');

  // Use ?template query param for instant preview switching without saving
  const tmpl = req.query.template || store.template;

  const categories = db.prepare('SELECT * FROM categories WHERE store_id = ? AND active = 1 ORDER BY sort_order').all(store.id);
  const products = db.prepare(`SELECT * FROM products WHERE store_id = ? AND status = 'active' ORDER BY featured DESC, created_at DESC`).all(store.id);
  const combos = db.prepare('SELECT * FROM combos WHERE store_id = ? AND active = 1').all(store.id);
  const featured = products.filter(p => p.featured);
  
  // Pass heroImages for preview
  let heroImages = [];
  try { heroImages = JSON.parse(store.hero_images || '[]'); } catch(e) {}

  res.render(`storefront/${tmpl}/layout`, {
    title: store.name, store, storeBaseUrl: store.custom_domain ? '' : '/' + store.slug, categories, products, combos, featured,
    cartItems: [], cartCount: 0, cartTotal: 0, currentSection: 'home', page: 'home', layout: false,
    locals: {}, heroImages
  });
});

// ============ APPEARANCE (redirects to editor) ============
router.get('/apariencia', ensureStore, (req, res) => {
  res.redirect('/dashboard/editor');
});

router.post('/apariencia', ensureStore, (req, res) => {
  res.redirect('/dashboard/editor');
});

// ============ SETTINGS ============
router.get('/configuracion', ensureStore, (req, res) => {
  const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.session.storeId);
  const user = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(req.session.userId);
  res.render('dashboard/settings', { title: 'Configuración', store, user, section: 'settings' });
});

// Sales settings page
router.get('/configuracion/ventas', ensureStore, (req, res) => {
  const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.session.storeId);
  res.render('dashboard/sales', { title: 'Configuración de Ventas', store, section: 'sales' });
});

// Sales settings
router.post('/configuracion/ventas', ensureStore, (req, res) => {
  const { min_purchase, payment_methods, local_pickup, local_pickup_address, pickup_discount,
    whatsapp_notifications, email_notifications, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from_email, smtp_from_name } = req.body;
  const methods = payment_methods ? (Array.isArray(payment_methods) ? payment_methods : [payment_methods]) : [];
  
  // Build payment discounts map
  const allMethods = ['Efectivo', 'Transferencia Bancaria', 'Mercado Pago', 'Tarjeta de Crédito/Débito', 'Criptomonedas', 'Otro'];
  const discounts = {};
  allMethods.forEach(m => {
    const key = 'payment_discount_' + m.replace(/[^a-zA-Z0-9]/g, '_');
    const val = parseFloat(req.body[key]);
    if (val > 0) discounts[m] = val;
  });

  db.prepare(`
    UPDATE stores SET min_purchase=?, payment_methods=?, payment_discounts=?, local_pickup=?, local_pickup_address=?, pickup_discount=?,
      whatsapp_notifications=?, email_notifications=?, smtp_host=?, smtp_port=?, smtp_user=?, smtp_pass=?, smtp_from_email=?, smtp_from_name=?
    WHERE id=?
  `).run(
    parseFloat(min_purchase || 0),
    JSON.stringify(methods),
    JSON.stringify(discounts),
    local_pickup === 'on' ? 1 : 0,
    local_pickup_address || null,
    parseFloat(pickup_discount || 0),
    whatsapp_notifications === '1' ? 1 : 0,
    email_notifications === '1' ? 1 : 0,
    smtp_host || '',
    parseInt(smtp_port || 587),
    smtp_user || '',
    smtp_pass || '',
    smtp_from_email || '',
    smtp_from_name || '',
    req.session.storeId
  );
  res.redirect('/dashboard/configuracion/ventas');
});

module.exports = router;
