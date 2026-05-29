import { describe, it, expect, vi, beforeEach } from 'vitest'
import { netTypeToNumber } from '../src/plugins/network'
import { field } from '../src/plugins/field'
import { scrollVelocity } from '../src/plugins/scroll-velocity'
import type { SourceContext } from '../src/core/types'

/** Collects the latest value written per local name, ignoring cadence prefix. */
function makeRecorder(target: HTMLElement) {
  const values: Record<string, number | string> = {}
  const ctx: SourceContext = {
    target,
    config: { livePrefix: '--live-', constPrefix: '--const-', root: target },
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
  })

  const tick = () => {
    const cbs = scheduled
    scheduled = []
    for (const cb of cbs) cb(0)
  }

  it('reports direction sign from the scroll delta', () => {
    const { ctx, values } = makeRecorder(document.documentElement)
    const dispose = scrollVelocity.start(ctx)
    expect(values['scroll-direction']).toBe(0)

    Object.defineProperty(window, 'scrollY', { value: 100, configurable: true })
    tick()
    expect(values['scroll-velocity']).toBeGreaterThan(0)
    expect(values['scroll-direction']).toBe(1)

    Object.defineProperty(window, 'scrollY', { value: 40, configurable: true })
    tick()
    expect(values['scroll-velocity']).toBeLessThan(0)
    expect(values['scroll-direction']).toBe(-1)

    dispose()
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true })
  })
})
