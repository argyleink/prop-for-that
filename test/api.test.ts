import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  propsFor,
  unbind,
  reset,
  register,
  unregister,
  configure,
} from '../src/index'
import type { Disposer, Source } from '../src/index'
import { field } from '../src/plugins/field'

/**
 * The public API uses the shared `writer`, which queues writes and flushes via
 * the shared frame loop's `requestAnimationFrame`. We stub rAF to collect the
 * loop's callbacks and run them on demand to flush queued custom properties.
 */
let scheduled: FrameRequestCallback[]

const flushFrames = () => {
  // a frame may re-schedule (continuous samplers), but the API sources used
  // here are event-driven, so one drain settles the writer.
  const cbs = scheduled
  scheduled = []
  for (const cb of cbs) cb(0)
}

beforeEach(() => {
  scheduled = []
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    scheduled.push(cb)
    return scheduled.length
  })
  vi.stubGlobal('cancelAnimationFrame', () => {})
})

afterEach(() => {
  reset()
  // Drain any frames the shared loop left queued so its internal scheduling
  // state returns to idle before the next test stubs rAF again.
  let guard = 0
  while (scheduled.length && guard++ < 100) flushFrames()
  vi.unstubAllGlobals()
})

/** A DOM-free source for testing routing / teardown / property cleanup. */
function makeFakeSource(key = 'fake') {
  const spy = vi.fn()
  const source: Source = {
    key,
    scope: 'element',
    start(ctx) {
      ctx.write('x', 1)
      return spy
    },
  }
  return { source, spy }
}

describe('propsFor: range (element)', () => {
  it('writes --live-value on the element after input + flush', () => {
    const input = document.createElement('input')
    input.type = 'range'
    input.min = '0'
    input.max = '100'
    input.value = '50'
    document.body.append(input)

    const dispose = propsFor(input, ['range'])
    flushFrames()
    expect(input.style.getPropertyValue('--live-value')).toBe('50')
    expect(input.style.getPropertyValue('--live-value-pct')).toBe('0.5')

    input.value = '75'
    input.dispatchEvent(new Event('input'))
    flushFrames()
    expect(input.style.getPropertyValue('--live-value')).toBe('75')
    expect(input.style.getPropertyValue('--live-value-pct')).toBe('0.75')

    dispose()
    input.remove()
  })
})

describe('propsFor: container-aware', () => {
  it('writes on the WRAPPER when bound to a div holding a range input', () => {
    const wrap = document.createElement('div')
    const input = document.createElement('input')
    input.type = 'range'
    input.min = '0'
    input.max = '10'
    input.value = '5'
    wrap.append(input)
    document.body.append(wrap)

    const dispose = propsFor(wrap, ['range'])
    flushFrames()
    // props land on the wrapper, not the inner input
    expect(wrap.style.getPropertyValue('--live-value')).toBe('5')
    expect(input.style.getPropertyValue('--live-value')).toBe('')

    input.value = '8'
    input.dispatchEvent(new Event('input'))
    flushFrames()
    expect(wrap.style.getPropertyValue('--live-value')).toBe('8')

    dispose()
    wrap.remove()
  })
})

describe('propsFor: disposer ownership', () => {
  it('disposing one call does not tear down another call on the same element', () => {
    const input = document.createElement('input')
    input.type = 'range'
    input.min = '0'
    input.max = '100'
    input.value = '10'
    document.body.append(input)

    register(field) // field is a plugin, register it so it can route
    const a = propsFor(input, ['range'])
    const b = propsFor(input, ['field'])
    flushFrames()
    expect(input.style.getPropertyValue('--live-value')).toBe('10')
    expect(input.style.getPropertyValue('--live-length')).toBe('2') // field wrote too

    // tear down b (field); a (range) must keep working
    b()
    expect(input.style.getPropertyValue('--live-length')).toBe('') // field cleaned up
    input.value = '60'
    input.dispatchEvent(new Event('input'))
    flushFrames()
    expect(input.style.getPropertyValue('--live-value')).toBe('60') // range still live

    a()
    unregister('field')
    input.remove()
  })
})

describe('propsFor: property cleanup on dispose', () => {
  it('removes the written --live-* property from the element', () => {
    const input = document.createElement('input')
    input.type = 'range'
    input.value = '30'
    document.body.append(input)

    const dispose = propsFor(input, ['range'])
    flushFrames()
    expect(input.style.getPropertyValue('--live-value')).toBe('30')

    dispose()
    expect(input.style.getPropertyValue('--live-value')).toBe('')
    expect(input.style.getPropertyValue('--live-value-pct')).toBe('')

    input.remove()
  })
})

describe('propsFor: global routing to documentElement', () => {
  it('binds to document.documentElement when no target is given', () => {
    const { source, spy } = makeFakeSource('global-fake')
    register(source)

    const dispose = propsFor(['global-fake'])
    flushFrames()
    // the fake wrote --live-x; with no target it routed to <html>
    expect(document.documentElement.style.getPropertyValue('--live-x')).toBe('1')
    expect(spy).not.toHaveBeenCalled()

    dispose()
    expect(spy).toHaveBeenCalledTimes(1) // disposer ran on teardown
    expect(document.documentElement.style.getPropertyValue('--live-x')).toBe('')

    unregister('global-fake')
  })
})

describe('register / unregister / unknown keys', () => {
  it('register makes a fake source usable; its start runs and writes', () => {
    const el = document.createElement('div')
    document.body.append(el)
    const { source, spy } = makeFakeSource('fake')
    register(source)

    const dispose = propsFor(el, ['fake'])
    flushFrames()
    expect(el.style.getPropertyValue('--live-x')).toBe('1')

    dispose()
    expect(spy).toHaveBeenCalledTimes(1)
    unregister('fake')
    el.remove()
  })

  it('unregister removes the key (a later bind no-ops / warns)', () => {
    const el = document.createElement('div')
    document.body.append(el)
    const { source } = makeFakeSource('fake')
    register(source)
    unregister('fake')

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const dispose = propsFor(el, ['fake'])
    flushFrames()
    expect(el.style.getPropertyValue('--live-x')).toBe('')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('unknown source "fake"'))

    warn.mockRestore()
    dispose()
    el.remove()
  })

  it('warns on an unknown key', () => {
    const el = document.createElement('div')
    document.body.append(el)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const dispose = propsFor(el, ['definitely-not-a-source'])
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('unknown source'))

    warn.mockRestore()
    dispose()
    el.remove()
  })
})

describe('unbind', () => {
  it('detaches a specific key and removes its written props', () => {
    const el = document.createElement('div')
    document.body.append(el)
    const { source, spy } = makeFakeSource('fake')
    register(source)

    propsFor(el, ['fake'])
    flushFrames()
    expect(el.style.getPropertyValue('--live-x')).toBe('1')

    unbind(el, ['fake'])
    expect(spy).toHaveBeenCalledTimes(1)
    expect(el.style.getPropertyValue('--live-x')).toBe('')

    unregister('fake')
    el.remove()
  })

  it('detaches all keys when none are specified', () => {
    const el = document.createElement('div')
    document.body.append(el)
    const a = makeFakeSource('fake-a')
    const b = makeFakeSource('fake-b')
    register(a.source)
    register(b.source)

    propsFor(el, ['fake-a', 'fake-b'])
    unbind(el)
    expect(a.spy).toHaveBeenCalledTimes(1)
    expect(b.spy).toHaveBeenCalledTimes(1)

    unregister('fake-a')
    unregister('fake-b')
    el.remove()
  })
})

describe('reset', () => {
  it('tears down every active binding and runs each disposer', () => {
    const el1 = document.createElement('div')
    const el2 = document.createElement('div')
    document.body.append(el1, el2)
    const a = makeFakeSource('fake-a')
    const b = makeFakeSource('fake-b')
    register(a.source)
    register(b.source)

    propsFor(el1, ['fake-a'])
    propsFor(el2, ['fake-b'])
    flushFrames()

    reset()
    expect(a.spy).toHaveBeenCalledTimes(1)
    expect(b.spy).toHaveBeenCalledTimes(1)
    expect(el1.style.getPropertyValue('--live-x')).toBe('')
    expect(el2.style.getPropertyValue('--live-x')).toBe('')

    unregister('fake-a')
    unregister('fake-b')
    el1.remove()
    el2.remove()
  })
})

describe('propsFor: NodeList / array routing', () => {
  it('binds each element in an array', () => {
    const el1 = document.createElement('div')
    const el2 = document.createElement('div')
    document.body.append(el1, el2)
    const { source } = makeFakeSource('fake')
    register(source)

    const dispose = propsFor([el1, el2], ['fake'])
    flushFrames()
    expect(el1.style.getPropertyValue('--live-x')).toBe('1')
    expect(el2.style.getPropertyValue('--live-x')).toBe('1')

    dispose()
    expect(el1.style.getPropertyValue('--live-x')).toBe('')
    expect(el2.style.getPropertyValue('--live-x')).toBe('')

    unregister('fake')
    el1.remove()
    el2.remove()
  })

  it('binds each element in a NodeList', () => {
    const wrap = document.createElement('div')
    wrap.innerHTML = '<span class="t"></span><span class="t"></span>'
    document.body.append(wrap)
    const { source } = makeFakeSource('fake')
    register(source)

    const nodes = wrap.querySelectorAll('.t')
    const dispose = propsFor(nodes, ['fake'])
    flushFrames()
    nodes.forEach((n) =>
      expect((n as HTMLElement).style.getPropertyValue('--live-x')).toBe('1'),
    )

    dispose()
    unregister('fake')
    wrap.remove()
  })
})

describe('propsFor: edge cases', () => {
  it('returns a no-op disposer for an empty key list', () => {
    const el = document.createElement('div')
    const dispose: Disposer = propsFor(el, [])
    expect(() => dispose()).not.toThrow()
  })

  it('skips re-binding a key already active on the element', () => {
    const el = document.createElement('div')
    document.body.append(el)
    const { source, spy } = makeFakeSource('fake')
    register(source)

    const a = propsFor(el, ['fake'])
    const b = propsFor(el, ['fake']) // duplicate key, should be ignored
    flushFrames()

    // disposing the second call (which started nothing) must not tear down 'fake'
    b()
    expect(spy).not.toHaveBeenCalled()
    expect(el.style.getPropertyValue('--live-x')).toBe('1')

    a()
    expect(spy).toHaveBeenCalledTimes(1)

    unregister('fake')
    el.remove()
  })
})

describe('configure', () => {
  it('overrides the live prefix used by writes', () => {
    configure({ livePrefix: '--x-' })
    try {
      const el = document.createElement('div')
      document.body.append(el)
      const { source } = makeFakeSource('fake')
      register(source)

      const dispose = propsFor(el, ['fake'])
      flushFrames()
      expect(el.style.getPropertyValue('--x-x')).toBe('1')

      dispose()
      unregister('fake')
      el.remove()
    } finally {
      configure({ livePrefix: '--live-' }) // restore for other tests
    }
  })
})
