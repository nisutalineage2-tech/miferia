const db = require('../config/db');

const CF_API = 'https://api.cloudflare.com/client/v4';

const DEFAULTS = {
  BASE_DOMAIN: 'hausetienda.com.ar',
  TUNNEL_TARGET: 'http://192.168.100.131:8081',
  TUNNEL_ID: 'b3c171eb-cb6d-4897-beac-58057a314951',
};

function getSetting(key) {
  try {
    const row = db.prepare('SELECT value FROM system_settings WHERE key = ?').get(key);
    return row ? row.value : null;
  } catch (e) {
    return null;
  }
}

function getSettingOrEnv(key, envKey) {
  return getSetting(key) || process.env[envKey] || DEFAULTS[key] || null;
}

function getSettings() {
  return {
    CF_API_TOKEN: getSetting('CF_API_TOKEN'),
    CF_ZONE_ID: getSetting('CF_ZONE_ID'),
    CF_ACCOUNT_ID: getSetting('CF_ACCOUNT_ID'),
    TUNNEL_ID: getSettingOrEnv('TUNNEL_ID', 'TUNNEL_ID'),
    TUNNEL_TARGET: getSettingOrEnv('TUNNEL_TARGET', 'TUNNEL_TARGET'),
    BASE_DOMAIN: getSettingOrEnv('BASE_DOMAIN', 'BASE_DOMAIN'),
  };
}

function saveSetting(key, value) {
  db.prepare(`INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`)
    .run(key, value);
}

function headers() {
  const s = getSettings();
  return {
    'Authorization': `Bearer ${s.CF_API_TOKEN}`,
    'Content-Type': 'application/json'
  };
}

function isConfigured() {
  const s = getSettings();
  return !!(s.CF_API_TOKEN && s.CF_ZONE_ID && s.CF_ACCOUNT_ID && s.TUNNEL_ID);
}

// ============ DNS ============

async function createDNSRecord(subdomain) {
  const s = getSettings();
  if (!isConfigured()) throw new Error('Cloudflare no está configurado');

  const name = `${subdomain}.${s.BASE_DOMAIN}`;
  const tunnelCname = `${s.TUNNEL_ID}.cfargotunnel.com`;

  const res = await fetch(`${CF_API}/zones/${s.CF_ZONE_ID}/dns_records`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      type: 'CNAME',
      name,
      content: tunnelCname,
      ttl: 1,
      proxied: true
    })
  });

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.errors?.map(e => e.message).join(', ') || 'Error al crear registro DNS');
  }

  return { id: data.result.id, name: data.result.name, content: data.result.content };
}

async function deleteDNSRecord(recordId) {
  const s = getSettings();
  if (!isConfigured()) throw new Error('Cloudflare no está configurado');

  const res = await fetch(`${CF_API}/zones/${s.CF_ZONE_ID}/dns_records/${recordId}`, {
    method: 'DELETE',
    headers: headers()
  });

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.errors?.map(e => e.message).join(', ') || 'Error al eliminar registro DNS');
  }
  return true;
}

async function getRecordByName(subdomain) {
  const s = getSettings();
  if (!isConfigured()) return null;

  const name = `${subdomain}.${s.BASE_DOMAIN}`;
  const res = await fetch(`${CF_API}/zones/${s.CF_ZONE_ID}/dns_records?name=${encodeURIComponent(name)}&type=CNAME`, {
    headers: headers()
  });
  const data = await res.json();
  if (!data.success) return null;
  return data.result.find(r => r.name === name) || null;
}

// ============ TUNNEL INGRESS ============

async function getTunnelConfig() {
  const s = getSettings();
  if (!isConfigured()) throw new Error('Cloudflare no está configurado');

  const res = await fetch(`${CF_API}/accounts/${s.CF_ACCOUNT_ID}/cfd_tunnel/${s.TUNNEL_ID}/configurations`, {
    headers: headers()
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.errors?.map(e => e.message).join(', ') || 'Error al obtener config del tunnel');
  }
  return data.result.config;
}

async function addTunnelIngress(subdomain) {
  const s = getSettings();
  if (!isConfigured()) throw new Error('Cloudflare no está configurado');

  const config = await getTunnelConfig();
  const hostname = `${subdomain}.${s.BASE_DOMAIN}`;

  const existing = config.ingress.find(r => r.hostname === hostname);
  if (existing) return { alreadyExists: true };

  const catchAll = config.ingress.pop();
  config.ingress.push({
    hostname,
    service: s.TUNNEL_TARGET,
    originRequest: {}
  });
  config.ingress.push(catchAll);

  const res = await fetch(`${CF_API}/accounts/${s.CF_ACCOUNT_ID}/cfd_tunnel/${s.TUNNEL_ID}/configurations`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({ config })
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.errors?.map(e => e.message).join(', ') || 'Error al actualizar tunnel');
  }
  return { success: true };
}

async function removeTunnelIngress(subdomain) {
  const s = getSettings();
  if (!isConfigured()) throw new Error('Cloudflare no está configurado');

  const config = await getTunnelConfig();
  const hostname = `${subdomain}.${s.BASE_DOMAIN}`;

  const newIngress = config.ingress.filter(r => r.hostname !== hostname);
  if (newIngress.length === config.ingress.length) return { notFound: true };

  config.ingress = newIngress;

  const res = await fetch(`${CF_API}/accounts/${s.CF_ACCOUNT_ID}/cfd_tunnel/${s.TUNNEL_ID}/configurations`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({ config })
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.errors?.map(e => e.message).join(', ') || 'Error al actualizar tunnel');
  }
  return { success: true };
}

async function listTunnelIngress() {
  const config = await getTunnelConfig();
  return config.ingress.filter(r => r.hostname);
}

// ============ COMBINED OPERATIONS ============

async function createSubdomain(subdomain) {
  const dnsResult = await createDNSRecord(subdomain);
  const tunnelResult = await addTunnelIngress(subdomain);
  return { dns: dnsResult, tunnel: tunnelResult };
}

async function deleteSubdomain(subdomain) {
  const record = await getRecordByName(subdomain);
  if (record) await deleteDNSRecord(record.id);
  await removeTunnelIngress(subdomain);
  return { success: true };
}

module.exports = {
  isConfigured,
  getSettings,
  saveSetting,
  getSetting,
  BASE_DOMAIN: () => getSettingOrEnv('BASE_DOMAIN', 'BASE_DOMAIN'),
  createDNSRecord,
  deleteDNSRecord,
  getRecordByName,
  getTunnelConfig,
  addTunnelIngress,
  removeTunnelIngress,
  listTunnelIngress,
  createSubdomain,
  deleteSubdomain
};
