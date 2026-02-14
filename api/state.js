const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

async function readKV() {

  if (!KV_URL || !KV_TOKEN) {
    return null;
  }

  try {

    const res = await fetch(`${KV_URL}/get/cache`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${KV_TOKEN}`
      }
    });

    const json = await res.json();

    if (!json.result) {
      return null;
    }

    return JSON.parse(json.result);

  } catch (e) {
    return null;
  }
}

export default async function handler(req, res) {

  const kvData = await readKV();

  if (kvData) {
    return res.status(200).json({
      ok: true,
      ...kvData,
      source: "kv"
    });
  }

  return res.status(500).json({
    ok: false,
    error: "KV empty or unreachable"
  });
}
