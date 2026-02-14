import { useState, useRef, useEffect } from 'react';
import { CHART_FADE_OUT_DELAY } from '@/lib/constants';

/**
 * Manages chart fade-out / re-mount transitions when the data length changes
 * (e.g. when the user adjusts the projection months slider).
 *
 * @param dataLength  - Current data array length to track for changes
 * @param onFadeStart - Optional callback invoked synchronously when the fade begins
 *
 * @returns
 *  - `chartKey`      — incremented on each re-mount; pass to ResponsiveContainer's `key`
 *  - `fading`        — true during the brief opacity transition
 *  - `prevLengthRef` — tracks the previous data length (useful for distinguishing
 *     length-change vs value-change updates in the consumer)
 */
export function useChartFadeTransition(
  dataLength: number,
  onFadeStart?: () => void,
) {
  const [chartKey, setChartKey] = useState(0);
  const [fading, setFading] = useState(false);
  const prevLengthRef = useRef(dataLength);

  // Store callback in a ref so we don't need it in the deps array
  const callbackRef = useRef(onFadeStart);
  callbackRef.current = onFadeStart;

  useEffect(() => {
    if (dataLength !== prevLengthRef.current) {
      prevLengthRef.current = dataLength;
      setFading(true);
      callbackRef.current?.();
      const timer = setTimeout(() => {
        setChartKey((k) => k + 1);
        setFading(false);
      }, CHART_FADE_OUT_DELAY);
      return () => clearTimeout(timer);
    }
  }, [dataLength]);

  return { chartKey, fading, prevLengthRef };
}
