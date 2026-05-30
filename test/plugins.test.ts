import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { netTypeToNumber } from '../src/plugins/network'
import { field } from '../src/plugins/field'
import { scrollVelocity } from '../src/plugins/scroll-velocity'
import type { SourceContext } from '../src/core/types'

/** Collects the latest value written per local name, ignoring cadence prefix. */
function makeRecorder(target: HTMLElement) {
  const values: Record<string, number | string> = {}
  const ctx: SourceContext = {
    target,
    config: { livePrefix: '--live-', constPrefix: '--const-', root: target, typed: false },
    write(localName, value) {
      values[localName] = value
    },
  }
  return { ctx, values }
}

describe('network netTypeToNumber', () => {
  it('maps effectiveType strings to numbers', () => {
    expect(netTypeToNumber('slow-2g')).toBe(1)
    expect(netTypeToNumber('2g')).toBe(2)
    expect(netTypeToNumber('3g')).toBe(3)
    expect(netTypeToNumber('4g')).toBe(4)
    expect(netTypeToNumber('5g')).toBe(0)
    expect(netTypeToNumber(undefined)).toBe(0)
  })
})

describe('field', () => {
  it('writes length, empty and valid from a text input', () => {
    const el = document.createElement('input')
    el.type = 'text'
    el.required = true
    document.body.append(el)
    const { ctx, values } = makeRecorder(el)

    const dispose = field.start(ctx)
    // seeded: empty + required → invalid
    expect(values.length).toBe(0)
    expect(values.empty).toBe(1)
    expect(values.valid).toBe(0)

    el.value = 'hi'
    el.dispatchEvent(new Event('input'))
    expect(values.length).toBe(2)
    expect(values.empty).toBe(0)
    expect(values.valid).toBe(1)

    dispose()
    el.remove()
  })

  it('updates on a change event (covers <select>)', () => {
    const wrap = document.createElement('div')
    const select = document.createElement('select')
    select.innerHTML = '<option value="">--</option><option value="one">one</option>'
    wrap.append(select)
    document.body.append(wrap)
    // container-aware: bind the wrapper, it resolves the inner field
    const { ctx, values } = makeRecorder(wrap)

    const dispose = field.start(ctx)
    expect(values.length).toBe(0)
    expect(values.empty).toBe(1)

    select.value = 'one'
    select.dispatchEvent(new Event('change'))
    expect(values.length).toBe(3)
    expect(values.empty).toBe(0)

    dispose()
    wrap.remove()
  })

  it('stops updating after dispose', () => {
    const el = document.createElement('input')
    el.type = 'text'
    document.body.append(el)
    const { ctx, values } = makeRecorder(el)

    const dispose = field.start(ctx)
    dispose()

    el.value = 'changed'
    el.dispatchEvent(new Event('input'))
    expect(values.length).toBe(0) // listener removed, still seeded value

    el.remove()
  })
})

describe('scroll-velocity', () => {
  let scheduled: FrameRequestCallback[]

  beforeEach(() => {
    scheduled = []
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      scheduled.push(cb)
      return scheduled.length
    })
    vi.stubGlobal('cancelAnimationFrame', () => {})
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true, writable: true })
  })

  /** Drain currently-queued frame callbacks. The shared loop re-schedules while
   *  a sampler is active, so each drain may enqueue the next frame. */
  const tick = () => {
    const cbs = scheduled
    scheduled = []
    for (const cb of cbs) cb(0)
  }

  afterEach(() => {
    // Drain any frames the shared loop left queued so its internal `id`/`running`
    // state returns to idle before the next test stubs rAF again. (Disposing the
    // source empties frameFns; running the trailing frame resets `id` to 0.)
    let guard = 0
    while (scheduled.length && guard++ < 100) tick()
    vi.unstubAllGlobals()
  })

  it('idles until a scroll event wakes the sampler', () => {
    const { ctx, values } = makeRecorder(document.documentElement)
    const dispose = scrollVelocity.start(ctx)

    // seeded at rest, no frame scheduled by merely starting
    expect(values['scroll-velocity']).toBe(0)
    expect(values['scroll-direction']).toBe(0)
    expect(scheduled.length).toBe(0)

    // moving scrollY without a scroll event does nothing
    Object.defineProperty(window, 'scrollY', { value: 100, configurable: true })
    expect(scheduled.length).toBe(0)

    dispose()
  })

  it('reports direction and velocity sign after waking on scroll', () => {
    const { ctx, values } = makeRecorder(document.documentElement)
    const dispose = scrollVelocity.start(ctx)

    // scroll down: wake, then run the scheduled frame
    Object.defineProperty(window, 'scrollY', { value: 100, configurable: true })
    window.dispatchEvent(new Event('scroll'))
    expect(scheduled.length).toBe(1) // waking scheduled a frame
    tick()
    expect(values['scroll-velocity']).toBeGreaterThan(0)
    expect(values['scroll-direction']).toBe(1)

    // scroll up: the loop is still active and re-scheduled, drive the next frame
    Object.defineProperty(window, 'scrollY', { value: 40, configurable: true })
    tick()
    expect(values['scroll-velocity']).toBeLessThan(0)
    expect(values['scroll-direction']).toBe(-1)

    dispose()
  })

  it('decays velocity to 0 on idle frames then stops the sampler', () => {
    const { ctx, values } = makeRecorder(document.documentElement)
    const dispose = scrollVelocity.start(ctx)

    Object.defineProperty(window, 'scrollY', { value: 200, configurable: true })
    window.dispatchEvent(new Event('scroll'))
    tick()
    expect(values['scroll-velocity']).toBeGreaterThan(0)

    // scrollY no longer changes: velocity eases toward 0 over subsequent frames,
    // and the sampler self-stops (no more frames scheduled) once it hits 0.
    let guard = 0
    while (scheduled.length && guard++ < 100) tick()
    expect(values['scroll-velocity']).toBe(0)
    expect(values['scroll-direction']).toBe(0)
    expect(scheduled.length).toBe(0) // sampler stopped itself

    dispose()
  })
})
