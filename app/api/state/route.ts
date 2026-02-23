import { NextResponse } from "next/server";
import { getStateData } from "../../../lib/state";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getStateData();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "STATE_FAILED", detail: err?.message },
      { status: 500 }
    );
  }
}
