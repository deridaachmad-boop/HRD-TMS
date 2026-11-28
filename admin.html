const crypto = require("crypto");
const { redis, TES, BIDANG, getDurasi, rebuildMeta } = require("./_lib");
const norm = (s) => String(s || "").trim().replace(/\s+/g, " ").toLowerCase();
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (req.method === "GET") {
      res.setHeader("Cache-Control", "public, s-maxage=5, stale-while-revalidate=5");
      const m = (await redis.get("meta")) || (await rebuildMeta());
      return res.json({
        bidang: Object.keys(TES).map((k) => {
          const x = m[k] || {};
          return { id: k, nama: TES[k].nama, jenis: TES[k].jenis, jumlah: x.jumlah || 0, buka: !!x.buka, durasi: x.durasi || 15 };
        }),
      });
    }
    if (req.method !== "POST") return res.status(405).json({ error: "Metode tidak didukung" });
    const body = req.body || {};

    if (body.aksi === "mulai") {
      const n = String(body.nama || "").trim().slice(0, 80);
      const b = body.b;
      if (!n || !BIDANG[b]) return res.status(400).json({ error: "Data tidak lengkap" });
      const epoch = await redis.get("buka:" + b);
      if (!epoch) return res.status(403).json({ error: "Tes belum dibuka atau sudah ditutup oleh HRD." });
      const s = await redis.get("soal:" + b);
      if (!Array.isArray(s) || !s.length) return res.status(404).json({ error: "Soal belum tersedia" });
      const baru = await redis.set("mulai:" + b + ":" + epoch + ":" + norm(n), 1, { nx: true, ex: 86400 });
      if (!baru) return res.status(409).json({ error: "Nama ini sudah memulai tes pada sesi ini. Hubungi HRD jika ada kendala." });
      const durasi = await getDurasi(b);
      const id = crypto.randomBytes(16).toString("hex");
      await redis.set("sesi:" + id, { nama: n, b, mulai: Date.now(), durasi }, { ex: durasi * 60 + 900 });
      return res.json({ id, durasi, soal: s.map((q) => ({ t: q.t, p: q.p, g: q.g, e: q.e ? 1 : undefined })) }); // kunci tidak dikirim
    }

    if (body.aksi === "kirim") {
      const { id, a, v } = body;
      if (!/^[a-f0-9]{32}$/.test(String(id || "")) || !Array.isArray(a)) return res.status(400).json({ error: "Data tidak lengkap" });
      const ses = await redis.get("sesi:" + id);
      if (!ses) return res.status(404).json({ error: "Sesi tidak ditemukan atau sudah selesai. Hubungi HRD." });
      const kunci = await redis.set("kirim:" + id, 1, { nx: true, ex: 3600 });
      if (!kunci) return res.status(409).json({ error: "Jawaban sudah pernah dikirim" });
      try {
        const s = await redis.get("soal:" + ses.b);
        if (!Array.isArray(s) || !s.length) throw new Error("soal");
        let benar = 0, maksPG = 0, maksEsai = 0;
        const esai = [];
        s.forEach((q, i) => {
          if (q.e) {
            const bobot = q.bobot || 10;
            maksEsai += bobot;
            // k = kunci/pedoman jawaban essay; hanya disimpan di data koreksi (admin), tidak pernah dikirim ke peserta
            esai.push({ i, t: q.t, bobot, k: q.k || "", a: String(a[i] == null ? "" : a[i]).slice(0, 2000) });
          } else {
            maksPG++;
            if (a[i] === q.j) benar++;
          }
        });
        const rec = {
          id, nama: ses.nama, bidang: BIDANG[ses.b], jenis: TES[ses.b].jenis, b: ses.b, benar, total: maksPG,
          nilai: esai.length ? null : Math.round((benar / maksPG) * 100),
          pelanggaran: Math.min(99, Math.max(0, parseInt(v) || 0)),
          lama: Math.max(0, Math.round((Date.now() - ses.mulai) / 1000)), // lama pengerjaan (detik), dihitung server
          terlambat: Date.now() - ses.mulai > ses.durasi * 60000 + 90000,
          waktu: new Date().toISOString(),
        };
        if (esai.length) {
          rec.esai = esai.length; rec.maksPG = maksPG; rec.maksEsai = maksEsai;
          await redis.set("esai:" + id, { nama: ses.nama, bidang: BIDANG[ses.b], items: esai });
        }
        await redis.lpush("hasil", rec);
        await redis.del("sesi:" + id);
        return res.json({ nilai: rec.nilai, benar, total: maksPG, esai: esai.length });
      } catch (e) {
        await redis.del("kirim:" + id);
        throw e;
      }
    }
    res.status(400).json({ error: "Aksi tidak dikenal" });
  } catch (e) {
    console.error("[api/quiz]", e && e.stack ? e.stack : e);
    res.status(500).json({ error: "Terjadi kesalahan server" });
  }
};
