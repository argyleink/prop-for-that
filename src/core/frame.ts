import { config } from './config'
import type { Disposer } from './types'

/**
 * The single shared frame loop. One `requestAnimationFrame` drives everything:
 * per-frame samplers (`onFrame`) run first, then the Writer's flush (`setFlush`)
 * applies the batched custom-property writes. `requestTick` wakes the loop for a
 * one-shot flush when only the Writer needs a frame.
 *
 * The loop idles when there are no continuous samplers and nothing pending: a
 * `requestTick` schedules exactly one frame, runs the flush, and stops.
 */
type FrameFn = (now: number) => void

const frameFns = new Set<FrameFn>()
let flushFn: (() => void) | null = null
let id = 0
let running = false
let paused = false
let lastFrame = 0

const hasRaf = (): boolean => typeof requestAnimationFrame === 'function'

function run(now: number): void {
  id = 0
  if (paused) return
  // Optional cadence cap: when `config.liveHz` is set, skip frames that land
  // too soon after the last one and try again next tick. Disabled without rAF
  // (SSR/test), where `now` is meaningless and writes must flush synchronously.
  const hz = config.liveHz
  if (hasRaf() && hz && hz > 0 && now - lastFrame < 1000 / hz) {
    id = requestAnimationFrame(run)
    return
  }
  lastFrame = now
  running = true
  if (frameFns.size) for (const fn of [...frameFns]) fn(now)
  flushFn?.()
  running = false
  // keep looping only while continuous samplers are registered
  if (frameFns.size && hasRaf()) schedule()
}

function schedule(): void {
  if (id || running || paused) return
  if (hasRaf()) id = requestAnimationFrame(run)
  else run(0) // no rAF (SSR/test): run synchronously, once
}

/** Ensure a frame runs soon. Used by the Writer to flush queued writes. */
export function requestTick(): void {
  schedule()
}

/** Register the single post-frame flush callback (the Writer). */
export function setFlush(fn: () => void): void {
  flushFn = fn
}

/** Add a continuous per-frame sampler; keeps the loop alive until disposed. */
export function onFrame(fn: FrameFn): Disposer {
  frameFns.add(fn)
  schedule()
  return () => {
    frameFns.delete(fn)
  }
}

/** Freeze the loop: no sampling, no flushing, until `resume()`. Idempotent. */
export function pause(): void {
  if (paused) return
  paused = true
  if (id && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(id)
  id = 0
}

/** Unfreeze the loop and pick up sampling / queued writes again. Idempotent. */
export function resume(): void {
  if (!paused) return
  paused = false
  schedule()
}
