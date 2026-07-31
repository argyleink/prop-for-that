import { test, expect } from '@playwright/test'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * Namespacing (`propsFor(el, keys, { as })` / `data-props-as`) exists because
 * hoisting alone can't express "measure both of these onto the same ancestor":
 * two elements writing `size` onto one `<figure>` produce one `--live-h` and
 * last-write-wins. `as` inserts a name after the cadence prefix, so they become
 * `--live-image-h` and `--live-caption-h`.
 *
 */
const BUILD = fileURLToPath(new URL('../dist/index.global.js', import.meta.url))

const CONTENT = `
  <figure id="fig" style="margin:0">
    <div id="pic" style="width:40px;height:60px"></div>
    <figcaption id="cap" style="width:40px;height:20px">caption</figcaption>
  </figure>
  <style>
    /* both namespaced values, read together in one calc() on a descendant */
    #cap { padding-top: calc((var(--live-image-h) + var(--live-caption-h)) * 1px); }
  </style>
`

/** Bind `size` on both children, hoisted onto the figure under distinct names;
 *  returns the disposer for the `image` one. */
const bind = () => {
  const PF = (window as unknown as { PropForThat: any }).PropForThat
  const stop = PF.propsFor(document.getElementById('pic')!, ['size'], {
    to: 'figure',
    as: 'image',
  })
  PF.propsFor(document.getElementById('cap')!, ['size'], { to: 'figure', as: 'caption' })
  return stop as () => void
}

/** Poll predicate: the figure's `prop` has settled on `want`. ResizeObserver
 *  delivers on its own schedule, so tests poll rather than count frames. */
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
        // 60 + 20: both namespaced values resolved in one calc()
        padding: cap.paddingTop,
      }
    })

    expect(r.imageH).toBe('60')
    expect(r.captionH).toBe('20')
    expect(r.plain).toBe('') // nothing landed under the unnamespaced name
    expect(r.inherited).toBe('60') // namespaced names inherit like any other
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

    expect(r.imageH).toBe('') // removed with its binding
    expect(r.captionH).toBe('20') // the survivor is untouched
  })
})
