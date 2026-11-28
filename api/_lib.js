const { Redis } = require("@upstash/redis");
const crypto = require("crypto");
const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });
const K = "Tes Kompetensi";
const TES = {
  metalurgi: { nama: "T. Metalurgi", jenis: K },
  mesin: { nama: "T. Mesin", jenis: K },
  industri: { nama: "T. Industri", jenis: K },
  k3: { nama: "K3", jenis: K },
  lingkungan: { nama: "T. Lingkungan", jenis: K },
  kognitif: { nama: "Tes Kognitif", jenis: "Tes Kognitif" },
  ketelitian: { nama: "Tes Ketelitian", jenis: "Tes Kognitif" },
  wpt: { nama: "Tes WPT", jenis: "Tes Kognitif" },
  psikologi: { nama: "Tes Psikologi", jenis: "Tes Psikologi" },
};
const BIDANG = Object.fromEntries(Object.entries(TES).map(([k, v]) => [k, v.nama]));
const sha = (s) => crypto.createHash("sha256").update(String(s)).digest();
function cekAdmin(req) {
  const real = process.env.ADMIN_PASSWORD || "";
  return real.length > 0 && crypto.timingSafeEqual(sha(req.headers["x-admin-password"] || ""), sha(real));
}
// Durasi per tes; jika belum diatur, memakai durasi lama (global) agar soal lama tetap berjalan.
async function getDurasi(id) {
  return Number(await redis.get("durasi:" + id)) || Number(await redis.get("durasi")) || 15;
}
// Ringkasan kecil (jumlah soal, status buka, durasi) supaya halaman peserta cukup 1 pembacaan database.
async function rebuildMeta() {
  const ks = Object.keys(TES);
  const g = Number(await redis.get("durasi")) || 15;
  const r = await Promise.all(ks.flatMap((k) => [redis.get("soal:" + k), redis.get("buka:" + k), redis.get("durasi:" + k)]));
  const m = {};
  ks.forEach((k, i) => {
    const s = r[3 * i];
    m[k] = { jumlah: Array.isArray(s) ? s.length : 0, buka: !!r[3 * i + 1], durasi: Number(r[3 * i + 2]) || g };
  });
  await redis.set("meta", m);
  return m;
}
// ---- Penilaian soal isian singkat ----
const teks = (s) => String(s == null ? "" : s).toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
function angka(s) {
  s = String(s == null ? "" : s).trim().toLowerCase().replace(/\s+/g, "");
  const m = s.match(/^(-?[\d.,]+)\/([\d.,]+)$/);
  if (m) {
    const a = angka(m[1]), b = angka(m[2]);
    return a != null && b ? a / b : null;
  }
  if (/^[1-9]\d{0,2}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(",", ".");
  return /^-?(\d+\.?\d*|\.\d+)$/.test(s) ? parseFloat(s) : null;
}
function daftar(s, kunci) {
  let t = String(s == null ? "" : s).match(/\d+/g) || [];
  const k = String(kunci).match(/\d+/g) || [];
  if (t.length === 1 && t[0].length > 1 && k.every((x) => x.length === 1)) t = t[0].split("");
  const urut = (a) => a.map(Number).sort((x, y) => x - y).join(",");
  return t.length === k.length && urut(t) === urut(k);
}
function cocok(q, a) {
  const ks = Array.isArray(q.k) ? q.k : [];
  if (a == null || String(a).trim() === "") return false;
  return ks.some((k) => {
    if (q.d) return daftar(a, k);
    const nk = angka(k), na = angka(a);
    if (nk != null) return na != null && Math.abs(nk - na) < 1e-9;
    return teks(k) !== "" && teks(k) === teks(a);
  });
}
module.exports = { redis, TES, BIDANG, cekAdmin, getDurasi, rebuildMeta, cocok };
