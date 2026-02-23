// lib/state.ts

export type StateAsset = {
  symbol: string;
  name?: string;
  price: number;
  chg_24h_pct: number;
  confidence_score: number;
  regime: string;
};

export async function getStateData(): Promise<StateAsset[]> {
  // ⚠️ Ici tu mets EXACTEMENT la logique métier actuelle
  // qui était dans /api/state

  // Exemple placeholder (à remplacer par ton vrai code) :

  return [
    {
      symbol: "BTCUSDT",
      name: "Bitcoin",
      price: 64000,
      chg_24h_pct: 2.1,
      confidence_score: 87,
      regime: "STABLE",
    },
  ];
}
