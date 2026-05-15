 /* ============================================================================
 * FILE: components/sparkline.tsx
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala public structural sparkline component
 *
 * ROLE
 * - render a passive 7D public market sparkline
 * - visually support structural transition reading
 * - keep visual perception separate from analytical computation
 *
 * DIRECTIVES
 * - UI rendering only
 * - public perception layer only
 * - no market decision
 * - no private score usage
 * - no RFS recomputation
 * - no MCI recomputation
 * - no calibration
 * - no data reconstruction
 * - no fake fallback data
 * - no smoothing transformation
 * - deterministic rendering only
 * - null or insufficient data renders an empty stable container
 *
 * DESIGN PRINCIPLE
 * - sparkline represents observed movement shape
 * - sparkline does not expose advice, decision or signal
 * ========================================================================== */

import React from "react";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

type SparklineTone =
  | "neutral"
  | "compression"
  | "expansion"
  | "fragmentation";

type SparklineProps = {
  data: number[] | null;
  width?: number;
  height?: number;
  strokeWidth?: number;
  tone?: SparklineTone;
};

/* ============================================================================
 * 2. SAFE HELPERS
 * ========================================================================== */

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function sanitizeData(data: unknown): number[] | null {
  if (!Array.isArray(data)) return null;

  const clean = data.filter(isFiniteNumber);

  return clean.length >= 2 ? clean : null;
}

function resolveTone(data: number[]): SparklineTone {
  const first = data[0];
  const last = data.at(-1);

  if (!isFiniteNumber(first) || !isFiniteNumber(last) || first <= 0) {
    return "neutral";
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const amplitude = last > 0 ? ((max - min) / last) * 100 : 0;
  const change = ((last - first) / first) * 100;

  if (amplitude >= 18) return "fragmentation";
  if (Math.abs(change) <= 1.2 && amplitude <= 5) return "compression";
  if (change > 1) return "expansion";

  return "neutral";
}

function buildPoints(input: {
  data: number[];
  width: number;
  height: number;
}): string {
  const min = Math.min(...input.data);
  const max = Math.max(...input.data);
  const range = max - min || 1;

  return input.data
    .map((value, index) => {
      const x = (index / (input.data.length - 1)) * input.width;
      const y = input.height - ((value - min) / range) * input.height;

      return `${x},${y}`;
    })
    .join(" ");
}

/* ============================================================================
 * 3. CORE COMPONENT
 * ========================================================================== */

export function Sparkline({
  data,
  width = 96,
  height = 28,
  strokeWidth = 2,
  tone,
}: SparklineProps) {
  const cleanData = sanitizeData(data);

  if (!cleanData) {
    return <div className="sparklineEmpty" style={{ width, height }} />;
  }

  const resolvedTone = tone ?? resolveTone(cleanData);
  const points = buildPoints({
    data: cleanData,
    width,
    height,
  });

  return (
    <svg
      width={width}
      height={height}
      className={`sparkline sparkline-${resolvedTone}`}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Observed 7D market movement"
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export default Sparkline;
