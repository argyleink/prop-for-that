import { describe, it, expect } from 'vitest'

/**
 * `head` runs its probe at import time and writes the constants inline on
 * `config.root` (documentElement). The *measurement* — does an `overflow:scroll`
 * box reserve layout width? — is platform behaviour jsdom can't reproduce (it
 * reports 0 for both offset/clientWidth), so that lives in the engines, not here.
 * What we can pin in jsdom is the **derivation logic**: `--const-scrollbar-overlay`
 * is `1` exactly when `--const-scrollbar-w` is `0`.
 */
describe('head: --const-scrollbar-overlay', () => {
  it('is the boolean complement of a non-zero scrollbar width', async () => {
    await import('../src/head')
    const style = document.documentElement.style
    const w = style.getPropertyValue('--const-scrollbar-w').trim()
    const overlay = style.getPropertyValue('--const-scrollbar-overlay').trim()

    expect(overlay).toBe(w === '0' ? '1' : '0')
    // jsdom reserves no scrollbar layout space → reads as overlay.
    expect(w).toBe('0')
    expect(overlay).toBe('1')
  })
})
