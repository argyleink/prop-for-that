import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Writer } from '../src/core/writer'

describe('Writer', () => {
  let scheduled: FrameRequestCallback[]

  beforeEach(() => {
    scheduled = []
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      scheduled.push(cb)
      return scheduled.length
    })
  })

  const tick = () => {
    const cbs = scheduled
    scheduled = []
    for (const cb of cbs) cb(0)
  }

  it('coalesces queued writes into a single frame', () => {
    const w = new Writer()
    const el = document.createElement('div')
    w.set(el, '--live-a', '1')
    w.set(el, '--live-b', '2')

    expect(el.style.getPropertyValue('--live-a')).toBe('') // nothing applied yet
    tick()
    expect(el.style.getPropertyValue('--live-a')).toBe('1')
    expect(el.style.getPropertyValue('--live-b')).toBe('2')
  })

  it('schedules at most one frame and lets the last value win', () => {
    const w = new Writer()
    const el = document.createElement('div')
    w.set(el, '--live-a', '1')
    w.set(el, '--live-a', '2')
    w.set(el, '--live-a', '3')

    expect(scheduled.length).toBe(1)
    tick()
    expect(el.style.getPropertyValue('--live-a')).toBe('3')
  })

  it('diffs against the last written value', () => {
    const w = new Writer()
    const el = document.createElement('div')
    const spy = vi.spyOn(el.style, 'setProperty')

    w.set(el, '--live-a', '1')
    tick()
    w.set(el, '--live-a', '1') // unchanged
    tick()
    expect(spy).toHaveBeenCalledTimes(1)

    w.set(el, '--live-a', '2') // changed
    tick()
    expect(spy).toHaveBeenCalledTimes(2)
  })
})
