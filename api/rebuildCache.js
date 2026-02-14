export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }
  // forward to /api/rebuild via internal call is not possible directly,
  // so just respond with instruction or duplicate rebuild logic here.
  return res.status(404).json({ ok: false, error: "Use /api/rebuild (POST)" });
}
