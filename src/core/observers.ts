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
    // Default threshold (0): fires on enter/exit — all the binary `visibility`
    // source needs. (Continuous ratios are native `view()` territory.)
    io = new IntersectionObserver((entries) => {
      for (const entry of entries) ioCallbacks.get(entry.target)?.(entry)
    })
  }
  ioCallbacks.set(el, cb)
  io.observe(el)
  return () => {
    io!.unobserve(el)
    ioCallbacks.delete(el)
  }
}
