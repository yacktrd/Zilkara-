export async function POST() {
  return Response.json({
    ok: true,
    rebuilt: true,
    ts: Date.now()
  });
}
