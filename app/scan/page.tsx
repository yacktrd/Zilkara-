import ScanTable from "@/components/scan-table"

type ScanAsset = {
  id: string
  symbol: string
  name: string
  price: number
  h24: number
  chg_24h_pct: number
  market_cap?: number
  volume_24h?: number
  confidence_score: number
  regime: "STABLE" | "TRANSITION" | "VOLATILE"
  binance_url: string
  affiliate_url?: string
}

type ScanResponse = {
  ok: boolean
  ts: string
  source: string
  quote: string
  count: number
  data: ScanAsset[]
  error?: string | null
}

async function getScan(): Promise<ScanResponse> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    "http://localhost:3000"

  const normalizedBaseUrl = baseUrl.startsWith("http")
    ? baseUrl
    : `https://${baseUrl}`

  const apiKey =
    process.env.XYVALA_PUBLIC_DEMO_KEY?.trim() ||
    process.env.XYVALA_API_KEY?.trim() ||
    ""

  const res = await fetch(
    `${normalizedBaseUrl}/api/scan?limit=50&sort=score_desc&quote=usd`,
    {
      method: "GET",
      headers: apiKey ? { "x-xyvala-key": apiKey } : {},
      cache: "no-store",
    }
  )

  const json = await res.json()
  return json
}

export default async function ScanPage() {
  const result = await getScan()

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 44, marginBottom: 8 }}>Xyvala Scan</h1>
      <p style={{ opacity: 0.8, marginBottom: 24 }}>
        Structured crypto scan ranked by confidence score.
      </p>

      {!result.ok ? (
        <div
          style={{
            padding: 16,
            border: "1px solid #662222",
            borderRadius: 12,
            background: "#1a0f0f",
            color: "#ffb3b3",
          }}
        >
          <strong>Erreur</strong>
          <div>{result.error || "unknown_error"}</div>
        </div>
      ) : (
        <ScanTable items={result.data ?? []} />
      )}
    </main>
  )
}
