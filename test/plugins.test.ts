import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { netTypeToNumber } from '../src/plugins/network'
import { field } from '../src/plugins/field'
import { fieldState } from '../src/plugins/field-state'
import { formState } from '../src/plugins/form-state'
import { palette, toHex } from '../src/plugins/_color'
import { scrollVelocity } from '../src/plugins/scroll-velocity'
import { cpuPressure } from '../src/plugins/cpu-pressure'
import { img } from '../src/plugins/img'
import { videoColor } from '../src/plugins/video-color'
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

describe('field-state', () => {
  /** Real input/change events bubble; the source delegates, so tests must too. */
  const bubble = (el: Element, type: string) =>
    el.dispatchEvent(new Event(type, { bubbles: true }))

  it('seeds pristine/untouched and latches dirty/changed on input (single field)', () => {
    const el = document.createElement('input')
    el.type = 'text'
    document.body.append(el)
    const { ctx, values } = makeRecorder(el)

    const dispose = fieldState.start(ctx)
    // fresh field: pristine + untouched, nothing changed or submitted
    expect(values.dirty).toBe(0)
    expect(values.pristine).toBe(1)
    expect(values.touched).toBe(0)
    expect(values.untouched).toBe(1)
    expect(values.changed).toBe(0)
    expect(values.submitted).toBe(0)

    el.value = 'hi'
    bubble(el, 'input')
    expect(values.dirty).toBe(1)
    expect(values.pristine).toBe(0)
    expect(values.changed).toBe(1)

    // typing back to the original un-latches `changed` but NOT `dirty`
    el.value = ''
    bubble(el, 'input')
    expect(values.changed).toBe(0)
    expect(values.dirty).toBe(1)

    dispose()
    el.remove()
  })

  it('latches touched on blur (focusout)', () => {
    const el = document.createElement('input')
    el.type = 'text'
    document.body.append(el)
    const { ctx, values } = makeRecorder(el)

    const dispose = fieldState.start(ctx)
    expect(values.touched).toBe(0)
    expect(values.untouched).toBe(1)

    bubble(el, 'focusout')
    expect(values.touched).toBe(1)
    expect(values.untouched).toBe(0)

    dispose()
    el.remove()
  })

  it('aggregates state across every field when bound to a <form>', () => {
    const form = document.createElement('form')
    const name = document.createElement('input')
    name.type = 'text'
    const agree = document.createElement('input')
    agree.type = 'checkbox'
    form.append(name, agree)
    document.body.append(form)
    // bind the FORM: state aggregates over both fields
    const { ctx, values } = makeRecorder(form)

    const dispose = fieldState.start(ctx)
    expect(values.dirty).toBe(0)
    expect(values.pristine).toBe(1)

    // editing the second field still flips the form-level aggregate to dirty
    agree.checked = true
    bubble(agree, 'change')
    expect(values.dirty).toBe(1)
    expect(values.pristine).toBe(0)
    expect(values.changed).toBe(1)

    // blurring only the first field is enough to mark the form touched
    bubble(name, 'focusout')
    expect(values.touched).toBe(1)
    expect(values.untouched).toBe(0)

    form.dispatchEvent(new Event('submit'))
    expect(values.submitted).toBe(1)

    // reset clears the latches; `changed` recomputes against defaults (checkbox
    // defaultChecked is false → back to unchanged) without racing the reset.
    form.dispatchEvent(new Event('reset'))
    expect(values.dirty).toBe(0)
    expect(values.pristine).toBe(1)
    expect(values.touched).toBe(0)
    expect(values.submitted).toBe(0)
    expect(values.changed).toBe(0)

    dispose()
    form.remove()
  })

  it('resolves an inner field when bound to a wrapper, and stops after dispose', () => {
    const wrap = document.createElement('label')
    const select = document.createElement('select')
    select.innerHTML = '<option value="">--</option><option value="one">one</option>'
    wrap.append(select)
    document.body.append(wrap)
    const { ctx, values } = makeRecorder(wrap) // bind the wrapper

    const dispose = fieldState.start(ctx)
    select.value = 'one'
    bubble(select, 'change')
    expect(values.dirty).toBe(1)
    expect(values.changed).toBe(1)

    dispose()
    select.value = ''
    bubble(select, 'change')
    expect(values.dirty).toBe(1) // listener removed: no further updates

    wrap.remove()
  })
})

describe('form-state', () => {
  const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()))

  it('aggregates validity + completion over a form, and recomputes after reset', async () => {
    const form = document.createElement('form')
    const required = document.createElement('input')
    required.type = 'text'
    required.required = true
    const optional = document.createElement('input')
    optional.type = 'text'
    form.append(required, optional)
    document.body.append(form)
    const { ctx, values } = makeRecorder(form)

    const dispose = formState.start(ctx)
    // the empty required field is invalid; the optional empty field is valid
    expect(values['field-count']).toBe(2)
    expect(values['valid-count']).toBe(1)
    expect(values['invalid-count']).toBe(1)
    expect(values['all-valid']).toBe(0)
    expect(values.completion).toBe(0) // 0 of 1 required satisfied

    // fill the required field → all valid, form complete
    required.value = 'ada'
    required.dispatchEvent(new Event('input', { bubbles: true }))
    expect(values['valid-count']).toBe(2)
    expect(values['invalid-count']).toBe(0)
    expect(values['all-valid']).toBe(1)
    expect(values.completion).toBe(1)

    // a native reset reverts values; validity recomputes on the next frame
    form.reset()
    await frame()
    expect(values['all-valid']).toBe(0)
    expect(values.completion).toBe(0)

    dispose()
    form.remove()
  })

  it('excludes disabled fields from validation, and stops after dispose', () => {
    const form = document.createElement('form')
    const a = document.createElement('input')
    a.required = true
    const b = document.createElement('input')
    b.required = true
    b.disabled = true
    form.append(a, b)
    document.body.append(form)
    const { ctx, values } = makeRecorder(form)

    const dispose = formState.start(ctx)
    expect(values['field-count']).toBe(1) // disabled b is barred from validation
    expect(values['all-valid']).toBe(0) // a is required + empty

    dispose()
    a.value = 'x'
    a.dispatchEvent(new Event('input', { bubbles: true }))
    expect(values['all-valid']).toBe(0) // listener removed: would be 1 if it ran

    form.remove()
  })
})

describe('img-color palette', () => {
  /** Build an RGBA buffer by repeating each [r,g,b,count] swatch. */
  const pixels = (...swatches: [number, number, number, number][]) => {
    const out: number[] = []
    for (const [r, g, b, n] of swatches)
      for (let i = 0; i < n; i++) out.push(r, g, b, 255)
    return new Uint8ClampedArray(out)
  }

  it('extracts dominant, accent, dark, light, average, and temperature', () => {
    const data = pixels(
      [40, 60, 120, 5], // dull blue — most common → dominant
      [240, 120, 20, 2], // vivid orange — most saturated mid-tone → accent
      [20, 20, 20, 1], // near-black but above the floor → darkest
      [235, 235, 235, 1], // near-white but below the ceiling → lightest
    )
    const p = palette(data)!
    expect(p.dominant).toMatchObject({ r: 40, g: 60, b: 120 })
    expect(p.accent).toMatchObject({ r: 240, g: 120, b: 20 })
    expect(p.dark).toMatchObject({ r: 20, g: 20, b: 20 })
    expect(p.light).toMatchObject({ r: 235, g: 235, b: 235 })
    // average is the mean of all 9 opaque pixels, not the dominant
    expect(p.average).toMatchObject({ r: 104, g: 88, b: 99 })
    expect(p.temp).toBeCloseTo((104 - 99) / 255, 4) // slightly warm
  })

  it('averages the members within a bucket and computes luminance', () => {
    const p = palette(pixels([255, 0, 0, 3], [0, 0, 255, 1]))!
    expect(p.dominant).toMatchObject({ r: 255, g: 0, b: 0 }) // red ×3 wins over blue ×1
    expect(p.dominant.l).toBeCloseTo(0.2126, 3) // luminance of pure red
    // two near-identical reds land in one 4-bit bucket and are averaged
    expect(palette(pixels([250, 0, 0, 1], [240, 0, 0, 1]))!.dominant.r).toBe(245)
  })

  it('falls back to the dominant for the accent of a grayscale image', () => {
    const p = palette(pixels([100, 100, 100, 4]))!
    expect(p.accent).toEqual(p.dominant)
    expect(p.temp).toBe(0) // equal red and blue → neutral
  })

  it('reads a blue-heavy image as cool (negative temperature)', () => {
    const p = palette(pixels([20, 40, 200, 4]))!
    expect(p.temp).toBeLessThan(0)
  })

  it('returns null when nothing is opaque', () => {
    expect(palette(new Uint8ClampedArray([10, 20, 30, 0]))).toBeNull()
  })

  it('serialises a swatch to a zero-padded sRGB hex string', () => {
    expect(toHex({ r: 255, g: 0, b: 0, l: 0 })).toBe('#ff0000')
    expect(toHex({ r: 0, g: 0, b: 0, l: 0 })).toBe('#000000') // padding, not "#0"
    expect(toHex({ r: 31, g: 158, b: 138, l: 0 })).toBe('#1f9e8a')
  })
})

describe('img', () => {
  /** Define the load-state props jsdom doesn't simulate (no real decoding). */
  const fake = (el: HTMLImageElement, complete: boolean, w: number, h = w) => {
    Object.defineProperty(el, 'complete', { value: complete, configurable: true })
    Object.defineProperty(el, 'naturalWidth', { value: w, configurable: true })
    Object.defineProperty(el, 'naturalHeight', { value: h, configurable: true })
  }

  it('seeds natural size + loaded for an already-complete image', () => {
    const el = document.createElement('img')
    fake(el, true, 200, 100)
    document.body.append(el)
    const { ctx, values } = makeRecorder(el)

    const dispose = img.start(ctx)
    expect(values['natural-w']).toBe(200)
    expect(values['natural-h']).toBe(100)
    expect(values.loaded).toBe(1)
    expect(values.broken).toBe(0)

    dispose()
    el.remove()
  })

  it('flags broken on an error event', () => {
    const el = document.createElement('img')
    el.setAttribute('src', '/missing.png')
    fake(el, false, 0)
    document.body.append(el)
    const { ctx, values } = makeRecorder(el)

    const dispose = img.start(ctx)
    expect(values.loaded).toBe(0)
    expect(values.broken).toBe(0) // pending, not yet errored

    el.dispatchEvent(new Event('error'))
    expect(values.broken).toBe(1)
    expect(values.loaded).toBe(0)

    dispose()
    el.remove()
  })

  it('resolves an inner <img> when bound to a container, and stops after dispose', () => {
    const wrap = document.createElement('div')
    const el = document.createElement('img')
    fake(el, false, 0)
    wrap.append(el)
    document.body.append(wrap)
    const { ctx, values } = makeRecorder(wrap) // bind the container

    const dispose = img.start(ctx)
    expect(values.loaded).toBe(0)

    dispose()
    fake(el, true, 320, 240)
    el.dispatchEvent(new Event('load'))
    expect(values.loaded).toBe(0) // listener removed, no update

    wrap.remove()
  })
})

describe('video-color', () => {
  afterEach(() => vi.unstubAllGlobals())

  /** A <video> with a controllable requestVideoFrameCallback + readyState. */
  function fakeVideo(readyState = 2) {
    const el = document.createElement('video')
    Object.defineProperty(el, 'readyState', { value: readyState, configurable: true })
    let frameCb: ((now: number) => void) | null = null
    let handle = 0
    ;(el as any).requestVideoFrameCallback = vi.fn((cb: (now: number) => void) => {
      frameCb = cb
      return ++handle
    })
    ;(el as any).cancelVideoFrameCallback = vi.fn()
    return {
      el,
      fire: (now: number) => frameCb?.(now),
      get handle() {
        return handle
      },
    }
  }

  /** Stub OffscreenCanvas so createSampler() yields the given pixels each read. */
  function stubCanvas(pixels: () => Uint8ClampedArray) {
    vi.stubGlobal(
      'OffscreenCanvas',
      class {
        constructor(_w: number, _h: number) {}
        getContext() {
          return { drawImage() {}, getImageData: () => ({ data: pixels() }) }
        }
      },
    )
  }

  const RED = () => new Uint8ClampedArray([255, 0, 0, 255])
  const BLUE = () => new Uint8ClampedArray([0, 0, 255, 255])

  it('seeds the dominant colour from the current frame on attach', () => {
    stubCanvas(RED)
    const v = fakeVideo()
    document.body.append(v.el)
    const { ctx, values } = makeRecorder(v.el)

    const dispose = videoColor.start(ctx)
    expect(values['video']).toBe('#ff0000') // a single sRGB hex colour

    dispose()
    v.el.remove()
  })

  it('also writes a vibrant accent colour, distinct from the dominant', () => {
    // 5 muted pixels (dominant) + 1 vivid pixel (the only accent-eligible colour)
    const frame = new Uint8ClampedArray([
      90, 90, 110, 255, 90, 90, 110, 255, 90, 90, 110, 255, 90, 90, 110, 255,
      90, 90, 110, 255, 230, 40, 40, 255,
    ])
    stubCanvas(() => frame)
    const v = fakeVideo()
    document.body.append(v.el)
    const { ctx, values } = makeRecorder(v.el)

    const dispose = videoColor.start(ctx)
    expect(values['video']).toBe('#5a5a6e') // dominant = the muted majority
    expect(values['video-accent']).toBe('#e62828') // accent = the vivid minority

    dispose()
    v.el.remove()
  })

  it('re-arms every frame but only re-samples past the throttle interval', () => {
    let frame = RED
    stubCanvas(() => frame())
    const v = fakeVideo()
    document.body.append(v.el)
    const { ctx, values } = makeRecorder(v.el)

    videoColor.start(ctx) // seeds red at synthetic now = 0
    frame = BLUE

    v.fire(100) // within 250 ms of the seed → throttled, still red
    expect(values['video']).toBe('#ff0000')
    expect((v.el as any).requestVideoFrameCallback).toHaveBeenCalledTimes(2) // re-armed

    v.fire(400) // past the interval → re-samples blue
    expect(values['video']).toBe('#0000ff')

    v.el.remove()
  })

  it('cancels the frame callback and stops sampling after dispose', () => {
    let frame = RED
    stubCanvas(() => frame())
    const v = fakeVideo()
    document.body.append(v.el)
    const { ctx, values } = makeRecorder(v.el)

    const dispose = videoColor.start(ctx)
    dispose()
    expect((v.el as any).cancelVideoFrameCallback).toHaveBeenCalledWith(v.handle)

    frame = BLUE
    v.fire(1000) // disposed → ignored
    expect(values['video']).toBe('#ff0000') // still the seeded red

    v.el.remove()
  })

  it('writes nothing for a tainted (cross-origin) frame', () => {
    vi.stubGlobal(
      'OffscreenCanvas',
      class {
        constructor(_w: number, _h: number) {}
        getContext() {
          return {
            drawImage() {},
            getImageData() {
              throw new Error('tainted')
            },
          }
        }
      },
    )
    const v = fakeVideo()
    document.body.append(v.el)
    const { ctx, values } = makeRecorder(v.el)

    const dispose = videoColor.start(ctx)
    expect(values['video']).toBeUndefined()

    dispose()
    v.el.remove()
  })

  it('no-ops when bound to an element with no <video>', () => {
    const div = document.createElement('div')
    document.body.append(div)
    const { ctx, values } = makeRecorder(div)

    const dispose = videoColor.start(ctx)
    expect(values['video']).toBeUndefined()

    dispose()
    div.remove()
  })
})

describe('cpu-pressure', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('writes nothing when PressureObserver is unsupported', () => {
    const { ctx, values } = makeRecorder(document.documentElement)
    const dispose = cpuPressure.start(ctx)
    expect(values['cpu-pressure']).toBeUndefined()
    dispose()
  })

  it('seeds 0, maps states to ordered tiers (last record wins), and disconnects', () => {
    let cb: ((records: { state: string }[]) => void) | undefined
    const observe = vi.fn().mockResolvedValue(undefined)
    const disconnect = vi.fn()
    class FakePressureObserver {
      constructor(callback: (records: { state: string }[]) => void) {
        cb = callback
      }
      observe = observe
      disconnect = disconnect
    }
    vi.stubGlobal('PressureObserver', FakePressureObserver)

    const { ctx, values } = makeRecorder(document.documentElement)
    const dispose = cpuPressure.start(ctx)

    expect(values['cpu-pressure']).toBe(0) // seeded nominal
    expect(observe).toHaveBeenCalledWith('cpu', { sampleInterval: 1000 })

    cb!([{ state: 'fair' }])
    expect(values['cpu-pressure']).toBe(1)
    cb!([{ state: 'serious' }, { state: 'critical' }]) // takes the latest record
    expect(values['cpu-pressure']).toBe(3)

    dispose()
    expect(disconnect).toHaveBeenCalled()
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
