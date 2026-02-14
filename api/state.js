import fs from "fs";
import path from "path";

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

async function getFromKV() {
  try {
    const res = await fetch(`${KV_URL}/get/cache`, {
      headers: {
        Authorization: `Bearer ${KV_TOKEN}`
      }
    });

    const data = await res.json();

    if (data.result) {
      return JSON.parse(data.result);
    }

    return null;

  } catch {
    return null;
  }
}

function getFromFile() {
  try {
    const filePath = path.join(process.cwd(), "data", "cache.json");
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default async function handler(req, res) {

  // PRIORITÉ KV
  const kv = await getFromKV();

  if (kv) {
    return res.status(200).json({
      ok: true,
      ...kv,
      source: "kv"
    });
  }

  // fallback file
  const file = getFromFile();

  if (file) {
    return res.status(200).json({
      ok: true,
      ...file,
      source: "file"
    });
  }

  return res.status(500).json({
    ok: false,
    error: "no data available"
  });
}
