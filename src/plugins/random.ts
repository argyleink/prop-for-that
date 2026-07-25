import type { Source } from '../core/types'
import { round4 } from '../core/num'

/**
 * Per-element randomness — the one value CSS genuinely can't produce for itself
 * (until `random()` ships everywhere). Bind it to N elements and each gets its
 * own rolls, written **once** on the `const` cadence:
 *
 * - `--const-random` — a float in `[0, 1)`
 * - `--const-random-2`, `--const-random-3` — two more, independent of the first
 *
 * Three, because organic variation usually needs more than one axis (delay *and*
 * rotation *and* scale) and CSS can't derive a second independent random from the
 * first. Everything else *is* derivable, so it isn't shipped: an angle is
 * `calc(var(--const-random) * 360deg)`, a coin flip
 * `calc(sign(var(--const-random) - 0.5))`, a range
 * `calc(A + (B - A) * var(--const-random))`, a bucket
 * `round(down, calc(var(--const-random) * 5), 1)`.
 *
 * Stagger a grid without `:nth-child()` rules, jitter a scatter layout, vary a
 * shimmer's duration per card — one binding, no per-element JS.
 *
 * **Never re-rolled.** It writes on the `const` cadence and sets `gate: false`,
 * so — unlike a gated element source, whose `start` re-runs on every viewport
 * re-entry — scrolling out of view and back can't hand an element a new value
 * mid-animation.
 *
 * **Seeded (deterministic) mode:** `configure({ randomSeed: 42 })` derives every
 * roll from the seed plus the element's position in the DOM, so the same markup
 * renders the same "random" layout on every load, and a rebind hands an element
 * the values it had before. Reordering the tree reshuffles it. Unseeded (the
 * default) rolls come from `Math.random()`.
 */
export const random: Source = {
  key: 'random',
  scope: 'element',
  // One-shot write: there's nothing to pause off screen — and gating would
  // actively break it, since a gated source's `start` re-runs on every viewport
  // re-entry and would re-roll the value each time the element scrolled back in.
  gate: false,
  props: {
    random: { syntax: '<number>', initial: '0' },
    'random-2': { syntax: '<number>', initial: '0' },
    'random-3': { syntax: '<number>', initial: '0' },
  },
  start(ctx) {
    const { randomSeed } = ctx.config
    const next =
      randomSeed === undefined ? () => Math.random() : prng(seedFor(ctx.target, randomSeed))
    ctx.write('random', round4(next()), 'const')
    ctx.write('random-2', round4(next()), 'const')
    ctx.write('random-3', round4(next()), 'const')
    return () => {}
  },
}

/** mulberry32 — fast, well-distributed, and its whole state is one 32-bit int. */
function prng(seed: number): () => number {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = a ^ (a >>> 15)
    t = Math.imul(t, t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * FNV-1a over the element's structural position (`P7 < DIV3 < BODY0 < HTML0`),
 * mixed with the seed. Deriving from *position* rather than from a shared
 * sequence is what makes a seeded roll stable across reloads and rebinds, and
 * independent of the order elements happen to bind in.
 */
function seedFor(el: Element, seed: number): number {
  let h = (seed >>> 0) ^ 0x811c9dc5
  for (let node: Element | null = el; node; node = node.parentElement) {
    const tag = node.tagName
    for (let c = 0; c < tag.length; c++) h = Math.imul(h ^ tag.charCodeAt(c), 0x01000193)
    let i = 0
    for (let sib = node.previousElementSibling; sib; sib = sib.previousElementSibling) i++
    h = Math.imul(h ^ i, 0x01000193)
  }
  return h >>> 0
}
