import { test, expect } from '@playwright/test'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type * as API from '../src/index'

const BUILD = fileURLToPath(new URL('../dist/index.global.js', import.meta.url))

const CONTENT = `
  <figure id="fig" style="margin:0">
    <div id="pic" style="width:40px;height:60px"></div>
    <figcaption id="cap" style="width:40px;height:20px">caption</figcaption>
  </figure>
  <style>
    #cap { padding-top: calc((var(--live-image-h) + var(--live-caption-h)) * 1px); }
  </style>
`

const bind = () => {
  const PF = (window as unknown as { PropForThat: typeof API }).PropForThat
  const stop = PF.propsFor(document.getElementById('pic')!, ['size'], {
    to: 'figure',
    as: 'image',
  })
  PF.propsFor(document.getElementById('cap')!, ['size'], { to: 'figure', as: 'caption' })
  return stop as () => void
}

function settled(args: { prop: string; want: string }): boolean {
  return (
    getComputedStyle(document.getElementById('fig')!).getPropertyValue(args.prop).trim() ===
    args.want
  )
}

test.describe('namespaced props (as)', () => {
  test.skip(!existsSync(BUILD), 'run `npm run build` first — this needs the bundled API')

  test('two elements hoist one key onto one ancestor without clobbering', async ({ page }) => {
    await page.setContent(CONTENT)
    await page.addScriptTag({ path: BUILD })
    await page.evaluateHandle(bind)
    await page.waitForFunction(settled, { prop: '--live-caption-h', want: '20' })
    await page.waitForFunction(settled, { prop: '--live-image-h', want: '60' })

    const r = await page.evaluate(() => {
      const cs = getComputedStyle(document.getElementById('fig')!)
      const cap = getComputedStyle(document.getElementById('cap')!)
      return {
        imageH: cs.getPropertyValue('--live-image-h').trim(),
        captionH: cs.getPropertyValue('--live-caption-h').trim(),
        plain: cs.getPropertyValue('--live-h').trim(),
        inherited: cap.getPropertyValue('--live-image-h').trim(),
        padding: cap.paddingTop,
      }
    })

    expect(r.imageH).toBe('60')
    expect(r.captionH).toBe('20')
    expect(r.plain).toBe('')
    expect(r.inherited).toBe('60')
    expect(r.padding).toBe('80px')
  })

  test('disposing one namespace leaves the other intact', async ({ page }) => {
    await page.setContent(CONTENT)
    await page.addScriptTag({ path: BUILD })

    const stopImage = await page.evaluateHandle(bind)
    await page.waitForFunction(settled, { prop: '--live-image-h', want: '60' })
    await page.waitForFunction(settled, { prop: '--live-caption-h', want: '20' })

    await stopImage.evaluate((stop: () => void) => stop())

    const r = await page.evaluate(() => {
      const cs = getComputedStyle(document.getElementById('fig')!)
      return {
        imageH: cs.getPropertyValue('--live-image-h').trim(),
        captionH: cs.getPropertyValue('--live-caption-h').trim(),
      }
    })

    expect(r.imageH).toBe('')
    expect(r.captionH).toBe('20')
  })
})
