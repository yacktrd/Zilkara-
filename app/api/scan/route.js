import { kv } from "@vercel/kv";
import { Ratelimit } from "@upstash/ratelimit";

export const runtime = "nodejs";

const TTL_SECONDS = 45;

// Rate limit: 30 req / 60s / IP
const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(30, "60 s"),
});

function json(ok, data = [], error = null, status = 200) {
  return Response.json(
    { ok, ts: Date.now(), data: Array.isArray(data) ? data : [], error },
    { status }
  );
}

function getIp(req) {
  const xf = req.headers.get("x-forwarded-for");
  return (xf ? xf.split(",")[0].trim() : "unknown");
}

function rid() {
  return Math.random().toString(16).slice(2, 10);
}

export async function GET(req) {
  const start = Date.now();
  const requestId = rid();
  const ip = getIp(req);

  try {
    // 1) rate limit
    const { success } = await ratelimit.limit(`rl:scan:${ip}`);
    if (!success) {
      console.log(`[scan] rid=${requestId} ip=${ip} status=429 err=RATE_LIMITED ms=${Date.now()-start}`);
      return json(false, [], { code: "RATE_LIMITED", message: "Too many requests" }, 429);
    }

    // 2) cache
    const cacheKey = "scan:v1";
    const cached = await kv.get(cacheKey);
    if (cached && Array.isArray(cached)) {
      console.log(`[scan] rid=${requestId} ip=${ip} cache=HIT count=${cached.length} ms=${Date.now()-start}`);
      return json(true, cached, null, 200);
    }

    // 3) compute/fetch (ton code actuel)
    // Remplace ceci par ta fonction réelle:
    const assets = await buildScanData(); // <- à brancher

    if (!Array.isArray(assets)) {
      console.log(`[scan] rid=${requestId} ip=${ip} cache=MISS err=INVALID_RESPONSE ms=${Date.now()-start}`);
      return json(false, [], { code: "INVALID_RESPONSE", message: "Scan did not return an array" }, 502);
    }

    // 4) store cache TTL
    await kv.set(cacheKey, assets, { ex: TTL_SECONDS });

    console.log(`[scan] rid=${requestId} ip=${ip} cache=MISS count=${assets.length} ms=${Date.now()-start}`);
    return json(true, assets, null, 200);

  } catch (e) {
    console.log(`[scan] rid=${requestId} ip=${ip} status=500 err=INTERNAL ms=${Date.now()-start} msg=${e?.message}`);
    return json(false, [], { code: "INTERNAL", message: "Internal error" }, 500);
  }
}
