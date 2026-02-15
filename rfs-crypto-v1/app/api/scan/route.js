import { readFile } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "data", "assets.json");
    const file = await readFile(filePath, "utf-8");
    const json = JSON.parse(file);

    return new Response(
      JSON.stringify({
        ok: true,
        route: "scan",
        count: json.assets.length,
        assets: json.assets,
        updatedAt: json.updatedAt
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store"
        }
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        ok: false,
        route: "scan",
        error: error.message
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
}
