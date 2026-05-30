import { propsFor, unbind } from './index'

/**
 * Zero-config entry: attaches a default set of global sources and binds any
 * element carrying `data-prop="key1 key2"`, keeping bindings in sync with the DOM.
 *
 *   import 'prop-for-that/auto'
 *   <input type="range" data-prop="range">
 *   <div data-prop="size visibility">…</div>
 */
const DEFAULT_GLOBALS = ['viewport', 'pointer']

/** The data-prop keys auto bound per element, so we touch only the delta and
 *  never clobber bindings added through the imperative API. */
const tracked = new WeakMap<HTMLElement, string[]>()

function keysOf(el: HTMLElement): string[] {
  return (el.dataset.prop ?? '').split(/\s+/).filter(Boolean)
}

function sync(el: HTMLElement): void {
  const next = keysOf(el)
  const prev = tracked.get(el) ?? []
  const removed = prev.filter((k) => !next.includes(k))
  const added = next.filter((k) => !prev.includes(k))
  if (removed.length) unbind(el, removed)
  if (added.length) propsFor(el, added)
  if (next.length) tracked.set(el, next)
  else tracked.delete(el)
}

function clear(el: HTMLElement): void {
  const keys = tracked.get(el)
  if (keys) {
    unbind(el, keys)
    tracked.delete(el)
  }
}

function syncTree(node: Node): void {
  if (!(node instanceof HTMLElement)) return
  if (node.hasAttribute('data-prop')) sync(node)
  node.querySelectorAll<HTMLElement>('[data-prop]').forEach(sync)
}

function clearTree(node: Node): void {
  if (!(node instanceof HTMLElement)) return
  clear(node)
  node.querySelectorAll<HTMLElement>('[data-prop]').forEach(clear)
}

function init(): void {
  propsFor(DEFAULT_GLOBALS)
  document.querySelectorAll<HTMLElement>('[data-prop]').forEach(sync)

  new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'attributes' && m.target instanceof HTMLElement) {
        sync(m.target)
        continue
      }
      m.removedNodes.forEach(clearTree)
      m.addedNodes.forEach(syncTree)
    }
  }).observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['data-prop'],
  })
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true })
  } else {
    init()
  }
}
