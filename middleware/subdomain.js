const db = require('../config/db');
const BASE_DOMAIN = process.env.BASE_DOMAIN || 'hausetienda.com.ar';

function subdomainMiddleware(req, res, next) {
  const host = req.headers.host || '';
  const portRegex = /:\d+$/;
  const hostname = host.replace(portRegex, '');

  const baseParts = BASE_DOMAIN.split('.');
  const baseSubdomains = hostname.split('.');

  if (baseSubdomains.length <= baseParts.length) {
    res.locals.subdomainStore = null;
    return next();
  }

  const subdomain = baseSubdomains.slice(0, baseSubdomains.length - baseParts.length).join('.');

  if (!subdomain || subdomain.includes('www') || subdomain.includes('api')) {
    res.locals.subdomainStore = null;
    return next();
  }

  try {
    const store = db.prepare('SELECT * FROM stores WHERE slug = ? AND active = 1').get(subdomain);
    res.locals.subdomainStore = store || null;
    if (store) {
      res.locals.subdomain = subdomain;
      res.locals.storeBaseUrl = '';
    } else {
      res.locals.storeBaseUrl = null;
    }
  } catch (e) {
    res.locals.subdomainStore = null;
    res.locals.storeBaseUrl = null;
  }

  next();
}

module.exports = subdomainMiddleware;
