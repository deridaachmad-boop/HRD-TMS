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
module.exports = { redis, TES, BIDANG, cekAdmin, getDurasi, rebuildMeta };
