const { redis } = require("./_lib");
module.exports = async (req, res) => {
  const id = String((req.query && req.query.id) || "");
  if (!/^[a-f0-9]{32}$/.test(id)) return res.status(400).end();
  try {
    const x = await redis.get("img:" + id);
    if (!x) return res.status(404).end();
    res.setHeader("Content-Type", x.m);
    res.setHeader("Cache-Control", "public, max-age=31536000, s-maxage=31536000, immutable");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.status(200).send(Buffer.from(x.d, "base64"));
  } catch (e) {
    return res.status(500).end();
  }
};
