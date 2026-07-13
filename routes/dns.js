const express = require('express');
const router = express.Router();
const db = require('../config/db');
const cloudflare = require('../utils/cloudflare');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/status', async (req, res) => {
  const store = db.prepare('SELECT id, slug, name, custom_domain, cloudflare_record_id FROM stores WHERE id = ?').get(req.session.storeId);
  if (!store) return res.status(404).json({ error: 'Tienda no encontrada' });

  const configured = cloudflare.isConfigured();
  let tunnelStatus = null;

  if (configured) {
    try {
      const ingress = await cloudflare.listTunnelIngress();
      tunnelStatus = ingress.length;
    } catch (e) {
      tunnelStatus = 'error: ' + e.message;
    }
  }

  res.json({
    configured,
    domain: configured ? cloudflare.BASE_DOMAIN() : null,
    tunnelId: configured ? cloudflare.TUNNEL_ID : null,
    subdomain: store.custom_domain || null,
    fullDomain: store.custom_domain ? `${store.custom_domain}.${cloudflare.BASE_DOMAIN()}` : null,
    hasRecord: !!store.cloudflare_record_id,
    tunnelRules: tunnelStatus,
    storeSlug: store.slug,
    storeName: store.name
  });
});

router.post('/create', async (req, res) => {
  const { subdomain } = req.body;

  if (!cloudflare.isConfigured()) {
    return res.status(503).json({ error: 'Cloudflare no está configurado.' });
  }

  if (!subdomain || !/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(subdomain)) {
    return res.status(400).json({ error: 'El subdominio solo puede contener letras, números y guiones.' });
  }

  const store = db.prepare('SELECT id, slug, custom_domain, cloudflare_record_id FROM stores WHERE id = ?').get(req.session.storeId);
  if (!store) return res.status(404).json({ error: 'Tienda no encontrada' });

  if (store.custom_domain) {
    return res.status(400).json({ error: 'Esta tienda ya tiene un subdominio. Eliminá el actual primero.' });
  }

  const inUse = db.prepare('SELECT id FROM stores WHERE custom_domain = ? AND id != ?').get(subdomain, store.id);
  if (inUse) {
    return res.status(400).json({ error: 'Este subdominio ya está en uso por otra tienda.' });
  }

  try {
    const existing = await cloudflare.getRecordByName(subdomain);
    if (existing) {
      return res.status(400).json({ error: 'Este subdominio ya existe en Cloudflare.' });
    }

    const result = await cloudflare.createSubdomain(subdomain);

    db.prepare('UPDATE stores SET custom_domain = ?, cloudflare_record_id = ? WHERE id = ?')
      .run(subdomain, result.dns.id, store.id);

    res.json({
      success: true,
      subdomain,
      fullDomain: `${subdomain}.${cloudflare.BASE_DOMAIN()}`,
      recordId: result.dns.id
    });
  } catch (err) {
    console.error('Error creando subdominio:', err.message);
    res.status(500).json({ error: 'Error al crear subdominio: ' + err.message });
  }
});

router.delete('/delete', async (req, res) => {
  if (!cloudflare.isConfigured()) {
    return res.status(503).json({ error: 'Cloudflare no está configurado.' });
  }

  const store = db.prepare('SELECT id, custom_domain, cloudflare_record_id FROM stores WHERE id = ?').get(req.session.storeId);
  if (!store) return res.status(404).json({ error: 'Tienda no encontrada' });

  if (!store.custom_domain) {
    return res.status(400).json({ error: 'Esta tienda no tiene un subdominio asignado.' });
  }

  try {
    await cloudflare.deleteSubdomain(store.custom_domain);
    db.prepare('UPDATE stores SET custom_domain = NULL, cloudflare_record_id = NULL WHERE id = ?').run(store.id);

    res.json({ success: true, message: 'Subdominio eliminado correctamente.' });
  } catch (err) {
    console.error('Error eliminando subdominio:', err.message);
    res.status(500).json({ error: 'Error al eliminar subdominio: ' + err.message });
  }
});

module.exports = router;
