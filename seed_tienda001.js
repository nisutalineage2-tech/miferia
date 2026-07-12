/**
 * Seed script for user "tienda001" — 40+ products, sports apparel store
 * Run: node seed_tienda001.js
 */
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('./config/db');

const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
const EU_SIZES = [38, 39, 40, 41, 42, 43, 44, 45];
const COLORS = ['Negro', 'Blanco', 'Gris', 'Azul', 'Rojo', 'Verde'];

function rand(min, max) { return Math.round((Math.random() * (max - min) + min) * 100) / 100; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function costOf(price) { return Math.round(price * (0.35 + Math.random() * 0.15) * 100) / 100; }

async function seedTienda001() {
  await db.init();
  console.log('🌱 Seeding catalog for tienda001...');

  // Find user and store
  const user = db.prepare("SELECT id FROM users WHERE email = 'tienda001@tienda001.com.ar'").get();
  if (!user) {
    console.log('❌ User tienda001 not found');
    process.exit(1);
  }
  const store = db.prepare('SELECT id, slug FROM stores WHERE user_id = ?').get(user.id);
  if (!store) {
    console.log('❌ Store for tienda001 not found');
    process.exit(1);
  }
  console.log('  🏪 Store:', store.slug, '(' + store.id + ')');

  // Clean existing catalog for this store
  db.prepare("DELETE FROM product_variants WHERE product_id IN (SELECT id FROM products WHERE store_id = ?)").run(store.id);
  db.prepare("DELETE FROM volume_discounts WHERE product_id IN (SELECT id FROM products WHERE store_id = ?)").run(store.id);
  db.prepare("DELETE FROM combos WHERE store_id = ?").run(store.id);
  db.prepare("DELETE FROM products WHERE store_id = ?").run(store.id);
  db.prepare("DELETE FROM categories WHERE store_id = ?").run(store.id);
  console.log('  🧹 Cleaned existing catalog');

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
    ['fitness', 'Fitness y Yoga', 'Colchonetas, pesas y bandas elásticas', 7],
    ['futbol', 'Fútbol', 'Camisetas, shorts y medias de fútbol', 8],
    ['natacion', 'Natación', 'Mallas, antiparras y gorros de natación', 9],
  ];
  catData.forEach(([key, name, desc, order]) => {
    cats[key] = uuidv4();
    db.prepare('INSERT INTO categories (id, store_id, name, description, sort_order) VALUES (?, ?, ?, ?, ?)').run(cats[key], store.id, name, desc, order);
  });
  console.log('  📁 10 categories created');

  // ====== PRODUCTS ======
  const products = [
    // REMERAS (5)
    { cat: 'remeras', name: 'Remera Térmica Running', desc: 'Remera técnica manga larga con tejido termorregulador. Ideal para running en climas fríos.', price: 24999, stock: 80, featured: 1, sku: 'T001-REM-TRM', brand: 'Tienda Sport' },
    { cat: 'remeras', name: 'Remera Dry-Fit M/C', desc: 'Remera de microfibra con tecnología Dry-Fit que absorbe la humedad y te mantiene seco.', price: 18999, stock: 120, featured: 1, sku: 'T001-REM-DF', brand: 'ActiveWear' },
    { cat: 'remeras', name: 'Remera Algodón Premium', desc: 'Remera de algodón peinado 24/1. Corte regular, ideal para uso diario y entrenamiento liviano.', price: 15999, stock: 200, featured: 0, sku: 'T001-REM-ALG', brand: 'Tienda Sport' },
    { cat: 'remeras', name: 'Remera Compresión', desc: 'Remera de compresión para training de alta intensidad. Mejora la recuperación muscular.', price: 32999, stock: 60, featured: 1, sku: 'T001-REM-COM', brand: 'CompressTech' },
    { cat: 'remeras', name: 'Remera Manga Larga Técnica', desc: 'Remera técnica manga larga con protección UV 50+. Ideal para deportes al aire libre.', price: 27999, stock: 90, featured: 0, sku: 'T001-REM-ML', brand: 'OutdoorPro' },
    
    // BUZOS (4)
    { cat: 'buzos', name: 'Buzo Canguro Algodón', desc: 'Buzo canguro de algodón fleece. Bolsillo frontal y capucha ajustable.', price: 44999, stock: 75, featured: 1, sku: 'T001-BUZ-CAN', brand: 'UrbanSport' },
    { cat: 'buzos', name: 'Buzo Técnico Running', desc: 'Buzo técnico ultraliviano para running. Tejido cortaviento y reflectivo.', price: 58999, stock: 45, featured: 1, sku: 'T001-BUZ-TEC', brand: 'Tienda Sport' },
    { cat: 'buzos', name: 'Hoodie Deportivo', desc: 'Hoodie de poliéster con capucha forrada. Cierre frontal y bolsillo canguro.', price: 39999, stock: 100, featured: 0, sku: 'T001-BUZ-HOD', brand: 'StreetMove' },
    { cat: 'buzos', name: 'Buzo Cremallera Completa', desc: 'Buzo con cremallera completa y cuello alto. Ideal para pre y post entrenamiento.', price: 52999, stock: 55, featured: 0, sku: 'T001-BUZ-CRM', brand: 'FitWear' },
    
    // PANTALONES (5)
    { cat: 'pantalones', name: 'Jogger Deportivo', desc: 'Jogger de algodón con elastano. Cintura elástica con cordón y puños tobilleros.', price: 35999, stock: 110, featured: 1, sku: 'T001-PAN-JOG', brand: 'UrbanSport' },
    { cat: 'pantalones', name: 'Calza Running', desc: 'Calza larga de compresión para running. Tejido Dry-Fit con bolsillo para celular.', price: 42999, stock: 85, featured: 1, sku: 'T001-PAN-CAL', brand: 'Tienda Sport' },
    { cat: 'pantalones', name: 'Pantalón Cargo Deportivo', desc: 'Pantalón cargo deportivo con múltiples bolsillos. Tejido resistente y elástico.', price: 49999, stock: 65, featured: 0, sku: 'T001-PAN-CAR', brand: 'OutdoorPro' },
    { cat: 'pantalones', name: 'Calza Yoga Mujer', desc: 'Calza de cintura alta para yoga y pilates. Tejido suave con costuras planas.', price: 38999, stock: 70, featured: 1, sku: 'T001-PAN-YOG', brand: 'ZenFit' },
    { cat: 'pantalones', name: 'Pantalón Técnico Impermeable', desc: 'Pantalón técnico impermeable para trail running. Cremallera en tobillos.', price: 55999, stock: 40, featured: 0, sku: 'T001-PAN-TEC', brand: 'TrailPro' },
    
    // SHORTS (4)
    { cat: 'shorts', name: 'Short Running 2en1', desc: 'Short con interior de compresión y bolsillo con cierre. Tejido ultraliviano.', price: 26999, stock: 95, featured: 1, sku: 'T001-SHO-RUN', brand: 'Tienda Sport' },
    { cat: 'shorts', name: 'Short de Gimnasio', desc: 'Short de gimnasio con cintura elástica y pretina ajustable. Sin costuras laterales.', price: 19999, stock: 130, featured: 0, sku: 'T001-SHO-GYM', brand: 'FitWear' },
    { cat: 'shorts', name: 'Bermuda Deportiva', desc: 'Bermuda de algodón con elastano. Corte moderno y dos bolsillos laterales.', price: 22999, stock: 85, featured: 0, sku: 'T001-SHO-BER', brand: 'UrbanSport' },
    { cat: 'shorts', name: 'Short de Compresión', desc: 'Short de compresión para training de piernas. Costuras planas antiroce.', price: 31999, stock: 50, featured: 1, sku: 'T001-SHO-COM', brand: 'CompressTech' },
    
    // CAMPERAS (3)
    { cat: 'camperas', name: 'Campera Rompevientos', desc: 'Campera rompevientos ultraliviana con capucha. Se guarda en su propio bolsillo.', price: 65999, stock: 60, featured: 1, sku: 'T001-CMP-ROM', brand: 'OutdoorPro' },
    { cat: 'camperas', name: 'Campera Impermeable', desc: 'Campera impermeable con costuras termoselladas. Capucha desmontable.', price: 89999, stock: 35, featured: 1, sku: 'T001-CMP-IMP', brand: 'TrailPro' },
    { cat: 'camperas', name: 'Campera Softshell', desc: 'Campera softshell térmica cortaviento. Ideal para outdoor en clima frío.', price: 75999, stock: 40, featured: 0, sku: 'T001-CMP-SOF', brand: 'Tienda Sport' },
    
    // CALZADO (6)
    { cat: 'calzado', name: 'Zapatillas Running Pro', desc: 'Zapatillas con amortiguación reactiva y suela Vibram. Ideal para asfalto y ruta.', price: 189999, stock: 30, featured: 1, sku: 'T001-CAL-RUN', brand: 'RunTech' },
    { cat: 'calzado', name: 'Zapatillas Training', desc: 'Zapatillas multideporte para training funcional. Suela plana y refuerzo lateral.', price: 159999, stock: 45, featured: 1, sku: 'T001-CAL-TRN', brand: 'FitWear' },
    { cat: 'calzado', name: 'Zapatillas Casual', desc: 'Zapatillas lifestyle con diseño retro. Plantilla memory foam y suela de goma.', price: 129999, stock: 55, featured: 0, sku: 'T001-CAL-CAS', brand: 'StreetMove' },
    { cat: 'calzado', name: 'Zapatillas Trail', desc: 'Zapatillas de trail running con suela multilargo. Protección en puntera y talón.', price: 219999, stock: 20, featured: 1, sku: 'T001-CAL-TRL', brand: 'TrailPro' },
    { cat: 'calzado', name: 'Zapatillas Indoor', desc: 'Zapatillas de indoor con suela antideslizante. Ideales para vóley, handball y gimnasio.', price: 139999, stock: 35, featured: 0, sku: 'T001-CAL-IND', brand: 'Tienda Sport' },
    { cat: 'calzado', name: 'Zapatillas Running Elite', desc: 'Zapatillas de competencia con placa de carbono. Retorno de energía del 85%.', price: 349999, stock: 15, featured: 1, sku: 'T001-CAL-ELT', brand: 'RunTech' },
    
    // ACCESORIOS (5)
    { cat: 'accesorios', name: 'Gorra Deportiva', desc: 'Gorra con visera curva y tejido transpirable. Cierre ajustable de velcro.', price: 12999, stock: 150, featured: 0, sku: 'T001-ACC-GOR', brand: 'Tienda Sport' },
    { cat: 'accesorios', name: 'Mochila Deportiva 30L', desc: 'Mochila impermeable con compartimiento para zapatillas y bolsillo termo.', price: 45999, stock: 40, featured: 1, sku: 'T001-ACC-MOC', brand: 'OutdoorPro' },
    { cat: 'accesorios', name: 'Botella Térmica 750ml', desc: 'Botella de acero inoxidable con aislamiento al vacío. Mantiene temperatura 12h.', price: 18999, stock: 100, featured: 0, sku: 'T001-ACC-BOT', brand: 'HydroMax' },
    { cat: 'accesorios', name: 'Set de Muñequeras', desc: 'Par de muñequeras deportivas de microfibra. Absorben el sudor y son lavables.', price: 10999, stock: 200, featured: 0, sku: 'T001-ACC-MUN', brand: 'Tienda Sport' },
    { cat: 'accesorios', name: 'Bolso Deportivo', desc: 'Bolso de lona con compartimento húmedo para ropa sudada. Correa ajustable.', price: 32999, stock: 55, featured: 0, sku: 'T001-ACC-BOL', brand: 'UrbanSport' },
    
    // FITNESS (5)
    { cat: 'fitness', name: 'Colchoneta Yoga 6mm', desc: 'Colchoneta de yoga de PVC 6mm antideslizante. Incluye correa de transporte.', price: 24999, stock: 80, featured: 1, sku: 'T001-FIT-COL', brand: 'ZenFit' },
    { cat: 'fitness', name: 'Kit Bandas Elásticas', desc: 'Set de 5 bandas de resistencia de látex natural. Diferentes niveles de intensidad.', price: 15999, stock: 120, featured: 0, sku: 'T001-FIT-BAN', brand: 'FitWear' },
    { cat: 'fitness', name: 'Mancuernas PVC 2x3kg', desc: 'Par de mancuernas forradas en PVC. Agarre ergonómico antideslizante.', price: 28999, stock: 60, featured: 0, sku: 'T001-FIT-MAN', brand: 'IronGym' },
    { cat: 'fitness', name: 'Soga para Saltar', desc: 'Soga de velocidad con rodamientos de bolsa. Cable de acero recubierto de PVC.', price: 11999, stock: 90, featured: 0, sku: 'T001-FIT-SOG', brand: 'Tienda Sport' },
    { cat: 'fitness', name: 'Rueda Abdominal', desc: 'Rueda abdominal con rodillo ancho y manijas de espuma. Ideal para core.', price: 12999, stock: 75, featured: 0, sku: 'T001-FIT-RUE', brand: 'IronGym' },
    
    // FÚTBOL (4)
    { cat: 'futbol', name: 'Camiseta Fútbol Titular', desc: 'Camiseta de fútbol réplica oficial. Tejido transpirable y escudo bordado.', price: 35999, stock: 100, featured: 1, sku: 'T001-FUT-CAM', brand: 'StarSport' },
    { cat: 'futbol', name: 'Short Fútbol', desc: 'Short de fútbol con cintura elástica y cordón. Tejido liviano de secado rápido.', price: 15999, stock: 130, featured: 0, sku: 'T001-FUT-SHO', brand: 'StarSport' },
    { cat: 'futbol', name: 'Medias Fútbol Largas', desc: 'Medias de fútbol hasta rodilla con compresión moderada. Talón y punta reforzados.', price: 12999, stock: 200, featured: 0, sku: 'T001-FUT-MED', brand: 'Tienda Sport' },
    { cat: 'futbol', name: 'Canilleras Profesionales', desc: 'Canilleras de fibra de vidrio con funda de neopreno. Protección nivel profesional.', price: 19999, stock: 85, featured: 0, sku: 'T001-FUT-CAN', brand: 'StarSport' },
    
    // NATACIÓN (3)
    { cat: 'natacion', name: 'Malla Natación Hombre', desc: 'Malla de natación de lycra con cordón interior. Corte jammer de compresión.', price: 21999, stock: 70, featured: 0, sku: 'T001-NAT-MAL', brand: 'AquaPro' },
    { cat: 'natacion', name: 'Antiparras Polarizadas', desc: 'Antiparras con lentes polarizados antivaho. Sellado de silicona y ajuste fácil.', price: 14999, stock: 90, featured: 1, sku: 'T001-NAT-ANT', brand: 'AquaPro' },
    { cat: 'natacion', name: 'Gorro Natación Silicona', desc: 'Gorro de silicona para natación. Protege el cabello del cloro.', price: 10999, stock: 150, featured: 0, sku: 'T001-NAT-GOR', brand: 'AquaPro' },
  ];

  const insertProduct = db.prepare(`INSERT INTO products (id, store_id, name, description, price, category_id, stock, sku, featured, status, cost, product_type, stock_type, tags, brand, free_shipping, gender)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, 'physical', 'limited', ?, ?, ?, ?)`);
  
  const productIds = [];
  const prodCats = {};

  products.forEach(p => {
    const id = uuidv4();
    productIds.push(id);
    prodCats[id] = p.cat;
    const cost = costOf(p.price);
    const compare = p.price > 50000 ? p.price * (1 + rand(0.15, 0.3)) : null;
    const gender = p.name.includes('Mujer') ? 'female' : p.name.includes('Hombre') ? 'male' : 'unisex';
    const tags = JSON.stringify([p.cat, p.brand.toLowerCase().replace(/\s/g, '')]);
    insertProduct.run(id, store.id, p.name, p.desc, p.price, cats[p.cat], p.stock, p.sku, p.featured || 0,
      cost, tags, p.brand, 1, gender);
    
    if (compare) {
      db.prepare('UPDATE products SET compare_price = ? WHERE id = ?').run(Math.round(compare * 100) / 100, id);
    }
  });
  console.log(`  📦 ${products.length} products created`);

  // ====== VARIANTS ======
  const insertVariant = db.prepare('INSERT INTO product_variants (id, product_id, name, price, stock, sku) VALUES (?, ?, ?, ?, ?, ?)');
  let variantCount = 0;

  // Apparel gets size variants (S-XXL)
  const sizeCategories = ['remeras', 'buzos', 'pantalones', 'shorts', 'camperas', 'futbol'];
  products.forEach((p, idx) => {
    const id = productIds[idx];
    if (sizeCategories.includes(p.cat)) {
      SIZES.forEach(size => {
        const extraPrice = (size === 'XL' || size === 'XXL') ? rand(0, p.price * 0.1) : 0;
        insertVariant.run(uuidv4(), id, size, extraPrice > 0 ? Math.round((p.price + extraPrice) * 100) / 100 : null, Math.floor(p.stock / 5), `${p.sku}-${size}`);
        variantCount++;
      });
    }
  });

  // Calzado gets EU size variants
  products.forEach((p, idx) => {
    const id = productIds[idx];
    if (p.cat === 'calzado') {
      EU_SIZES.forEach(euSize => {
        insertVariant.run(uuidv4(), id, `EU ${euSize}`, null, Math.floor(p.stock / EU_SIZES.length), `${p.sku}-EU${euSize}`);
        variantCount++;
      });
    }
  });

  // Gorra gets color variants
  products.forEach((p, idx) => {
    const id = productIds[idx];
    if (p.name.includes('Gorra') || p.name.includes('Gorro')) {
      ['Negro', 'Blanco', 'Azul'].forEach(c => {
        insertVariant.run(uuidv4(), id, c, null, Math.floor(p.stock / 3), `${p.sku}-${c}`);
        variantCount++;
      });
    }
  });

  console.log(`  🏷️  ${variantCount} variants created`);

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
  const insertCombo = db.prepare('INSERT INTO combos (id, store_id, name, description, price, products, active) VALUES (?, ?, ?, ?, ?, ?, 1)');
  const combos = [
    { name: 'Pack Runner Pro', desc: 'Zapatillas Running Pro + Remera Dry-Fit + Short Running 2en1 + Botella Térmica', price: 229999, ids: [22, 1, 15, 28] },
    { name: 'Pack Training Completo', desc: 'Zapatillas Training + Remera Compresión + Jogger Deportivo + Kit Bandas', price: 199999, ids: [23, 3, 10, 32] },
    { name: 'Pack Yoga Esencial', desc: 'Colchoneta Yoga + Calza Yoga Mujer + Botella Térmica', price: 69999, ids: [31, 13, 28] },
    { name: 'Pack Fútbol Starter', desc: 'Camiseta Fútbol + Short Fútbol + Medias + Canilleras', price: 69999, ids: [37, 38, 39, 40] },
    { name: 'Pack Outdoor Aventura', desc: 'Campera Rompevientos + Mochila 30L + Botella Térmica + Gorra', price: 109999, ids: [18, 27, 28, 26] },
    { name: 'Pack Running Elite', desc: 'Zapatillas Running Elite + Buzo Técnico + Remera Térmica + Antiparras', price: 399999, ids: [25, 6, 0, 42] },
  ];
  combos.forEach(c => {
    insertCombo.run(uuidv4(), store.id, c.name, c.desc, c.price, JSON.stringify(c.ids));
  });
  console.log(`  🔥 ${combos.length} combos created`);

  // ====== PAYMENT DISCOUNTS ======
  const paymentDiscounts = { 'Efectivo': 10, 'Transferencia Bancaria': 8, 'Mercado Pago': 5 };
  const paymentMethods = ['Efectivo', 'Transferencia Bancaria', 'Mercado Pago', 'Tarjeta de Crédito/Débito'];
  db.prepare('UPDATE stores SET payment_discounts = ?, payment_methods = ?, min_purchase = ?, local_pickup = 1, local_pickup_address = ?, pickup_discount = ? WHERE id = ?')
    .run(JSON.stringify(paymentDiscounts), JSON.stringify(paymentMethods), 15000, 'Av. Corrientes 1234, CABA, Argentina', 2000, store.id);
  console.log('  💰 Payment discounts: Efectivo 10%, Transferencia 8%, Mercado Pago 5%');

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
    uuidv4(), store.id, 'Carlos', 'Rodríguez', 'carlos@ejemplo.com', '+54 11 5555-0202', '28.456.789',
    'Av. Cabildo', '2450', 'Piso 2', 'C1428', 'Belgrano', 'CABA', 'Capital Federal',
    orderItems, total, 'Av. Cabildo 2450, Piso 2, Belgrano, CABA, Capital Federal'
  );
  console.log('  📋 Demo order created');

  console.log('\n✅ Seed completado para tienda001!');
  console.log(`   🏪 Tienda: /${store.slug}`);
  console.log('   💰 Descuentos: Efectivo 10%, Transferencia 8%, Mercado Pago 5%');
  console.log('   📦 Productos: ' + products.length + ' | Variantes: ' + variantCount + ' | Combos: ' + combos.length);
}

seedTienda001().catch(err => { console.error('Seed error:', err); process.exit(1); });
