// app/api/admin/create-key/route.ts

import { NextRequest, NextResponse } from "next/server"

import { generateApiKey } from "@/lib/xyvala/generateKey"
import { addRegistryKey } from "@/lib/xyvala/registry"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * XYVALA — Admin create API key
 *
 * Objectif :
 * - créer une clé API
 * - choisir un plan
 * - enregistrer dans registry
 */

export async function POST(req: NextRequest) {

  try {

    const body = await req.json()

    const plan = body?.plan ?? "trader"

    const key = generateApiKey("live")

    const result = addRegistryKey({
      key,
      config: {
        plan,
        enabled: true
      }
    })

    if (!result.ok) {

      return NextResponse.json({
        ok: false,
        error: result.reason
      }, { status: 400 })

    }

    return NextResponse.json({
      ok: true,
      key,
      plan
    })

  } catch (e: any) {

    return NextResponse.json({
      ok: false,
      error: e?.message ?? "unknown_error"
    }, { status: 500 })

  }

}
