/** Round to 4 decimal places. The shared rounding convention for all sources. */
export function round4(n: number): number {
  return Math.round(n * 1e4) / 1e4
}
