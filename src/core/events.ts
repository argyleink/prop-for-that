import type { Disposer } from './types'

/**
 * Shared, ref-counted passive listeners. Many sources can subscribe to the same
 * event (`scroll`, `pointermove`, `resize`, …) with a single real listener per
 * event type per target. The event is passed through to each handler.
 *
 * One hub per target — `window`, `document`, and the visual viewport each get
 * their own `groups` map, so a `scroll` on one never dispatches the other's
 * handlers. State lives on all three: most events are on `window`, some only on
 * `document` (`visibilitychange`, the Page Lifecycle `freeze`/`resume` events),
 * and the visual viewport has its own `resize`/`scroll` that `visual-viewport`
 * and `keyboard` both read.
 */
type Handler = (e: Event) => void

/** The target is resolved lazily, on first subscribe, so importing is SSR-safe. */
function eventHub(getTarget: () => EventTarget) {
  const groups = new Map<string, { handlers: Set<Handler>; dispatch: EventListener }>()

  return function on(type: string, handler: Handler): Disposer {
    const target = getTarget()
    let group = groups.get(type)
    if (!group) {
      const handlers = new Set<Handler>()
      // Iterated live, no snapshot: Set iteration tolerates handlers disposing
      // themselves (or others) mid-dispatch, and copying here would allocate on
      // every event — including each pointermove.
      const dispatch: EventListener = (e) => {
        for (const h of handlers) h(e)
      }
      group = { handlers, dispatch }
      groups.set(type, group)
      target.addEventListener(type, dispatch, { passive: true })
    }
    group.handlers.add(handler)
    return () => {
      group!.handlers.delete(handler)
      if (group!.handlers.size === 0) {
        target.removeEventListener(type, group!.dispatch)
        groups.delete(type)
      }
    }
  }
}

export const onWindow = eventHub(() => window)
export const onDocument = eventHub(() => document)
/** Only subscribe after null-checking `window.visualViewport`. */
export const onVisualViewport = eventHub(() => window.visualViewport!)

/**
 * Attach one passive handler to several event types on a single element, and
 * tear them all down together. For per-element listeners (a `<video>`, an
 * `<input>`) where there's nothing page-wide to ref-count — use the hubs above
 * for shared targets.
 */
export function onAll(
  target: EventTarget,
  types: string[],
  handler: Handler,
): Disposer {
  for (const type of types) target.addEventListener(type, handler, { passive: true })
  return () => {
    for (const type of types) target.removeEventListener(type, handler)
  }
}
