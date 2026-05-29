import { global, bind } from 'prop-for-that'

// ── The entire reactive wiring. JS exposes state; CSS does all the reacting.
// Demo 1 (pointer-reactive card) and the page accent read globals off :root.
global(['pointer'])

// ── Demo 2: each panel exposes its own --live-visible-ratio — the scroll-
// TRIGGERED state CSS can't latch on its own. The continuous scroll motion on
// this page (progress bar, parallax) is native CSS scroll-driven animation
// (animation-timeline: scroll()/view()) — no library, runs on the compositor.
document
  .querySelectorAll<HTMLElement>('[data-reveal]')
  .forEach((el) => bind(el, ['visibility']))

// ── Demo 3: bind the slider's CONTAINER. The range source finds the inner
// <input> but writes --live-value / --live-value-pct on the container, so the
// big gauge AND the slider both inherit the value (custom props inherit down).
const meter = document.getElementById('meter')
if (meter) bind(meter, ['range'])

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
