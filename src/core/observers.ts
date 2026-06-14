import type { Disposer } from './types'

/**
 * Page-wide shared observers. N bound elements share one ResizeObserver and one
 * IntersectionObserver, dispatched per element via WeakMap.
 *
 * Each element may have *several* subscribers to the same observer (e.g. the
 * `visibility` source and the binding layer's visibility gate both watch one
 * element), so callbacks are held in a Set per element. The most recent entry is
 * cached and replayed to a late subscriber, since the browser only delivers an
 * initial entry to the *first* `observe()` of an element.
 */

type RoCb = (entry: ResizeObserverEntry) => void
type IoCb = (entry: IntersectionObserverEntry) => void

let ro: ResizeObserver | undefined
const roCallbacks = new WeakMap<Element, Set<RoCb>>()
const roLast = new WeakMap<Element, ResizeObserverEntry>()

export function observeResize(el: Element, cb: RoCb): Disposer {
  if (!ro) {
    ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        roLast.set(entry.target, entry)
        const cbs = roCallbacks.get(entry.target)
        if (cbs) for (const fn of [...cbs]) fn(entry)
      }
    })
  }
  let cbs = roCallbacks.get(el)
  if (!cbs) {
    roCallbacks.set(el, (cbs = new Set()))
    ro.observe(el)
  }
  cbs.add(cb)
  const last = roLast.get(el)
  if (last) cb(last) // replay current size to a late subscriber
  return () => {
    const set = roCallbacks.get(el)
    if (!set) return
    set.delete(cb)
    if (set.size === 0) {
      roCallbacks.delete(el)
      ro!.unobserve(el)
    }
  }
}

let io: IntersectionObserver | undefined
const ioCallbacks = new WeakMap<Element, Set<IoCb>>()
const ioLast = new WeakMap<Element, IntersectionObserverEntry>()
const ioThresholds = [0, 0.98, 0.99, 0.995, 0.999, 1]

export function observeIntersection(el: Element, cb: IoCb): Disposer {
  if (!io) {
    // Thresholds hug both edges: notify when the target starts/stops overlapping
    // the viewport at all (ratio crosses 0), and again as it gets *very* close to
    // full containment. Some mobile engines can stall just shy of ratio 1 due to
    // viewport chrome / subpixel rounding, so `visibility` gets a near-1 callback
    // and decides "fully visible" from geometry instead of exact ratio alone. The
    // binding-layer gate still only cares about the any-pixel edge (`isIntersecting`).
    io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ioLast.set(entry.target, entry)
          const cbs = ioCallbacks.get(entry.target)
          if (cbs) for (const fn of [...cbs]) fn(entry)
        }
      },
      { threshold: ioThresholds },
    )
  }
  let cbs = ioCallbacks.get(el)
  if (!cbs) {
    ioCallbacks.set(el, (cbs = new Set()))
    io.observe(el)
  }
  cbs.add(cb)
  const last = ioLast.get(el)
  if (last) cb(last) // replay current intersection to a late subscriber
  return () => {
    const set = ioCallbacks.get(el)
    if (!set) return
    set.delete(cb)
    if (set.size === 0) {
      ioCallbacks.delete(el)
      io!.unobserve(el)
    }
  }
}
