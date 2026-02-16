/**
 * Type declarations for recharts internal hooks.
 *
 * `useXAxis` and `useYAxis` are defined in recharts but not re-exported
 * from the main package entry point. We import them from the ES module
 * build path (`recharts/es6/hooks`) and declare types here.
 */
declare module 'recharts/es6/hooks' {
  interface RechartsScale {
    /** Convert a data value to a pixel coordinate. */
    map(
      input: unknown,
      options?: { position?: 'start' | 'middle' | 'end' },
    ): number | undefined;
    domain(): ReadonlyArray<unknown>;
    range(): ReadonlyArray<number>;
    rangeMin(): number;
    rangeMax(): number;
    bandwidth?(): number;
  }

  interface BaseAxisWithScale {
    scale: RechartsScale;
  }

  export function useXAxis(axisId: string | number): BaseAxisWithScale | undefined;
  export function useYAxis(axisId: string | number): BaseAxisWithScale | undefined;
}
