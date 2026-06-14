import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

type IoEntry = Partial<IntersectionObserverEntry> & { target: Element }

let ioCb: ((entries: IoEntry[]) => void) | null = null

class FakeIO {
  observe() {}
  unobserve() {}
  disconnect() {}
  constructor(cb: (entries: IoEntry[]) => void) {
    ioCb = cb
  }
}

beforeEach(() => {
  ioCb = null
  vi.resetModules()
  vi.stubGlobal('IntersectionObserver', FakeIO)
})

afterEach(() => vi.unstubAllGlobals())

describe('visibility source', () => {
  it('latches once the element is fully contained even if the ratio stalls just below 1', async () => {
    const { visibility } = await import('../src/sources/element/visibility')
    const target = document.createElement('div')
    const writes = new Map<string, string>()
    const ctx = {
      target,
      write: (key: string, value: string | number, cadence = 'live') => {
        writes.set(`${cadence}:${key}`, String(value))
      },
    }

    const dispose = visibility.start(ctx as never)
    expect(writes.get('live:visible')).toBe('0')
    expect(writes.get('const:has-entered')).toBe('0')

    ioCb!([
      {
        target,
        isIntersecting: true,
        intersectionRatio: 0.98,
        boundingClientRect: { top: 0, right: 100, bottom: 104, left: 0 } as DOMRectReadOnly,
        rootBounds: { top: 0, right: 100, bottom: 100, left: 0 } as DOMRectReadOnly,
      },
    ])
    expect(writes.get('live:visible')).toBe('0')
    expect(writes.get('const:has-entered')).toBe('0')

    ioCb!([
      {
        target,
        isIntersecting: true,
        intersectionRatio: 0.999,
        boundingClientRect: { top: 0.5, right: 99.5, bottom: 99.5, left: 0.5 } as DOMRectReadOnly,
        rootBounds: { top: 0, right: 100, bottom: 100, left: 0 } as DOMRectReadOnly,
      },
    ])
    expect(writes.get('live:visible')).toBe('1')
    expect(writes.get('const:has-entered')).toBe('1')

    ioCb!([
      {
        target,
        isIntersecting: true,
        intersectionRatio: 0.999,
        boundingClientRect: { top: -2, right: 100, bottom: 98, left: 0 } as DOMRectReadOnly,
        rootBounds: { top: 0, right: 100, bottom: 100, left: 0 } as DOMRectReadOnly,
      },
    ])
    expect(writes.get('live:visible')).toBe('0')
    expect(writes.get('const:has-entered')).toBe('1')

    dispose()
  })
})
