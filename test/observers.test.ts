import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * The shared observers dispatch one real IntersectionObserver / ResizeObserver
 * per page to many per-element subscribers, and replay the latest entry to a
 * subscriber that joins after the browser's one-time initial delivery. jsdom has
 * neither observer, so we stub controllable fakes and drive them by hand.
 */
type IoEntry = Partial<IntersectionObserverEntry> & { target: Element }
type RoEntry = Partial<ResizeObserverEntry> & { target: Element }

let ioInstances: FakeIO[]
let roInstances: FakeRO[]

class FakeIO {
  observe = vi.fn()
  unobserve = vi.fn()
  options?: IntersectionObserverInit
  constructor(private cb: (entries: IoEntry[]) => void, options?: IntersectionObserverInit) {
    this.options = options
    ioInstances.push(this)
  }
  emit(entries: IoEntry[]) {
    this.cb(entries)
  }
}
class FakeRO {
  observe = vi.fn()
  unobserve = vi.fn()
  constructor(private cb: (entries: RoEntry[]) => void) {
    roInstances.push(this)
  }
  emit(entries: RoEntry[]) {
    this.cb(entries)
  }
}

beforeEach(() => {
  ioInstances = []
  roInstances = []
  vi.resetModules()
  vi.stubGlobal('IntersectionObserver', FakeIO)
  vi.stubGlobal('ResizeObserver', FakeRO)
})

afterEach(() => vi.unstubAllGlobals())

const io = (target: Element, isIntersecting: boolean): IoEntry => ({
  target,
  isIntersecting,
  intersectionRatio: isIntersecting ? 1 : 0,
})

describe('observeIntersection', () => {
  it('observes an element once but dispatches to every subscriber', async () => {
    const { observeIntersection } = await import('../src/core/observers')
    const el = document.createElement('div')
    const a = vi.fn()
    const b = vi.fn()
    observeIntersection(el, a)
    observeIntersection(el, b)
    expect(ioInstances[0]!.observe).toHaveBeenCalledTimes(1)

    ioInstances[0]!.emit([io(el, true)])
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(1)
  })

  it('uses near-full thresholds so visibility sources get a callback just before ratio 1', async () => {
    const { observeIntersection } = await import('../src/core/observers')
    observeIntersection(document.createElement('div'), vi.fn())
    expect(ioInstances[0]!.options?.threshold).toEqual([0, 0.98, 0.99, 0.995, 0.999, 1])
  })

  it('replays the latest entry to a late subscriber', async () => {
    const { observeIntersection } = await import('../src/core/observers')
    const el = document.createElement('div')
    observeIntersection(el, vi.fn())
    ioInstances[0]!.emit([io(el, false)]) // current state recorded

    const late = vi.fn()
    observeIntersection(el, late)
    expect(late).toHaveBeenCalledTimes(1) // got the cached state immediately
    expect((late.mock.calls[0]![0] as IoEntry).isIntersecting).toBe(false)
  })

  it('unobserves only when the last subscriber leaves', async () => {
    const { observeIntersection } = await import('../src/core/observers')
    const el = document.createElement('div')
    const offA = observeIntersection(el, vi.fn())
    const offB = observeIntersection(el, vi.fn())

    offA()
    expect(ioInstances[0]!.unobserve).not.toHaveBeenCalled()
    offB()
    expect(ioInstances[0]!.unobserve).toHaveBeenCalledTimes(1)
  })
})

describe('observeResize', () => {
  it('shares one observer and replays the latest size to a late subscriber', async () => {
    const { observeResize } = await import('../src/core/observers')
    const el = document.createElement('div')
    const a = vi.fn()
    observeResize(el, a)
    expect(roInstances[0]!.observe).toHaveBeenCalledTimes(1)

    const entry = { target: el } as RoEntry
    roInstances[0]!.emit([entry])
    expect(a).toHaveBeenCalledTimes(1)

    const late = vi.fn()
    observeResize(el, late)
    expect(roInstances[0]!.observe).toHaveBeenCalledTimes(1) // not re-observed
    expect(late).toHaveBeenCalledTimes(1) // replayed current size
  })
})
