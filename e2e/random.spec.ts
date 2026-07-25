import { test, expect } from '@playwright/test'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * The `random` plugin's two platform premises, neither provable in jsdom:
 *
 * 1. **`gate: false` is what keeps a roll stable.** A *gated* element source has
 *    its `start` re-run on every viewport re-entry — which for a generator means a
 *    fresh value every time the element scrolls back in, mid-animation. Only a
 *    real IntersectionObserver can prove the opt-out actually holds.
 * 2. **A per-element `--const-*` inherits and survives `calc()`** — the whole
 *    point of writing randomness into a custom property.
 *
 * The plugin itself isn't in the IIFE bundle (plugins are ESM-only chunks), so
 * these register a source mirroring its shape — `gate: false` plus one `const`
 * write of `Math.random()` — the same way `truncated.spec.ts` mirrors its measure.
 * Uses the bundled API (`window.PropForThat`); run `npm run build` first.
 */
const BUILD = fileURLToPath(new URL('../dist/index.global.js', import.meta.url))

/** One write-once roll, `round4`'d like the real source. */
const roller = (key: string, gate: boolean) => `{
  key: '${key}',
  scope: 'element',
  gate: ${gate},
  start: (ctx) => { ctx.write('${key}', Math.round(Math.random() * 1e4) / 1e4, 'const'); return () => {} },
}`

const MIRROR = roller('roll', false) // what `random` ships
const GATED = roller('gated-roll', true) // the default, kept for contrast

test.describe('random: write-once rolls', () => {
  test.skip(!existsSync(BUILD), 'run `npm run build` first — needs the bundled API')

  test('an ungated const roll is written off screen and never re-rolled, unlike a gated one', async ({
    page,
  }) => {
    await page.setContent(
      '<div style="height:300vh"></div><div id="t" style="height:40px">x</div>',
    )
    await page.addScriptTag({ path: BUILD })

    const r = await page.evaluate(
      async ([mirror, gated]) => {
        const PF = (window as unknown as { PropForThat: any }).PropForThat
        PF.register(eval(`(${mirror})`))
        PF.register(eval(`(${gated})`))
        const el = document.getElementById('t')!
        const frames = () =>
          new Promise((res) =>
            requestAnimationFrame(() => requestAnimationFrame(res as FrameRequestCallback)),
          )
        const read = (prop: string) => el.style.getPropertyValue(prop)

        // bound while parked below a 300vh spacer: off screen
        PF.propsFor(el, ['roll', 'gated-roll'])
        await frames()
        const offScreen = { ungated: read('--const-roll'), gated: read('--const-gated-roll') }

        // scroll in (starts the gated one), then away, then back
        el.scrollIntoView()
        await frames()
        const visible = { ungated: read('--const-roll'), gated: read('--const-gated-roll') }
        window.scrollTo(0, 0)
        await frames()
        el.scrollIntoView()
        await frames()
        return {
          offScreen,
          visible,
          returned: { ungated: read('--const-roll'), gated: read('--const-gated-roll') },
        }
      },
      [MIRROR, GATED],
    )

    // ungated: lands immediately, even off screen — a var() read resolves on frame one
    expect(Number(r.offScreen.ungated)).toBeGreaterThanOrEqual(0)
    expect(Number(r.offScreen.ungated)).toBeLessThan(1)
    // and holds through scroll out → in: the value an animation started with
    expect(r.returned.ungated).toBe(r.offScreen.ungated)

    // gated: deferred until visible, then re-rolled on re-entry — what `random` avoids
    expect(r.offScreen.gated).toBe('')
    expect(r.visible.gated).not.toBe('')
    expect(r.returned.gated).not.toBe(r.visible.gated)
  })

  test('each element gets its own roll, inherited by descendants and usable in calc()', async ({
    page,
  }) => {
    await page.setContent(`
      <style>
        .tile { opacity: calc(var(--const-roll) * 0.5 + 0.5); }
        .tile b { opacity: var(--const-roll); }
      </style>
      <div class="tile"><b>a</b></div>
      <div class="tile"><b>b</b></div>
      <div class="tile"><b>c</b></div>
    `)
    await page.addScriptTag({ path: BUILD })

    const r = await page.evaluate(async (mirror) => {
      const PF = (window as unknown as { PropForThat: any }).PropForThat
      PF.register(eval(`(${mirror})`))
      PF.propsFor(document.querySelectorAll('.tile'), ['roll'])
      await new Promise((res) =>
        requestAnimationFrame(() => requestAnimationFrame(res as FrameRequestCallback)),
      )
      return [...document.querySelectorAll<HTMLElement>('.tile')].map((tile) => ({
        raw: tile.style.getPropertyValue('--const-roll'),
        own: getComputedStyle(tile).opacity, // calc() over the property
        child: getComputedStyle(tile.querySelector('b')!).opacity, // inherited
      }))
    }, MIRROR)

    for (const tile of r) {
      // calc() consumed the number: 0.5 + roll/2, and the child sees the same roll
      expect(Number(tile.own)).toBeCloseTo(Number(tile.raw) * 0.5 + 0.5, 2)
      expect(Number(tile.child)).toBeCloseTo(Number(tile.raw), 2)
    }
    // three bindings, three independent rolls
    expect(new Set(r.map((t) => t.raw)).size).toBe(3)
  })
})
