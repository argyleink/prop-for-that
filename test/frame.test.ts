import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { requestTick, setFlush, pause, resume } from '../src/core/frame'
import { config } from '../src/core/config'

/**
 * The shared frame loop's scheduling logic: pause/resume freezing and the
 * optional `liveHz` cadence cap. We stub rAF to capture the loop's callbacks
 * and drive them with a monotonic clock so we control when "frames" land.
 */
let scheduled: FrameRequestCallback[]
let now = 1e6 // monotonic across tests so a stale `lastFrame` never throttles us

beforeEach(() => {
  scheduled = []
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    scheduled.push(cb)
    return scheduled.length
  })
  vi.stubGlobal('cancelAnimationFrame', () => {})
})

afterEach(() => {
  resume() // ensure not left paused
  config.liveHz = undefined
  let guard = 0
  while (scheduled.length && guard++ < 100) tick()
  vi.unstubAllGlobals()
})

/** Advance the clock by `dt` and invoke every currently-queued frame callback. */
function tick(dt = 16): void {
  now += dt
  const cbs = scheduled
  scheduled = []
  for (const cb of cbs) cb(now)
}

describe('frame: pause / resume', () => {
  it('freezes flushing while paused and resumes it after', () => {
    const flush = vi.fn()
    setFlush(flush)

    requestTick()
    pause()
    tick() // drains the already-queued callback, but it no-ops while paused
    expect(flush).toHaveBeenCalledTimes(0)

    requestTick() // ignored: schedule() is a no-op while paused
    tick()
    expect(flush).toHaveBeenCalledTimes(0)

    resume()
    tick()
    expect(flush).toHaveBeenCalledTimes(1)
  })

  it('pause and resume are idempotent', () => {
    const flush = vi.fn()
    setFlush(flush)

    pause()
    pause()
    resume()
    resume() // a second resume must not double-schedule
    expect(scheduled.length).toBeLessThanOrEqual(1)
  })
})

describe('frame: pause while the tab is hidden', () => {
  it('freezes flushing when the document becomes hidden and resumes on return', () => {
    const flush = vi.fn()
    setFlush(flush)
    const hidden = vi.spyOn(document, 'hidden', 'get')

    hidden.mockReturnValue(true)
    document.dispatchEvent(new Event('visibilitychange'))
    requestTick() // ignored: schedule() no-ops while paused
    tick()
    expect(flush).toHaveBeenCalledTimes(0)

    hidden.mockReturnValue(false)
    document.dispatchEvent(new Event('visibilitychange')) // resume → schedules a frame
    tick()
    expect(flush).toHaveBeenCalledTimes(1)

    hidden.mockRestore()
  })
})

describe('frame: liveHz cadence cap', () => {
  it('coalesces ticks that land within the interval into one flush', () => {
    const flush = vi.fn()
    setFlush(flush)
    config.liveHz = 30 // ~33.3ms minimum gap

    requestTick()
    tick(1000) // long gap → flushes, sets the reference time
    expect(flush).toHaveBeenCalledTimes(1)

    requestTick()
    tick(10) // 10ms < 33ms → throttled, reschedules instead of flushing
    requestTick() // already rescheduled this frame → no extra work
    tick(10) // 20ms total < 33ms → still throttled
    expect(flush).toHaveBeenCalledTimes(1)

    tick(20) // 40ms total ≥ 33ms → flushes the coalesced write
    expect(flush).toHaveBeenCalledTimes(2)
  })

  it('does not throttle when liveHz is unset', () => {
    const flush = vi.fn()
    setFlush(flush)

    requestTick()
    tick(1) // tiny gap, but no cap → flushes
    requestTick()
    tick(1)
    expect(flush).toHaveBeenCalledTimes(2)
  })
})
