import type { Disposer } from './types'

/**
 * Shared, ref-counted passive `document` listeners — the document-target twin of
 * `onWindow`. Some state lives on `document`, not `window` (`visibilitychange`,
 * the Page Lifecycle `freeze`/`resume` events), so sources subscribe here with a
 * single real listener per event type. The event is passed through to each handler.
 */
type Handler = (e: Event) => void

const groups = new Map<string, { handlers: Set<Handler>; dispatch: EventListener }>()

export function onDocument(type: string, handler: Handler): Disposer {
  let group = groups.get(type)
  if (!group) {
    const handlers = new Set<Handler>()
    const dispatch: EventListener = (e) => {
      for (const h of [...handlers]) h(e)
    }
    group = { handlers, dispatch }
    groups.set(type, group)
    document.addEventListener(type, dispatch, { passive: true })
  }
  group.handlers.add(handler)
  return () => {
    group!.handlers.delete(handler)
    if (group!.handlers.size === 0) {
      document.removeEventListener(type, group!.dispatch)
      groups.delete(type)
    }
  }
}
