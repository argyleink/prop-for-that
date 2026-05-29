import type { Disposer } from './types'

/**
 * Shared, ref-counted passive `window` listeners. Many sources can subscribe to
 * `scroll`/`resize` with a single real listener per event type.
 */
const groups = new Map<string, { handlers: Set<() => void>; dispatch: EventListener }>()

export function onWindow(type: string, handler: () => void): Disposer {
  let group = groups.get(type)
  if (!group) {
    const handlers = new Set<() => void>()
    const dispatch: EventListener = () => {
      for (const h of handlers) h()
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
