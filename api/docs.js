const crypto = require('crypto');
const SEED = require('./_docs-data.js');

const SECRET = process.env.DOC_SECRET || '';
const TTL = 8 * 3600 * 1000;
const R_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const R_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY = 'tms:docs:v1';

const sign = p => crypto.createHmac('sha256', SECRET).update(p).digest('base64url');
const same = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
const list = v => (v || '').split(',').map(s => s.trim()).filter(Boolean);
const users = () => list(process.env.DOC_USERS).map(s => { const i = s.indexOf(':'); return [s.slice(0, i), s.slice(i + 1)]; });
const admins = () => list(process.env.DOC_ADMINS);

const makeToken = id => {
  const p = Buffer.from(JSON.stringify({ id, exp: Date.now() + TTL })).toString('base64url');
  return p + '.' + sign(p);
};
const readToken = t => {
  if (!t) return null;
  const [p, s] = t.split('.');
  if (!p || !s || !same(sign(p), s)) return null;
  try {
    const d = JSON.parse(Buffer.from(p, 'base64url').toString());
    return d.exp > Date.now() ? d : null;
  } catch (e) { return null; }
};

async function redis(cmd) {
  const r = await fetch(R_URL, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + R_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd)
  });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(j.error || 'Redis ' + r.status);
  return j.result;
}
async function loadDocs() {
  if (!R_URL || !R_TOKEN) return SEED;
  const v = await redis(['GET', KEY]);
  return v ? JSON.parse(v) : SEED;
}

const S = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
function clean(docs) {
  if (!Array.isArray(docs) || docs.length > 30) throw new Error('Format data tidak valid.');
  const keys = new Set();
  return docs.map(c => {
    const title = S(c && c.title, 80);
    if (!title) throw new Error('Nama kategori kosong.');
    let key = S(c.key, 40).toLowerCase().replace(/[^a-z0-9-]/g, '') || 'k' + crypto.randomBytes(3).toString('hex');
    while (keys.has(key)) key += 'x';
    keys.add(key);
    const items = Array.isArray(c.items) ? c.items : [];
    if (items.length > 500) throw new Error('Terlalu banyak dokumen dalam satu kategori.');
    return {
      key, title,
      items: items.map(d => {
        const name = S(d && d.name, 200);
        const url = S(d && d.url, 1000);
        if (!name) throw new Error('Nama dokumen wajib diisi.');
        if (!/^https?:\/\//i.test(url)) throw new Error('Link wajib diawali http:// atau https://');
        return { code: S(d.code, 40), name, rev: S(d.rev, 30), date: S(d.date, 40), url };
      })
    };
  });
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!SECRET || !users().length) return res.status(500).json({ error: 'Server belum dikonfigurasi.' });

  try {
    if (req.method === 'POST') {
      const { id, password } = req.body || {};
      const ok = users().some(([u, p]) => same(u, id || '') && same(p, password || ''));
      if (!ok) {
        await new Promise(r => setTimeout(r, 900));
        return res.status(401).json({ error: 'ID atau password salah.' });
      }
      return res.status(200).json({ token: makeToken(id), admin: admins().includes(id), docs: await loadDocs() });
    }

    const me = readToken((req.headers.authorization || '').replace(/^Bearer\s+/, ''));
    if (!me) return res.status(401).json({ error: 'Sesi berakhir.' });
    const isAdmin = admins().includes(me.id);

    if (req.method === 'GET') {
      return res.status(200).json({ admin: isAdmin, docs: await loadDocs() });
    }
    if (req.method === 'PUT') {
      if (!isAdmin) return res.status(403).json({ error: 'Anda tidak memiliki izin mengedit.' });
      if (!R_URL || !R_TOKEN) return res.status(500).json({ error: 'Penyimpanan belum tersambung.' });
      const docs = clean((req.body || {}).docs);
      await redis(['SET', KEY, JSON.stringify(docs)]);
      return res.status(200).json({ docs });
    }
    return res.status(405).json({ error: 'Metode tidak diizinkan.' });
  } catch (e) {
    const msg = String(e.message || '');
    const user = /wajib|kosong|valid|Terlalu/.test(msg);
    return res.status(user ? 400 : 500).json({ error: user ? msg : 'Terjadi gangguan di server.' });
  }
};
