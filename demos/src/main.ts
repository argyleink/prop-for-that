import { propsFor, configure, register, unbind, pause, resume, type Source } from 'prop-for-that'
import {
  registerPlugins,
  pointer,
  pointerLocal,
  field,
  fieldState,
  formState,
  select,
  colorInput,
  imgColor,
  videoColor,
  clock,
  fps,
  online,
  network,
  battery,
  scrollVelocity,
  media,
  visualViewport,
  orientation,
  motion,
  cpuPressure,
  pageFocused,
  pageVisible,
  navType,
  ua,
} from 'prop-for-that/plugins'
// FOUC-safe device constants on :root: --const-dpr / cores / mem / scrollbar-w(-thin) / scrollbar-overlay.
// Side-effect import — writes once, synchronously. Surfaced in the gallery's head card.
import 'prop-for-that/head'

// Register every --live-* as a typed @property so values are interpolatable
// (the media ring transitions because of this). A registered property always
// carries an initial value, which would otherwise override the var() fallbacks
// some demos rely on — so `defaults` (keyed by the source's local name) sets the
// correct rest value: pointer centred (0.5), full battery (1), square (1).
// Must run before any source writes, so it's the very first call.
configure({
  typed: true,
  defaults: {
    'pointer-x-ratio': 0.5,
    'pointer-y-ratio': 0.5,
    'local-pointer-x-ratio': 0.5,
    'local-pointer-y-ratio': 0.5,
    'battery-level': 1,
    aspect: 1,
    'vvp-scale': 1,
  },
})

// Make every plugin source used below resolvable by key via propsFor.
// (size, visibility, range are core and already registered; pointer is a plugin now.)
// geo is intentionally omitted: watchPosition would fire a permission prompt on
// load. It still appears in the gallery, tagged "permission", reading a default.
registerPlugins(
  pointer,
  pointerLocal,
  field,
  fieldState,
  formState,
  select,
  colorInput,
  imgColor,
  videoColor,
  clock,
  fps,
  online,
  network,
  battery,
  scrollVelocity,
  media,
  visualViewport,
  orientation,
  motion,
  cpuPressure,
  pageFocused,
  pageVisible,
  navType,
  ua,
)

// ── The entire reactive wiring. JS exposes state; CSS does all the reacting.
// These globals land on :root, so any element on the page can read them: the
// accent hue, the HUD, the trig clock, the device panel.
propsFor([
  'pointer', // --live-pointer-x/y(-ratio)
  'viewport', // --live-vw / --live-vh
  'clock', // --live-hours / minutes / seconds / now
  'fps', // --live-fps
  'online', // --live-online (0/1)
  'page-focused', // --live-page-focused (1/0 — tab frontmost & window focused)
  'page-visible', // --live-page-visible (1/0 — tab not hidden, document.visibilityState)
  'network', // --live-net-type / downlink / rtt / save-data
  'battery', // --live-battery-level / charging
  'scroll-velocity', // --live-scroll-velocity / direction
  'visual-viewport', // --live-vvp-scale / offset-top / height
  'orientation', // --live-orient-alpha / beta / gamma (mobile)
  'motion', // --live-accel-x / y / z (mobile)
  'cpu-pressure', // --live-cpu-pressure (0 nominal → 3 critical, Chromium)
  'nav-type', // --const-nav-type (navigate / reload / back_forward / prerender, write-once)
  'ua', // --const-ua-platform / browser / engine / version / mobile (write-once; also FOUC-safe via head)
])

// Capability flags (one-shot, NOT reactive): the Battery + Network Information
// APIs are Chromium-only, so flag support once and let CSS show a graceful
// "unsupported" note when a source never writes its vars.
const root = document.documentElement
if ('getBattery' in navigator) root.dataset.hasBattery = ''
if ('connection' in navigator) root.dataset.hasNetwork = ''

// Demo 1: bind pointer-local to BOTH the FRAME (#card) and the card (.tilt-card).
// The frame's --live-local-pointer-x-ratio / --live-local-pointer-y-ratio (0–1 across the frame) drive the behind-card
// gradient + border shine; the card's OWN --live-local-pointer-x-ratio / --live-local-pointer-y-ratio (0–1 across the
// card) drive its glow / glare / texture, so the highlight tracks the cursor
// exactly over the card instead of feeling offset by the frame padding.
const card = document.getElementById('card')
if (card) propsFor(card, ['pointer-local'])
const tiltCard = card?.querySelector<HTMLElement>('.tilt-card')
if (tiltCard) propsFor(tiltCard, ['pointer-local'])

// ── Demo 2: each panel exposes binary --live-visible / --const-has-entered, the
// scroll-TRIGGERED state CSS can't latch on its own (one IntersectionObserver).
// propsFor accepts a NodeList, so one call binds every panel.
propsFor(document.querySelectorAll('[data-reveal]'), ['visibility'])

// ── Demo 3: bind the slider's CONTAINER. The range source finds the inner
// <input> but writes --live-value / --live-value-pct on the container, so the
// big gauge AND the slider both inherit the value (custom props inherit down).
const meter = document.getElementById('meter')
if (meter) propsFor(meter, ['range'])

// ── Demo 4: same range source on a container, but read as DISCRETE state. The
// integer --live-value is matched by @container style() to swap whole rule
// blocks (the state word, its colour) — the branch var()/calc() can't make.
const level = document.getElementById('level')
if (level) propsFor(level, ['range'])

// ── Demo 5: the field source writes --live-length / --live-empty / --live-valid
// on the <textarea>. The minlength / maxlength live in the HTML; CSS compares
// --live-length against them (passed in as --min / --max) to show the state.
const note = document.getElementById('note')
if (note) propsFor(note, ['field'])

// ── Demo 14: bind field-state to EACH field wrapper, so every input gets its
// own interaction history (--live-dirty / touched / changed / submitted) on its
// own container — the chips inside read that field's state. Bind field-state AND
// form-state to the WRAP (it holds the topper + the form): field-state aggregates
// the form-wide submitted, form-state aggregates validity/completion across every
// field (--live-field-count / valid-count / all-valid / completion). Both land on
// the wrap, so the topper above the card reads them and the submit gate inside the
// form does too. preventDefault keeps Submit from navigating.
const fstate = document.getElementById('fstate')
const fstateWrap = document.getElementById('fstate-wrap')
if (fstate && fstateWrap) {
  propsFor(fstate.querySelectorAll('.fstate__field'), ['field-state'])
  // form-state + field-state aggregate the form; color-input reads the brand-colour
  // picker and writes --live-color on the wrap, which re-themes the whole form.
  propsFor(fstateWrap, ['field-state', 'form-state', 'color-input'])
  // the plan <select> (required, so it gates the form) exposes its choice as a
  // number — --live-value-num — on its own field, which CSS reads as the seat count.
  const planField = document.getElementById('fstate-plan-field')
  if (planField) propsFor(planField, ['select'])
  fstate.addEventListener('submit', (e) => e.preventDefault())
}

// ── Demo 15 (img-color): the first two swatches are real photos from a CORS-
// enabled placeholder API (crossorigin so img-color can read their pixels); the
// other two are canvas-generated gradients (same-origin, no taint). Picking one
// swaps the <img>; img-color re-reads the dominant colour into --live-img (hex)
// on the card, which tints the drop shadow. pointer-local on the stage drives
// --live-local-pointer-x-ratio/y-ratio, and CSS casts the shadow AWAY from the cursor — the cursor is the sun.
const SUN_IMAGES = [
  'https://picsum.photos/id/1080/240/300', // strawberries — vivid red
  'https://picsum.photos/id/225/240/300', // dog — warm earth tones
]
// Display-P3 stops for the two gradient swatches — wider gamut than sRGB, rendered
// through a display-p3 canvas and a P3 CSS gradient. The picker gradient is authored
// `in oklab` for perceptual interpolation (current Chromium normalises that out of
// the *serialised* value, but the intent stands and other engines honour it).
const SUN_GRADS: Record<string, string[]> = {
  lime: ['color(display-p3 0.85 1 0.3)', 'color(display-p3 0.35 0.85 0.3)', 'color(display-p3 0 0.55 0.35)'],
  berry: ['color(display-p3 1 0.5 0.82)', 'color(display-p3 0.75 0.2 0.82)', 'color(display-p3 0.35 0.1 0.66)'],
}
const sunArtwork = (stops: string[]): string => {
  const c = document.createElement('canvas')
  c.width = c.height = 100
  // a display-p3 canvas so the P3 stops render at full gamut (falls back to sRGB)
  const g = c.getContext('2d', { colorSpace: 'display-p3' }) ?? c.getContext('2d')
  if (!g) return ''
  const grad = g.createLinearGradient(0, 0, 100, 100)
  stops.forEach((s, i) => grad.addColorStop(i / (stops.length - 1), s))
  g.fillStyle = grad
  g.fillRect(0, 0, 100, 100)
  return c.toDataURL()
}
const sunImg = document.querySelector<HTMLImageElement>('#sun-img')
const sunCard = document.getElementById('sun-card')
const sunPicker = document.getElementById('sun-picker')
if (sunImg && sunCard && sunPicker) {
  sunImg.crossOrigin = 'anonymous' // so img-color can read cross-origin pixels
  sunPicker.querySelectorAll<HTMLElement>('[data-img], [data-grad]').forEach((dot) => {
    const url = dot.dataset.img != null ? SUN_IMAGES[Number(dot.dataset.img)] : undefined
    if (url) {
      dot.style.backgroundImage = `url("${url}")`
      dot.addEventListener('click', () => (sunImg.src = url))
      return
    }
    const stops = dot.dataset.grad ? SUN_GRADS[dot.dataset.grad] : undefined
    if (!stops) return
    dot.style.background = `linear-gradient(135deg in oklab, ${stops.join(', ')})`
    dot.addEventListener('click', () => (sunImg.src = sunArtwork(stops)))
  })
  sunImg.src = SUN_IMAGES[0]! // start on the first photo
}
// img-color AND pointer-local on the STAGE: the dominant tints the card's shadow,
// and the palette swatches (siblings of the card) read the rest of the extracted
// colours — accent / dark / light / avg — all inherited from the stage.
const sunStage = document.getElementById('sun-stage')
if (sunStage) propsFor(sunStage, ['pointer-local', 'img-color'])

// ── Demo 16 (video-color): bind it to the STAGE so the card's glow AND the two
// swatches below it read the sampled colours (~4 Hz). The accent drives the
// backlit box-shadow glow; dominant + accent show as swatches. The video is
// crossorigin so the frame is readable (CORS); muted + autoplay + loop keep the
// colour flowing.
const vidStage = document.getElementById('vid-stage')
if (vidStage) propsFor(vidStage, ['video-color'])

// ── Demo 6 (CSS trig): bind pointer-local to EACH eye, so every eye gets its
// own --live-local-pointer-x-ratio / --live-local-pointer-y-ratio and can aim its pupil with atan2()/sin()/cos() —
// the angle from that eye's own centre to the cursor. No JS does the maths.
propsFor(document.querySelectorAll('.eye'), ['pointer-local'])

// ── Demo 7 flourish: bind pointer-local to the clock FACE so --live-local-pointer-x-ratio / --live-local-pointer-y-ratio
// are the cursor's position inside the watch. CSS eases the face's gradient toward
// them (magnetic pull), releasing back to centre when the pointer leaves.
const clockFace = document.getElementById('clock-face')
if (clockFace) propsFor(clockFace, ['pointer-local'])

// ── Demo 10: the size source writes --live-w / --live-h / --live-aspect on the
// resizable card (ResizeObserver). CSS restyles continuously from those.
const sizer = document.getElementById('sizer')
if (sizer) propsFor(sizer, ['size'])

// ── Demo 13 (drag): bind pointer-local AND size to the board. CSS gates on
// :active and computes each token's translate from --live-local-pointer-x-ratio / --live-local-pointer-y-ratio and the
// board's --live-w / --live-h. No JS drag handler, no pointer math in JS.
const dragboard = document.getElementById('dragboard')
if (dragboard) propsFor(dragboard, ['pointer-local', 'size'])

// ── Demo 11: bind media to the player CONTAINER; it finds the inner <video> and
// writes --live-progress etc. on the container so the ring + label inherit them.
// video-color also samples the same <video> (crossorigin) and writes
// --live-video-accent here, which colours the progress ring from the footage.
const player = document.getElementById('player')
if (player) propsFor(player, ['media', 'video-color'])

// ── Demo 0 (auto): the zero-config entry. `import 'prop-for-that/auto'` attaches
// NOTHING by default — it binds any [data-props-for] element and lazy-loads plugins
// on demand, so the box below gets `size` (a core source) with no imperative call.
// This demo's globals are bound imperatively above (propsFor([...])), not by auto.
// Imported dynamically so it runs after configure() above (typed @property treatment).
import('prop-for-that/auto')

// ── Hero panels: bind pointer-local to EACH chip so every panel gets its own
// --live-local-pointer-x-ratio / --live-local-pointer-y-ratio (0–1 within the panel) + --live-local-pointer-inside. CSS draws
// a conic border shine that follows the pointer around that panel's rim and grows
// brighter the closer to its edge the pointer is. propsFor takes a NodeList, so
// one call binds them all.
propsFor(document.querySelectorAll('.hero-stage .hchip'), ['pointer-local'])

// ── Hero hue control: the page theme hue is set ONLY by scrubbing the hue track.
// While the pointer is over it, --accent-h is set on :root from the pointer's x
// within the track; it holds when the pointer leaves (we simply stop updating).
// A deliberate control affordance — like the T-key theme toggle below.
const hueTrack = document.querySelector<HTMLElement>('#hue-ctrl .hue-track')
hueTrack?.addEventListener('pointermove', (e) => {
  const r = hueTrack.getBoundingClientRect()
  const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
  document.documentElement.style.setProperty('--accent-h', String(Math.round(px * 360)))
})

// ── Touch fallback: drive the pointer effects from device tilt ──────────────
// Every pointer demo above (the card's 3D lean + glare, the hero border-shine,
// the eyes, the parallax backdrop) reads --live-local-pointer-x-ratio /
// --live-local-pointer-y-ratio / --live-local-pointer-inside and the global
// --live-pointer-*-ratio. A mouse moves those; a finger
// can't, so on a touch screen they'd sit frozen at their 0.5 rest. So on a
// no-hover device we offer to feed those SAME vars from the phone's orientation
// instead — the effects don't change, they just get a new input. Writing them on
// :root (where the pointer globals live) lets the inherited --live-local-pointer-x-ratio / --live-local-pointer-y-ratio
// reach every pointer-local element that, lacking a pointermove, never wrote its
// own value — so the whole page leans as one with the device.

// How far you must tilt (degrees, from the pose held when enabling) for a var to
// reach its 0 / 1 extreme, and how hard each reading eases toward target. Both are
// deliberately tame — a small tilt window plus heavy smoothing keep it from ever
// whipping to the edges or jittering.
const TILT_RANGE = 22
const TILT_EASE = 0.12
const TILT_DIR_X = 1 // tilt right → lean/highlight right
const TILT_DIR_Y = -1 // tilt the top away → lean/highlight up

const r4 = (n: number) => Math.round(n * 1e4) / 1e4
const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n)
// signed tilt delta (deg) → 0–1, clamped so past the range it pins at the edge
const tiltRatio = (deg: number) =>
  clamp01(0.5 + Math.max(-TILT_RANGE, Math.min(TILT_RANGE, deg)) / (2 * TILT_RANGE))

// Fired once, on the first real reading — lets the UI flip from "asking" to "on",
// and distinguishes "granted but no sensor ever fires" from "actually tilting".
let onFirstTilt: (() => void) | null = null

const tiltPointer: Source = {
  key: 'tilt-pointer',
  scope: 'global',
  start(ctx) {
    let baseX: number | null = null // neutral pose, captured on the first reading
    let baseY = 0
    let x = 0.5 // eased ratios (start at rest so there's no jump-in)
    let y = 0.5
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.gamma == null && e.beta == null) return
      const g = e.gamma ?? 0 // left/right tilt → x
      const b = e.beta ?? 0 // front/back tilt → y
      if (baseX == null) {
        baseX = g
        baseY = b
        onFirstTilt?.()
        onFirstTilt = null
      }
      const tx = tiltRatio(TILT_DIR_X * (g - baseX))
      const ty = tiltRatio(TILT_DIR_Y * (b - baseY))
      x += (tx - x) * TILT_EASE
      y += (ty - y) * TILT_EASE
      ctx.write('local-pointer-x-ratio', r4(x))
      ctx.write('local-pointer-y-ratio', r4(y))
      ctx.write('pointer-x-ratio', r4(x))
      ctx.write('pointer-y-ratio', r4(y))
      ctx.write('local-pointer-inside', 1) // wake the shine/glare/eyes that gate on it
    }
    window.addEventListener('deviceorientation', onOrient, { passive: true })
    return () => window.removeEventListener('deviceorientation', onOrient)
  },
}

// Offer the fallback only where it's both needed (no hover) and possible
// (orientation events exist). On a mouse, none of this runs.
const noHover = matchMedia('(hover: none)').matches
const hasOrient = typeof DeviceOrientationEvent !== 'undefined'
const tiltBtn = document.getElementById('tilt-enable')

if (noHover && hasOrient && tiltBtn) {
  const setTiltState = (s: 'offer' | 'on' | 'denied') => {
    root.dataset.tilt = s
    // the blocked note self-clears back to the offer, so the button returns for a retry
    if (s === 'denied')
      setTimeout(() => root.dataset.tilt === 'denied' && (root.dataset.tilt = 'offer'), 4000)
  }
  setTiltState('offer')

  // iOS gates deviceorientation behind a per-gesture permission call; elsewhere it
  // just flows. Either way we start from a real tap, which satisfies iOS.
  const requestOrient = (): Promise<boolean> => {
    const reqPerm = (
      DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<'granted' | 'denied'>
      }
    ).requestPermission
    if (typeof reqPerm !== 'function') return Promise.resolve(true)
    return reqPerm()
      .then((r) => r === 'granted')
      .catch(() => false)
  }

  tiltBtn.addEventListener('click', async () => {
    if (!(await requestOrient())) return setTiltState('denied')
    // Each pointer demo binds pointer-local, which writes its OWN inline
    // --live-local-pointer-x-ratio/y-ratio the instant any pointermove fires — including the very tap
    // that enabled this — then sits frozen, shadowing the inherited root value
    // the tilt bridge writes. A touch device has no hovering pointer to track
    // anyway, so detach pointer-local from those hosts (mirrors the bindings
    // above); unbind also clears the stale props, so each element falls back to
    // the root values tilt now drives. Combined bindings keep their other keys.
    document
      .querySelectorAll<HTMLElement>(
        '#card, #card .tilt-card, #sun-stage, .eye, #clock-face, #dragboard, .hero-stage .hchip',
      )
      .forEach((el) => unbind(el, ['pointer-local']))

    register(tiltPointer)
    let guard = 0
    // assign before starting so the first reading (a later task) can never slip past
    onFirstTilt = () => {
      clearTimeout(guard)
      setTiltState('on')
    }
    const stop = propsFor(['tilt-pointer'])
    // permission can be granted yet no sensor ever fire (desktop emulators,
    // sensor-less hardware) — if nothing reads within 1.5s, fall back gracefully
    guard = window.setTimeout(() => {
      stop()
      onFirstTilt = null
      setTiltState('denied')
    }, 1500)
  })
}

// ── HUD play/pause: freeze / unfreeze the whole library ─────────────────────
// pause() cancels the single shared frame loop, so every --live-* across the page
// holds its last value — the HUD's own pointer x/y % stop counting — and resume()
// picks sampling and queued writes back up. One global switch for all reactivity.
const hud = document.querySelector<HTMLElement>('.hud')
const loopBtn = document.getElementById('loop-toggle')
if (hud && loopBtn) {
  let paused = false
  loopBtn.addEventListener('click', () => {
    paused = !paused
    paused ? pause() : resume()
    hud.toggleAttribute('data-paused', paused)
    loopBtn.setAttribute('aria-pressed', String(paused))
    loopBtn.setAttribute('aria-label', paused ? 'Resume live updates' : 'Pause live updates')
  })
}

// ── Reference gallery: link each source card to its docsite page. The cards use
// CSS subgrid, so a wrapping <a> would break the grid; instead lay a stretched
// link over each card. Core/element sources with a demo page point at it; the
// rest (plugins without one) point at the plugins reference, by section.
const DOC_BASE = '/docsite'
const DEMO_PAGE: Record<string, string> = {
  pointer: 'pointer',
  'pointer-local': 'pointer',
  viewport: 'size',
  size: 'size',
  visibility: 'visibility',
  range: 'range',
  select: 'select',
  'color-input': 'color-input',
  field: 'field',
  'field-state': 'field-state',
  'form-state': 'form-state',
  'img-color': 'img-color',
  'video-color': 'video-color',
}
const ELEMENT_PLUGINS = new Set(['media', 'img', 'truncated'])
const docUrlFor = (key: string): string =>
  key in DEMO_PAGE
    ? `${DOC_BASE}/demos/${DEMO_PAGE[key]}/`
    : `${DOC_BASE}/reference/plugins/#${ELEMENT_PLUGINS.has(key) ? 'element' : 'global'}-plugins`
document.querySelectorAll<HTMLElement>('.src').forEach((card) => {
  const key = card.querySelector('.src__key')?.textContent?.trim()
  if (!key) return
  const link = document.createElement('a')
  link.className = 'src__link'
  link.href = docUrlFor(key)
  link.setAttribute('aria-label', `${key} source — read the docs`)
  card.append(link)
})

// Everything visual above is CSS reading var(--live-*). Nothing below touches
// the reactivity path — it is one discrete affordance: a keyboard theme toggle.

// ── Keyboard flourish: press T to cycle light → dark → system ──────────
// Not reactive state; a one-shot attribute the stylesheet keys off via
// html[data-theme]. No live values are read or written here.
const themes = ['light', 'dark', ''] as const
let theme = 0
addEventListener('keydown', (e) => {
  if (e.key !== 't' && e.key !== 'T') return
  const el = e.target as HTMLElement | null
  // don't hijack typing in fields
  if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return
  theme = (theme + 1) % themes.length
  const next = themes[theme]
  if (next) document.documentElement.dataset.theme = next
  else delete document.documentElement.dataset.theme
})
