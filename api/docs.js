const crypto = require('crypto');
const DOCS = require('./_docs-data.js');

const SECRET = process.env.DOC_SECRET || '';
const TTL = 8 * 3600 * 1000;   // token berlaku 8 jam

const sign = p => crypto.createHmac('sha256', SECRET).update(p).digest('base64url');
const same = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
const users = () => (process.env.DOC_USERS || '').split(',').map(s => s.trim()).filter(Boolean)
  .map(s => { const i = s.indexOf(':'); return [s.slice(0, i), s.slice(i + 1)]; });
const makeToken = id => {
  const p = Buffer.from(JSON.stringify({ id, exp: Date.now() + TTL })).toString('base64url');
  return p + '.' + sign(p);
};
const valid = t => {
  if (!t) return false;
  const [p, s] = t.split('.');
  if (!p || !s || !same(sign(p), s)) return false;
  try { return JSON.parse(Buffer.from(p, 'base64url').toString()).exp > Date.now(); } catch (e) { return false; }
};

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!SECRET || !users().length) return res.status(500).json({ error: 'Server belum dikonfigurasi.' });

  if (req.method === 'POST') {
    const { id, password } = req.body || {};
    const ok = users().some(([u, p]) => same(u, id || '') && same(p, password || ''));
    if (!ok) {
      await new Promise(r => setTimeout(r, 900));   // memperlambat tebak-tebakan password
      return res.status(401).json({ error: 'ID atau password salah.' });
    }
    return res.status(200).json({ token: makeToken(id), docs: DOCS });
  }
  if (req.method === 'GET') {
    const t = (req.headers.authorization || '').replace(/^Bearer\s+/, '');
    if (!valid(t)) return res.status(401).json({ error: 'Sesi berakhir.' });
    return res.status(200).json({ docs: DOCS });
  }
  return res.status(405).json({ error: 'Metode tidak diizinkan.' });
};
