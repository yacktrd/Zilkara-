import fs from "fs";
import path from "path";

export default function handler(req, res) {

  try {

    const filePath = path.join(process.cwd(), "data", "assets.json");

    if (!fs.existsSync(filePath)) {

      return res.status(200).json({
        ok: true,
        assets: [],
        updated: null,
        source: "empty"
      });

    }

    const raw = fs.readFileSync(filePath, "utf8");
    const json = JSON.parse(raw);

    return res.status(200).json({
      ok: true,
      assets: json.assets || [],
      updated: json.updated || null,
      source: "file"
    });

  } catch (err) {

    return res.status(500).json({
      ok: false,
      error: err.message
    });

  }

}

