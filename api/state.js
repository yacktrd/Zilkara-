import fs from "fs";
import path from "path";

export default function handler(req, res) {

  try {

    const file = path.join(process.cwd(), "data", "state.json");

    if (!fs.existsSync(file)) {

      return res.status(200).json({
        ok: true,
        assets: [],
        updated: null,
        source: "empty"
      });

    }

    const raw = fs.readFileSync(file, "utf8");

    const json = JSON.parse(raw);

    res.setHeader("Cache-Control", "s-maxage=10");

    return res.status(200).json(json);

  } catch (e) {

    return res.status(500).json({
      ok: false,
      error: e.message
    });

  }

}
