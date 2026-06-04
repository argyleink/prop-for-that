import type { Source } from '../core/types'

type PressureState = 'nominal' | 'fair' | 'serious' | 'critical'
interface PressureRecord {
  state: PressureState
}
interface PressureObserverInstance {
  observe(source: string, options: { sampleInterval: number }): Promise<void>
  disconnect(): void
}
type PressureObserverCtor = new (
  callback: (records: PressureRecord[]) => void,
) => PressureObserverInstance

/** Pressure state → ordered tier, so CSS can compare/compose it. */
const TIER: Record<PressureState, number> = {
  nominal: 0,
  fair: 1,
  serious: 2,
  critical: 3,
}

/**
 * `--live-cpu-pressure` — the CPU's Compute Pressure state as an ordered tier:
 * nominal=0, fair=1, serious=2, critical=3. Use it to back off expensive CSS
 * work (animations, blur, shadows) as the CPU gets busy.
 *
 * Chromium-only, secure-context, and gated by the `compute-pressure` Permissions
 * Policy. Feature-detects and no-ops (writing nothing) where unavailable, so CSS
 * can fall back via `var(--live-cpu-pressure, 0)`.
 */
export const cpuPressure: Source = {
  key: 'cpu-pressure',
  scope: 'global',
  start(ctx) {
    const PressureObserver = (
      globalThis as { PressureObserver?: PressureObserverCtor }
    ).PressureObserver
    if (!PressureObserver) return () => {}

    ctx.write('cpu-pressure', 0) // seed nominal so var() resolves before first sample
    let observer: PressureObserverInstance | undefined
    try {
      observer = new PressureObserver((records) => {
        const last = records[records.length - 1]
        if (last) ctx.write('cpu-pressure', TIER[last.state] ?? 0)
      })
      // observe() rejects when blocked by the permissions policy or unsupported;
      // degrade to the seeded 0.
      observer.observe('cpu', { sampleInterval: 1000 }).catch(() => {})
    } catch {
      observer = undefined
    }

    return () => observer?.disconnect()
  },
}
