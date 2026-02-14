import { useState, useRef, useEffect } from 'react';

const GLOW_DURATION_MS = 1000;

/**
 * Detects Y-axis domain changes and returns a flag to trigger a glow animation
 * on the axis tick labels, alerting the user that the scale has changed.
 *
 * @param domainFingerprint - Stringified representation of the current Y-axis domain.
 * @param disabled - When true, silently tracks domain changes without triggering glow
 *                   (useful during chart fade/re-mount transitions).
 * @returns Whether the glow animation should currently be active.
 */
export function useYAxisGlow(domainFingerprint: string, disabled = false): boolean {
  const [glowing, setGlowing] = useState(false);
  const prevRef = useRef(domainFingerprint);
  const isFirstRender = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevRef.current = domainFingerprint;
      return;
    }

    if (domainFingerprint !== prevRef.current) {
      prevRef.current = domainFingerprint;

      if (disabled) {
        // Accept the new domain silently during chart transitions
        setGlowing(false);
        if (timerRef.current) clearTimeout(timerRef.current);
        return;
      }

      // Clear any running timer from a previous glow
      if (timerRef.current) clearTimeout(timerRef.current);

      // Restart animation: toggle class off → on across two frames
      // so the browser restarts the CSS animation even if already glowing.
      setGlowing(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setGlowing(true);
          timerRef.current = setTimeout(() => setGlowing(false), GLOW_DURATION_MS);
        });
      });
    }
  }, [domainFingerprint, disabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return glowing;
}
