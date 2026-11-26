const { redis, TES, BIDANG, cekAdmin, getDurasi, rebuildMeta } = require("./_lib");
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
    const { act, b, soal, durasi, ids } = req.body || {};
    if (act === "ping") return res.json({ ok: true });
    if (act === "hasil") return res.json({ hasil: await redis.lrange("hasil", 0, -1) });
    if (act === "hapusHasil") {
      const pilih = new Set((Array.isArray(ids) ? ids : []).map(String));
      if (!pilih.size) return res.status(400).json({ error: "Tidak ada data yang dipilih" });
      const semua = await redis.lrange("hasil", 0, -1);
      const sisa = semua.filter((x) => !pilih.has(String(x.id)));
      const tx = redis.multi().del("hasil");
      if (sisa.length) tx.rpush("hasil", ...sisa);
      await tx.exec();
      return res.json({ ok: true, dihapus: semua.length - sisa.length });
    }
    if (act === "status") {
      const m = await rebuildMeta();
      return res.json({ status: Object.keys(TES).map((k) => ({ id: k, nama: TES[k].nama, jenis: TES[k].jenis, ...m[k] })) });
    }
    if (!BIDANG[b]) return res.status(400).json({ error: "Tes tidak valid" });
    if (act === "buka") {
      const s = await redis.get("soal:" + b);
      if (!Array.isArray(s) || !s.length) return res.status(400).json({ error: "Belum ada soal untuk tes ini" });
      await redis.set("buka:" + b, Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
      await rebuildMeta();
      return res.json({ ok: true });
    }
    if (act === "tutup") {
      await redis.del("buka:" + b);
      await rebuildMeta();
      return res.json({ ok: true });
    }
    if (act === "get") {
      const s = await redis.get("soal:" + b);
      return res.json({ soal: Array.isArray(s) ? s : [], durasi: await getDurasi(b) });
    }
    if (act === "simpan") {
      if (!Array.isArray(soal) || soal.length > 200) return res.status(400).json({ error: "Format soal tidak valid" });
      const bersih = soal.map((q) => ({
        t: String(q.t || "").trim().slice(0, 600),
        p: (Array.isArray(q.p) ? q.p : []).slice(0, 5).map((o) => String(o || "").trim().slice(0, 300)),
        j: Number(q.j),
      }));
      if (bersih.some((q) => !q.t || q.p.length < 4 || q.p.length > 5 || q.p.some((o) => !o) || !Number.isInteger(q.j) || q.j < 0 || q.j >= q.p.length))
        return res.status(400).json({ error: "Ada soal yang belum lengkap (pertanyaan, 4–5 pilihan, kunci)" });
      await redis.set("soal:" + b, bersih);
      await redis.set("durasi:" + b, Math.min(240, Math.max(1, Math.round(Number(durasi) || 15))));
      await rebuildMeta();
      return res.json({ ok: true, jumlah: bersih.length });
    }
    res.status(400).json({ error: "Aksi tidak dikenal" });
  } catch (e) {
    res.status(500).json({ error: "Terjadi kesalahan server" });
  }
};
