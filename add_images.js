/**
 * Assign placeholder product images from picsum.photos
 * Run: node add_images.js
 */
const db = require('./config/db');

const IMAGE_BASE = 'https://picsum.photos/seed';

// Unique seeds for each product index to get consistent images
const IMAGE_SEEDS = [
  // REMERAS (0-4)
  'runner-tech', 'dry-fit-red', 'cotton-white', 'compression-blue', 'longsleeve-uv',
  // BUZOS (5-8)
  'hoodie-gray', 'running-jacket', 'street-hoodie', 'fullzip-black',
  // PANTALONES (9-13)
  'jogger-navy', 'leggings-run', 'cargo-green', 'yoga-pants', 'trail-pant',
  // SHORTS (14-17)
  'short-run', 'gym-short', 'bermuda-khaki', 'compression-short',
  // CAMPERAS (18-20)
  'windbreaker', 'rain-jacket', 'softshell',
  // CALZADO (21-26)
  'running-pro', 'training-shoe', 'casual-sneaker', 'trail-shoe', 'indoor-shoe', 'carbon-elite',
  // ACCESORIOS (27-31)
  'cap-black', 'backpack-blue', 'bottle-steel', 'wristband', 'gym-bag',
  // FITNESS (32-36)
  'yoga-mat', 'resistance-band', 'dumbell-set', 'jump-rope', 'ab-wheel',
  // FUTBOL (37-40)
  'jersey-home', 'short-soccer', 'socks-long', 'shin-guard',
  // NATACION (41-43)
  'swim-trunks', 'goggles-polarized', 'swim-cap',
];

async function addImages() {
  await db.init();
  console.log('🖼️  Adding placeholder images to products...');

  // Find tienda001 store
  const store = db.prepare("SELECT id FROM stores WHERE slug = 'tienda001'").get();
  if (!store) {
    console.log('❌ Store tienda001 not found');
    process.exit(1);
  }

  // Get all products ordered by creation
  const products = db.prepare("SELECT id, name, sku, category_id FROM products WHERE store_id = ? ORDER BY created_at").all(store.id);

  // Get categories for mapping
  const categories = db.prepare("SELECT id, name FROM categories WHERE store_id = ? ORDER BY sort_order").all(store.id);
  const catNames = {};
  categories.forEach(c => { catNames[c.id] = c.name; });

  console.log(`  📦 Found ${products.length} products`);

  let updated = 0;
  products.forEach((p, idx) => {
    const seed = IMAGE_SEEDS[idx] || `product-${idx}`;
    const imgUrl = `${IMAGE_BASE}/${seed}/400/400`;
    const imagesJson = JSON.stringify([imgUrl]);
    
    db.prepare('UPDATE products SET image = ?, images = ? WHERE id = ?').run(imgUrl, imagesJson, p.id);
    updated++;
    
    if (updated <= 5 || updated % 10 === 0) {
      const catName = catNames[p.category_id] || 'Sin categoría';
      console.log(`  [${updated}/${products.length}] ${p.name} (${catName})`);
    }
  });

  console.log(`\n✅ ${updated} products updated with images`);
  console.log(`   Example: ${IMAGE_BASE}/${IMAGE_SEEDS[0]}/400/400`);
}

addImages().catch(err => { console.error('Error:', err); process.exit(1); });
