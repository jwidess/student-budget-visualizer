import { useMemo, useRef } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useProjection } from '@/hooks/useProjection';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { DailySnapshot } from '@/engine/types';

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

interface ChartDataPoint {
  date: string;
  balance: number;
  events: string[];
}

function prepareChartData(snapshots: DailySnapshot[]): ChartDataPoint[] {
  return snapshots.map((s) => ({
    date: s.date,
    balance: s.balance,
    events: s.events,
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
      <p className="text-sm font-medium">{formatDate(new Date(data.date + 'T00:00:00'))}</p>
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
            <p key={i} className="text-xs text-muted-foreground">
              • {e}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export function CashBalanceChart() {
  const { snapshots } = useProjection();
  const data = prepareChartData(snapshots);

  // Smart sampling: always include days with events (expenses/income),
  // plus enough regular points for a smooth line
  const sampled = useMemo(() => {
    if (data.length <= 180) return data; // Under 6 months: show all days

    const step = Math.max(2, Math.floor(data.length / 180));
    const result: ChartDataPoint[] = [];
    const included = new Set<number>();

    // Always include days with events
    data.forEach((d, i) => {
      if (d.events.length > 0) included.add(i);
    });

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
  }, [data]);

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

  // Where zero falls as a fraction from the top of the path's bounding box.
  // Must use actual data extents (including 0 from baseValue), NOT the padded
  // y-axis domain, because the SVG gradient maps to the element's bounding box.
  const zeroFraction = useMemo(() => {
    if (sampled.length === 0) return 1;
    const balances = sampled.map((d) => d.balance);
    const dataMax = Math.max(...balances, 0); // 0 included because baseValue={0}
    const dataMin = Math.min(...balances, 0);
    if (dataMax <= 0) return 0;   // entirely negative
    if (dataMin >= 0) return 1;   // entirely positive
    return dataMax / (dataMax - dataMin);
  }, [sampled]);

  const pct = `${(zeroFraction * 100).toFixed(4)}%`;

  return (
    <div className="w-full">
      <h2 className="text-lg font-semibold mb-4">Cash Balance Over Time</h2>
      <ResponsiveContainer width="100%" height={400}>
        <AreaChart
          data={sampled}
          margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
        >
          <defs>
            {/* Fill: green above zero, red below zero */}
            <linearGradient id="splitFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity={0.25} />
              <stop offset={pct} stopColor="#22c55e" stopOpacity={0.05} />
              <stop offset={pct} stopColor="#ef4444" stopOpacity={0.05} />
              <stop offset="100%" stopColor="#ef4444" stopOpacity={0.25} />
            </linearGradient>
            {/* Stroke: green above zero, red below zero */}
            <linearGradient id="splitStroke" x1="0" y1="0" x2="0" y2="1">
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
            interval={Math.floor(sampled.length / 8)}
            fontSize={12}
          />
          <YAxis
            domain={yDomain}
            tickFormatter={(v: number) => formatCurrency(v)}
            fontSize={12}
            width={80}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#888" strokeDasharray="3 3" />
          <Area
            type="monotone"
            dataKey="balance"
            stroke="url(#splitStroke)"
            fill="url(#splitFill)"
            baseValue={0}
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
  );
}
