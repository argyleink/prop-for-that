import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { propsFor, unbind, reset, register, unregister } from '../src/index'
import type { Source } from '../src/index'
import type { Scope } from '../src/core/types'

/**
 * Hoisting (`propsFor(el, keys, { to })`): the binding observes the bound element
 * but writes its properties on an ancestor, so the element's siblings — and the
 * element itself, via `@container style()` against an ancestor — can read them.
 *
 * Same rAF stubbing as api.test.ts: the shared writer flushes in the frame loop.
 */
let scheduled: FrameRequestCallback[]

const flushFrames = () => {
  const cbs = scheduled
  scheduled = []
  for (const cb of cbs) cb(0)
}

beforeEach(() => {
  scheduled = []
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    scheduled.push(cb)
    return scheduled.length
  })
  vi.stubGlobal('cancelAnimationFrame', () => {})
})

afterEach(() => {
  reset()
  let guard = 0
  while (scheduled.length && guard++ < 100) flushFrames()
  vi.unstubAllGlobals()
})

/** A DOM-free source that records the ctx target it was handed and writes one prop. */
function makeFakeSource(key = 'fake', scope: Scope = 'element') {
  const seen: HTMLElement[] = []
  const spy = vi.fn()
  const source: Source = {
    key,
    scope,
    start(ctx) {
      seen.push(ctx.target)
      ctx.write('x', 1)
      return spy
    },
  }
  return { source, spy, seen }
}

/** <figure><img><figcaption></figure>, appended to the document. */
function figure() {
  const fig = document.createElement('figure')
  const img = document.createElement('img')
  const cap = document.createElement('figcaption')
  fig.append(img, cap)
  document.body.append(fig)
  return { fig, img, cap }
}

describe('propsFor: to (element)', () => {
  it('writes the props on the ancestor, not the bound element', () => {
    const { fig, img } = figure()
    const { source, seen } = makeFakeSource()
    register(source)

    const dispose = propsFor(img, ['fake'], { to: fig })
    flushFrames()
    expect(fig.style.getPropertyValue('--live-x')).toBe('1')
    expect(img.style.getPropertyValue('--live-x')).toBe('') // hoisted, not written here
    expect(seen).toEqual([img]) // ctx.target is still the observed element

    dispose()
    expect(fig.style.getPropertyValue('--live-x')).toBe('') // cleaned off the ancestor

    unregister('fake')
    fig.remove()
  })

  it('unbind removes the hoisted props from the ancestor', () => {
    const { fig, img } = figure()
    const { source, spy } = makeFakeSource()
    register(source)

    propsFor(img, ['fake'], { to: fig })
    flushFrames()
    expect(fig.style.getPropertyValue('--live-x')).toBe('1')

    unbind(img, ['fake'])
    expect(spy).toHaveBeenCalledTimes(1)
    expect(fig.style.getPropertyValue('--live-x')).toBe('')

    unregister('fake')
    fig.remove()
  })
})

describe('propsFor: to (selector)', () => {
  it('resolves a string through closest()', () => {
    const { fig, img } = figure()
    const { source } = makeFakeSource()
    register(source)

    const dispose = propsFor(img, ['fake'], { to: 'figure' })
    flushFrames()
    expect(fig.style.getPropertyValue('--live-x')).toBe('1')
    expect(img.style.getPropertyValue('--live-x')).toBe('')

    dispose()
    unregister('fake')
    fig.remove()
  })

  it('warns and falls back to the element itself when nothing matches', () => {
    const { fig, img } = figure()
    const { source } = makeFakeSource()
    register(source)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const dispose = propsFor(img, ['fake'], { to: 'main' }) // no such ancestor
    flushFrames()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('no ancestor matches "main"'))
    expect(img.style.getPropertyValue('--live-x')).toBe('1') // degraded to self
    expect(fig.style.getPropertyValue('--live-x')).toBe('')

    dispose()
    expect(img.style.getPropertyValue('--live-x')).toBe('')

    warn.mockRestore()
    unregister('fake')
    fig.remove()
  })
})

describe('propsFor: to + a global source', () => {
  it('warns and ignores the hoist (globals keep their own target)', () => {
    const { fig, img } = figure()
    const { source } = makeFakeSource('global-fake', 'global')
    register(source)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const dispose = propsFor(img, ['global-fake'], { to: fig })
    flushFrames()
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('"to" ignored for global source "global-fake"'),
    )
    expect(fig.style.getPropertyValue('--live-x')).toBe('')
    expect(img.style.getPropertyValue('--live-x')).toBe('1')

    dispose()
    warn.mockRestore()
    unregister('global-fake')
    fig.remove()
  })
})

describe('propsFor: to and the (element, key) dedupe', () => {
  it('ignores a second bind of the same key, even with a different target', () => {
    const { fig, img } = figure()
    const other = document.createElement('div')
    document.body.append(other)
    const { source, spy } = makeFakeSource()
    register(source)

    const a = propsFor(img, ['fake'], { to: fig })
    const b = propsFor(img, ['fake'], { to: other }) // same (element, key): ignored
    flushFrames()
    expect(fig.style.getPropertyValue('--live-x')).toBe('1')
    expect(other.style.getPropertyValue('--live-x')).toBe('')

    b() // started nothing, so it must not tear the first binding down
    expect(spy).not.toHaveBeenCalled()
    expect(fig.style.getPropertyValue('--live-x')).toBe('1')

    a()
    expect(spy).toHaveBeenCalledTimes(1)

    unregister('fake')
    fig.remove()
    other.remove()
  })
})

describe('propsFor: duplicate hoists onto one target', () => {
  it('warns when two elements hoist the same key to the same ancestor', () => {
    const { fig, img } = figure()
    const img2 = document.createElement('img')
    fig.append(img2)
    const { source } = makeFakeSource()
    register(source)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const a = propsFor(img, ['fake'], { to: 'figure' })
    expect(warn).not.toHaveBeenCalled()
    const b = propsFor(img2, ['fake'], { to: 'figure' }) // same key, same write target
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('already hoisted'), fig)

    a()
    b()
    warn.mockRestore()
    unregister('fake')
    fig.remove()
  })

  it('does not warn for different keys on one target, or after the first is disposed', () => {
    const { fig, img } = figure()
    const img2 = document.createElement('img')
    fig.append(img2)
    const one = makeFakeSource('fake-a')
    const two = makeFakeSource('fake-b')
    register(one.source)
    register(two.source)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const a = propsFor(img, ['fake-a'], { to: 'figure' })
    const b = propsFor(img2, ['fake-b'], { to: 'figure' }) // different key: no clash
    expect(warn).not.toHaveBeenCalled()

    a() // releases 'fake-a' from the figure
    const c = propsFor(img2, ['fake-a'], { to: 'figure' })
    expect(warn).not.toHaveBeenCalled()

    b()
    c()
    warn.mockRestore()
    unregister('fake-a')
    unregister('fake-b')
    fig.remove()
  })
})

describe('propsFor: as (namespace)', () => {
  it('inserts the name after the cadence prefix', () => {
    const { fig, img } = figure()
    const { source, seen } = makeFakeSource()
    register(source)

    const dispose = propsFor(img, ['fake'], { to: fig, as: 'caption' })
    flushFrames()
    expect(fig.style.getPropertyValue('--live-caption-x')).toBe('1')
    expect(fig.style.getPropertyValue('--live-x')).toBe('')
    expect(seen).toEqual([img]) // observation is unaffected

    dispose()
    expect(fig.style.getPropertyValue('--live-caption-x')).toBe('')

    unregister('fake')
    fig.remove()
  })

  it('works without `to` — namespaces props written on the element itself', () => {
    const { fig, img } = figure()
    const { source } = makeFakeSource()
    register(source)

    const dispose = propsFor(img, ['fake'], { as: 'img' })
    flushFrames()
    expect(img.style.getPropertyValue('--live-img-x')).toBe('1')

    dispose()
    expect(img.style.getPropertyValue('--live-img-x')).toBe('')

    unregister('fake')
    fig.remove()
  })

  it('lets two elements hoist one key onto one ancestor without collision', () => {
    const { fig, img, cap } = figure()
    const { source } = makeFakeSource()
    register(source)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const a = propsFor(img, ['fake'], { to: 'figure', as: 'image' })
    const b = propsFor(cap, ['fake'], { to: 'figure', as: 'caption' })
    flushFrames()
    expect(warn).not.toHaveBeenCalled() // different property names: no collision
    expect(fig.style.getPropertyValue('--live-image-x')).toBe('1')
    expect(fig.style.getPropertyValue('--live-caption-x')).toBe('1')

    a() // disposing one must not strip the other's props
    expect(fig.style.getPropertyValue('--live-image-x')).toBe('')
    expect(fig.style.getPropertyValue('--live-caption-x')).toBe('1')

    b()
    warn.mockRestore()
    unregister('fake')
    fig.remove()
  })

  it('still warns when two bindings share a namespace and a key', () => {
    const { fig, img, cap } = figure()
    const { source } = makeFakeSource()
    register(source)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const a = propsFor(img, ['fake'], { to: 'figure', as: 'same' })
    const b = propsFor(cap, ['fake'], { to: 'figure', as: 'same' })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('already hoisted'), fig)

    a()
    b()
    // the claim is released on dispose, so a later rebind is clean
    warn.mockClear()
    const c = propsFor(img, ['fake'], { to: 'figure', as: 'same' })
    expect(warn).not.toHaveBeenCalled()

    c()
    warn.mockRestore()
    unregister('fake')
    fig.remove()
  })

  it('warns and drops an invalid namespace, keeping the binding', () => {
    const { fig, img } = figure()
    const { source } = makeFakeSource()
    register(source)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const dispose = propsFor(img, ['fake'], { as: 'my caption' })
    flushFrames()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('invalid namespace "my caption"'))
    expect(img.style.getPropertyValue('--live-x')).toBe('1') // unnamespaced fallback

    dispose()
    warn.mockRestore()
    unregister('fake')
    fig.remove()
  })

  it('namespaces const-cadence props too', () => {
    const { fig, img } = figure()
    const source: Source = {
      key: 'fake-const',
      scope: 'element',
      start(ctx) {
        ctx.write('n', 3, 'const')
        return () => {}
      },
    }
    register(source)

    const dispose = propsFor(img, ['fake-const'], { as: 'cap' })
    flushFrames()
    expect(img.style.getPropertyValue('--const-cap-n')).toBe('3')

    dispose()
    unregister('fake-const')
    fig.remove()
  })
})
