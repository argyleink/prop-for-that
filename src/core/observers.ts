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

interface ObserverLike {
  observe(el: Element): void
  unobserve(el: Element): void
}

/**
 * Build a shared-observer subscribe function. The observer itself is created
 * lazily on first subscribe (SSR-safe, and a page that never binds pays
 * nothing); `create` receives the dispatcher to hand to its constructor.
 */
function observerHub<E extends { target: Element }>(
  create: (dispatch: (entries: E[]) => void) => ObserverLike,
) {
  let observer: ObserverLike | undefined
  const callbacks = new WeakMap<Element, Set<(entry: E) => void>>()
  const last = new WeakMap<Element, E>()

  return function observe(el: Element, cb: (entry: E) => void): Disposer {
    if (!observer) {
      observer = create((entries) => {
        for (const entry of entries) {
          last.set(entry.target, entry)
          const cbs = callbacks.get(entry.target)
          // iterated live: Set iteration tolerates unsubscribes mid-dispatch
          if (cbs) for (const fn of cbs) fn(entry)
        }
      })
    }
    let cbs = callbacks.get(el)
    if (!cbs) {
      callbacks.set(el, (cbs = new Set()))
      observer.observe(el)
    }
    cbs.add(cb)
    const entry = last.get(el)
    if (entry) cb(entry) // replay the current state to a late subscriber
    return () => {
      const set = callbacks.get(el)
      if (!set) return
      set.delete(cb)
      if (set.size === 0) {
        callbacks.delete(el)
        observer!.unobserve(el)
      }
    }
  }
}

export const observeResize = observerHub<ResizeObserverEntry>(
  (dispatch) => new ResizeObserver(dispatch),
)

// Thresholds hug both edges: notify when the target starts/stops overlapping the
// viewport at all (ratio crosses 0), and again as it gets *very* close to full
// containment. Some mobile engines can stall just shy of ratio 1 due to viewport
// chrome / subpixel rounding, so `visibility` gets a near-1 callback and decides
// "fully visible" from geometry instead of exact ratio alone. The binding-layer
// gate still only cares about the any-pixel edge (`isIntersecting`).
const ioThresholds = [0, 0.98, 0.99, 0.995, 0.999, 1]

export const observeIntersection = observerHub<IntersectionObserverEntry>(
  (dispatch) => new IntersectionObserver(dispatch, { threshold: ioThresholds }),
)
