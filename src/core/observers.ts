import type { Disposer } from './types'

/**
 * Page-wide shared observers. N bound elements share one ResizeObserver and one
 * IntersectionObserver, dispatched per element via WeakMap.
 */

let ro: ResizeObserver | undefined
const roCallbacks = new WeakMap<Element, (entry: ResizeObserverEntry) => void>()

export function observeResize(
  el: Element,
  cb: (entry: ResizeObserverEntry) => void,
): Disposer {
  if (!ro) {
    ro = new ResizeObserver((entries) => {
      for (const entry of entries) roCallbacks.get(entry.target)?.(entry)
    })
  }
  roCallbacks.set(el, cb)
  ro.observe(el)
  return () => {
    ro!.unobserve(el)
    roCallbacks.delete(el)
  }
}

let io: IntersectionObserver | undefined
const ioCallbacks = new WeakMap<Element, (entry: IntersectionObserverEntry) => void>()

export function observeIntersection(
  el: Element,
  cb: (entry: IntersectionObserverEntry) => void,
): Disposer {
  if (!io) {
    // Thresholds [0, 1]: notify when the target starts/stops overlapping the
    // viewport at all (ratio crosses 0) and when it becomes/stops being fully
    // contained (ratio crosses 1). `visibility` uses the full-containment edge;
    // continuous ratios in between are native `view()` territory.
    io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) ioCallbacks.get(entry.target)?.(entry)
      },
      { threshold: [0, 1] },
    )
  }
  ioCallbacks.set(el, cb)
  io.observe(el)
  return () => {
    io!.unobserve(el)
    ioCallbacks.delete(el)
  }
}
