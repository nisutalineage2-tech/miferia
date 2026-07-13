const express = require('express');
const session = require('express-session');
const path = require('path');
const layouts = require('express-ejs-layouts');
const db = require('./config/db');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const storefrontRoutes = require('./routes/storefront');
const apiRoutes = require('./routes/api');
const customerRoutes = require('./routes/customer');
const dnsRoutes = require('./routes/dns');
const cloudflareApiRoutes = require('./routes/cloudflare-api');
const subdomainMiddleware = require('./middleware/subdomain');

const app = express();
const PORT = 8081;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'tuferia-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true
  }
}));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'dashboard/layout');
app.use(layouts);

// Make user data available to all views
app.use((req, res, next) => {
  res.locals.user = null;
  res.locals.store = null;
  res.locals.currentPath = req.path;

  if (req.session.userId) {
    try {
      const user = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(req.session.userId);
      res.locals.user = user;
      if (req.session.storeId) {
        const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.session.storeId);
        res.locals.store = store;
      }
    } catch (e) {
      // DB not ready yet
    }
  }
  next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/api/dns', dnsRoutes);
app.use('/api/cloudflare', cloudflareApiRoutes);
app.use('/api', apiRoutes);
app.use('/customer', customerRoutes);

// Subdomain detection (before storefront)
app.use(subdomainMiddleware);

// Subdomain URL rewriting: when accessed via subdomain, rewrite paths to /{slug}/...
app.use((req, res, next) => {
  if (res.locals.subdomainStore && !req.path.startsWith('/api') && !req.path.startsWith('/auth') && !req.path.startsWith('/dashboard') && !req.path.startsWith('/css') && !req.path.startsWith('/js') && !req.path.startsWith('/uploads')) {
    const slug = res.locals.subdomainStore.slug;
    if (req.path === '/' || req.path === '') {
      req.url = `/${slug}`;
    } else if (!req.path.startsWith(`/${slug}`)) {
      req.url = `/${slug}${req.path}`;
    }
  }
  next();
});

// Storefront routes (after subdomain URL rewriting)
app.use('/', storefrontRoutes);

// Home page (no dashboard layout)
app.get('/', (req, res) => {
  res.render('public/home', { title: 'TuFerIA - Crea tu tienda online', layout: false });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('public/404', { title: 'Página no encontrada', layout: false });
});

// Initialize DB then start server
async function start() {
  try {
    await db.init();
    console.log('✅ Base de datos inicializada');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 TuFerIA corriendo en http://0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Error al iniciar:', err);
    process.exit(1);
  }
}
start();
