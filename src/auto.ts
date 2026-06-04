import { propsFor, unbind, configure } from './index'

/**
 * Zero-config entry: attaches a default set of global sources and binds any
 * element carrying `data-props-for="key1 key2"`, keeping bindings in sync with the DOM.
 *
 *   import 'prop-for-that/auto'
 *   <input type="range" data-props-for="range">
 *   <div data-props-for="size visibility">…</div>
 *
 * Add `data-props-typed` to the root `<html>` to opt the whole document into
 * typed, interpolatable `@property` values — the HTML mirror of
 * `configure({ typed: true })`:
 *
 *   <html data-props-typed>
 */
const DEFAULT_GLOBALS = ['viewport', 'pointer']

/** The data-props-for keys auto bound per element, so we touch only the delta and
 *  never clobber bindings added through the imperative API. */
const tracked = new WeakMap<HTMLElement, string[]>()

function keysOf(el: HTMLElement): string[] {
  return (el.dataset.propsFor ?? '').split(/\s+/).filter(Boolean)
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
  if (node.hasAttribute('data-props-for')) sync(node)
  node.querySelectorAll<HTMLElement>('[data-props-for]').forEach(sync)
}

function clearTree(node: Node): void {
  if (!(node instanceof HTMLElement)) return
  clear(node)
  node.querySelectorAll<HTMLElement>('[data-props-for]').forEach(clear)
}

function init(): void {
  // Document-level opt-in: `<html data-props-typed>` mirrors `configure({ typed: true })`.
  // Read once, before any source attaches — `@property` registration is global per
  // name, so typing is all-or-nothing for the document (see the typed-properties docs),
  // and `config.typed` must be set before the first write. The attribute is a boolean;
  // any value is ignored (there is no per-key subset, just as there isn't in JS).
  if (document.documentElement.hasAttribute('data-props-typed')) {
    configure({ typed: true })
  }
  propsFor(DEFAULT_GLOBALS)
  document.querySelectorAll<HTMLElement>('[data-props-for]').forEach(sync)

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
    attributeFilter: ['data-props-for'],
  })
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true })
  } else {
    init()
  }
}
