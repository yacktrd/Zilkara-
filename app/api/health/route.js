// app/api/health/route.js
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    { ok: true, ts: Date.now(), service: "zilkara" },
    { status: 200 }
  );
}
