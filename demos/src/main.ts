import { global, bind } from 'prop-for-that'

// ── Demo 1: pointer-reactive card ──────────────────────────────────────
// ── Demo 2: scroll progress + per-section visibility ───────────────────
// One call covers the globals both demos read off :root.
global(['pointer', 'scroll'])

// ── Demo 2: each reveal panel exposes its own --live-visible-ratio ─────
document
  .querySelectorAll<HTMLElement>('[data-reveal]')
  .forEach((el) => bind(el, ['visibility']))

// ── Demo 3: the slider exposes --live-value / --live-value-pct ─────────
const range = document.getElementById('range')
if (range) bind(range, ['range'])

// That is the entire script. Everything visual is CSS reading var(--live-*).
