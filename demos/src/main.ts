import { propsFor, configure } from 'prop-for-that'
import {
  registerPlugins,
  pointerLocal,
  field,
  fieldState,
  formState,
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
} from 'prop-for-that/plugins'

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
    px: 0.5,
    py: 0.5,
    'battery-level': 1,
    aspect: 1,
    'vvp-scale': 1,
  },
})

// Make every plugin source used below resolvable by key via propsFor.
// (size, visibility, range, pointer are core and already registered.)
// geo is intentionally omitted: watchPosition would fire a permission prompt on
// load. It still appears in the gallery, tagged "permission", reading a default.
registerPlugins(
  pointerLocal,
  field,
  fieldState,
  formState,
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
  'network', // --live-net-type / downlink / rtt / save-data
  'battery', // --live-battery-level / charging
  'scroll-velocity', // --live-scroll-velocity / direction
  'visual-viewport', // --live-vvp-scale / offset-top / height
  'orientation', // --live-orient-alpha / beta / gamma (mobile)
  'motion', // --live-accel-x / y / z (mobile)
  'cpu-pressure', // --live-cpu-pressure (0 nominal → 3 critical, Chromium)
])

// Capability flags (one-shot, NOT reactive): the Battery + Network Information
// APIs are Chromium-only, so flag support once and let CSS show a graceful
// "unsupported" note when a source never writes its vars.
const root = document.documentElement
if ('getBattery' in navigator) root.dataset.hasBattery = ''
if ('connection' in navigator) root.dataset.hasNetwork = ''

// Demo 1: bind pointer-local to the FRAME (#card). It writes --live-px /
// --live-py (0–1 across the frame) + --live-pointer-inside there, inherited into
// the card, so the card parallaxes from the frame pointer and its glow fades in
// the moment you enter the frame (~50px before the card). The frame carries the
// behind-card gradient and a border shine.
const card = document.getElementById('card')
if (card) propsFor(card, ['pointer-local'])

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
  propsFor(fstateWrap, ['field-state', 'form-state'])
  fstate.addEventListener('submit', (e) => e.preventDefault())
}

// ── Demo 15 (img-color): the first two swatches are real photos from a CORS-
// enabled placeholder API (crossorigin so img-color can read their pixels); the
// other two are canvas-generated gradients (same-origin, no taint). Picking one
// swaps the <img>; img-color re-reads the dominant colour into --live-img-r/g/b
// on the card, which tints the drop shadow. pointer-local on the stage drives
// --live-px/py, and CSS casts the shadow AWAY from the cursor — the cursor is the sun.
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
// own --live-px / --live-py and can aim its pupil with atan2()/sin()/cos() —
// the angle from that eye's own centre to the cursor. No JS does the maths.
propsFor(document.querySelectorAll('.eye'), ['pointer-local'])

// ── Demo 7 flourish: bind pointer-local to the clock FACE so --live-px / --live-py
// are the cursor's position inside the watch. CSS eases the face's gradient toward
// them (magnetic pull), releasing back to centre when the pointer leaves.
const clockFace = document.getElementById('clock-face')
if (clockFace) propsFor(clockFace, ['pointer-local'])

// ── Demo 10: the size source writes --live-w / --live-h / --live-aspect on the
// resizable card (ResizeObserver). CSS restyles continuously from those.
const sizer = document.getElementById('sizer')
if (sizer) propsFor(sizer, ['size'])

// ── Demo 13 (drag): bind pointer-local AND size to the board. CSS gates on
// :active and computes each token's translate from --live-px / --live-py and the
// board's --live-w / --live-h. No JS drag handler, no pointer math in JS.
const dragboard = document.getElementById('dragboard')
if (dragboard) propsFor(dragboard, ['pointer-local', 'size'])

// ── Demo 11: bind media to the player CONTAINER; it finds the inner <video> and
// writes --live-progress etc. on the container so the ring + label inherit them.
const player = document.getElementById('player')
if (player) propsFor(player, ['media'])

// ── Demo 0 (auto): the zero-config entry. `import 'prop-for-that/auto'` attaches
// the default globals AND binds any [data-props-for] element — so the box below gets
// `size` with no imperative call at all. Imported dynamically so it runs after
// configure() above (its globals get the same typed @property treatment).
import('prop-for-that/auto')

// ── Hero panels: bind pointer-local to EACH chip so every panel gets its own
// --live-px / --live-py (0–1 within the panel) + --live-pointer-inside. CSS draws
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
