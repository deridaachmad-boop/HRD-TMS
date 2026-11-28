const crypto = require("crypto");
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
    const { act, b, soal, durasi, ids, data, mime, id: rid, skor } = req.body || {};
    if (act === "ping") return res.json({ ok: true });
    if (act === "hasil") {
      const daftar = await redis.lrange("hasil", 0, -1);
      const nx = (await redis.hgetall("nilaiEsai")) || {};
      return res.json({ hasil: daftar.map((x) => (x.esai && nx[x.id] ? { ...x, ...nx[x.id], dinilai: true } : x)) });
    }
    if (act === "esaiGet") {
      const e = await redis.get("esai:" + String(rid || ""));
      if (!e) return res.status(404).json({ error: "Jawaban essay tidak ditemukan" });
      return res.json(e);
    }
    if (act === "esaiNilai") {
      const key = String(rid || "");
      const e = await redis.get("esai:" + key);
      if (!e || !Array.isArray(skor) || skor.length !== e.items.length) return res.status(400).json({ error: "Data penilaian tidak valid" });
      const rec = (await redis.lrange("hasil", 0, -1)).find((x) => String(x.id) === key);
      if (!rec) return res.status(404).json({ error: "Hasil peserta tidak ditemukan" });
      const angka = skor.map((v, k) => Math.min(e.items[k].bobot, Math.max(0, Math.round((Number(v) || 0) * 10) / 10)));
      const skorEsai = Math.round(angka.reduce((a, v) => a + v, 0) * 10) / 10;
      const maks = (rec.maksPG || 0) + (rec.maksEsai || 0) || 1;
      const nilai = Math.round(((rec.benar + skorEsai) / maks) * 100);
      await redis.set("esai:" + key, { ...e, skor: angka });
      await redis.hset("nilaiEsai", { [key]: { skorEsai, nilai } });
      return res.json({ ok: true, nilai, skorEsai });
    }
    if (act === "unggahGambar") {
      const magic = { "image/jpeg": [0xff, 0xd8, 0xff], "image/png": [0x89, 0x50, 0x4e, 0x47] }[mime];
      if (!magic || typeof data !== "string" || data.length > 700000) return res.status(400).json({ error: "Gambar tidak valid atau terlalu besar" });
      const buf = Buffer.from(data, "base64");
      if (!magic.every((v, i) => buf[i] === v)) return res.status(400).json({ error: "Berkas bukan gambar yang valid" });
      const id = crypto.randomBytes(16).toString("hex");
      await redis.set("img:" + id, { m: mime, d: data });
      return res.json({ id });
    }
    if (act === "hapusHasil") {
      const pilih = new Set((Array.isArray(ids) ? ids : []).map(String));
      if (!pilih.size) return res.status(400).json({ error: "Tidak ada data yang dipilih" });
      const semua = await redis.lrange("hasil", 0, -1);
      const sisa = semua.filter((x) => !pilih.has(String(x.id)));
      const tx = redis.multi().del("hasil");
      if (sisa.length) tx.rpush("hasil", ...sisa);
      await tx.exec();
      await redis.hdel("nilaiEsai", ...pilih);
      await Promise.all([...pilih].map((k) => redis.del("esai:" + k)));
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
      const bersih = soal.map((q) => {
        const t = String(q.t || "").trim().slice(0, 600);
        const g = /^[a-f0-9]{32}$/.test(String(q.g || "")) ? q.g : undefined;
        if (q.e) return { t, e: true, bobot: Math.min(100, Math.max(1, Math.round(Number(q.bobot) || 10))), k: String(q.k || "").trim().slice(0, 2000), p: [], j: 0, g };
        return { t, p: (Array.isArray(q.p) ? q.p : []).slice(0, 5).map((o) => String(o || "").trim().slice(0, 300)), j: Number(q.j), g };
      });
      if (bersih.some((q) => !q.t || (!q.e && (q.p.length < 2 || q.p.length > 5 || q.p.some((o) => !o) || !Number.isInteger(q.j) || q.j < 0 || q.j >= q.p.length))))
        return res.status(400).json({ error: "Ada soal yang belum lengkap (pertanyaan, 2–5 pilihan, kunci)" });
      const lama = await redis.get("soal:" + b);
      await redis.set("soal:" + b, bersih);
      const pakai = new Set(bersih.map((q) => q.g).filter(Boolean));
      const buang = (Array.isArray(lama) ? lama : []).map((q) => q.g).filter((g) => g && !pakai.has(g));
      await Promise.all(buang.map((g) => redis.del("img:" + g)));
      await redis.set("durasi:" + b, Math.min(240, Math.max(1, Math.round(Number(durasi) || 15))));
      await rebuildMeta();
      return res.json({ ok: true, jumlah: bersih.length });
    }
    res.status(400).json({ error: "Aksi tidak dikenal" });
  } catch (e) {
    console.error("[api/admin]", e && e.stack ? e.stack : e);
    res.status(500).json({ error: "Terjadi kesalahan server" });
  }
};
