// app/api/track/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type TrackPayload = {
  type: "affiliate_click" | string;
  symbol?: string;
  url?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as TrackPayload;

    const type = String(body?.type ?? "").trim();
    const symbol = String(body?.symbol ?? "").trim();
    const url = String(body?.url ?? "").trim();

    if (!type) {
      return NextResponse.json({ ok: false, error: "missing_type" }, { status: 400 });
    }

    const ua = req.headers.get("user-agent") ?? "";
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "";

    // V1: logs (brancher DB ensuite)
    console.log(
      JSON.stringify({
        event: "track",
        type,
        symbol,
        url,
        ua,
        ip,
        at: new Date().toISOString(),
      })
    );

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }
}

export async function GET() {
  // optionnel: healthcheck
  return NextResponse.json({ ok: true }, { status: 200 });
}
