export async function GET() {
  return Response.json({
    ok: true,
    route: "state",
    ts: Date.now(),
    engine: "Zilkara Core",
    status: "operational"
  });
}
