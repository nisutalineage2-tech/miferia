const express = require('express');
const router = express.Router();
const cloudflare = require('../utils/cloudflare');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/test', async (req, res) => {
  if (!cloudflare.isConfigured()) {
    return res.json({ success: false, error: 'Cloudflare no está configurado' });
  }

  try {
    const config = await cloudflare.getTunnelConfig();
    const ingress = config.ingress.filter(r => r.hostname);

    res.json({
      success: true,
      tunnelStatus: 'healthy',
      tunnelId: cloudflare.getSettings().TUNNEL_ID,
      ingressCount: ingress.length,
      hostnames: ingress.map(r => r.hostname)
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

router.post('/settings', (req, res) => {
  const { CF_API_TOKEN, CF_ZONE_ID, CF_ACCOUNT_ID, TUNNEL_ID, TUNNEL_TARGET, BASE_DOMAIN } = req.body;

  const toSave = { CF_API_TOKEN, CF_ZONE_ID, CF_ACCOUNT_ID, TUNNEL_ID, TUNNEL_TARGET, BASE_DOMAIN };
  for (const [key, value] of Object.entries(toSave)) {
    if (value !== undefined && value !== null && value !== '') {
      cloudflare.saveSetting(key, value.trim());
    }
  }

  res.json({ success: true });
});

module.exports = router;
