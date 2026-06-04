import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

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
