import { test, expect } from '@playwright/test'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * Viewport gating: an element-scoped source runs only while its element is in
 * the viewport. jsdom has no IntersectionObserver (the unit suite stubs one), so
 * the real-engine proof — a live IO actually defers `start()` until the element
 * scrolls in, and the written value persists after it scrolls away — lives here.
 *
 * Uses the bundled IIFE API (`window.PropForThat`); run `npm run build` first.
 */
const BUILD = fileURLToPath(new URL('../dist/index.global.js', import.meta.url))

test.describe('viewport gating', () => {
  test.skip(!existsSync(BUILD), 'run `npm run build` first — gating needs the bundled API')

  test('an element source starts only once visible, then its value persists', async ({ page }) => {
    await page.setContent('<div style="height:300vh"></div><div id="t" style="height:40px">x</div>')
    await page.addScriptTag({ path: BUILD })

    // A trivial element source that writes a value in start(). Bound while the
    // target sits below a 300vh spacer (off screen), so the gate must defer it.
    const initial = await page.evaluate(async () => {
      const PF = (window as unknown as { PropForThat: any }).PropForThat
      PF.register({
        key: 'seed',
        scope: 'element',
        start: (ctx: any) => {
          ctx.write('seed', 1)
          return () => {}
        },
      })
      const el = document.getElementById('t')!
      PF.propsFor(el, ['seed'])
      // give a real IO callback + a couple of frames a chance to (not) fire
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r as FrameRequestCallback)))
      return el.style.getPropertyValue('--live-seed')
    })
    expect(initial).toBe('') // never started while off screen

    const afterScrollIn = await page.evaluate(
      () =>
        new Promise<string>((res) => {
          const el = document.getElementById('t')!
          el.scrollIntoView()
          let tries = 0
          const check = () => {
            const v = el.style.getPropertyValue('--live-seed')
            if (v === '1' || tries++ > 90) res(v)
            else requestAnimationFrame(check)
          }
          check()
        }),
    )
    expect(afterScrollIn).toBe('1') // gate started it once visible; the write flushed

    const afterScrollAway = await page.evaluate(async () => {
      window.scrollTo(0, 0)
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r as FrameRequestCallback)))
      return document.getElementById('t')!.style.getPropertyValue('--live-seed')
    })
    expect(afterScrollAway).toBe('1') // value frozen in place, not removed
  })
})
