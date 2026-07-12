# AGENTS - Frontend / Templates

## Motor de Plantillas

- **EJS** (Embedded JavaScript Templates) con `express-ejs-layouts`
- **Tailwind CSS** via CDN (`cdn.tailwindcss.com`) - sin build step
- **Google Fonts** via CDN (Inter, Playfair Display, Space Grotesk segun template)
- **Server-Side Rendering** - todo el HTML se genera en el servidor

---

## Estructura de Vistas

```
views/
├── auth/                    # Autenticacion administradores
│   ├── login.ejs
│   ├── register.ejs
│   └── setup.ejs            # Crear primera tienda
│
├── dashboard/               # Panel administrativo
│   ├── layout.ejs           # Layout principal (sidebar + contenido)
│   ├── overview.ejs         # Estadisticas + pedidos recientes
│   ├── products.ejs         # Lista de productos
│   ├── product-form.ejs     # Formulario crear/editar producto
│   ├── categories.ejs       # Gestion de categorias
│   ├── orders.ejs           # Gestion de pedidos
│   ├── combos.ejs           # Gestion de combos/packs
│   ├── editor.ejs           # Editor visual de tema (~500 lineas)
│   ├── settings.ejs         # Configuracion general
│   ├── sales.ejs            # Configuracion de ventas
│   └── appearance.ejs       # Redirect a editor
│
├── storefront/              # 10 templates de tienda publica
│   ├── template1/layout.ejs   (213 lineas) Belleza/Soft
│   ├── template2/layout.ejs   (205 lineas) Fashion/Moderno
│   ├── template3/layout.ejs   (175 lineas)
│   ├── template4/layout.ejs   (308 lineas)
│   ├── template5/layout.ejs   (294 lineas)
│   ├── template6/layout.ejs   (226 lineas)
│   ├── template7/layout.ejs   (162 lineas)
│   ├── template8/layout.ejs   (142 lineas)
│   ├── template9/layout.ejs   (143 lineas)
│   └── template10/layout.ejs  (143 lineas)
│
├── partials/                # Componentes reutilizables
│   ├── _nav_links.ejs       # Navegacion comun
│   ├── _cart.ejs            # Carrito de compras
│   ├── _checkout.ejs        # Formulario de checkout
│   ├── _product_card.ejs    # Tarjeta de producto
│   ├── _product_detail.ejs  # Detalle de producto
│   ├── _hero_carousel.ejs   # Carrusel hero
│   ├── _flash.ejs           # Mensajes flash/alertas
│   └── _page_content.ejs    # Contenido de paginas estaticas
│
└── public/                  # Paginas del sitio principal
    ├── home.ejs             # Landing page TuFerIA
    ├── stores.ejs           # Directorio de tiendas
    └── 404.ejs              # Pagina no encontrada
```

---

## Dashboard Layout (`views/dashboard/layout.ejs`)

El layout del dashboard tiene:
- **Sidebar fijo** con navegacion por secciones (iconos SVG inline)
- **Responsive:** sidebar en desktop, menu hamburguesa en mobile
- **Tema dark:** gradientes `#0f0f1a → #1a1a2e`, acentos indigo/purple
- **Tarjetas:** bordes sutiles, gradientes, bordes redondeados
- **JS minimal:** solo toggle del sidebar mobile (`public/js/dashboard.js`, 18 lineas)

### Variables disponibles en todas las vistas del dashboard:
```javascript
title         // Titulo de la pagina
store         // Objeto tienda completo de BD
user          // Objeto usuario (id, email, name)
section       // Seccion activa para highlighting en sidebar
currentPath   // Ruta actual para highlighting
```

---

## Templates de Storefront

### Como funciona el multi-template

Cada tienda tiene un `template` guardado en la BD (ej: `template1`). El storefront renderiza:
```javascript
res.render(`storefront/${store.template}/layout`, { ... });
```

Cada template es un **layout completo** que incluye todas las secciones (home, tienda, detalle, carrito, checkout, etc.) usando condicionales EJS:
```ejs
<% if (page === 'home') { %>
  <!-- Hero, categorias, productos destacados -->
<% } else if (page === 'shop') { %>
  <!-- Filtros, grid de productos -->
<% } else if (page === 'product') { %>
  <!-- Detalle de producto -->
<% } else if (page === 'cart') { %>
  <!-- Carrito -->
<% } else if (page === 'checkout') { %>
  <!-- Checkout -->
<% } %>
```

### Variables disponibles en templates storefront:
```javascript
store            // Objeto tienda (theme_settings, colors, social, etc.)
categories       // Array de categorias activas
products         // Array de productos
featured         // Array de productos destacados
combos           // Array de combos activos
cartItems        // Items del carrito
cartCount        // Cantidad total en carrito
cartTotal        // Total del carrito
currentSection   // Seccion actual (home, shop, product, cart, etc.)
page             // Pagina actual (home, shop, product, cart, etc.)
heroImages       // Array de imagenes hero
category         // Categoria actual (en vista de categoria)
product          // Producto actual (en vista de detalle)
productImages    // Imagenes del producto
variants         // Variantes del producto
volumeDiscounts  // Descuentos por volumen
related          // Productos relacionados
filterData       // Datos para UI de filtros (brands, variants, genders)
filterSettings   // Que filtros mostrar
priceRange       // Rango de precios
query            // Query string de filtros
```

---

## Tema Settings (JSON en `store.theme_settings`)

El editor visual guarda toda la configuracion en un JSON con esta estructura:

```json
{
  "brand": {
    "logo": "url",
    "favicon": "url"
  },
  "colors": {
    "menu_link": "#1f2937",
    "menu_link_hover": "#4f46e5",
    "menu_bg": "#ffffff",
    "menu_border": "#e5e7eb",
    "title_text": "#111827",
    "title_bg": "#f9fafb",
    "body_bg": "#f9fafb",
    "body_text": "#374151",
    "btn_primary_bg": "#4f46e5",
    "btn_primary_text": "#ffffff",
    "btn_secondary_bg": "#e5e7eb",
    "label_bg": "#ef4444",
    "label_text": "#ffffff",
    "footer_bg": "#111827",
    "footer_text": "#9ca3af",
    "preset": "nombre-del-preset"
  },
  "fonts": {
    "headings": "Inter",
    "menus": "Inter",
    "product_titles": "Inter",
    "buttons": "Inter",
    "body": "Inter"
  },
  "header": {
    "column_width": "full|boxed",
    "logo_position": "left|center|right",
    "logo_size": 120,
    "bg_color": "#ffffff",
    "sticky": true,
    "search_mobile": false,
    "mega_menu": false,
    "tab_menu_mobile": false,
    "announcement_show": false,
    "announcement_bg": "#4f46e5",
    "announcement_text": "",
    "announcement_link": ""
  },
  "site_bg": {
    "image": "url",
    "repeat": "no-repeat",
    "size": "cover"
  },
  "homepage": {
    "hero": true,
    "carousel": false,
    "category_banners": false,
    "promo_banners": false,
    "institutional_msg": false,
    "featured_products": true,
    "sale_products": false,
    "horizontal_banner": false,
    "modules": false,
    "video": false,
    "instagram_posts": false,
    "main_categories": false,
    "shipping_info": false,
    "newsletter": false
  },
  "product_listing": {
    "infinite_scroll": false,
    "color_variants": false,
    "hover_image": false,
    "image_carousel": false,
    "quick_buy": false,
    "show_installments": false
  },
  "product_detail": {
    "color_swatches": false,
    "size_guide_link": "",
    "show_stock": false,
    "low_stock_warning": false,
    "low_stock_threshold": 5,
    "low_stock_1_msg": "Ultima unidad!",
    "related_title": "Productos relacionados",
    "complementary_title": "Completa tu look",
    "info_blocks": [],
    "facebook_comments": false,
    "facebook_page_id": ""
  },
  "cart": {
    "show_view_more": false,
    "min_amount": 0,
    "quick_cart": false,
    "quick_cart_action": "drawer",
    "recommendations": false,
    "coupons": false,
    "shipping_calculator": false
  },
  "footer": {
    "show_contact": false,
    "show_social": true,
    "show_payment": false
  },
  "social": {
    "whatsapp": "",
    "instagram": "",
    "facebook": "",
    "twitter": "",
    "tiktok": "",
    "youtube": ""
  }
}
```

### Campos adicionales en tabla `stores`:
```json
{
  "filter_settings": {
    "categories": true,
    "price_range": true,
    "search": true,
    "sort": true,
    "brands": false,
    "colors_sizes": false,
    "gender": false,
    "free_shipping": false
  },
  "hero_images": ["url1", "url2", "url3"],
  "advanced_css": "CSS personalizado"
}
```

---

## Parciales Reutilizables

### `_cart.ejs`
Muestra el carrito como drawer/modal. Incluye:
- Lista de items con imagen, nombre, precio, cantidad
- Botones +/- para cantidad
- Total del carrito
- Link a checkout
- Compra minima (si esta configurada)
- Retiro en local (si esta habilitado)

### `_checkout.ejs`
Formulario completo de checkout:
- Datos personales (nombre, apellido, email, telefono, DNI)
- Direccion por componentes (calle, numero, piso, CP, barrio, ciudad, provincia)
- Opcion de retiro en local
- Metodo de pago con descuentos por metodo
- Resumen del pedido

### `_product_card.ejs`
Tarjeta de producto con:
- Imagen principal
- Nombre, precio, precio de comparacion (tachado)
- Badge de descuento
- Link a detalle

### `_product_detail.ejs`
Detalle de producto con:
- Galeria de imagenes
- Selector de variantes
- Descuentos por volumen
- Agregar al carrito
- Productos relacionados

### `_hero_carousel.ejs`
Carrusel de imagenes hero (configurable hasta 5 imagenes desde el editor).

---

## CSS y Estilos

### Dashboard
- Archivo: `public/css/dashboard.css`
- Tema dark con gradientes
- Tailwind via CDN
- Iconos SVG inline

### Storefront
- Tailwind CSS via CDN (configurado por template)
- Google Fonts via CDN
- CSS personalizado via `store.advanced_css`
- Colores dinamicos via variables CSS inline generadas desde `theme_settings`
