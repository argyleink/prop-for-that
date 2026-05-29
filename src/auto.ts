import { bind, unbind, global } from './index'

/**
 * Zero-config entry: attaches a default set of global sources and binds any
 * element carrying `data-prop="key1 key2"`, keeping bindings in sync with the DOM.
 *
 *   import 'prop-for-that/auto'
 *   <input type="range" data-prop="range">
 *   <div data-prop="size visibility">…</div>
 */
const DEFAULT_GLOBALS = ['viewport', 'pointer']

function keysOf(el: HTMLElement): string[] {
  return (el.dataset.prop ?? '').split(/\s+/).filter(Boolean)
}

function scan(el: HTMLElement): void {
  const keys = keysOf(el)
  if (keys.length) bind(el, keys)
}

function scanTree(node: Node): void {
  if (!(node instanceof HTMLElement)) return
  if (node.hasAttribute('data-prop')) scan(node)
  node.querySelectorAll<HTMLElement>('[data-prop]').forEach(scan)
}

function unbindTree(node: Node): void {
  if (!(node instanceof HTMLElement)) return
  unbind(node)
  node.querySelectorAll<HTMLElement>('[data-prop]').forEach((el) => unbind(el))
}

function init(): void {
  global(DEFAULT_GLOBALS)
  document.querySelectorAll<HTMLElement>('[data-prop]').forEach(scan)

  new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'attributes' && m.target instanceof HTMLElement) {
        unbind(m.target)
        scan(m.target)
        continue
      }
      m.removedNodes.forEach(unbindTree)
      m.addedNodes.forEach(scanTree)
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
