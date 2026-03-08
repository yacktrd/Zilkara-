
import { NextRequest, NextResponse } from "next/server"

import {
  validateApiKey,
  buildApiKeyErrorResponse,
  applyApiAuthHeaders
} from "@/lib/xyvala/auth"

import { getXyvalaScan } from "@/lib/xyvala/scan"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {

  /* ---------------- AUTH ---------------- */

  const auth = validateApiKey(req)

  if (!auth.ok) {
    return buildApiKeyErrorResponse(auth.error, auth.status)
  }

  /* ---------------- PARAMS ---------------- */

  const { searchParams } = new URL(req.url)

  const limit = searchParams.get("limit")
  const sort = searchParams.get("sort")
  const quote = searchParams.get("quote")

  /* ---------------- SCAN ---------------- */

  const result = await getXyvalaScan({
    limit: limit ? Number(limit) : undefined,
    sort: sort as any,
    quote: quote as any
  })

  /* ---------------- RESPONSE ---------------- */

  return applyApiAuthHeaders(
    NextResponse.json(result, { status: 200 }),
    auth
  )
}
