const { Jimp } = require('jimp');
const path = require('path');
const fs = require('fs');

const OUTPUT = path.join(__dirname, '..', 'public', 'uploads', 'templates');

const PALETTES = [
  { n:'Elegance', bg:'#fef1f7', p:'#db2777', fb:'#831843', h:'#831843', ft:'#fbcfe8', t:'#831843', c:'#ffffff', cb:'#fce7f3' },
  { n:'Minimal',  bg:'#ffffff', p:'#4f46e5', fb:'#111827', h:'#111827', ft:'#9ca3af', t:'#1f2937', c:'#ffffff', cb:'#e5e7eb' },
  { n:'Vibrant',  bg:'#fefce8', p:'#f59e0b', fb:'#78350f', h:'#422006', ft:'#fde68a', t:'#422006', c:'#ffffff', cb:'#fed7aa' },
  { n:'Dark',     bg:'#0a0a0f', p:'#818cf8', fb:'#050508', h:'#e5e7eb', ft:'#6b7280', t:'#e5e7eb', c:'#1a1a2e', cb:'#2a2a3e' },
  { n:'Nature',   bg:'#f0fdf4', p:'#16a34a', fb:'#14532d', h:'#14532d', ft:'#bbf7d0', t:'#14532d', c:'#ffffff', cb:'#bbf7d0' },
  { n:'Soft',     bg:'#fdf2f8', p:'#ec4899', fb:'#831843', h:'#831843', ft:'#fbcfe8', t:'#831843', c:'#ffffff', cb:'#fbcfe8' },
  { n:'Sport',    bg:'#fff7ed', p:'#ea580c', fb:'#7c2d12', h:'#7c2d12', ft:'#fed7aa', t:'#7c2d12', c:'#ffffff', cb:'#fed7aa' },
  { n:'Luxury',   bg:'#fafaf9', p:'#d97706', fb:'#292524', h:'#292524', ft:'#d6d3d1', t:'#292524', c:'#ffffff', cb:'#e7e5e4' },
  { n:'Friendly', bg:'#fff1f2', p:'#f43f5e', fb:'#881337', h:'#881337', ft:'#fecdd3', t:'#881337', c:'#ffffff', cb:'#fecdd3' },
  { n:'Bold',     bg:'#ffffff', p:'#dc2626', fb:'#111827', h:'#111827', ft:'#9ca3af', t:'#111827', c:'#ffffff', cb:'#e5e7eb' },
  { n:'Calm',     bg:'#f0fdfa', p:'#0d9488', fb:'#134e4a', h:'#134e4a', ft:'#99f6e4', t:'#134e4a', c:'#ffffff', cb:'#99f6e4' },
  { n:'Tech',     bg:'#0f172a', p:'#06b6d4', fb:'#020617', h:'#e2e8f0', ft:'#64748b', t:'#cbd5e1', c:'#1e293b', cb:'#334155' },
  { n:'Warm',     bg:'#fefce8', p:'#c2410c', fb:'#431407', h:'#431407', ft:'#fed7aa', t:'#431407', c:'#fffbeb', cb:'#fed7aa' },
  { n:'Cool',     bg:'#eff6ff', p:'#2563eb', fb:'#1e3a5f', h:'#1e3a5f', ft:'#bfdbfe', t:'#1e3a5f', c:'#ffffff', cb:'#bfdbfe' },
  { n:'Urban',    bg:'#fafafa', p:'#171717', fb:'#0a0a0a', h:'#0a0a0a', ft:'#737373', t:'#171717', c:'#ffffff', cb:'#d4d4d4' },
  { n:'Playful',  bg:'#fdf4ff', p:'#a855f7', fb:'#581c87', h:'#581c87', ft:'#e9d5ff', t:'#581c87', c:'#ffffff', cb:'#e9d5ff' },
  { n:'Clean',    bg:'#ffffff', p:'#111827', fb:'#111827', h:'#111827', ft:'#9ca3af', t:'#111827', c:'#ffffff', cb:'#e5e7eb' },
  { n:'Rustic',   bg:'#fefce8', p:'#92400e', fb:'#292524', h:'#422006', ft:'#a8a29e', t:'#422006', c:'#fff7ed', cb:'#d6d3d1' },
  { n:'Neon',     bg:'#050505', p:'#22d3ee', fb:'#000000', h:'#e5e7eb', ft:'#4b5563', t:'#e5e7eb', c:'#111111', cb:'#1f2937' },
  { n:'Zen',      bg:'#fafaf9', p:'#65a30d', fb:'#292524', h:'#44403c', ft:'#a8a29e', t:'#44403c', c:'#ffffff', cb:'#e7e5e4' },
  { n:'Royal',    bg:'#f8fafc', p:'#b45309', fb:'#0f172a', h:'#1e293b', ft:'#94a3b8', t:'#1e293b', c:'#ffffff', cb:'#e2e8f0' },
  { n:'Sweet',    bg:'#fdf2f8', p:'#f472b6', fb:'#831843', h:'#831843', ft:'#fbcfe8', t:'#831843', c:'#ffffff', cb:'#fbcfe8' },
  { n:'Metal',    bg:'#f3f4f6', p:'#6b7280', fb:'#111827', h:'#1f2937', ft:'#6b7280', t:'#1f2937', c:'#ffffff', cb:'#d1d5db' },
  { n:'Ocean',    bg:'#ecfeff', p:'#0891b2', fb:'#164e63', h:'#164e63', ft:'#a5f3fc', t:'#164e63', c:'#ffffff', cb:'#a5f3fc' },
  { n:'Sunset',   bg:'#fdf4ff', p:'#9333ea', fb:'#4c1d95', h:'#4c1d95', ft:'#e9d5ff', t:'#4c1d95', c:'#ffffff', cb:'#e9d5ff' },
  { n:'Forest',   bg:'#f7fee7', p:'#4d7c0f', fb:'#1a2e05', h:'#365314', ft:'#a3e635', t:'#365314', c:'#ffffff', cb:'#bef264' },
  { n:'Gold',     bg:'#fffbeb', p:'#f59e0b', fb:'#451a03', h:'#78350f', ft:'#fde68a', t:'#78350f', c:'#ffffff', cb:'#fde68a' },
  { n:'Silver',   bg:'#f9fafb', p:'#8b5cf6', fb:'#1f2937', h:'#1f2937', ft:'#9ca3af', t:'#1f2937', c:'#ffffff', cb:'#e5e7eb' },
  { n:'Coral',    bg:'#fff1f2', p:'#fb7185', fb:'#9f1239', h:'#9f1239', ft:'#fecdd3', t:'#9f1239', c:'#ffffff', cb:'#fecdd3' },
  { n:'Lavender', bg:'#f5f3ff', p:'#7c3aed', fb:'#4c1d95', h:'#4c1d95', ft:'#ddd6fe', t:'#4c1d95', c:'#ffffff', cb:'#ddd6fe' },
  { n:'Beauty',   bg:'#ffffff', p:'#550047', fb:'#000000', h:'#000000', ft:'#ffffff', t:'#000000', c:'#ffffff', cb:'#e5e7eb' },
];

function toU32(r, g, b, a) { return ((r*256+g)*256+b)*256+a; }

function hexI(hex) {
  return toU32(parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16), 255);
}

function hexR(hex) { return parseInt(hex.slice(1,3),16); }
function hexG(hex) { return parseInt(hex.slice(3,5),16); }
function hexB(hex) { return parseInt(hex.slice(5,7),16); }

function light(hex, amt) {
  return toU32(Math.max(0,Math.min(255,hexR(hex)+amt)), Math.max(0,Math.min(255,hexG(hex)+amt)), Math.max(0,Math.min(255,hexB(hex)+amt)), 255);
}

function dark(hex, amt) { return light(hex, -amt); }

function fill(i, x, y, w, h, ci) {
  for (let r=y; r<y+h && r<i.bitmap.height; r++)
    for (let c=x; c<x+w && c<i.bitmap.width; c++)
      i.setPixelColor(ci, c, r);
}

function circle(i, cx, cy, r, ci) {
  for (let dy=-r; dy<=r; dy++)
    for (let dx=-r; dx<=r; dx++)
      if (dx*dx+dy*dy <= r*r) { const px=cx+dx, py=cy+dy; if (px>=0&&px<i.bitmap.width&&py>=0&&py<i.bitmap.height) i.setPixelColor(ci, px, py); }
}

function rrect(i, x, y, w, h, r, ci) {
  for (let row=y; row<y+h && row<i.bitmap.height; row++)
    for (let col=x; col<x+w && col<i.bitmap.width; col++) {
      let inShape = true;
      if (col<x+r && row<y+r) inShape = (col-(x+r))*(col-(x+r))+(row-(y+r))*(row-(y+r))<=r*r;
      else if (col<x+r && row>=y+h-r) inShape = (col-(x+r))*(col-(x+r))+(row-(y+h-r))*(row-(y+h-r))<=r*r;
      else if (col>=x+w-r && row<y+r) inShape = (col-(x+w-r))*(col-(x+w-r))+(row-(y+r))*(row-(y+r))<=r*r;
      else if (col>=x+w-r && row>=y+h-r) inShape = (col-(x+w-r))*(col-(x+w-r))+(row-(y+h-r))*(row-(y+h-r))<=r*r;
      if (inShape) i.setPixelColor(ci, col, row);
    }
}

async function gen(p, fp) {
  const W=800, H=600;
  const img = new Jimp({width:W, height:H, color: hexI(p.bg)});

  const pI = hexI(p.p);
  const pR=hexR(p.p), pG=hexG(p.p), pB=hexB(p.p);
  const hI = hexI(p.h);
  const hR=hexR(p.h), hG=hexG(p.h), hB=hexB(p.h);
  const fI = hexI(p.fb);
  const fR=hexR(p.fb), fG=hexG(p.fb), fB=hexB(p.fb);
  const wI=0xffffffff, bI=0x000000ff;
  const bgD = dark(p.bg, 12);
  const bgL = light(p.bg, 18);
  const bgX = light(p.bg, 10);

  // ---------- TOP BAR (promo) ----------
  fill(img, 0, 0, W, 26, pI);
  // text-like bars
  fill(img, 260, 8, 80, 4, toU32(pR,pG,pB,60));
  fill(img, 400, 8, 100, 4, toU32(pR,pG,pB,60));
  fill(img, 550, 8, 70, 4, toU32(pR,pG,pB,60));

  // ---------- NAV ----------
  fill(img, 0, 26, W, 36, wI);
  // Logo
  rrect(img, 22, 33, 90, 22, 4, pI);
  // Nav links
  const navX = [170, 240, 310, 380, 450];
  navX.forEach(x => fill(img, x, 42, 40, 4, toU32(hR,hG,hB,60)));
  // Search
  rrect(img, 550, 33, 120, 22, 11, light(p.bg, -6));
  fill(img, 560, 41, 70, 4, toU32(hR,hG,hB,30));
  // Cart
  rrect(img, 700, 33, 50, 22, 4, pI);
  fill(img, 755, 42, 20, 4, wI);

  // ---------- HERO (gradient overlay effect) ----------
  const hY = 62, hH = 145;
  // Gradient-like: layered fills
  fill(img, 0, hY, W, hH, bgL);
  // Hero overlay circle
  circle(img, 680, hY+110, 90, toU32(pR,pG,pB,20));
  circle(img, 120, hY-20, 50, toU32(pR,pG,pB,10));

  // Tag badge
  rrect(img, 35, hY+18, 95, 18, 9, pI);
  fill(img, 55, hY+26, 55, 4, wI);

  // Hero title lines
  fill(img, 35, hY+48, 310, 10, hI);
  fill(img, 35, hY+64, 240, 8, toU32(hR,hG,hB,80));
  fill(img, 35, hY+78, 280, 8, toU32(hR,hG,hB,60));

  // Hero description
  fill(img, 35, hY+100, 200, 6, toU32(hR,hG,hB,50));
  fill(img, 35, hY+110, 250, 6, toU32(hR,hG,hB,40));

  // Hero buttons
  rrect(img, 35, hY+128, 110, 30, 15, pI);
  rrect(img, 155, hY+128, 110, 30, 15, toU32(pR,pG,pB,30));

  // Hero image placeholder (rounded rectangle)
  rrect(img, 480, hY+22, 260, 110, 8, light(p.bg, -10));
  // Decorative inside
  fill(img, 500, hY+45, 60, 6, toU32(hR,hG,hB,30));
  fill(img, 500, hY+57, 100, 6, toU32(hR,hG,hB,20));
  fill(img, 500, hY+100, 80, 20, pI);

  // ---------- SECTION: Categories ----------
  const sec1Y = hY + hH + 10;
  fill(img, 35, sec1Y+10, 140, 10, hI);

  const catX = [30, 190, 350, 510, 670];
  catX.forEach((cx, i) => {
    const cy = sec1Y + 35;
    rrect(img, cx, cy, 120, 80, 8, bgX);
    circle(img, cx+60, cy+28, 18, i%2===0?pI:toU32(pR,pG,pB,30));
    fill(img, cx+30, cy+58, 60, 5, toU32(hR,hG,hB,50));
  });

  // ---------- SECTION: Products heading ----------
  const sec2Y = sec1Y + 130;
  fill(img, 35, sec2Y+5, 160, 10, hI);

  // ---------- PRODUCT GRID ----------
  const cW=155, cH=230, gap=14;
  const sX=20, sY=sec2Y+30;
  for (let row=0; row<2; row++) {
    for (let col=0; col<4; col++) {
      const cx = sX + col*(cW+gap);
      const cy = sY + row*(cH+gap);
      if (cx+cW > W) continue;

      // Card bg
      rrect(img, cx, cy, cW, cH, 6, wI);
      // Card shadow border
      fill(img, cx, cy, cW, 1, light(p.bg, -8));

      // Product image
      rrect(img, cx+8, cy+8, cW-16, 100, 4, bgD);
      // Image inner decoration
      const imgColor = (row*4+col)%3===0 ? pI : toU32(pR,pG,pB,30);
      rrect(img, cx+30, cy+26, cW-60, 60, 30, imgColor);
      // White icon
      fill(img, cx+55, cy+50, 30, 8, wI);
      fill(img, cx+45, cy+64, 50, 8, wI);

      // Title
      fill(img, cx+12, cy+118, cW-24, 7, hI);
      fill(img, cx+12, cy+129, Math.floor((cW-24)*0.55), 6, toU32(hR,hG,hB,60));

      // Price
      fill(img, cx+12, cy+148, 55, 11, pI);

      // Rating stars
      for (let s=0; s<5; s++) fill(img, cx+12+s*14, cy+166, 10, 3, light(p.bg, -15));

      // Button
      rrect(img, cx+12, cy+185, cW-24, 26, 13, pI);
      fill(img, cx+40, cy+196, 60, 4, wI);
    }
  }

  // ---------- SECTION: Stats/trust bar ----------
  const statsY = Math.min(sY+2*(cH+gap)+5, H-90);
  fill(img, 0, statsY, W, 42, bgL);
  [100, 300, 500, 700].forEach(x => {
    fill(img, x, statsY+10, 60, 6, pI);
    fill(img, x+5, statsY+20, 50, 4, toU32(hR,hG,hB,50));
  });

  // ---------- NEWSLETTER SECTION ----------
  const nlY = statsY + 42;
  fill(img, 0, nlY, W, 48, toU32(pR,pG,pB,12));
  fill(img, 300, nlY+8, 200, 8, hI);
  fill(img, 280, nlY+20, 240, 5, toU32(hR,hG,hB,50));
  rrect(img, 310, nlY+30, 180, 16, 8, pI);
  fill(img, 360, nlY+36, 80, 4, wI);

  // ---------- FOOTER ----------
  const ftY = nlY + 48;
  fill(img, 0, ftY, W, H-ftY, fI);
  fill(img, 200, ftY+15, 400, 6, toU32(fR,fG,fB,80));
  fill(img, 230, ftY+27, 340, 5, toU32(fR,fG,fB,40));
  // Footer columns
  [100, 250, 400, 550].forEach(x => {
    fill(img, x, ftY+45, 50, 4, toU32(fR,fG,fB,60));
    for (let l=0; l<3; l++) fill(img, x, ftY+54+l*8, 70, 3, toU32(fR,fG,fB,30));
  });
  // Copyright
  fill(img, 280, H-18, 240, 4, toU32(fR,fG,fB,40));

  await img.write(fp);
}

async function main() {
  fs.mkdirSync(OUTPUT, {recursive:true});
  for (let i=0; i<PALETTES.length; i++) {
    const idx = i+1, tmpl = `template${idx}`, fp = path.join(OUTPUT, `${tmpl}.jpg`);
    console.log(`Generating ${tmpl} (${PALETTES[i].n})...`);
    await gen(PALETTES[i], fp);
    const size = Math.round(fs.statSync(fp).size/1024);
    console.log(`  Saved ${tmpl}.jpg (${size}KB)`);
  }
  console.log('Done! All '+PALETTES.length+' previews generated.');
}

main().catch(e => { console.error(e); process.exit(1); });
