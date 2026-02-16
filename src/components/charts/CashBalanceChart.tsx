import { useMemo, useRef, useState, useEffect, useLayoutEffect, useCallback } from 'react';
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
import { useChartFadeTransition } from '@/hooks/useChartFadeTransition';
import { useYAxisGlow } from '@/hooks/useYAxisGlow';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  CHART_ANIM_DURATION,
  CHART_FADE_OUT_DELAY,
  CHART_COLORS,
  MAX_SAMPLE_POINTS,
  XAXIS_TICK_COUNT,
} from '@/lib/constants';
import { EventAnnotations } from './EventAnnotations';
import type { AnnotationHoverInfo } from './EventAnnotations';
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
const TOOLTIP_OFFSET_Y = 12; // px below the dot

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
    if (data.length <= MAX_SAMPLE_POINTS) return data;

    const step = Math.max(2, Math.floor(data.length / MAX_SAMPLE_POINTS));
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

  // ── One-time event detection ──
  const hasOneTimeEvents = useMemo(
    () => sampled.some((d) => d.events.some((e) => e.isOneTime)),
    [sampled],
  );

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

  // ── Annotation hover state ──
  const [annotationHover, setAnnotationHover] = useState<AnnotationHoverInfo | null>(null);
  const handleAnnotationHover = useCallback(
    (info: AnnotationHoverInfo | null) => setAnnotationHover(info),
    [],
  );

  // Find the data point matching the hovered annotation's date
  const annotationTooltipData = useMemo(() => {
    if (!annotationHover) return null;
    return sampled.find((d) => d.date === annotationHover.date) ?? null;
  }, [annotationHover, sampled]);

  // ── Dot visibility & chart transition management ──
  const [dotsVisible, setDotsVisible] = useState(true);
  const prevDataRef = useRef(data);

  // ── Resize detection: hide dots/annotations while chart re-flows ──
  const containerRef = useRef<HTMLDivElement>(null);
  const prevWidthRef = useRef<number | null>(null);
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const hideDotsForAnimation = useCallback(() => {
    setDotsVisible(false);
    if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
    resizeTimerRef.current = setTimeout(
      () => setDotsVisible(true),
      CHART_ANIM_DURATION,
    );
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newWidth = entry.contentRect.width;
        if (prevWidthRef.current !== null && newWidth !== prevWidthRef.current) {
          hideDotsForAnimation();
        }
        prevWidthRef.current = newWidth;
      }
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
    };
  }, [hideDotsForAnimation]);

  // Fade-out / re-mount when projection length changes.
  // We track data.length (total projection days) instead of sampled.length,
  // because the sampling step can produce slightly different counts when event
  // days shift — that would falsely trigger a full re-mount.
  const { chartKey, fading, prevLengthRef } = useChartFadeTransition(
    data.length,
    () => setDotsVisible(false),
  );

  // Glow y-axis ticks briefly when the domain/scale changes
  const yAxisGlowing = useYAxisGlow(yDomain.join(','), fading);

  // Handle value changes without length change (hide dots during transition)
  useLayoutEffect(() => {
    if (data === prevDataRef.current) return;
    prevDataRef.current = data;

    // Length unchanged → value-only update: hide dots while the line animates
    if (data.length === prevLengthRef.current) {
      setDotsVisible(false);
      const timer = setTimeout(() => setDotsVisible(true), CHART_ANIM_DURATION);
      return () => clearTimeout(timer);
    }
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  // After a chart re-mount (chartKey change), wait for the Area animation
  // to finish before fading in the dots.
  useEffect(() => {
    if (!dotsVisible) {
      const timer = setTimeout(() => setDotsVisible(true), CHART_ANIM_DURATION + CHART_FADE_OUT_DELAY);
      return () => clearTimeout(timer);
    }
  }, [chartKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="w-full">
      <h2 className="text-lg font-semibold mb-4">Cash Balance Over Time</h2>
      <div
        ref={containerRef}
        className="transition-opacity duration-150 ease-in-out"
        style={{ opacity: fading ? 0 : 1, position: 'relative' }}
      >
      <ResponsiveContainer key={chartKey} width="100%" height={CHART_HEIGHT}>
        <AreaChart
          data={sampled}
          margin={MARGIN}
        >
          <defs>
            {/* Fill: green above zero, red below zero (userSpaceOnUse = pixel coords) */}
            <linearGradient id="splitFill" x1="0" y1={gradientY1} x2="0" y2={gradientY2} gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={CHART_COLORS.positive} stopOpacity={0.25} />
              <stop offset={pct} stopColor={CHART_COLORS.positive} stopOpacity={0.05} />
              <stop offset={pct} stopColor={CHART_COLORS.negative} stopOpacity={0.05} />
              <stop offset="100%" stopColor={CHART_COLORS.negative} stopOpacity={0.25} />
            </linearGradient>
            {/* Stroke: green above zero, red below zero */}
            <linearGradient id="splitStroke" x1="0" y1={gradientY1} x2="0" y2={gradientY2} gradientUnits="userSpaceOnUse">
              <stop offset={pct} stopColor={CHART_COLORS.positive} />
              <stop offset={pct} stopColor={CHART_COLORS.negative} />
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
            interval={Math.floor(data.length / XAXIS_TICK_COUNT)}
            fontSize={12}
            height={XAXIS_HEIGHT}
          />
          <YAxis
            domain={yDomain}
            tick={(props: Record<string, unknown>) => {
              const { x, y, payload } = props as { x: number; y: number; payload: { value: number } };
              return (
                <text
                  x={x}
                  y={y}
                  dy={4}
                  textAnchor="end"
                  fontSize={12}
                  className={yAxisGlowing ? 'yaxis-tick-glow' : 'yaxis-tick'}
                >
                  {formatCurrency(payload.value)}
                </text>
              );
            }}
            width={80}
          />
          <Tooltip
            content={(props) => {
              if (annotationHover) return null;
              return <CustomTooltip {...(props as unknown as CustomTooltipProps)} />;
            }}
          />
          <ReferenceLine y={0} stroke={CHART_COLORS.zeroLine} strokeDasharray="3 3" />
          {/* Min/max highlight dots — only rendered after area animation finishes */}
          {dotsVisible && data.length > 0 && (
            <ReferenceDot
              x={data[maxIdx]!.date}
              y={data[maxIdx]!.balance}
              r={5}
              fill={CHART_COLORS.positive}
              stroke="white"
              strokeWidth={2}
              shape={(props: Record<string, unknown>) => {
                const { cx, cy } = props as { cx: number; cy: number };
                return (
                  <circle
                    cx={cx} cy={cy} r={5}
                    fill={CHART_COLORS.positive} stroke="white" strokeWidth={2}
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
              fill={data[minIdx]!.balance >= 0 ? CHART_COLORS.warning : CHART_COLORS.negative}
              stroke="white"
              strokeWidth={2}
              shape={(props: Record<string, unknown>) => {
                const { cx, cy } = props as { cx: number; cy: number };
                const fill = data[minIdx]!.balance >= 0 ? CHART_COLORS.warning : CHART_COLORS.negative;
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
            activeDot={annotationHover ? false : (props) => {
              const { cx = 0, cy = 0, payload } = props as { cx?: number; cy?: number; payload: ChartDataPoint };
              const color = payload.balance >= 0 ? CHART_COLORS.positive : CHART_COLORS.negative;
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
            animationDuration={CHART_ANIM_DURATION}
            animationEasing="ease-in-out"
          />
          {/* One-time event annotations — rendered AFTER Area so they
              appear on top of the chart fill and stroke */}
          {hasOneTimeEvents && (
            <EventAnnotations
              sampled={sampled}
              visible={dotsVisible}
              onAnnotationHover={handleAnnotationHover}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
      {/* Tooltip overlay when hovering an annotation label */}
      {annotationHover && annotationTooltipData && (
        <div
          style={{
            position: 'absolute',
            left: annotationHover.dotX,
            top: annotationHover.dotY + TOOLTIP_OFFSET_Y,
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          <CustomTooltip
            active
            payload={[{ payload: annotationTooltipData }]}
          />
        </div>
      )}
      </div>
    </div>
  );
}
