import { NextResponse } from "next/server";

export async function GET() {
  try {
    const ts = new Date().toISOString();

    const market_regime = "STABLE"; // ou ton calcul réel
    const market_context_index = 99; // ton score global

    const stable_ratio = 0.86;
    const transition_ratio = 0.13;
    const volatile_ratio = 0.01;

    return NextResponse.json({
      ok: true,
      ts,
      market_regime,
      confidence_global: market_context_index,
      stable_ratio,
      transition_ratio,
      volatile_ratio
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: "Context computation failed"
      },
      { status: 500 }
    );
  }
}
