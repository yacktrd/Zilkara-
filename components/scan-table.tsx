import type { ScanAsset } from "@/lib/xyvala/scan"

type ScanTableItem = ScanAsset & {
  affiliate_url: string
}

type Props = {
  items: ScanTableItem[]
}

function price(v: number) {
  if (!Number.isFinite(v)) return "-"
  if (v > 1000) return v.toLocaleString()
  if (v > 1) return v.toFixed(2)
  return v.toFixed(6)
}

function pct(v: number) {
  if (!Number.isFinite(v)) return "-"
  const sign = v >= 0 ? "+" : ""
  return `${sign}${v.toFixed(2)}%`
}

export function ScanTable({ items }: Props) {
  if (!items.length) {
    return (
      <div className="p-6 text-sm text-neutral-500 border rounded-lg">
        Aucun actif disponible
      </div>
    )
  }

  return (
    <div className="overflow-x-auto border rounded-xl">
      <table className="w-full text-sm">
        <thead className="bg-neutral-100">
          <tr>
            <th className="px-4 py-3 text-left">Asset</th>
            <th className="px-4 py-3 text-left">Price</th>
            <th className="px-4 py-3 text-left">24h</th>
            <th className="px-4 py-3 text-left">Score</th>
            <th className="px-4 py-3 text-left">Regime</th>
            <th className="px-4 py-3 text-left">Link</th>
          </tr>
        </thead>

        <tbody>
          {items.map((a) => (
            <tr key={a.id} className="border-t">
              <td className="px-4 py-3">
                <div className="font-medium">{a.symbol}</div>
                <div className="text-xs text-neutral-500">{a.name}</div>
              </td>

              <td className="px-4 py-3">{price(a.price)}</td>

              <td className="px-4 py-3">{pct(a.chg_24h_pct)}</td>

              <td className="px-4 py-3">{a.confidence_score}</td>

              <td className="px-4 py-3">{a.regime}</td>

              <td className="px-4 py-3">
                <a
                  href={a.affiliate_url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  Trade
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
