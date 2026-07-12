/**
 * Seed script - Sports apparel store with 40+ products
 * Run: node seed.js
 */
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('./config/db');

// Realistic product images from Unsplash (high-quality sports/fitness photography)
const IMG_BASE = 'https://images.unsplash.com';
const IMAGES = {
  remeras: [
    `${IMG_BASE}/photo-1576566588028-4147f3842f27?w=600&h=600&fit=crop`,  // remera running
    `${IMG_BASE}/photo-1571731956672-f2b94d7dd0cb?w=600&h=600&fit=crop`,  // remera dry-fit
    `${IMG_BASE}/photo-1583743814966-8936f5b7be1a?w=600&h=600&fit=crop`,  // remera algodón
    `${IMG_BASE}/photo-1618354691373-d851c5c3a990?w=600&h=600&fit=crop`,  // remera compresión
    `${IMG_BASE}/photo-1596755094514-f87e34085b2c?w=600&h=600&fit=crop`,  // remera manga larga
  ],
  buzos: [
    `${IMG_BASE}/photo-1556821840-3a63f95609a7?w=600&h=600&fit=crop`,
    `${IMG_BASE}/photo-1578587018452-892bacefd3f2?w=600&h=600&fit=crop`,
    `${IMG_BASE}/photo-1620799140408-edc6dcb6d633?w=600&h=600&fit=crop`,
    `${IMG_BASE}/photo-1591047139829-d91aecb6caea?w=600&h=600&fit=crop`,
  ],
  pantalones: [
    `${IMG_BASE}/photo-1591195853828-11db59a44f6b?w=600&h=600&fit=crop`,  // jogger
    `${IMG_BASE}/photo-1518314911000-281bb16e63db?w=600&h=600&fit=crop`,  // calza
    `${IMG_BASE}/photo-1584865288642-42078afe6942?w=600&h=600&fit=crop`,  // pantalón cargo
    `${IMG_BASE}/photo-1543364195-bfe6e4932397?w=600&h=600&fit=crop`,  // calza yoga
    `${IMG_BASE}/photo-1552902865-b72c031c34e1?w=600&h=600&fit=crop`,  // pantalón técnico
  ],
  shorts: [
    `${IMG_BASE}/photo-1572490122740-5a0d229750ae?w=600&h=600&fit=crop`,
    `${IMG_BASE}/photo-1571513885956-3d2a3cf6b070?w=600&h=600&fit=crop`,
    `${IMG_BASE}/photo-1591195853828-11db59a44f6b?w=600&h=600&fit=crop`,
    `${IMG_BASE}/photo-1622445275576-721325763afe?w=600&h=600&fit=crop`,
  ],
  camperas: [
    `${IMG_BASE}/photo-1544923246-77307dd270b8?w=600&h=600&fit=crop`,
    `${IMG_BASE}/photo-1601924582970-9238bcb495d9?w=600&h=600&fit=crop`,
    `${IMG_BASE}/photo-1591047139829-d91aecb6caea?w=600&h=600&fit=crop`,
  ],
  calzado: [
    `${IMG_BASE}/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop`,  // zapatillas rojas
    `${IMG_BASE}/photo-1608231387042-66d1773070a5?w=600&h=600&fit=crop`,  // zapatillas training
    `${IMG_BASE}/photo-1606107557195-0e29a4b5b4aa?w=600&h=600&fit=crop`,  // zapatillas casual
    `${IMG_BASE}/photo-1551107696-a4b0c5a0d9a2?w=600&h=600&fit=crop`,  // zapatillas trail
    `${IMG_BASE}/photo-1605348532760-7c8bb364cc86?w=600&h=600&fit=crop`,  // zapatillas indoor
    `${IMG_BASE}/photo-1606107557195-0e29a4b5b4aa?w=600&h=600&fit=crop`,  // zapatillas elite
  ],
  accesorios: [
    `${IMG_BASE}/photo-1532073150508-0c1df9b52352?w=600&h=600&fit=crop`,  // gorra
    `${IMG_BASE}/photo-1553062407-98eeb64c6a62?w=600&h=600&fit=crop`,  // mochila
    `${IMG_BASE}/photo-1570831739435-6601aa3fa4fb?w=600&h=600&fit=crop`,  // botella
    `${IMG_BASE}/photo-1611510338559-2c46338f5b7e?w=600&h=600&fit=crop`,  // muñequeras
    `${IMG_BASE}/photo-1553062407-98eeb64c6a62?w=600&h=600&fit=crop`,  // bolso
  ],
  fitness: [
    `${IMG_BASE}/photo-1601925260368-ae2f83cf8b7f?w=600&h=600&fit=crop`,  // colchoneta
    `${IMG_BASE}/photo-1517836357463-d25dfeac3438?w=600&h=600&fit=crop`,  // bandas
    `${IMG_BASE}/photo-1534438327276-14e5300c3a48?w=600&h=600&fit=crop`,  // mancuernas
    `${IMG_BASE}/photo-1571019613454-1cb2f99b2d8b?w=600&h=600&fit=crop`,  // soga
    `${IMG_BASE}/photo-1534369249990-6a03b10dfa62?w=600&h=600&fit=crop`,  // rueda
  ],
  futbol: [
    `${IMG_BASE}/photo-1567003595470-b2f373a8df12?w=600&h=600&fit=crop`,  // camiseta fútbol
    `${IMG_BASE}/photo-1577216894081-3bf4a02a8ee7?w=600&h=600&fit=crop`,  // short fútbol
    `${IMG_BASE}/photo-1622279457486-896c4816c696?w=600&h=600&fit=crop`,  // medias
    `${IMG_BASE}/photo-1577216894081-3bf4a02a8ee7?w=600&h=600&fit=crop`,  // canilleras
  ],
  natacion: [
    `${IMG_BASE}/photo-1570977366275-4f0f0af0f0e0?w=600&h=600&fit=crop`,  // malla
    `${IMG_BASE}/photo-1570977366275-4f0f0af0f0e0?w=600&h=600&fit=crop`,  // antiparras
    `${IMG_BASE}/photo-1570977366275-4f0f0af0f0e0?w=600&h=600&fit=crop`,  // gorro
  ],
};
let imgIdx = {};
for (const k of Object.keys(IMAGES)) imgIdx[k] = 0;
function nextImg(cat) {
  const arr = IMAGES[cat];
  if (!arr) return null;
  const idx = imgIdx[cat] % arr.length;
  imgIdx[cat]++;
  return arr[idx];
}

const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
const COLORS = ['Negro', 'Blanco', 'Gris', 'Azul', 'Rojo', 'Verde'];

function rand(min, max) { return Math.round((Math.random() * (max - min) + min) * 100) / 100; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function costOf(price) { return Math.round(price * (0.35 + Math.random() * 0.15) * 100) / 100; }

async function seed() {
  await db.init();
  console.log('🌱 Seeding sports store database...');
  
  // ====== USER ======
  const userId = uuidv4();
  const hashedPw = bcrypt.hashSync('tienda001', 10);
  db.prepare('INSERT INTO users (id, email, password, name) VALUES (?, ?, ?, ?)').run(userId, 'tienda001@tienda001.com.ar', hashedPw, 'SportZone Argentina');
  console.log('  👤 User: tienda001@tienda001.com.ar / tienda001');

  // ====== STORE with payment discounts ======
  const storeId = uuidv4();
  const paymentMethods = ['Efectivo', 'Transferencia Bancaria', 'Mercado Pago', 'Tarjeta de Crédito/Débito'];
  const paymentDiscounts = { 'Efectivo': 10, 'Transferencia Bancaria': 8, 'Mercado Pago': 5 };
  
  const defaultTheme = {
    colors: {
      menu_link: '#1f2937', menu_link_hover: '#059669', menu_bg: '#ffffff', menu_border: '#e5e7eb',
      title_text: '#111827', title_bg: '#f9fafb', body_bg: '#f9fafb', body_text: '#374151',
      btn_primary_bg: '#059669', btn_primary_text: '#ffffff', btn_secondary_bg: '#e5e7eb',
      label_bg: '#ef4444', label_text: '#ffffff', footer_bg: '#111827', footer_text: '#9ca3af',
    },
    fonts: { headings: 'Inter', menus: 'Inter', product_titles: 'Inter', buttons: 'Inter', body: 'Inter' },
    header: { column_width: 'full', logo_position: 'left', logo_size: 120, bg_color: '#ffffff', sticky: true, search_mobile: true, tab_menu_mobile: true, mega_menu: false, announcement_show: true, announcement_bg: '#059669', announcement_text: '¡Envío gratis en compras mayores a $50,000!', announcement_link: '' },
    site_bg: { image: null, repeat: 'no-repeat', size: 'cover' },
    homepage: { carousel: true, category_banners: true, promo_banners: true, institutional_msg: true, featured_products: true, sale_products: true, horizontal_banner: false, modules: false, video: false, instagram_posts: true, main_categories: true, shipping_info: true, newsletter: true },
    product_listing: { infinite_scroll: false, color_variants: true, hover_image: true, image_carousel: false, quick_buy: true, show_installments: false },
    product_detail: { color_swatches: true, size_guide_link: '', show_stock: true, low_stock_warning: true, low_stock_threshold: 5, low_stock_1_msg: '¡Última unidad!', related_title: 'Productos relacionados', complementary_title: 'Completa tu look', info_blocks: [], facebook_comments: false, facebook_page_id: '' },
    cart: { show_view_more: true, min_amount: 0, quick_cart: true, quick_cart_action: 'drawer', recommendations: true, coupons: false, shipping_calculator: false },
    footer: { show_contact: true, show_social: true, show_payment: false },
    social: { whatsapp: '', instagram: '', facebook: '', twitter: '', tiktok: '', youtube: '' },
  };

  db.prepare(`INSERT INTO stores (id, user_id, name, slug, template, description, primary_color, accent_color, whatsapp, instagram, 
    min_purchase, payment_methods, payment_discounts, local_pickup, local_pickup_address, pickup_discount, theme_settings) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    storeId, userId, 'SportZone Argentina', 'sportzone', 'template2',
    'Indumentaria deportiva de primeras marcas. Running, fútbol, fitness y más. ¡Equipate como un profesional!',
    '#059669', '#10b981', '5491123456789', 'sportzone.ar',
    15000, JSON.stringify(paymentMethods), JSON.stringify(paymentDiscounts),
    1, 'Av. Santa Fe 3200, CABA, Argentina', 2000, JSON.stringify(defaultTheme)
  );
  console.log('  🏪 Store:');

  // ====== CATEGORIES ======
  const cats = {};
  const catData = [
    ['remeras', 'Remeras Deportivas', 'Remeras técnicas y de algodón para entrenar', 0],
    ['buzos', 'Buzos y Hoodies', 'Buzos con capucha y canguros para antes y después del deporte', 1],
    ['pantalones', 'Pantalones y Joggers', 'Pantalones de running, joggers y calzas', 2],
    ['shorts', 'Shorts y Bermudas', 'Shorts deportivos para hombre y mujer', 3],
    ['camperas', 'Camperas', 'Camperas impermeables y cortaviento', 4],
    ['calzado', 'Calzado Deportivo', 'Zapatillas para running, training y lifestyle', 5],
    ['accesorios', 'Accesorios', 'Gorras, mochilas, botellas y más', 6],
    ['fitness', 'Fitness y Yoga', 'Colchonetas, pesas, bandas elásticas', 7],
    ['futbol', 'Fútbol', 'Camisetas, shorts y medias de fútbol', 8],
    ['natacion', 'Natación', 'Mallas, antiparras y gorros de natación', 9],
  ];
  catData.forEach(([key, name, desc, order]) => {
    cats[key] = uuidv4();
    db.prepare('INSERT INTO categories (id, store_id, name, description, sort_order) VALUES (?, ?, ?, ?, ?)').run(cats[key], storeId, name, desc, order);
  });
  console.log('  📁 10 categories created');

  // ====== PRODUCTS ======
  const products = [
    // REMERAS
    { cat: 'remeras', name: 'Remera Térmica Running', desc: 'Remera técnica manga larga con tejido termorregulador. Ideal para running en climas fríos.', price: 24999, stock: 80, featured: 1, sku: 'REM-TRM-001', brand: 'SportZone', tags: ['running', 'térmica', 'invierno'] },
    { cat: 'remeras', name: 'Remera Dry-Fit M/C', desc: 'Remera de microfibra con tecnología Dry-Fit que absorbe la humedad y te mantiene seco.', price: 18999, stock: 120, featured: 1, sku: 'REM-DF-002', brand: 'NikeFit', tags: ['dry-fit', 'transpirable', 'gimnasio'] },
    { cat: 'remeras', name: 'Remera Algodón Premium', desc: 'Remera de algodón peinado 24/1. Corte regular, ideal para uso diario y entrenamiento liviano.', price: 15999, stock: 200, featured: 0, sku: 'REM-ALG-003', brand: 'SportZone', tags: ['algodón', 'cómoda', 'diaria'] },
    { cat: 'remeras', name: 'Remera Compresión', desc: 'Remera de compresión para training de alta intensidad. Mejora la recuperación muscular.', price: 32999, stock: 60, featured: 1, sku: 'REM-COM-004', brand: 'CompressTech', tags: ['compresión', 'recuperación', 'training'] },
    { cat: 'remeras', name: 'Remera Manga Larga Técnica', desc: 'Remera técnica manga larga con protección UV 50+. Ideal para deportes al aire libre.', price: 27999, stock: 90, featured: 0, sku: 'REM-ML-005', brand: 'OutdoorPro', tags: ['uv', 'manga larga', 'outdoor'] },
    
    // BUZOS
    { cat: 'buzos', name: 'Buzo Canguro Algodón', desc: 'Buzo canguro de algodón fleece. Bolsillo frontal y capucha ajustable.', price: 44999, stock: 75, featured: 1, sku: 'BUZ-CAN-006', brand: 'UrbanSport', tags: ['canguro', 'algodón', 'casual'] },
    { cat: 'buzos', name: 'Buzo Técnico Running', desc: 'Buzo técnico ultraliviano para running. Tejido cortaviento y reflectivo.', price: 58999, stock: 45, featured: 1, sku: 'BUZ-TEC-007', brand: 'SportZone', tags: ['running', 'cortaviento', 'reflectivo'] },
    { cat: 'buzos', name: 'Hoodie Deportivo', desc: 'Hoodie de poliéster con capucha forrada. Cierre frontal y bolsillo canguro.', price: 39999, stock: 100, featured: 0, sku: 'BUZ-HOD-008', brand: 'StreetMove', tags: ['hoodie', 'poliéster', 'urbano'] },
    { cat: 'buzos', name: 'Buzo Cremallera Completa', desc: 'Buzo con cremallera completa y cuello alto. Ideal para pre y post entrenamiento.', price: 52999, stock: 55, featured: 0, sku: 'BUZ-CRM-009', brand: 'FitWear', tags: ['cremallera', 'cuello alto', 'training'] },
    
    // PANTALONES
    { cat: 'pantalones', name: 'Jogger Deportivo', desc: 'Jogger de algodón con elastano. Cintura elástica con cordón y puños tobilleros.', price: 35999, stock: 110, featured: 1, sku: 'PAN-JOG-010', brand: 'UrbanSport', tags: ['jogger', 'algodón', 'cómodo'] },
    { cat: 'pantalones', name: 'Calza Running', desc: 'Calza larga de compresión para running. Tejido Dry-Fit con bolsillo para celular.', price: 42999, stock: 85, featured: 1, sku: 'PAN-CAL-011', brand: 'SportZone', tags: ['calza', 'running', 'compresión'] },
    { cat: 'pantalones', name: 'Pantalón Táctico', desc: 'Pantalón cargo deportivo con múltiples bolsillos. Tejido resistente y elástico.', price: 49999, stock: 65, featured: 0, sku: 'PAN-TAC-012', brand: 'OutdoorPro', tags: ['cargo', 'bolsillos', 'resistente'] },
    { cat: 'pantalones', name: 'Calza Yoga Mujer', desc: 'Calza de cintura alta para yoga y pilates. Tejido suave y elástico con costuras planas.', price: 38999, stock: 70, featured: 1, sku: 'PAN-YOG-013', brand: 'ZenFit', tags: ['yoga', 'mujer', 'cintura alta'] },
    { cat: 'pantalones', name: 'Pantalón Largo Técnico', desc: 'Pantalón técnico impermeable para trail running. Cremallera en tobillos.', price: 55999, stock: 40, featured: 0, sku: 'PAN-TEC-014', brand: 'TrailPro', tags: ['impermeable', 'trail', 'técnico'] },
    
    // SHORTS
    { cat: 'shorts', name: 'Short Running 2en1', desc: 'Short con interior de compresión y bolsillo con cierre. Tejido ultraliviano.', price: 26999, stock: 95, featured: 1, sku: 'SHO-RUN-015', brand: 'SportZone', tags: ['running', '2en1', 'bolsillo'] },
    { cat: 'shorts', name: 'Short de Gimnasio', desc: 'Short de gimnasio con cintura elástica y pretina ajustable. Libre de costuras laterales.', price: 19999, stock: 130, featured: 0, sku: 'SHO-GYM-016', brand: 'FitWear', tags: ['gimnasio', 'elástico', 'liviano'] },
    { cat: 'shorts', name: 'Bermuda Deportiva', desc: 'Bermuda de algodón con elastano. Corte moderno y dos bolsillos laterales.', price: 22999, stock: 85, featured: 0, sku: 'SHO-BER-017', brand: 'UrbanSport', tags: ['bermuda', 'algodón', 'casual'] },
    { cat: 'shorts', name: 'Short de Compresión', desc: 'Short de compresión para training de piernas. Costuras planas antiroce.', price: 31999, stock: 50, featured: 1, sku: 'SHO-COM-018', brand: 'CompressTech', tags: ['compresión', 'training', 'antiroce'] },
    
    // CAMPERAS
    { cat: 'camperas', name: 'Campera Rompevientos', desc: 'Campera rompevientos ultraliviana con capucha. Se guarda en su propio bolsillo.', price: 65999, stock: 60, featured: 1, sku: 'CMP-ROM-019', brand: 'OutdoorPro', tags: ['rompevientos', 'ultraliviana', 'portátil'] },
    { cat: 'camperas', name: 'Campera Impermeable', desc: 'Campera impermeable con costuras termoselladas. Capucha desmontable y bolsillos con cierre.', price: 89999, stock: 35, featured: 1, sku: 'CMP-IMP-020', brand: 'TrailPro', tags: ['impermeable', 'termosellada', 'lluvia'] },
    { cat: 'camperas', name: 'Campera Softshell', desc: 'Campera softshell térmica cortaviento. Ideal para actividades outdoor en clima frío.', price: 75999, stock: 40, featured: 0, sku: 'CMP-SOF-021', brand: 'SportZone', tags: ['softshell', 'térmica', 'outdoor'] },
    
    // CALZADO
    { cat: 'calzado', name: 'Zapatillas Running Pro', desc: 'Zapatillas con amortiguación reactiva y suela Vibram. Ideal para asfalto y ruta.', price: 189999, stock: 30, featured: 1, sku: 'CAL-RUN-022', brand: 'RunTech', tags: ['zapatillas', 'running', 'amortiguación'] },
    { cat: 'calzado', name: 'Zapatillas Training', desc: 'Zapatillas multideporte para training funcional. Suela plana y refuerzo lateral.', price: 159999, stock: 45, featured: 1, sku: 'CAL-TRN-023', brand: 'FitWear', tags: ['training', 'multideporte', 'suela plana'] },
    { cat: 'calzado', name: 'Zapatillas Casual', desc: 'Zapatillas lifestyle con diseño retro. Plantilla memory foam y suela de goma.', price: 129999, stock: 55, featured: 0, sku: 'CAL-CAS-024', brand: 'StreetMove', tags: ['casual', 'retro', 'memory foam'] },
    { cat: 'calzado', name: 'Zapatillas Trail', desc: 'Zapatillas de trail running con suela multilargo. Protección en puntera y talón.', price: 219999, stock: 20, featured: 1, sku: 'CAL-TRL-025', brand: 'TrailPro', tags: ['trail', 'montaña', 'agarre'] },
    { cat: 'calzado', name: 'Zapatillas Indoor', desc: 'Zapatillas de indoor con suela antideslizante. Ideales para vóley, handball y gimnasio.', price: 139999, stock: 35, featured: 0, sku: 'CAL-IND-026', brand: 'SportZone', tags: ['indoor', 'antideslizante', 'gimnasio'] },
    { cat: 'calzado', name: 'Zapatillas Running Elite', desc: 'Zapatillas de competencia con placa de carbono. Retorno de energía del 85%.', price: 349999, stock: 15, featured: 1, sku: 'CAL-ELT-027', brand: 'RunTech', tags: ['carbono', 'competencia', 'elite'] },
    
    // ACCESORIOS
    { cat: 'accesorios', name: 'Gorra Deportiva', desc: 'Gorra con visera curva y tejido transpirable. Cierre ajustable de velcro.', price: 12999, stock: 150, featured: 0, sku: 'ACC-GOR-028', brand: 'SportZone', tags: ['gorra', 'visera', 'transpirable'] },
    { cat: 'accesorios', name: 'Mochila Deportiva 30L', desc: 'Mochila impermeable con compartimiento para zapatillas y bolsillo termo.', price: 45999, stock: 40, featured: 1, sku: 'ACC-MOC-029', brand: 'OutdoorPro', tags: ['mochila', 'impermeable', '30L'] },
    { cat: 'accesorios', name: 'Botella Térmica 750ml', desc: 'Botella de acero inoxidable con aislamiento al vacío. Mantiene la temperatura por 12h.', price: 18999, stock: 100, featured: 0, sku: 'ACC-BOT-030', brand: 'HydroMax', tags: ['botella', 'térmica', 'acero'] },
    { cat: 'accesorios', name: 'Set de Muñequeras', desc: 'Par de muñequeras deportivas de microfibra. Absorben el sudor y son lavables.', price: 6999, stock: 200, featured: 0, sku: 'ACC-MUN-031', brand: 'SportZone', tags: ['muñequeras', 'sudor', 'microfibra'] },
    { cat: 'accesorios', name: 'Bolso Deportivo', desc: 'Bolso de lona con compartimento húmedo para ropa sudada. Correa ajustable.', price: 32999, stock: 55, featured: 0, sku: 'ACC-BOL-032', brand: 'UrbanSport', tags: ['bolso', 'lona', 'compartimento'] },
    
    // FITNESS
    { cat: 'fitness', name: 'Colchoneta Yoga 6mm', desc: 'Colchoneta de yoga de PVC 6mm antideslizante. Incluye correa de transporte.', price: 24999, stock: 80, featured: 1, sku: 'FIT-COL-033', brand: 'ZenFit', tags: ['yoga', 'colchoneta', 'antideslizante'] },
    { cat: 'fitness', name: 'Kit Bandas Elásticas', desc: 'Set de 5 bandas de resistencia de látex natural. Diferentes niveles de intensidad.', price: 15999, stock: 120, featured: 0, sku: 'FIT-BAN-034', brand: 'FitWear', tags: ['bandas', 'resistencia', 'látex'] },
    { cat: 'fitness', name: 'Mancuernas PVC 2x3kg', desc: 'Par de mancuernas forradas en PVC. Agarre ergonómico antideslizante.', price: 28999, stock: 60, featured: 0, sku: 'FIT-MAN-035', brand: 'IronGym', tags: ['mancuernas', 'PVC', '3kg'] },
    { cat: 'fitness', name: 'Soga para Saltar', desc: 'Soga de velocidad con rodamientos de bolsa. Cable de acero recubierto de PVC.', price: 11999, stock: 90, featured: 0, sku: 'FIT-SOG-036', brand: 'SportZone', tags: ['soga', 'velocidad', 'cardio'] },
    { cat: 'fitness', name: 'Rueda Abdominal', desc: 'Rueda abdominal con rodillo ancho y manijas de espuma. Ideal para core.', price: 9999, stock: 75, featured: 0, sku: 'FIT-RUE-037', brand: 'IronGym', tags: ['abdominal', 'rueda', 'core'] },
    
    // FÚTBOL
    { cat: 'futbol', name: 'Camiseta Fútbol Titular', desc: 'Camiseta de fútbol réplica oficial. Tejido transpirable y escudo bordado.', price: 35999, stock: 100, featured: 1, sku: 'FUT-CAM-038', brand: 'StarSport', tags: ['fútbol', 'camiseta', 'titular'] },
    { cat: 'futbol', name: 'Short Fútbol', desc: 'Short de fútbol con cintura elástica y cordón. Tejido liviano de secado rápido.', price: 15999, stock: 130, featured: 0, sku: 'FUT-SHO-039', brand: 'StarSport', tags: ['fútbol', 'short', 'liviano'] },
    { cat: 'futbol', name: 'Medias Fútbol Largas', desc: 'Medias de fútbol hasta rodilla con compresión moderada. Talón y punta reforzados.', price: 8999, stock: 200, featured: 0, sku: 'FUT-MED-040', brand: 'SportZone', tags: ['fútbol', 'medias', 'compresión'] },
    { cat: 'futbol', name: 'Canilleras Profesionales', desc: 'Canilleras de fibra de vidrio con funda de neopreno. Protección nivel profesional.', price: 19999, stock: 85, featured: 0, sku: 'FUT-CAN-041', brand: 'StarSport', tags: ['canilleras', 'protección', 'fibra'] },
    
    // NATACIÓN
    { cat: 'natacion', name: 'Malla Natación Hombre', desc: 'Malla de natación de lycra con cordón interior. Corte jammer de compresión.', price: 21999, stock: 70, featured: 0, sku: 'NAT-MAL-042', brand: 'AquaPro', tags: ['natación', 'malla', 'lycra'] },
    { cat: 'natacion', name: 'Antiparras Polarizadas', desc: 'Antiparras con lentes polarizados antivaho. Sellado de silicona y ajuste fácil.', price: 14999, stock: 90, featured: 1, sku: 'NAT-ANT-043', brand: 'AquaPro', tags: ['antiparras', 'polarizadas', 'antivaho'] },
    { cat: 'natacion', name: 'Gorro Natación Silicona', desc: 'Gorro de silicona para natación. Protege el cabello del cloro. Disponible en varios colores.', price: 6999, stock: 150, featured: 0, sku: 'NAT-GOR-044', brand: 'AquaPro', tags: ['gorro', 'silicona', 'natación'] },
  ];

  const insertProduct = db.prepare(`INSERT INTO products (id, store_id, name, description, price, category_id, stock, sku, featured, status, cost, product_type, stock_type, tags, brand, free_shipping, gender, image, images)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, 'physical', 'limited', ?, ?, ?, ?, ?, ?)`);
  const productIds = [];
  const prodCats = {};

  products.forEach(p => {
    const id = uuidv4();
    productIds.push(id);
    prodCats[id] = p.cat;
    const cost = costOf(p.price);
    const compare = p.price > 50000 ? p.price * (1 + rand(0.15, 0.3)) : null;
    const gender = p.name.includes('Mujer') ? 'female' : p.name.includes('Hombre') ? 'male' : 'unisex';
    const img = nextImg(p.cat);
    const extraImgs = [];
    for (let i = 0; i < 2; i++) { const e = nextImg(p.cat); if (e !== img) extraImgs.push(e); }
    insertProduct.run(id, storeId, p.name, p.desc, p.price, cats[p.cat], p.stock, p.sku, p.featured || 0,
      cost, JSON.stringify(p.tags), p.brand, p.tags.includes('zapatillas') || p.tags.includes('impermeable') ? 0 : 1, gender,
      img, JSON.stringify(extraImgs));
    
    // Some products have compare price
    if (compare) {
      db.prepare('UPDATE products SET compare_price = ? WHERE id = ?').run(Math.round(compare * 100) / 100, id);
    }
  });
  console.log(`  📦 ${products.length} products created`);

  // ====== VARIANTS (sizes + colors) ======
  const insertVariant = db.prepare('INSERT INTO product_variants (id, product_id, name, price, stock, sku) VALUES (?, ?, ?, ?, ?, ?)');
  let variantCount = 0;

  // Indumentaria gets size variants
  const sizeCategories = ['remeras', 'buzos', 'pantalones', 'shorts', 'camperas', 'futbol'];
  products.forEach((p, idx) => {
    const id = productIds[idx];
    if (sizeCategories.includes(p.cat)) {
      SIZES.forEach(size => {
        const extraPrice = (size === 'XXL' || size === 'XL') ? rand(0, p.price * 0.1) : 0;
        insertVariant.run(uuidv4(), id, size, extraPrice > 0 ? p.price + extraPrice : null, Math.floor(p.stock / 5), `${p.sku}-${size}`);
        variantCount++;
      });
    }
    // Some products also get color variants
    if (p.cat === 'accesorios' && p.name.includes('Gorra')) {
      ['Negro', 'Blanco', 'Azul'].forEach(c => {
        insertVariant.run(uuidv4(), id, c, null, Math.floor(p.stock / 3), `${p.sku}-${c}`);
        variantCount++;
      });
    }
  });

  // Calzado gets size variants (EU sizes)
  products.forEach((p, idx) => {
    const id = productIds[idx];
    if (p.cat === 'calzado') {
      [39, 40, 41, 42, 43, 44].forEach(euSize => {
        insertVariant.run(uuidv4(), id, `EU ${euSize}`, null, Math.floor(p.stock / 6), `${p.sku}-EU${euSize}`);
        variantCount++;
      });
    }
  });
  console.log(`  🏷️  ${variantCount} variants created (sizes + colors)`);

  // ====== VOLUME DISCOUNTS ======
  const insertVD = db.prepare('INSERT INTO volume_discounts (id, product_id, min_qty, discount_type, discount_value) VALUES (?, ?, ?, ?, ?)');
  let vdCount = 0;
  products.forEach((p, idx) => {
    if (p.price > 20000 && Math.random() > 0.5) {
      const id = productIds[idx];
      insertVD.run(uuidv4(), id, 3, 'fixed', Math.round(p.price * 0.9 * 100) / 100);
      vdCount++;
      if (p.price > 50000) {
        insertVD.run(uuidv4(), id, 6, 'fixed', Math.round(p.price * 0.82 * 100) / 100);
        vdCount++;
      }
    }
  });
  console.log(`  📊 ${vdCount} volume discounts created`);

  // ====== COMBOS ======
  const insertCombo = db.prepare('INSERT INTO combos (id, store_id, name, description, price, image, products, active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)');
  const combos = [
    { name: 'Pack Runner Pro', desc: 'Zapatillas Running Pro + Remera Dry-Fit + Short Running 2en1 + Botella Térmica', price: 229999, ids: [22, 1, 14, 29] },
    { name: 'Pack Training Completo', desc: 'Zapatillas Training + Remera Compresión + Jogger Deportivo + Set Bandas', price: 199999, ids: [23, 3, 9, 33] },
    { name: 'Pack Yoga Esencial', desc: 'Colchoneta Yoga + Calza Yoga Mujer + Botella Térmica', price: 69999, ids: [32, 12, 29] },
    { name: 'Pack Fútbol Starter', desc: 'Camiseta Fútbol + Short Fútbol + Medias + Canilleras + Gorra', price: 79999, ids: [37, 38, 39, 40, 27] },
    { name: 'Pack Outdoor Aventura', desc: 'Campera Rompevientos + Mochila 30L + Botella Térmica + Gorra', price: 109999, ids: [18, 28, 29, 27] },
    { name: 'Pack Running Elite', desc: 'Zapatillas Running Elite + Buzo Técnico + Remera Térmica + Antiparras', price: 399999, ids: [26, 6, 0, 42] },
  ];
  combos.forEach(c => {
    insertCombo.run(uuidv4(), storeId, c.name, c.desc, c.price, null, JSON.stringify(c.ids));
  });
  console.log(`  🔥 ${combos.length} combos created`);

  // ====== DEMO ORDER ======
  const orderItems = JSON.stringify([
    { quantity: 1, name: 'Zapatillas Running Pro', price: 189999, image: null },
    { quantity: 2, name: 'Remera Dry-Fit M/C', price: 18999, image: null },
    { quantity: 1, name: 'Gorra Deportiva', price: 12999, image: null },
  ]);
  const total = 189999 + 2 * 18999 + 12999;
  db.prepare(`INSERT INTO orders (id, store_id, customer_name, customer_lastname, customer_email, customer_phone, customer_dni,
    address_street, address_number, address_floor, address_zip, address_neighborhood, address_city, address_province,
    items, total, status, payment_status, customer_address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', 'paid', ?)`).run(
    uuidv4(), storeId, 'Carlos', 'Rodríguez', 'carlos@ejemplo.com', '+54 11 5555-0202', '28.456.789',
    'Av. Cabildo', '2450', 'Piso 2', 'C1428', 'Belgrano', 'CABA', 'Capital Federal',
    orderItems, total, 'Av. Cabildo 2450, Piso 2, Belgrano, CABA, Capital Federal'
  );
  console.log('  📋 Demo order created');

  await db.save();
  console.log('\n✅ Seed completado!');
  console.log('   🔑 Email: tienda001@tienda001.com.ar');
  console.log('   🔑 Pass:  tienda001');
  console.log('   🏪 Tienda: http://localhost:8081/sportzone');
  console.log('   💰 Descuentos: Efectivo 10%, Transferencia 8%, Mercado Pago 5%');
  process.exit(0);
}

seed().catch(err => { console.error('Seed error:', err); process.exit(1); });
