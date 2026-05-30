import type { Disposer } from './types'

/**
 * Shared, ref-counted passive `window` listeners. Many sources can subscribe to
 * the same event (`scroll`, `pointermove`, `resize`, …) with a single real
 * listener per event type. The event is passed through to each handler.
 */
type Handler = (e: Event) => void

const groups = new Map<string, { handlers: Set<Handler>; dispatch: EventListener }>()

export function onWindow(type: string, handler: Handler): Disposer {
  let group = groups.get(type)
  if (!group) {
    const handlers = new Set<Handler>()
    const dispatch: EventListener = (e) => {
      for (const h of [...handlers]) h(e)
    }
    group = { handlers, dispatch }
    groups.set(type, group)
    window.addEventListener(type, dispatch, { passive: true })
  }
  group.handlers.add(handler)
  return () => {
    group!.handlers.delete(handler)
    if (group!.handlers.size === 0) {
      window.removeEventListener(type, group!.dispatch)
      groups.delete(type)
    }
  }
}
