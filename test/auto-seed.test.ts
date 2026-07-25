import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * `data-props-seed` on the root `<html>` is the HTML mirror of
 * `configure({ randomSeed: n })` — the zero-config route to a `random` layout
 * that repeats identically on every load. auto runs `init()` on import (jsdom's
 * readyState is already 'complete'), so a fresh module graph per test lets us
 * read the `config` instance auto actually mutated.
 *
 * The end-to-end test comes **first** on purpose: every auto instance imported
 * later keeps observing this document, and a second (unseeded) instance binding
 * the same elements would race the seeded one for the same custom property.
 */
describe('auto: data-props-seed', () => {
  beforeEach(() => {
    vi.resetModules()
    document.documentElement.removeAttribute('data-props-seed')
  })
  afterEach(() => {
    document.documentElement.removeAttribute('data-props-seed')
    vi.unstubAllGlobals()
  })

  it('seeds a lazily-loaded random binding: siblings differ, a rebind repeats', async () => {
    const scheduled: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => scheduled.push(cb))
    vi.stubGlobal('cancelAnimationFrame', () => {})
    const flush = () => scheduled.splice(0).forEach((cb) => cb(0))

    document.documentElement.setAttribute('data-props-seed', '7')
    const wrap = document.createElement('div')
    wrap.innerHTML = '<p data-props-for="random"></p><p data-props-for="random"></p>'
    document.body.append(wrap)
    const [a, b] = [...wrap.children] as [HTMLElement, HTMLElement]

    await import('../src/auto') // loads the random chunk on demand, then binds
    const { reset } = await import('../src/index')
    const roll = (el: HTMLElement) => el.style.getPropertyValue('--const-random')
    await vi.waitFor(() => {
      flush()
      expect(roll(a)).not.toBe('')
      expect(roll(b)).not.toBe('')
    })

    const first = roll(a)
    expect(Number(first)).toBeGreaterThanOrEqual(0)
    expect(Number(first)).toBeLessThan(1)
    expect(roll(b)).not.toBe(first) // seeded, but derived per DOM position

    // dropping the key unbinds and removes the property…
    a.removeAttribute('data-props-for')
    await vi.waitFor(() => expect(roll(a)).toBe(''))
    // …and re-adding it hands the element the very same roll back
    a.setAttribute('data-props-for', 'random')
    await vi.waitFor(() => {
      flush()
      expect(roll(a)).toBe(first)
    })

    reset()
    wrap.remove()
  })

  it('leaves the seed unset by default', async () => {
    await import('../src/auto')
    const { config } = await import('../src/core/config')
    expect(config.randomSeed).toBeUndefined()
  })

  it('reads the seed from <html data-props-seed="42">', async () => {
    document.documentElement.setAttribute('data-props-seed', '42')
    await import('../src/auto')
    const { config } = await import('../src/core/config')
    expect(config.randomSeed).toBe(42)
  })

  it('treats 0 as a seed, not as absent', async () => {
    document.documentElement.setAttribute('data-props-seed', '0')
    await import('../src/auto')
    const { config } = await import('../src/core/config')
    expect(config.randomSeed).toBe(0)
  })

  it('ignores a non-numeric seed, with a warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    document.documentElement.setAttribute('data-props-seed', 'lucky')

    await import('../src/auto')
    const { config } = await import('../src/core/config')

    expect(config.randomSeed).toBeUndefined() // stays random rather than seeding NaN
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('data-props-seed'))
    warn.mockRestore()
  })
})
