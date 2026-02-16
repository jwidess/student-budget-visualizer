import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { usePlotArea } from 'recharts';
import { CHART_COLORS } from '@/lib/constants';
import { useXAxis, useYAxis } from 'recharts/es6/hooks';
import { formatCurrency } from '@/lib/utils';
import type { DailyEvent } from '@/engine/types';

/* ──────────────────────────────────────────────────────────────────
 *  TUNING PARAMS
 *
 *  FONT_SIZE / LABEL_H    → control label box height
 *  MAX_LABEL_LEN          → characters before "…" truncation
 *  LABEL_PAD_X / _Y       → internal padding inside the label pill
 *  GAP_FROM_LINE          → minimum gap between the data-point dot and label
 *  CONNECTOR_DASH         → dotted line pattern  ("3 2" = 3px dash, 2px gap)
 *  CLAMP_MARGIN           → px safety margin from chart plot-area edges
 *  DOT_R / DOT_STROKE     → data-point dot dimensions
 *  LINE_PADDING           → vertical padding between labels and chart line
 *  LINE_BAND_SAMPLES      → # of samples for line-avoidance accuracy
 *  SOLVER_ITERATIONS      → # of collision-resolve passes (more = less overlap)
 *  COLLISION_GAP          → minimum spacing between adjacent labels (px)
 * ────────────────────────────────────────────────────────────────── */

const MAX_LABEL_LEN = 18;
const FONT_SIZE = 10;
const LABEL_PAD_X = 5;
const LABEL_PAD_Y = 3;
const LABEL_H = FONT_SIZE + LABEL_PAD_Y * 2;
const GAP_FROM_LINE = 15;
const CONNECTOR_COLOR = '#9ca3af';
const CONNECTOR_WIDTH = 1.5;
const CONNECTOR_DASH = '3 2';
const DOT_R = 3.5;
const DOT_STROKE = 1.5;
const CLAMP_MARGIN = 5;
const LABEL_OPACITY = 0.95;
const BG_OPACITY = 0.8;
const BORDER_RADIUS = 3;

/**
 * Vertical padding (px) between labels and the chart line band.
 * The solver pushes labels so they sit entirely outside the line's
 * min-max band (computed across the label width) plus this padding.
 */
const LINE_PADDING = 10;

/**
 * Number of dense samples across the label width to find the line's
 * min/max vertical band.  More = more accurate, 20 is plenty.
 */
const LINE_BAND_SAMPLES = 30;

/**
 * Number of solver passes.  More passes = better separation but slightly
 * heavier.  30 handles up to ~10 crowded annotations well.
 */
const SOLVER_ITERATIONS = 30;

/**
 * Minimum spacing (px) between label edges to prevent visual overlap.
 * Used in collision detection.
 */
const COLLISION_GAP = 2;

/* ────────────────────────────────────────────────────────────────── */

interface RawAnnotation {
  date: string;
  balance: number;
  label: string;
  amount: number;
  type: 'income' | 'expense';
}

interface LayoutAnnotation extends RawAnnotation {
  /** Pixel position of the data point on the chart line */
  dotX: number;
  dotY: number;
  /** Label box center after layout */
  labelX: number;
  labelY: number;
  /** Label box dimensions */
  boxW: number;
  boxH: number;
  /** Truncated display text */
  displayLabel: string;
  /** Formatted amount string */
  displayAmount: string;
}

/* ────────────────────────────────────────────────────────────────── */

function truncate(label: string, max: number): string {
  if (label.length <= max) return label;
  return label.slice(0, max - 1).trimEnd() + '…';
}

/** Approximate text width in px (proportional-width heuristic). */
function estimateTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.56;
}

/* ──────────────────────────────────────────────────────────────────
 *  Props
 * ────────────────────────────────────────────────────────────────── */

export interface ChartDataPointLike {
  date: string;
  balance: number;
  events: DailyEvent[];
}

/** Info passed to the parent when hovering an annotation label. */
export interface AnnotationHoverInfo {
  date: string;
  dotX: number;
  dotY: number;
}

interface EventAnnotationsProps {
  sampled: ChartDataPointLike[];
  visible: boolean;
  onAnnotationHover?: (info: AnnotationHoverInfo | null) => void;
}

/* ──────────────────────────────────────────────────────────────────
 *  Component
 * ────────────────────────────────────────────────────────────────── */

export function EventAnnotations({
  sampled,
  visible,
  onAnnotationHover,
}: EventAnnotationsProps) {
  const xAxis = useXAxis(0);
  const yAxis = useYAxis(0);
  const plotArea = usePlotArea();

  const annotations = useMemo<LayoutAnnotation[]>(() => {
    if (!xAxis?.scale || !yAxis?.scale || !plotArea) return [];

    const { x: plotX, y: plotY, width: plotW, height: plotH } = plotArea;
    const plotTop = plotY;
    const plotBottom = plotY + plotH;
    const plotLeft = plotX;
    const plotRight = plotX + plotW;

    // 1. Collect one-time events
    const raw: RawAnnotation[] = [];
    for (const dp of sampled) {
      for (const evt of dp.events) {
        if (!evt.isOneTime) continue;
        raw.push({
          date: dp.date,
          balance: dp.balance,
          label: evt.label,
          amount: evt.amount,
          type: evt.type,
        });
      }
    }
    if (raw.length === 0) return [];

    // 2. Compute pixel positions & build label text
    const items: LayoutAnnotation[] = raw.map((item) => {
      const dotX = xAxis.scale.map(item.date, { position: 'middle' }) ?? 0;
      const dotY = yAxis.scale.map(item.balance) ?? 0;
      const displayLabel = truncate(item.label, MAX_LABEL_LEN);
      const sign = item.type === 'income' ? '+' : '−';
      const displayAmount = `${sign}${formatCurrency(item.amount)}`;
      const fullText = `${displayLabel} ${displayAmount}`;
      const textW = estimateTextWidth(fullText, FONT_SIZE);
      const boxW = textW + LABEL_PAD_X * 2;
      const boxH = LABEL_H;

      // Place ABOVE or BELOW the line depending on available space
      const spaceAbove = dotY - plotTop;
      const spaceBelow = plotBottom - dotY;
      const preferAbove = spaceAbove >= spaceBelow;

      const labelY = preferAbove
        ? dotY - GAP_FROM_LINE - boxH / 2
        : dotY + GAP_FROM_LINE + boxH / 2;

      return {
        ...item,
        dotX,
        dotY,
        labelX: dotX,
        labelY,
        boxW,
        boxH,
        displayLabel,
        displayAmount,
      };
    });

    // 3. Sort by X for collision resolution
    items.sort((a, b) => a.dotX - b.dotX);

    // 3b. Build a polyline of the chart curve (px coords) for line-avoidance.
    const linePoints: { x: number; y: number }[] = [];
    for (const dp of sampled) {
      const lx = xAxis.scale.map(dp.date, { position: 'middle' });
      const ly = yAxis.scale.map(dp.balance);
      if (lx != null && ly != null) linePoints.push({ x: lx, y: ly });
    }
    linePoints.sort((a, b) => a.x - b.x);

    /** Interpolate the chart-line Y at a given pixel-X. */
    function lineYAtX(px: number): number | null {
      if (linePoints.length < 2) return null;
      if (px <= linePoints[0]!.x) return linePoints[0]!.y;
      if (px >= linePoints[linePoints.length - 1]!.x)
        return linePoints[linePoints.length - 1]!.y;
      for (let k = 0; k < linePoints.length - 1; k++) {
        const a = linePoints[k]!;
        const b = linePoints[k + 1]!;
        if (px >= a.x && px <= b.x) {
          const t = b.x === a.x ? 0 : (px - a.x) / (b.x - a.x);
          return a.y + t * (b.y - a.y);
        }
      }
      return null;
    }

    /** Clamp a single item to the plot area. */
    function clamp(item: LayoutAnnotation) {
      item.labelX = Math.max(
        plotLeft + item.boxW / 2 + CLAMP_MARGIN,
        Math.min(plotRight - item.boxW / 2 - CLAMP_MARGIN, item.labelX),
      );
      item.labelY = Math.max(
        plotTop + item.boxH / 2 + CLAMP_MARGIN,
        Math.min(plotBottom - item.boxH / 2 - CLAMP_MARGIN, item.labelY),
      );
    }

    /** Push a single item's labelY so it sits entirely outside the
     *  min/max band of the chart line across the label's width.
     *  This handles jagged/oscillating lines that the old 3-sample
     *  approach missed completely. */
    function avoidLine(item: LayoutAnnotation) {
      // Sample the chart line densely across the label's horizontal extent
      const left = item.labelX - item.boxW / 2;
      const right = item.labelX + item.boxW / 2;
      let bandMin = Infinity;
      let bandMax = -Infinity;
      let anyHit = false;

      for (let s = 0; s <= LINE_BAND_SAMPLES; s++) {
        const sx = left + (right - left) * (s / LINE_BAND_SAMPLES);
        const ly = lineYAtX(sx);
        if (ly == null) continue;
        anyHit = true;
        bandMin = Math.min(bandMin, ly);
        bandMax = Math.max(bandMax, ly);
      }
      if (!anyHit) return;

      const halfH = item.boxH / 2 + LINE_PADDING;
      const labelTop = item.labelY - halfH;
      const labelBottom = item.labelY + halfH;

      // No overlap with the line band → nothing to do
      if (labelBottom <= bandMin || labelTop >= bandMax) return;

      // Label overlaps the line band. Push it entirely above or below.
      const targetAbove = bandMin - halfH; // label center to clear top
      const targetBelow = bandMax + halfH; // label center to clear bottom

      const distAbove = Math.abs(item.labelY - targetAbove);
      const distBelow = Math.abs(item.labelY - targetBelow);

      // Pick the closer escape direction
      item.labelY = distAbove <= distBelow ? targetAbove : targetBelow;
    }

    // ── Solver loop ──
    for (let iter = 0; iter < SOLVER_ITERATIONS; iter++) {
      // A) Line avoidance — labels must sit outside the chart line band
      for (const item of items) {
        avoidLine(item);
      }

      // B) Label-vs-label collision: push overlapping pairs apart.
      //    Use full separation (no weak damping) so labels actually split.
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const a = items[i]!;
          const b = items[j]!;

          const overlapX =
            (a.boxW / 2 + b.boxW / 2 + COLLISION_GAP) - Math.abs(a.labelX - b.labelX);
          const overlapY =
            (a.boxH / 2 + b.boxH / 2 + COLLISION_GAP) - Math.abs(a.labelY - b.labelY);

          if (overlapX <= 0 || overlapY <= 0) continue;

          // Push along the axis of smaller overlap (cheaper escape)
          if (overlapY <= overlapX) {
            // Separate vertically — each label moves half the overlap + 1px
            const push = overlapY / 2 + 1;
            if (a.labelY <= b.labelY) {
              a.labelY -= push;
              b.labelY += push;
            } else {
              a.labelY += push;
              b.labelY -= push;
            }
          } else {
            // Separate horizontally
            const push = overlapX / 2 + 1;
            if (a.labelX <= b.labelX) {
              a.labelX -= push;
              b.labelX += push;
            } else {
              a.labelX += push;
              b.labelX -= push;
            }
          }
        }
      }

      // C) Clamp to plot area
      for (const item of items) {
        clamp(item);
      }
    }

    // Final pass: ensure no label still overlaps the line after collision settled
    for (const item of items) {
      avoidLine(item);
      clamp(item);
    }

    // Last-resort collision cleanup: if clamping forced labels back into overlap,
    // do one more hard separation pass (vertical only, no clamp, so labels stack)
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i]!;
        const b = items[j]!;
        const overlapX =
          (a.boxW / 2 + b.boxW / 2 + COLLISION_GAP) - Math.abs(a.labelX - b.labelX);
        const overlapY =
          (a.boxH / 2 + b.boxH / 2 + COLLISION_GAP) - Math.abs(a.labelY - b.labelY);
        if (overlapX > 0 && overlapY > 0) {
          const push = overlapY / 2 + 1;
          if (a.labelY <= b.labelY) {
            a.labelY -= push;
            b.labelY += push;
          } else {
            a.labelY += push;
            b.labelY -= push;
          }
        }
      }
    }

    return items;
  }, [sampled, xAxis, yAxis, plotArea]);

  // ── SVG portal: find the parent <svg> and render our <g> as the
  //    very last child so it paints on top of all recharts layers
  //    (Area fill/stroke, ReferenceLine, axis ticks, ReferenceDots). ──
  const anchorRef = useRef<SVGGElement>(null);
  const [svgEl, setSvgEl] = useState<SVGSVGElement | null>(null);

  useEffect(() => {
    if (anchorRef.current) {
      const svg = anchorRef.current.closest('svg');
      setSvgEl(svg as SVGSVGElement | null);
    }
  }, []);

  // Track which annotation index is hovered
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const handleEnter = useCallback(
    (idx: number, a: LayoutAnnotation) => {
      setHoveredIdx(idx);
      onAnnotationHover?.({ date: a.date, dotX: a.dotX, dotY: a.dotY });
    },
    [onAnnotationHover],
  );
  const handleLeave = useCallback(() => {
    setHoveredIdx(null);
    onAnnotationHover?.(null);
  }, [onAnnotationHover]);

  // We always render a tiny invisible anchor <g> so the ref can find
  // the parent SVG, then portal the real content to the SVG's end.
  if (!visible || annotations.length === 0) {
    return <g ref={anchorRef} />;
  }

  const content = (
    <g className="event-annotations">
      {annotations.map((a, i) => {
        const isHovered = hoveredIdx === i;
        const color =
          a.type === 'income' ? CHART_COLORS.positive : CHART_COLORS.negative;
        const bgColor = a.type === 'income' ? '#f0fdf4' : '#fef2f2';
        const borderColor = a.type === 'income' ? '#bbf7d0' : '#fecaca';

        // Box top-left corner
        const bx = a.labelX - a.boxW / 2;
        const by = a.labelY - a.boxH / 2;

        // Connector: from nearest edge of the label box to dot
        const labelAbove = a.labelY < a.dotY;
        const connBoxY = labelAbove ? by + a.boxH : by;
        const connDotY = labelAbove
          ? a.dotY - DOT_R - 1
          : a.dotY + DOT_R + 1;

        // Hovered dot is bigger + has a glow ring
        const dotRadius = isHovered ? DOT_R + 2 : DOT_R;
        const dotStroke = isHovered ? 2.5 : DOT_STROKE;

        return (
          <g
            key={`${a.date}-${a.label}-${i}`}
            className="event-annotation"
            onMouseEnter={() => handleEnter(i, a)}
            onMouseLeave={handleLeave}
            onMouseMove={(e) => e.stopPropagation()}
            style={{ cursor: 'default' }}
          >
            {/* Dashed connector line: label box ↔ dot */}
            <line
              x1={a.labelX}
              y1={connBoxY}
              x2={a.dotX}
              y2={connDotY}
              stroke={isHovered ? color : CONNECTOR_COLOR}
              strokeWidth={isHovered ? 1.25 : CONNECTOR_WIDTH}
              strokeDasharray={CONNECTOR_DASH}
            />
            {/* Dot on the chart curve — rendered with highlight ring on hover */}
            {isHovered && (
              <circle
                cx={a.dotX}
                cy={a.dotY}
                r={dotRadius + 3}
                fill="none"
                stroke={color}
                strokeWidth={1}
                opacity={0.35}
              />
            )}
            <circle
              cx={a.dotX}
              cy={a.dotY}
              r={dotRadius}
              fill={color}
              stroke="white"
              strokeWidth={dotStroke}
            />
            {/* Label pill background */}
            <rect
              x={bx}
              y={by}
              width={a.boxW}
              height={a.boxH}
              rx={BORDER_RADIUS}
              ry={BORDER_RADIUS}
              fill={bgColor}
              fillOpacity={BG_OPACITY}
              stroke={isHovered ? color : borderColor}
              strokeWidth={isHovered ? 1.25 : 0.75}
            />
            {/* Label text + amount */}
            <text
              x={a.labelX}
              y={a.labelY}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={FONT_SIZE}
              fontWeight={600}
              fill={color}
              opacity={LABEL_OPACITY}
              style={{ pointerEvents: 'none' }}
            >
              {a.displayLabel}
              <tspan fontWeight={400} dx={2} fontSize={FONT_SIZE - 0.5}>
                {a.displayAmount}
              </tspan>
            </text>
          </g>
        );
      })}
    </g>
  );

  return (
    <>
      <g ref={anchorRef} />
      {svgEl ? createPortal(content, svgEl) : content}
    </>
  );
}
