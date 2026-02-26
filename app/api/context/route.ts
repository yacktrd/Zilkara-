// app/api/context/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Regime = 'STABLE' | 'TRANSITION' | 'VOLATILE' | null;

type ContextResponse = {
  ok: boolean;
  ts: string;
  market_regime: Regime;
  stable_ratio: number | null;
  transition_ratio: number | null;
  volatile_ratio: number | null;
  message: string | null;
  error?: string;
};

function upperRegime(v: unknown): Regime {
  const s = typeof v === 'string' ? v.trim().toUpperCase() : '';
  if (s === 'STABLE' || s === 'TRANSITION' || s === 'VOLATILE') return s;
  return null;
}

export async function GET(request: Request) {
  const ts = new Date().toISOString();

  try {
    const origin = new URL(request.url).origin;

    const scanUrl = new URL('/api/scan', origin);
    scanUrl.searchParams.set('limit', '250');
    scanUrl.searchParams.set('sort', 'score_desc');
    scanUrl.searchParams.set('mode', 'exclude');

    const scanRes = await fetch(scanUrl.toString(), { cache: 'no-store' });

    if (!scanRes.ok) {
      const txt = await scanRes.text().catch(() => '');
      return NextResponse.json(
        {
          ok: false,
          ts,
          market_regime: null,
          stable_ratio: null,
          transition_ratio: null,
          volatile_ratio: null,
          message: null,
          error: `Context: scan failed (${scanRes.status}) ${txt}`,
        } satisfies ContextResponse,
        { status: 200 }
      );
    }

    const scanJson = await scanRes.json();
    const data: any[] = Array.isArray(scanJson?.data) ? scanJson.data : [];

    let stable = 0;
    let transition = 0;
    let volatile = 0;

    for (const a of data) {
      const r = upperRegime(a?.regime);
      if (r === 'STABLE') stable++;
      else if (r === 'TRANSITION') transition++;
      else if (r === 'VOLATILE') volatile++;
    }

    const total = stable + transition + volatile;

    const stable_ratio = total ? stable / total : null;
    const transition_ratio = total ? transition / total : null;
    const volatile_ratio = total ? volatile / total : null;

    let market_regime: Regime = null;

    if (volatile_ratio !== null && volatile_ratio >= 0.45) {
      market_regime = 'VOLATILE';
    } else if (stable_ratio !== null && stable_ratio >= 0.55) {
      market_regime = 'STABLE';
    } else if (transition_ratio !== null) {
      market_regime = 'TRANSITION';
    }

    return NextResponse.json(
      {
        ok: true,
        ts,
        market_regime,
        stable_ratio,
        transition_ratio,
        volatile_ratio,
        message: null,
      } satisfies ContextResponse,
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        ts,
        market_regime: null,
        stable_ratio: null,
        transition_ratio: null,
        volatile_ratio: null,
        message: null,
        error: e?.message ?? 'Unknown error',
      } satisfies ContextResponse,
      { status: 500 }
    );
  }
}
