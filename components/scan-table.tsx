// components/scan-table.tsx

"use client";

import React, { useMemo, useState } from "react";
import type { ScanAsset, Regime } from "@/lib/xyvala/scan";

type RegimeFilter = "ALL" | Regime;
type SortDirection = "none" | "asc" | "desc";
type SortPreset = "score_desc" | "score_asc" | "price_desc" | "price_asc";

type ScanTableAsset = ScanAsset & {
  affiliate_url?: string;
};

type Props = {
  assets: ScanTableAsset[];
  quote: string;
  sort?: string;
  limit?: number;
};

function safeString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function safeNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeSortPreset(value: string | undefined): SortPreset {
  const normalized = safeString(value, "score_desc").toLowerCase();

  if (normalized === "score_asc") return "score_asc";
  if (normalized === "price_desc") return "price_desc";
  if (normalized === "price_asc") return "price_asc";

  return "score_desc";
}

function normalizeLimit(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(1, Math.floor(value));
}

function formatPrice(value: number, quote: string): string {
  if (!Number.isFinite(value)) return "-";

  const formatted =
    value >= 1000
      ? value.toLocaleString("fr-FR", { maximumFractionDigits: 2 })
      : value >= 1
        ? value.toLocaleString("fr-FR", { maximumFractionDigits: 4 })
        : value.toLocaleString("fr-FR", { maximumFractionDigits: 8 });

  return `${formatted} ${quote.toUpperCase()}`;
}

function formatPct(value: number): string {
  if (!Number.isFinite(value)) return "-";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function getPctClass(value: number): string {
  if (!Number.isFinite(value)) return "z-muted";
  if (value > 0) return "z-pos";
  if (value < 0) return "z-neg";
  return "z-muted";
}

function getRegimeLabel(regime: Regime): string {
  if (regime === "STABLE") return "Stable";
  if (regime === "TRANSITION") return "Transition";
  return "Instable";
}

function getInitialSortState(sort: SortPreset): {
  priceSort: SortDirection;
  scoreSort: SortDirection;
} {
  if (sort === "price_asc") {
    return { priceSort: "asc", scoreSort: "none" };
  }

  if (sort === "price_desc") {
    return { priceSort: "desc", scoreSort: "none" };
  }

  if (sort === "score_asc") {
    return { priceSort: "none", scoreSort: "asc" };
  }

  return { priceSort: "none", scoreSort: "desc" };
}

function resolveAssetHref(asset: ScanTableAsset): string {
  return safeString(asset.affiliate_url) || safeString(asset.binance_url) || "#";
}

function resolveAssetKey(asset: ScanTableAsset): string {
  const id = safeString(asset.id);
  const symbol = safeString(asset.symbol, "UNKNOWN");
  return id ? `${id}-${symbol}` : symbol;
}

function FilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`z-filterBtn${active ? " is-active" : ""}`}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="z-filterGroup">
      <p className="z-filterTitle">{title}</p>
      <div className="z-filterRow">{children}</div>
    </div>
  );
}

function SearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <input
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Rechercher BTC, ETH, SOL..."
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      className="z-search"
    />
  );
}

function ResultMeta({
  visible,
  total,
}: {
  visible: number;
  total: number;
}) {
  return (
    <div className="z-toolbarMeta">
      <span className="z-toolbarCount">Actifs affichés</span>
      <span className="z-chip">
        {visible} / {total}
      </span>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="z-empty">{children}</div>;
}

function MobileAssetCard({
  asset,
  quote,
}: {
  asset: ScanTableAsset;
  quote: string;
}) {
  const href = resolveAssetHref(asset);
  const symbol = safeString(asset.symbol, "UNKNOWN");
  const name = safeString(asset.name, symbol);
  const regime = asset.regime;
  const score = Math.round(safeNumber(asset.confidence_score, 0));
  const price = formatPrice(safeNumber(asset.price, 0), quote);
  const change = safeNumber(asset.chg_24h_pct, 0);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="z-card z-hiddenDesktop"
      aria-label={`Ouvrir ${symbol}`}
    >
      <div className="z-asset">
        <p className="z-symbol">{symbol}</p>
        <p className="z-name">{name}</p>
      </div>

      <div className="z-score z-num">{score}</div>

      <div className="z-regime">
        <span className="z-dot" data-regime={regime} aria-hidden="true" />
        <span>{getRegimeLabel(regime)}</span>
      </div>

      <div className="z-stats">
        <div className="z-stat">
          <span className="z-statLabel">Prix</span>
          <span className="z-statValue z-num">{price}</span>
        </div>

        <div className="z-stat">
          <span className="z-statLabel">24h</span>
          <span className={`z-statValue z-num ${getPctClass(change)}`}>
            {formatPct(change)}
          </span>
        </div>
      </div>

      <span className="z-trade">Ouvrir</span>
    </a>
  );
}

function DesktopTable({
  assets,
  quote,
}: {
  assets: ScanTableAsset[];
  quote: string;
}) {
  return (
    <div className="z-tableWrap z-hiddenMobile">
      <div className="z-tableScroll">
        <table className="z-table">
          <thead>
            <tr>
              <th className="z-colAsset">Actif</th>
              <th className="z-colPrice">Prix</th>
              <th className="z-col24h">24h</th>
              <th className="z-colRegime">Régime</th>
              <th className="z-colScore">Score</th>
            </tr>
          </thead>

          <tbody>
            {assets.map((asset) => {
              const href = resolveAssetHref(asset);
              const symbol = safeString(asset.symbol, "UNKNOWN");
              const name = safeString(asset.name, symbol);
              const price = formatPrice(safeNumber(asset.price, 0), quote);
              const change = safeNumber(asset.chg_24h_pct, 0);
              const score = Math.round(safeNumber(asset.confidence_score, 0));

              return (
                <tr key={resolveAssetKey(asset)}>
                  <td>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="z-cellAsset"
                    >
                      <span
                        className="z-dot"
                        data-regime={asset.regime}
                        aria-hidden="true"
                      />
                      <div className="z-assetText">
                        <span className="z-assetName">{symbol}</span>
                        <span className="z-assetSub">{name}</span>
                      </div>
                    </a>
                  </td>

                  <td className="z-num">{price}</td>

                  <td className={`z-num ${getPctClass(change)}`}>
                    {formatPct(change)}
                  </td>

                  <td>
                    <span className="z-regime">
                      <span
                        className="z-dot"
                        data-regime={asset.regime}
                        aria-hidden="true"
                      />
                      <span>{getRegimeLabel(asset.regime)}</span>
                    </span>
                  </td>

                  <td className="z-scoreCell z-num">{score}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ScanTable({
  assets,
  quote,
  sort,
  limit,
}: Props) {
  const initialSort = getInitialSortState(normalizeSortPreset(sort));
  const normalizedLimit = normalizeLimit(limit, assets.length);

  const [query, setQuery] = useState("");
  const [regimeFilter, setRegimeFilter] = useState<RegimeFilter>("ALL");
  const [priceSort, setPriceSort] = useState<SortDirection>(initialSort.priceSort);
  const [scoreSort, setScoreSort] = useState<SortDirection>(initialSort.scoreSort);

  const filteredAssets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const filtered = assets.filter((asset) => {
      const symbol = safeString(asset.symbol).toLowerCase();
      const name = safeString(asset.name).toLowerCase();

      const matchesQuery =
        normalizedQuery.length === 0 ||
        symbol.includes(normalizedQuery) ||
        name.includes(normalizedQuery);

      const matchesRegime =
        regimeFilter === "ALL" || asset.regime === regimeFilter;

      return matchesQuery && matchesRegime;
    });

    const sorted = [...filtered].sort((a, b) => {
      const aScore = safeNumber(a.confidence_score);
      const bScore = safeNumber(b.confidence_score);
      const aPrice = safeNumber(a.price);
      const bPrice = safeNumber(b.price);

      if (scoreSort !== "none") {
        const scoreDelta =
          scoreSort === "asc" ? aScore - bScore : bScore - aScore;
        if (scoreDelta !== 0) return scoreDelta;
      }

      if (priceSort !== "none") {
        const priceDelta =
          priceSort === "asc" ? aPrice - bPrice : bPrice - aPrice;
        if (priceDelta !== 0) return priceDelta;
      }

      return safeString(a.symbol).localeCompare(safeString(b.symbol));
    });

    return sorted.slice(0, normalizedLimit);
  }, [assets, query, regimeFilter, priceSort, scoreSort, normalizedLimit]);

  if (!assets.length) {
    return <EmptyState>Aucun résultat.</EmptyState>;
  }

  return (
    <div className="z-scanShell">
      <div className="z-scanToolbar">
        <SearchInput value={query} onChange={setQuery} />
        <ResultMeta visible={filteredAssets.length} total={assets.length} />

        <div className="z-filterGrid">
          <FilterGroup title="Régime">
            <FilterButton
              active={regimeFilter === "ALL"}
              onClick={() => setRegimeFilter("ALL")}
            >
              Tout
            </FilterButton>

            <FilterButton
              active={regimeFilter === "STABLE"}
              onClick={() => setRegimeFilter("STABLE")}
            >
              Stable
            </FilterButton>

            <FilterButton
              active={regimeFilter === "TRANSITION"}
              onClick={() => setRegimeFilter("TRANSITION")}
            >
              Transition
            </FilterButton>

            <FilterButton
              active={regimeFilter === "VOLATILE"}
              onClick={() => setRegimeFilter("VOLATILE")}
            >
              Instable
            </FilterButton>
          </FilterGroup>

          <FilterGroup title="Prix">
            <FilterButton
              active={priceSort === "asc"}
              onClick={() => setPriceSort("asc")}
            >
              Croissant
            </FilterButton>

            <FilterButton
              active={priceSort === "desc"}
              onClick={() => setPriceSort("desc")}
            >
              Décroissant
            </FilterButton>

            <FilterButton
              active={priceSort === "none"}
              onClick={() => setPriceSort("none")}
            >
              Neutre
            </FilterButton>
          </FilterGroup>

          <FilterGroup title="Score">
            <FilterButton
              active={scoreSort === "asc"}
              onClick={() => setScoreSort("asc")}
            >
              Croissant
            </FilterButton>

            <FilterButton
              active={scoreSort === "desc"}
              onClick={() => setScoreSort("desc")}
            >
              Décroissant
            </FilterButton>

            <FilterButton
              active={scoreSort === "none"}
              onClick={() => setScoreSort("none")}
            >
              Neutre
            </FilterButton>
          </FilterGroup>
        </div>
      </div>

      {filteredAssets.length === 0 ? (
        <EmptyState>Aucun actif ne correspond aux filtres actuels.</EmptyState>
      ) : (
        <>
          <div className="z-list">
            {filteredAssets.map((asset) => (
              <MobileAssetCard
                key={resolveAssetKey(asset)}
                asset={asset}
                quote={quote}
              />
            ))}
          </div>

          <DesktopTable assets={filteredAssets} quote={quote} />
        </>
      )}
    </div>
  );
}
