import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { Source } from '../src/core/types'

/**
 * `data-props-typed` on the root `<html>` is the HTML mirror of
 * `configure({ typed: true })`. auto runs `init()` on import (jsdom's
 * readyState is already 'complete'), so a fresh module graph per test lets us
 * read the `config` instance auto actually mutated.
 */
describe('auto: data-props-typed', () => {
  beforeEach(() => {
    vi.resetModules()
    document.documentElement.removeAttribute('data-props-typed')
  })
  afterEach(() => {
    document.documentElement.removeAttribute('data-props-typed')
  })

  it('leaves typed mode off by default', async () => {
    await import('../src/auto')
    const { config } = await import('../src/core/config')
    expect(config.typed).toBe(false)
  })

  it('enables typed mode when <html data-props-typed> is present', async () => {
    document.documentElement.setAttribute('data-props-typed', '')
    await import('../src/auto')
    const { config } = await import('../src/core/config')
    expect(config.typed).toBe(true)
  })

  it('treats the attribute as a boolean — any value still enables typed', async () => {
    // typing is global per @property name, so there's no per-key subset to honor
    document.documentElement.setAttribute('data-props-typed', 'pointer viewport')
    await import('../src/auto')
    const { config } = await import('../src/core/config')
    expect(config.typed).toBe(true)
  })
})

/**
 * auto is fully declarative: nothing is attached unless the DOM asks for it, and
 * plugin sources load on demand the first time a `data-props-for` key needs one.
 */
describe('auto: declarative + just-in-time plugins', () => {
  beforeEach(() => vi.resetModules())

  it('attaches no sources by default (no viewport/pointer freebie)', async () => {
    const scheduled: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => scheduled.push(cb))
    vi.stubGlobal('cancelAnimationFrame', () => {})

    await import('../src/auto') // empty document: no [data-props-for] anywhere
    for (let i = 0; i < 5 && scheduled.length; i++) scheduled.splice(0).forEach((cb) => cb(0))

    // global writes fall back to the root's inline style in jsdom (no adopted
    // sheets), so the absence of these proves nothing was attached by default.
    expect(document.documentElement.style.getPropertyValue('--live-vw')).toBe('')
    expect(document.documentElement.style.getPropertyValue('--live-pointer-x')).toBe('')

    vi.unstubAllGlobals()
  })

  it('lazy-loads and registers a plugin the first time a key needs it', async () => {
    const el = document.createElement('div')
    el.setAttribute('data-props-for', 'online') // a plugin, not a core source
    document.body.append(el)

    await import('../src/auto')
    const { isRegistered, reset } = await import('../src/index')

    // online isn't a core source; auto loads its chunk on demand and registers it
    await vi.waitFor(() => expect(isRegistered('online')).toBe(true))

    reset()
    el.remove()
  })

  it('retries a plugin load that failed the first time (not cached as failed)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { loaders } = await import('../src/plugins/loaders')
    let attempts = 0
    loaders['retry-probe'] = async (): Promise<Source> => {
      attempts++
      if (attempts === 1) throw new Error('boom')
      return { key: 'retry-probe', scope: 'global', start: (ctx) => (ctx.write('rp', 1), () => {}) }
    }

    const a = document.createElement('div')
    a.setAttribute('data-props-for', 'retry-probe')
    document.body.append(a)

    await import('../src/auto')
    const { isRegistered, reset } = await import('../src/index')

    await vi.waitFor(() => expect(attempts).toBe(1))
    expect(isRegistered('retry-probe')).toBe(false) // first attempt failed

    // a later element requesting the same key re-attempts (the failure wasn't cached)
    const b = document.createElement('div')
    b.setAttribute('data-props-for', 'retry-probe')
    document.body.append(b)

    await vi.waitFor(() => expect(isRegistered('retry-probe')).toBe(true))
    expect(attempts).toBe(2)

    reset()
    a.remove()
    b.remove()
    warn.mockRestore()
    error.mockRestore()
  })
})
