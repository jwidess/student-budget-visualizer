// ── Chart sampling ──

/** Maximum data points rendered in the chart (longer projections are down-sampled) */
export const MAX_SAMPLE_POINTS = 180;

/** Number of evenly-spaced ticks along the X axis */
export const XAXIS_TICK_COUNT = 8;

// ── Animation timing (ms) ──

/** Duration of the Recharts Area draw / transition animation */
export const CHART_ANIM_DURATION = 600;

/** Brief fade-out before a chart re-mount (projection length change) */
export const CHART_FADE_OUT_DELAY = 150;

// ── Monthly calculation factors (52-week year) ──

/** Average weekdays per month: 5 × 52 ÷ 12 ≈ 21.67 */
export const WEEKDAYS_PER_MONTH = (52 * 5) / 12;

/** Average weekend days per month: 2 × 52 ÷ 12 ≈ 8.67 */
export const WEEKEND_DAYS_PER_MONTH = (52 * 2) / 12;

/** Average weeks per month: 52 ÷ 12 ≈ 4.33 */
export const WEEKS_PER_MONTH = 52 / 12;

// ── Chart colors (Tailwind palette equivalents for SVG contexts) ──

export const CHART_COLORS = {
  /** Green-500 — positive balances, income */
  positive: '#22c55e',
  /** Red-500 — negative balances, expenses */
  negative: '#ef4444',
  /** Amber-500 — warning / lowest balance (when still positive) */
  warning: '#f59e0b',
  /** Neutral gray — zero reference line */
  zeroLine: '#888888',
} as const;
