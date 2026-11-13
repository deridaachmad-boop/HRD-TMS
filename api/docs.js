const crypto = require('crypto');
const SEED = require('./_docs-data.js');

const SECRET = process.env.DOC_SECRET || '';
const TTL = 8 * 3600 * 1000;
const R_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const R_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY = 'tms:docs:v2';
const OLD_KEY = 'tms:docs:v1';
const MAX_DEPTH = 8, MAX_NODES = 3000;

const fail = (status, msg) => { const e = new Error(msg); e.status = status; return e; };
const sign = p => crypto.createHmac('sha256', SECRET).update(p).digest('base64url');
const same = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
const list = v => (v || '').split(',').map(s => s.trim()).filter(Boolean);
const users = () => list(process.env.DOC_USERS).map(s => { const i = s.indexOf(':'); return [s.slice(0, i), s.slice(i + 1)]; });
const admins = () => list(process.env.DOC_ADMINS);
const uid = () => crypto.randomBytes(5).toString('hex');
const did = s => 'm' + crypto.createHash('sha1').update(s).digest('hex').slice(0, 10);

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

// format lama (kategori berisi items) -> pohon folder, dengan id yang selalu sama
function migrate(data) {
  if (!Array.isArray(data)) return [];
  return data.map((c, ci) => {
    if (c && Array.isArray(c.items)) {
      const base = c.key || c.title || String(ci);
      return {
        id: did('f:' + base), type: 'folder', name: c.title || 'Folder',
        children: c.items.map((d, i) => ({
          id: did('d:' + base + ':' + i + ':' + (d.code || d.name)), type: 'file',
          code: d.code || '', name: d.name || '', rev: d.rev || '', date: d.date || '', url: d.url || ''
        }))
      };
    }
    return c;
  });
}
async function loadDocs() {
  if (!R_URL || !R_TOKEN) return migrate(SEED);
  let v = await redis(['GET', KEY]);
  if (v) return JSON.parse(v);
  v = await redis(['GET', OLD_KEY]);
  return migrate(v ? JSON.parse(v) : SEED);
}

const S = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
function clean(nodes) {
  let count = 0;
  const seen = new Set();
  const walk = (arr, depth) => {
    if (!Array.isArray(arr)) throw fail(400, 'Format data tidak valid.');
    if (depth > MAX_DEPTH) throw fail(400, 'Folder terlalu dalam (maksimal ' + MAX_DEPTH + ' tingkat).');
    return arr.map(n => {
      if (++count > MAX_NODES) throw fail(400, 'Terlalu banyak item.');
      const name = S(n && n.name, 200);
      if (!name) throw fail(400, 'Nama wajib diisi.');
      let id = S(n.id, 40).replace(/[^a-zA-Z0-9]/g, '');
      if (!id || seen.has(id)) id = uid();
      seen.add(id);
      if (n.type === 'folder') return { id, type: 'folder', name, children: walk(n.children || [], depth + 1) };
      const url = S(n.url, 1000);
      if (!/^https?:\/\//i.test(url)) throw fail(400, 'Link wajib diawali http:// atau https://');
      return { id, type: 'file', code: S(n.code, 40), name, rev: S(n.rev, 30), date: S(n.date, 40), url };
    });
  };
  return walk(nodes, 1);
}
function idsOf(nodes) {
  const s = new Set();
  (function walk(a) { (a || []).forEach(n => { s.add(n.id); if (n.type === 'folder') walk(n.children); }); })(nodes);
  return s;
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

    if (req.method === 'GET') return res.status(200).json({ admin: isAdmin, docs: await loadDocs() });

    if (req.method === 'PUT') {
      if (!R_URL || !R_TOKEN) throw fail(500, 'Penyimpanan belum tersambung.');
      const docs = clean((req.body || {}).docs);
      if (!isAdmin) {
        const after = idsOf(docs);
        for (const id of idsOf(await loadDocs())) {
          if (!after.has(id)) throw fail(403, 'Hanya admin yang boleh menghapus. Jika Anda tidak menghapus apa pun, muat ulang halaman (ada perubahan dari pengguna lain) lalu coba lagi.');
        }
      }
      await redis(['SET', KEY, JSON.stringify(docs)]);
      return res.status(200).json({ docs });
    }
    return res.status(405).json({ error: 'Metode tidak diizinkan.' });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message });
    console.error(e);
    return res.status(500).json({ error: 'Terjadi gangguan di server.' });
  }
};
