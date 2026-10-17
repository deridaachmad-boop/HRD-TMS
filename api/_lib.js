const { Redis } = require("@upstash/redis");
const crypto = require("crypto");
const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });
const BIDANG = { metalurgi: "T. Metalurgi", mesin: "T. Mesin", industri: "T. Industri", k3: "K3", lingkungan: "T. Lingkungan" };
const sha = (s) => crypto.createHash("sha256").update(String(s)).digest();
function cekAdmin(req) {
  const real = process.env.ADMIN_PASSWORD || "";
  return real.length > 0 && crypto.timingSafeEqual(sha(req.headers["x-admin-password"] || ""), sha(real));
}
module.exports = { redis, BIDANG, cekAdmin };
