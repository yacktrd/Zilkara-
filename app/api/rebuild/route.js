import { Redis } from "@upstash/redis";
import assetsFile from "../data/assets.json";

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false });
  }

  try {

    const expected = process.env.REBUILD_TOKEN;
    const provided =
      req.headers.authorization?.replace("Bearer ", "") ||
      req.headers["x-rebuild-token"];

    if (!expected || provided !== expected) {
      return res.status(401).json({ ok: false });
    }

    const redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });

    const payload = {
      updatedAt: Date.now(),
      assets: assetsFile.assets || [],
    };

    await redis.set("assets_payload", payload);

    return res.json({ ok: true });

  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
