import { describe, it, expect, vi, afterEach } from 'vitest'
import { configure, register, unregister, propsFor, reset } from '../src/index'
import type { Source } from '../src/core/types'

/**
 * `@property` registration via `configure({ typed: true })`. jsdom has no
 * `CSS.registerProperty`, so we stub it and assert the calls.
 */
describe('typed (@property registration)', () => {
  afterEach(() => {
    reset()
    configure({ typed: false, defaults: undefined })
    vi.unstubAllGlobals()
  })

  function fakeSource(key: string, localName: string): Source {
    return {
      key,
      scope: 'element',
      start(ctx) {
        ctx.write(localName, 1)
        return () => {}
      },
    }
  }

  it('does not register when typed is off (default)', () => {
    const spy = vi.fn()
    vi.stubGlobal('CSS', { registerProperty: spy })
    register(fakeSource('f-off', 'off-a'))
    propsFor(document.createElement('div'), ['f-off'])
    expect(spy).not.toHaveBeenCalled()
    unregister('f-off')
  })

  it('registers each written prop once with <number>/0/inherits when typed is on', () => {
    const spy = vi.fn()
    vi.stubGlobal('CSS', { registerProperty: spy })
    configure({ typed: true })
    register(fakeSource('f-on', 'on-a'))

    propsFor(document.createElement('div'), ['f-on'])
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith({
      name: '--live-on-a',
      syntax: '<number>',
      inherits: true,
      initialValue: '0',
    })

    // a second binding of the same prop name does not re-register
    propsFor(document.createElement('div'), ['f-on'])
    expect(spy).toHaveBeenCalledTimes(1)
    unregister('f-on')
  })

  it('honours a source-declared PropSpec (syntax/initial/inherits)', () => {
    const spy = vi.fn()
    vi.stubGlobal('CSS', { registerProperty: spy })
    configure({ typed: true })
    const src: Source = {
      key: 'f-spec',
      scope: 'element',
      props: { hue: { syntax: '<angle>', initial: '0deg', inherits: false } },
      start(ctx) {
        ctx.write('hue', 90)
        return () => {}
      },
    }
    register(src)
    propsFor(document.createElement('div'), ['f-spec'])
    expect(spy).toHaveBeenCalledWith({
      name: '--live-hue',
      syntax: '<angle>',
      inherits: false,
      initialValue: '0deg',
    })
    unregister('f-spec')
  })

  it('tolerates registerProperty throwing (already registered elsewhere)', () => {
    const spy = vi.fn(() => {
      throw new Error('InvalidModificationError')
    })
    vi.stubGlobal('CSS', { registerProperty: spy })
    configure({ typed: true })
    register(fakeSource('f-throw', 'throw-a'))
    expect(() => propsFor(document.createElement('div'), ['f-throw'])).not.toThrow()
    unregister('f-throw')
  })

  it('no-ops when CSS.registerProperty is unavailable', () => {
    vi.stubGlobal('CSS', {})
    configure({ typed: true })
    register(fakeSource('f-nosupport', 'ns-a'))
    expect(() => propsFor(document.createElement('div'), ['f-nosupport'])).not.toThrow()
    unregister('f-nosupport')
  })

  it('uses a consumer default from configure({ defaults }) as the initial value', () => {
    const spy = vi.fn()
    vi.stubGlobal('CSS', { registerProperty: spy })
    configure({ typed: true, defaults: { 'def-a': 0.5 } })
    register(fakeSource('f-def', 'def-a'))
    propsFor(document.createElement('div'), ['f-def'])
    expect(spy).toHaveBeenCalledWith({
      name: '--live-def-a',
      syntax: '<number>',
      inherits: true,
      initialValue: '0.5',
    })
    unregister('f-def')
  })

  it('a consumer default overrides a source-declared initial', () => {
    const spy = vi.fn()
    vi.stubGlobal('CSS', { registerProperty: spy })
    configure({ typed: true, defaults: { 'ovr-a': '7' } })
    register({
      key: 'f-ovr',
      scope: 'element',
      props: { 'ovr-a': { initial: '3' } },
      start(ctx) {
        ctx.write('ovr-a', 1)
        return () => {}
      },
    })
    propsFor(document.createElement('div'), ['f-ovr'])
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ name: '--live-ovr-a', initialValue: '7' }),
    )
    unregister('f-ovr')
  })
})
