// app/api/context/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ContextResponse = {
  ok: boolean;
  ts: string;
  market_regime?: string | null;
  confidence_global?: number | null; // 0-100
  stable_ratio?: number | null;
  transition_ratio?: number | null;
  volatile_ratio?: number | null;
  message?: string | null;
  error?: string;
};

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function asNullableNumber(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function upperRegime(v: unknown): 'STABLE' | 'TRANSITION' | 'VOLATILE' | null {
  const s = typeof v === 'string' ? v.trim().toUpperCase() : '';
  if (s === 'STABLE' || s === 'TRANSITION' || s === 'VOLATILE') return s;
  return null;
}

export async function GET(request: Request) {
  const ts = new Date().toISOString();

  try {
    // ✅ IMPORTANT : fetch interne via origin courant (évite 401 dû à Deployment Protection / domaine hardcodé)
    const origin = new URL(request.url).origin;

    const scanUrl = new URL('/api/scan', origin);
    scanUrl.searchParams.set('limit', '250');
    scanUrl.searchParams.set('sort', 'score_desc');

    const scanRes = await fetch(scanUrl.toString(), { cache: 'no-store' });

    if (!scanRes.ok) {
      const txt = await scanRes.text().catch(() => '');
      const res: ContextResponse = {
        ok: false,
        ts,
        error: `Context: scan failed (HTTP ${scanRes.status})${txt ? ` — ${txt}` : ''}`,
      };
      return NextResponse.json(res, { status: 200 }); // 200 pour ne pas casser l’UI, mais ok:false
    }

    const scanJson = await scanRes.json();

    // scanJson.data attendu: array
    const data: any[] = Array.isArray(scanJson?.data) ? scanJson.data : [];

    // ratios par régime
    let stable = 0;
    let transition = 0;
    let volatile = 0;

    for (const a of data) {
      const r = upperRegime(a?.regime);
      if (r === 'STABLE') stable++;
      else if (r === 'TRANSITION') transition++;
      else if (r === 'VOLATILE') volatile++;
    }

    const total = data.length || 1;
    const stable_ratio = stable / total;
    const transition_ratio = transition / total;
    const volatile_ratio = volatile / total;

    // confiance globale simple : moyenne des confidence_score (si présent)
    const scores = data
      .map((a) => asNullableNumber(a?.confidence_score))
      .filter((x): x is number => x != null);

    const avg = scores.length ? scores.reduce((s, n) => s + n, 0) / scores.length : null;
    const confidence_global = avg != null ? clampInt(avg, 0, 100) : null;

    // marché = régime dominant
    const market_regime =
      stable >= transition && stable >= volatile
        ? 'STABLE'
        : transition >= stable && transition >= volatile
        ? 'TRANSITION'
        : 'VOLATILE';

    const res: ContextResponse = {
      ok: true,
      ts,
      market_regime,
      confidence_global,
      stable_ratio: Number.isFinite(stable_ratio) ? stable_ratio : null,
      transition_ratio: Number.isFinite(transition_ratio) ? transition_ratio : null,
      volatile_ratio: Number.isFinite(volatile_ratio) ? volatile_ratio : null,
      message: null,
    };

    return NextResponse.json(res, { status: 200 });
  } catch (e: any) {
    const res: ContextResponse = {
      ok: false,
      ts,
      error: e?.message ? String(e.message) : 'Context failed',
    };
    return NextResponse.json(res, { status: 200 }); // 200 ok:false pour UI stable
  }
}
