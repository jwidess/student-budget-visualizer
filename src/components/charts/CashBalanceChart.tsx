import { useMemo, useRef, useState, useEffect, useLayoutEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
} from 'recharts';
import { useProjection } from '@/hooks/useProjection';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { DailySnapshot, DailyEvent } from '@/engine/types';

/** Round down to nearest increment */
function floorTo(value: number, increment: number): number {
  return Math.floor(value / increment) * increment;
}

/** Round up to nearest increment */
function ceilTo(value: number, increment: number): number {
  return Math.ceil(value / increment) * increment;
}

/**
 * Choose a nice rounding increment based on the data range.
 * Larger ranges use $1000 steps, smaller use $500 or $250.
 */
function niceIncrement(range: number): number {
  if (range > 10000) return 2000;
  if (range > 5000) return 1000;
  if (range > 2000) return 500;
  return 250;
}

// Chart layout constants (keep in sync with ResponsiveContainer / AreaChart props)
const CHART_HEIGHT = 400;
const MARGIN = { top: 10, right: 10, left: 10, bottom: 0 };
const XAXIS_HEIGHT = 30; // explicit so gradient bounds stay in sync

interface ChartDataPoint {
  date: string;
  balance: number;
  events: DailyEvent[];
  isMin?: boolean;
  isMax?: boolean;
}

function prepareChartData(snapshots: DailySnapshot[], minIdx: number, maxIdx: number): ChartDataPoint[] {
  return snapshots.map((s, i) => ({
    date: s.date,
    balance: s.balance,
    events: s.events,
    isMin: i === minIdx,
    isMax: i === maxIdx,
  }));
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: ChartDataPoint;
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.[0]) return null;
  const data = payload[0].payload;
  return (
    <div className="rounded-lg border border-gray-200 p-3 shadow-lg" style={{ opacity: 1, backgroundColor: 'white' }}>
      <p className="text-sm font-medium">
        {formatDate(new Date(data.date + 'T00:00:00'))}
        {data.isMax && (
          <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">▲ Highest</span>
        )}
        {data.isMin && (
          <span className={`ml-2 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
            data.balance >= 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
          }`}>▼ Lowest</span>
        )}
      </p>
      <p
        className={`text-lg font-bold ${
          data.balance >= 0 ? 'text-green-600' : 'text-red-600'
        }`}
      >
        {formatCurrency(data.balance)}
      </p>
      {data.events.length > 0 && (
        <div className="mt-1 border-t pt-1">
          {data.events.map((e, i) => (
            <p key={i} className={`text-xs font-medium ${
              e.type === 'income' ? 'text-green-600' : 'text-red-600'
            }`}>
              • {e.label}{' '}
              <span className="font-semibold">
                {e.type === 'income' ? '+' : '−'}{formatCurrency(e.amount)}
              </span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export function CashBalanceChart() {
  const { snapshots } = useProjection();

  // Find the indices of the lowest and highest balance days across ALL data
  // so we can always include them in the sampled set and highlight them.
  const { minIdx, maxIdx } = useMemo(() => {
    if (snapshots.length === 0) return { minIdx: 0, maxIdx: 0 };
    let mi = 0, ma = 0;
    for (let i = 1; i < snapshots.length; i++) {
      if (snapshots[i]!.balance < snapshots[mi]!.balance) mi = i; // eslint-disable-line @typescript-eslint/no-non-null-assertion
      if (snapshots[i]!.balance > snapshots[ma]!.balance) ma = i; // eslint-disable-line @typescript-eslint/no-non-null-assertion
    }
    return { minIdx: mi, maxIdx: ma };
  }, [snapshots]);

  const data = useMemo(
    () => prepareChartData(snapshots, minIdx, maxIdx),
    [snapshots, minIdx, maxIdx]
  );

  // Smart sampling: always include days with events (expenses/income),
  // the min/max balance days, plus enough regular points for a smooth line
  const sampled = useMemo(() => {
    if (data.length <= 180) return data; // Under 6 months: show all days

    const step = Math.max(2, Math.floor(data.length / 180));
    const result: ChartDataPoint[] = [];
    const included = new Set<number>();

    // Always include days with events
    data.forEach((d, i) => {
      if (d.events.length > 0) included.add(i);
    });

    // Always include min and max balance days
    included.add(minIdx);
    included.add(maxIdx);

    // Add regularly spaced points for smooth curve
    for (let i = 0; i < data.length; i += step) {
      included.add(i);
    }
    // Always include first and last
    included.add(0);
    included.add(data.length - 1);

    // Sort indices and build result
    const sorted = Array.from(included).sort((a, b) => a - b);
    for (const idx of sorted) {
      const point = data[idx];
      if (point) result.push(point);
    }
    return result;
  }, [data, minIdx, maxIdx]);

  // ── Sticky Y-axis domain ──
  // Only expands when data exceeds current bounds; prevents misleading
  // visual shifts when small input changes cause axis rescaling.
  const stickyDomain = useRef<[number, number] | null>(null);

  const yDomain = useMemo(() => {
    if (sampled.length === 0) return [0, 1000] as [number, number];

    const balances = sampled.map((d) => d.balance);
    const dataMin = Math.min(...balances);
    const dataMax = Math.max(...balances);
    const range = dataMax - dataMin;
    const inc = niceIncrement(range);
    const padding = inc; // one full increment of padding

    // Calculate the "ideal" domain for current data
    const idealMin = floorTo(dataMin - padding, inc);
    const idealMax = ceilTo(dataMax + padding, inc);

    const prev = stickyDomain.current;
    if (prev) {
      // Expand bounds if data exceeds them; otherwise keep stable
      const newMin = Math.min(prev[0], idealMin);
      const newMax = Math.max(prev[1], idealMax);

      // Allow bounds to tighten if data has moved far from the edges
      // (more than 3× padding away), so the chart isn't stuck at old extremes forever
      const shrinkMin =
        dataMin - prev[0] > padding * 3 ? idealMin : newMin;
      const shrinkMax =
        prev[1] - dataMax > padding * 3 ? idealMax : newMax;

      stickyDomain.current = [shrinkMin, shrinkMax];
    } else {
      stickyDomain.current = [idealMin, idealMax];
    }

    return stickyDomain.current;
  }, [sampled]);

  // Where zero falls as a fraction of the chart area, computed from the Y-axis
  // domain. We use gradientUnits="userSpaceOnUse" so the gradient maps to the
  // chart's pixel coordinate space directly, avoiding objectBoundingBox issues
  // where the fill and stroke paths have different bounding boxes (the stroke
  // doesn't extend to baseValue=0) and monotone interpolation can overshoot.
  const zeroFraction = useMemo(() => {
    const [domMin, domMax] = yDomain;
    if (domMax <= 0) return 0;   // entirely negative
    if (domMin >= 0) return 1;   // entirely positive
    return domMax / (domMax - domMin);
  }, [yDomain]);

  const pct = `${(zeroFraction * 100).toFixed(4)}%`;

  // Pixel boundaries of the chart's plotting area (for userSpaceOnUse gradients).
  // Must subtract XAXIS_HEIGHT because the axis is drawn inside the chart area,
  // shrinking the actual plot region.
  const gradientY1 = MARGIN.top;
  const gradientY2 = CHART_HEIGHT - MARGIN.bottom - XAXIS_HEIGHT;

  // Delay showing min/max highlight dots until the Area's draw animation
  // has finished, so they fade in rather than jumping ahead of the line.
  const ANIM_DURATION = 600;
  const [dotsVisible, setDotsVisible] = useState(true);

  // Track raw data length changes to trigger a fade transition when projection months changes.
  // We use data.length (total projection days) instead of sampled.length, because the
  // sampling step can produce slightly different counts when event days shift that
  // would falsely trigger a full re-mount and kill the smooth Recharts animation.
  const [chartKey, setChartKey] = useState(0);
  const [fading, setFading] = useState(false);
  const prevLengthRef = useRef(data.length);
  // Track previous data reference to avoid effect on initial mount
  const prevDataRef = useRef(data);

  // Handle projection length changes (fade out & remount)
  useEffect(() => {
    if (data.length !== prevLengthRef.current) {
      prevLengthRef.current = data.length;
      setFading(true);
      setDotsVisible(false);
      // Brief fade-out, then swap key to re-mount chart with animation
      const timer = setTimeout(() => {
        setChartKey((k) => k + 1);
        setFading(false);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [data.length]);

  // Handle value changes without length change (hide dots during transition)
  useLayoutEffect(() => {
    // Skip if data hasn't changed reference (should be handled by dep array, but safety check)
    if (data === prevDataRef.current) return;
    prevDataRef.current = data;

    // If length hasn't changed but data has, it's a value update.
    // We hide dots immediately so they don't jump, let the chart animate, then fade them back in.
    if (data.length === prevLengthRef.current) {
      setDotsVisible(false);
      const timer = setTimeout(() => {
        setDotsVisible(true);
      }, ANIM_DURATION);
      return () => clearTimeout(timer);
    }
  }, [data]);

  // After a chart re-mount (chartKey change), wait for the Area animation
  // to finish before fading in the dots.
  useEffect(() => {
    if (!dotsVisible) {
      const timer = setTimeout(() => setDotsVisible(true), ANIM_DURATION + 150);
      return () => clearTimeout(timer);
    }
  }, [chartKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="w-full">
      <h2 className="text-lg font-semibold mb-4">Cash Balance Over Time</h2>
      <div
        className="transition-opacity duration-150 ease-in-out"
        style={{ opacity: fading ? 0 : 1 }}
      >
      <ResponsiveContainer key={chartKey} width="100%" height={CHART_HEIGHT}>
        <AreaChart
          data={sampled}
          margin={MARGIN}
        >
          <defs>
            {/* Fill: green above zero, red below zero (userSpaceOnUse = pixel coords) */}
            <linearGradient id="splitFill" x1="0" y1={gradientY1} x2="0" y2={gradientY2} gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#22c55e" stopOpacity={0.25} />
              <stop offset={pct} stopColor="#22c55e" stopOpacity={0.05} />
              <stop offset={pct} stopColor="#ef4444" stopOpacity={0.05} />
              <stop offset="100%" stopColor="#ef4444" stopOpacity={0.25} />
            </linearGradient>
            {/* Stroke: green above zero, red below zero */}
            <linearGradient id="splitStroke" x1="0" y1={gradientY1} x2="0" y2={gradientY2} gradientUnits="userSpaceOnUse">
              <stop offset={pct} stopColor="#22c55e" />
              <stop offset={pct} stopColor="#ef4444" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) => {
              const date = new Date(d + 'T00:00:00');
              return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              });
            }}
            interval={Math.floor(data.length / 8)}
            fontSize={12}
            height={XAXIS_HEIGHT}
          />
          <YAxis
            domain={yDomain}
            tickFormatter={(v: number) => formatCurrency(v)}
            fontSize={12}
            width={80}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#888" strokeDasharray="3 3" />
          {/* Min/max highlight dots — only rendered after area animation finishes */}
          {dotsVisible && data.length > 0 && (
            <ReferenceDot
              x={data[maxIdx]!.date}
              y={data[maxIdx]!.balance}
              r={5}
              fill="#22c55e"
              stroke="white"
              strokeWidth={2}
              shape={(props: Record<string, unknown>) => {
                const { cx, cy } = props as { cx: number; cy: number };
                return (
                  <circle
                    cx={cx} cy={cy} r={5}
                    fill="#22c55e" stroke="white" strokeWidth={2}
                    className="animate-fade-in"
                  />
                );
              }}
            />
          )}
          {dotsVisible && data.length > 0 && (
            <ReferenceDot
              x={data[minIdx]!.date}
              y={data[minIdx]!.balance}
              r={5}
              fill={data[minIdx]!.balance >= 0 ? '#f59e0b' : '#ef4444'}
              stroke="white"
              strokeWidth={2}
              shape={(props: Record<string, unknown>) => {
                const { cx, cy } = props as { cx: number; cy: number };
                const fill = data[minIdx]!.balance >= 0 ? '#f59e0b' : '#ef4444';
                return (
                  <circle
                    cx={cx} cy={cy} r={5}
                    fill={fill} stroke="white" strokeWidth={2}
                    className="animate-fade-in"
                  />
                );
              }}
            />
          )}
          <Area
            type="monotone"
            dataKey="balance"
            stroke="url(#splitStroke)"
            fill="url(#splitFill)"
            baseValue={Math.max(0, yDomain[0])}
            strokeWidth={2}
            dot={false}
            activeDot={(props) => {
              const { cx = 0, cy = 0, payload } = props as { cx?: number; cy?: number; payload: ChartDataPoint };
              const color = payload.balance >= 0 ? '#22c55e' : '#ef4444';
              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={5}
                  fill={color}
                  stroke="white"
                  strokeWidth={2}
                />
              );
            }}
            isAnimationActive={true}
            animationDuration={600}
            animationEasing="ease-in-out"
          />
        </AreaChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
