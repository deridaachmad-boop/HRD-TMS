const { redis, BIDANG, cekAdmin } = require("./_lib");
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Metode tidak didukung" });
  const ip = String(req.headers["x-forwarded-for"] || "x").split(",")[0].trim();
  const gk = "gagal:" + ip;
  try {
    if ((Number(await redis.get(gk)) || 0) >= 10) return res.status(429).json({ error: "Terlalu banyak percobaan. Coba lagi 15 menit lagi." });
    if (!cekAdmin(req)) {
      await redis.incr(gk); await redis.expire(gk, 900);
      return res.status(401).json({ error: "Password salah" });
    }
    await redis.del(gk);
    const { act, b, soal, durasi } = req.body || {};
    if (act === "ping") return res.json({ ok: true });
    if (act === "hasil") return res.json({ hasil: await redis.lrange("hasil", 0, -1) });
    if (!BIDANG[b]) return res.status(400).json({ error: "Bidang tidak valid" });
    if (act === "get") {
      const s = await redis.get("soal:" + b);
      return res.json({ soal: Array.isArray(s) ? s : [], durasi: Number(await redis.get("durasi")) || 15 });
    }
    if (act === "simpan") {
      if (!Array.isArray(soal) || soal.length > 200) return res.status(400).json({ error: "Format soal tidak valid" });
      const bersih = soal.map((q) => ({
        t: String(q.t || "").trim().slice(0, 600),
        p: (Array.isArray(q.p) ? q.p : []).slice(0, 4).map((o) => String(o || "").trim().slice(0, 300)),
        j: Number(q.j),
      }));
      if (bersih.some((q) => !q.t || q.p.length !== 4 || q.p.some((o) => !o) || ![0, 1, 2, 3].includes(q.j)))
        return res.status(400).json({ error: "Ada soal yang belum lengkap (pertanyaan, 4 pilihan, kunci)" });
      await redis.set("soal:" + b, bersih);
      const d = Math.min(180, Math.max(1, Math.round(Number(durasi) || 15)));
      await redis.set("durasi", d);
      return res.json({ ok: true, jumlah: bersih.length });
    }
    res.status(400).json({ error: "Aksi tidak dikenal" });
  } catch (e) {
    res.status(500).json({ error: "Terjadi kesalahan server" });
  }
};
