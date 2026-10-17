const { redis, BIDANG } = require("./_lib");
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (req.method === "GET") {
      const durasi = Number(await redis.get("durasi")) || 15;
      const b = req.query.b;
      if (!b) {
        const ks = Object.keys(BIDANG);
        const all = await Promise.all(ks.map((k) => redis.get("soal:" + k)));
        return res.json({ durasi, bidang: ks.map((k, i) => ({ id: k, nama: BIDANG[k], jumlah: Array.isArray(all[i]) ? all[i].length : 0 })) });
      }
      if (!BIDANG[b]) return res.status(400).json({ error: "Bidang tidak valid" });
      const s = await redis.get("soal:" + b);
      if (!Array.isArray(s) || !s.length) return res.status(404).json({ error: "Soal belum tersedia" });
      return res.json({ durasi, soal: s.map((q) => ({ t: q.t, p: q.p })) }); // kunci jawaban tidak dikirim
    }
    if (req.method === "POST") {
      const { nama, b, a } = req.body || {};
      const n = String(nama || "").trim().slice(0, 80);
      if (!n || !BIDANG[b] || !Array.isArray(a)) return res.status(400).json({ error: "Data tidak lengkap" });
      const s = await redis.get("soal:" + b);
      if (!Array.isArray(s) || !s.length) return res.status(404).json({ error: "Soal belum tersedia" });
      const benar = s.filter((q, i) => a[i] === q.j).length;
      const nilai = Math.round((benar / s.length) * 100);
      await redis.lpush("hasil", {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        nama: n, bidang: BIDANG[b], benar, total: s.length, nilai, waktu: new Date().toISOString(),
      });
      return res.json({ nilai, benar, total: s.length });
    }
    res.status(405).json({ error: "Metode tidak didukung" });
  } catch (e) {
    res.status(500).json({ error: "Terjadi kesalahan server" });
  }
};
