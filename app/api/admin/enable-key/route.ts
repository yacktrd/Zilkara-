// app/api/admin/enable-key/route.ts

import { NextRequest, NextResponse } from "next/server"
import { enableRegistryKey } from "@/lib/xyvala/registry"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const key =
      typeof body?.key === "string"
        ? body.key.trim()
        : ""

    if (!key) {
      return NextResponse.json(
        {
          ok: false,
          error: "missing_key"
        },
        { status: 400 }
      )
    }

    await enableRegistryKey(key)

    return NextResponse.json({
      ok: true,
      key
    })
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message ?? "enable_key_failed"
      },
      { status: 500 }
    )
  }
}
