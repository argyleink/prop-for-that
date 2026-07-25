import { test, expect } from '@playwright/test'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * Hoisting (`propsFor(el, keys, { to })` / `data-props-to`) exists for a reason
 * jsdom can't demonstrate: custom properties inherit **downward only**, and
 * `@container style()` matches against an **ancestor**. So a property written on
 * an `<img>` is invisible to the img's own style queries and to its siblings —
 * writing it on the `<figure>` instead is what makes both work.
 *
 * The unit suite proves the routing (which element gets `setProperty`); this
 * proves the platform payoff: a *sibling* `<figcaption>` resolves the value
 * through `var()`, and a style query flips rules for the sibling AND for the img
 * that produced the value.
 *
 * Uses the bundled IIFE API (`window.PropForThat`); run `npm run build` first.
 * That bundle is the core API only, so the img-ish source is registered inline —
 * the binding layer does the hoisting, sources know nothing about it.
 */
const BUILD = fileURLToPath(new URL('../dist/index.global.js', import.meta.url))

/** A 1×1 gif, so `load` fires without a network round-trip. */
const PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

const CONTENT = `
  <figure id="fig" style="margin:0">
    <img id="pic" alt="" width="40" height="40">
    <figcaption id="cap">caption</figcaption>
  </figure>
  <style>
    /* the sibling reads the img's state through plain inheritance */
    #cap { opacity: var(--live-loaded, 0); }
    #cap::after { content: 'waiting'; }
    #pic { outline: 0px solid red; }
    @container style(--live-loaded: 1) {
      #cap::after { content: 'ready'; }
      #pic { outline: 2px solid red; }  /* the img reacts to its own value */
    }
  </style>
`

/** Bind an img-shaped source to #pic, hoisted onto the figure, then load the image. */
const bindAndLoad = (src: string) =>
  new Promise<void>((done) => {
    const PF = (window as unknown as { PropForThat: any }).PropForThat
    PF.register({
      key: 'loaded',
      scope: 'element',
      gate: false,
      start: (ctx: any) => {
        const img = ctx.target as HTMLImageElement
        const read = () => ctx.write('loaded', img.complete && img.naturalWidth > 0 ? 1 : 0)
        read()
        img.addEventListener('load', read)
        return () => img.removeEventListener('load', read)
      },
    })
    const img = document.getElementById('pic') as HTMLImageElement
    PF.propsFor(img, ['loaded'], { to: 'figure' })
    img.addEventListener(
      'load',
      // two frames: one for the source's write, one for the flush to land
      () => requestAnimationFrame(() => requestAnimationFrame(() => done())),
      { once: true },
    )
    img.src = src
  })

test.describe('hoisting to an ancestor', () => {
  test.skip(!existsSync(BUILD), 'run `npm run build` first — this needs the bundled API')

  test('a sibling resolves the hoisted value through var()', async ({ page }) => {
    await page.setContent(CONTENT)
    await page.addScriptTag({ path: BUILD })
    await page.evaluate(bindAndLoad, PIXEL)

    const r = await page.evaluate(() => {
      const fig = document.getElementById('fig')!
      const pic = document.getElementById('pic')!
      const cap = document.getElementById('cap')!
      return {
        onFigure: getComputedStyle(fig).getPropertyValue('--live-loaded').trim(),
        inlineOnImg: pic.style.getPropertyValue('--live-loaded'),
        inheritedByCaption: getComputedStyle(cap).getPropertyValue('--live-loaded').trim(),
        captionOpacity: getComputedStyle(cap).opacity,
      }
    })

    expect(r.onFigure).toBe('1') // written on the ancestor…
    expect(r.inlineOnImg).toBe('') // …not on the element that produced it
    expect(r.inheritedByCaption).toBe('1') // inherits to the sibling
    expect(r.captionOpacity).toBe('1') // and resolves through var()
  })

  test('the hoisted value drives @container style() for the sibling and the img', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'style queries vary by engine version in bundled browsers')
    await page.setContent(CONTENT)
    await page.addScriptTag({ path: BUILD })

    const before = await page.evaluate(() => ({
      caption: getComputedStyle(document.getElementById('cap')!, '::after').content,
      imgOutline: getComputedStyle(document.getElementById('pic')!).outlineWidth,
    }))
    expect(before.caption).toContain('waiting')
    expect(before.imgOutline).toBe('0px')

    await page.evaluate(bindAndLoad, PIXEL)

    const after = await page.evaluate(() => ({
      caption: getComputedStyle(document.getElementById('cap')!, '::after').content,
      imgOutline: getComputedStyle(document.getElementById('pic')!).outlineWidth,
    }))
    expect(after.caption).toContain('ready') // sibling matched the query
    expect(after.imgOutline).toBe('2px') // and so did the img itself
  })
})
