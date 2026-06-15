import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { propsFor, register, reset } from '../src/index'
import { field } from '../src/plugins/field'
import { imgColor } from '../src/plugins/img-color'
import { fps } from '../src/plugins/fps'

/**
 * The shared rAF loop must idle the instant its work is done. A genuine
 * per-frame sampler (`onFrame`) legitimately pins it alive, but event-driven
 * sources like `field` and async ones like `img-color` must only ever wake
 * *one-shot* frames to flush a write — they must never leave a frame
 * perpetually re-armed. Any always-on rAF demotes compositor animations, so
 * this guards that boundary.
 *
 * We stub rAF to capture scheduled callbacks; `scheduled.length` is the live
 * "is a frame queued?" signal. After work settles it must return to 0 and stay
 * there. `fps` (a real per-frame sampler) is the positive control — it proves
 * the harness actually *detects* a running loop, so the assertions on `field` /
 * `img-color` aren't passing vacuously.
 */
let scheduled: FrameRequestCallback[]
let now = 1e6 // monotonic so a stale `lastFrame` never throttles us

beforeEach(() => {
  scheduled = []
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    scheduled.push(cb)
    return scheduled.length
  })
  vi.stubGlobal('cancelAnimationFrame', () => {})
  register(field)
  register(imgColor)
  register(fps)
})

afterEach(() => {
  reset()
  let guard = 0
  while (scheduled.length && guard++ < 100) tick()
  vi.unstubAllGlobals()
})

/** Advance the clock and invoke every currently-queued frame callback. */
function tick(dt = 16): void {
  now += dt
  const cbs = scheduled
  scheduled = []
  for (const cb of cbs) cb(now)
}

/** Run frames until the loop goes idle (or the guard trips on a runaway loop). */
function settle(max = 50): void {
  let guard = 0
  while (scheduled.length && guard++ < max) tick()
}

describe('rAF loop: event-driven sources never pin a continuous frame', () => {
  it('field wakes one frame per change, then idles', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    propsFor(input, ['field'])

    // seeding the props wakes a single one-shot frame…
    expect(scheduled.length).toBe(1)
    settle()
    expect(scheduled.length).toBe(0) // …then idles, never re-arming

    // a real edit wakes exactly one frame, which flushes and idles again
    input.value = 'hello'
    input.dispatchEvent(new Event('input'))
    expect(scheduled.length).toBe(1)
    settle()
    expect(scheduled.length).toBe(0)
    expect(input.style.getPropertyValue('--live-length')).toBe('5')

    // sitting idle never schedules another frame
    for (let i = 0; i < 10; i++) tick()
    expect(scheduled.length).toBe(0)

    input.remove()
  })

  it('img-color never keeps the loop running', () => {
    const image = document.createElement('img')
    document.body.appendChild(image)
    propsFor(image, ['img-color'])

    settle()
    expect(scheduled.length).toBe(0) // no per-frame sampler pinned

    // a load / src-swap fires its handler; still no perpetual frame
    image.dispatchEvent(new Event('load'))
    settle()
    expect(scheduled.length).toBe(0)

    for (let i = 0; i < 10; i++) tick()
    expect(scheduled.length).toBe(0)

    image.remove()
  })

  it('fps (positive control) keeps the loop alive, then idles once unbound', () => {
    propsFor(['fps']) // global per-frame sampler

    // a real sampler re-arms every frame: the loop must NOT idle while bound
    expect(scheduled.length).toBe(1)
    for (let i = 0; i < 5; i++) {
      tick()
      expect(scheduled.length).toBe(1)
    }

    // unbinding it lets the loop finally settle — confirming the loop genuinely
    // stops when nothing needs it (so the field/img-color cases above are real)
    reset()
    settle()
    expect(scheduled.length).toBe(0)
  })
})
