import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "data", "assets.json");

    if (!fs.existsSync(filePath)) {
      return Response.json({
        ok: false,
        error: "assets.json not found"
      });
    }

    const raw = fs.readFileSync(filePath, "utf8");
    const json = JSON.parse(raw);

    return Response.json({
      ok: true,
      updatedAt: json.updatedAt,
      count: json.assets.length,
      assets: json.assets
    });

  } catch (err) {
    return Response.json({
      ok: false,
      error: err.message
    });
  }
}
