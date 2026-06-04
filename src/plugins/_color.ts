/** Shared pixel-sampling + colour-extraction logic for `img-color` and `video-color`. */

export interface Rgb {
  r: number
  g: number
  b: number
  /** Relative luminance 0–1 (Rec. 709 weights) — threshold it for light/dark. */
  l: number
}

/** Relative luminance 0–1 (Rec. 709 weights). */
const lum = (r: number, g: number, b: number): number =>
  (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255

/** HSL saturation 0–1 — how colourful, independent of brightness. */
const saturation = (r: number, g: number, b: number): number => {
  const mx = Math.max(r, g, b) / 255
  const mn = Math.min(r, g, b) / 255
  const d = mx - mn
  if (d === 0) return 0
  return Math.min(1, d / (1 - Math.abs(mx + mn - 1)))
}

/** A running colour bucket: summed channels + member count. */
interface BucketSum {
  r: number
  g: number
  b: number
  n: number
}

/**
 * Bucket the opaque pixels into a coarse 12-bit grid (4 bits/channel) and tally
 * the overall pixel sum. Near-transparent pixels are ignored. One pass over the
 * data feeds every extraction below.
 */
function buildBuckets(data: Uint8ClampedArray) {
  const buckets = new Map<number, BucketSum>()
  let count = 0
  let sumR = 0
  let sumG = 0
  let sumB = 0
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3]! < 128) continue // skip transparent
    const r = data[i]!
    const g = data[i + 1]!
    const b = data[i + 2]!
    count++
    sumR += r
    sumG += g
    sumB += b
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
    const bucket = buckets.get(key)
    if (bucket) {
      bucket.r += r
      bucket.g += g
      bucket.b += b
      bucket.n++
    } else {
      buckets.set(key, { r, g, b, n: 1 })
    }
  }
  return { buckets, count, sumR, sumG, sumB }
}

/** A bucket's representative colour — its members averaged for a smooth result. */
const repColor = (b: BucketSum): Rgb => {
  const r = Math.round(b.r / b.n)
  const g = Math.round(b.g / b.n)
  const bl = Math.round(b.b / b.n)
  return { r, g, b: bl, l: lum(r, g, bl) }
}

/** A palette extracted from one image, beyond the dominant colour. */
export interface Palette {
  /** Most-populated colour (the mode). */
  dominant: Rgb
  /** Most vibrant colour — punchy, mid-toned, populous. Reuses `dominant` for a grayscale image. */
  accent: Rgb
  /** Darkest colour that isn't (near-)black. */
  dark: Rgb
  /** Lightest colour that isn't (near-)white. */
  light: Rgb
  /** Mean of every opaque pixel (the average, vs the dominant's mode). */
  average: Rgb
  /** Warm/cool bias from the mean red-vs-blue balance, −1 (cool) … +1 (warm). */
  temp: number
}

const DARK_FLOOR = 0.04 // below this luminance a colour reads as black
const LIGHT_CEIL = 0.96 // above this luminance a colour reads as white
const MIN_ACCENT_SAT = 0.15 // below this saturation there's no real accent

/**
 * Extract a small, handy palette from a downscaled image's pixels — all derived
 * from one bucketing pass, so it's barely dearer than reading the dominant alone.
 * Returns `null` if there's nothing opaque to sample.
 *
 * Pure and side-effect-free so it's unit-testable without a canvas.
 */
export function palette(data: Uint8ClampedArray): Palette | null {
  const { buckets, count, sumR, sumG, sumB } = buildBuckets(data)
  if (!count) return null

  let maxN = 0
  for (const b of buckets.values()) if (b.n > maxN) maxN = b.n

  let dominant: Rgb | null = null
  let domN = 0
  let accent: Rgb | null = null
  let accentScore = -Infinity
  let dark: Rgb | null = null
  let darkL = Infinity
  let light: Rgb | null = null
  let lightL = -Infinity

  for (const b of buckets.values()) {
    const rep = repColor(b)
    if (b.n > domN) {
      domN = b.n
      dominant = rep
    }
    // accent: weight colourfulness most, then a mid tone, then how common it is —
    // so it skips dull and near-black/white colours and ignores stray specks.
    const s = saturation(rep.r, rep.g, rep.b)
    if (s >= MIN_ACCENT_SAT) {
      const midness = 1 - Math.abs(rep.l - 0.5) * 2
      const score = 3 * s + 1.5 * Math.max(0, midness) + b.n / maxN
      if (score > accentScore) {
        accentScore = score
        accent = rep
      }
    }
    if (rep.l >= DARK_FLOOR && rep.l < darkL) {
      darkL = rep.l
      dark = rep
    }
    if (rep.l <= LIGHT_CEIL && rep.l > lightL) {
      lightL = rep.l
      light = rep
    }
  }

  const r = Math.round(sumR / count)
  const g = Math.round(sumG / count)
  const b = Math.round(sumB / count)
  const average: Rgb = { r, g, b, l: lum(r, g, b) }

  const dom = dominant! // count > 0 guarantees at least one bucket
  return {
    dominant: dom,
    accent: accent ?? dom, // grayscale → no real accent → reuse the dominant
    dark: dark ?? dom, // all-black edge → fall back
    light: light ?? dom, // all-white edge → fall back
    average,
    temp: (r - b) / 255, // warm = more red than blue
  }
}

/** Side of the square images/frames are sampled down to (256 px is plenty, and cheap). */
export const SAMPLE = 16

type AnyCanvas = OffscreenCanvas | HTMLCanvasElement
type Any2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

const makeCanvas = (): AnyCanvas | null => {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(SAMPLE, SAMPLE)
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = c.height = SAMPLE
  return c
}

/**
 * Build a reusable downscaling sampler around a single `SAMPLE`×`SAMPLE` canvas,
 * or `null` where no canvas is available (SSR / unsupported). The returned
 * function draws any image source into that canvas and reads the pixels back,
 * returning `null` when the source taints the canvas (cross-origin without CORS).
 *
 * One canvas per sampler means a continuous reader (video) reuses it across
 * frames instead of allocating each time.
 */
export function createSampler(): ((source: CanvasImageSource) => Uint8ClampedArray | null) | null {
  const canvas = makeCanvas()
  const ctx = canvas?.getContext('2d', { willReadFrequently: true }) as Any2D | null
  if (!ctx) return null
  return (source) => {
    ctx.drawImage(source, 0, 0, SAMPLE, SAMPLE)
    try {
      return ctx.getImageData(0, 0, SAMPLE, SAMPLE).data
    } catch {
      return null // cross-origin source with no CORS grant taints the canvas
    }
  }
}
