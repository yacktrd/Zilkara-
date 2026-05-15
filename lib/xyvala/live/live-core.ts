export type LiveTick = {
  price: number;
  ts: number;
  size?: number | null;
  volume?: number | null;
};

export type LiveMetrics = {
  price_5s_avg: number | null;
  price_15s_avg: number | null;
  price_1m_avg: number | null;

  price_5s_median: number | null;
  price_15s_median: number | null;
  price_1m_median: number | null;

  micro_volatility: number;
  price_velocity: number;
  tick_density: number;
  noise_score: number;
  quality_score: number;

  micro_rupture_flag: boolean;
  trend_alignment: "UP" | "DOWN" | "FLAT";
};

export type LiveCoreOutput = {
  live_price: number | null;
  live_ts: number | null;

  smoothed_price: number | null;
  filtered_price: number | null;

  buffer_size: number;

  windows: {
    ticks_5s: number;
    ticks_15s: number;
    ticks_1m: number;
  };

  metrics: LiveMetrics;
  warnings: string[];
};

export type LiveCoreState = {
  ticks: LiveTick[];
};

export type PushLiveTickInput = {
  state: LiveCoreState;
  tick: LiveTick;
  nowTs?: number;
};

export type ComputeLiveCoreInput = {
  state: LiveCoreState;
  nowTs?: number;
};
