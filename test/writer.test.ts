import { describe, it, expect, vi } from 'vitest'
import { Writer } from '../src/core/writer'

/**
 * The Writer no longer schedules its own rAF; the shared frame loop calls
 * `flush()`. So we test it in isolation: queue with `set()`, then call
 * `flush()` directly.
 */
describe('Writer', () => {
  it('applies all queued writes on a single flush', () => {
    const w = new Writer()
    const el = document.createElement('div')

    w.set(el, '--live-a', '1')
    w.set(el, '--live-b', '2')
    expect(el.style.getPropertyValue('--live-a')).toBe('') // nothing applied yet
    expect(el.style.getPropertyValue('--live-b')).toBe('')

    w.flush()
    expect(el.style.getPropertyValue('--live-a')).toBe('1')
    expect(el.style.getPropertyValue('--live-b')).toBe('2')
  })

  it('lets the last queued value win before a flush', () => {
    const w = new Writer()
    const el = document.createElement('div')

    w.set(el, '--live-a', '1')
    w.set(el, '--live-a', '2')
    w.set(el, '--live-a', '3')
    w.flush()

    expect(el.style.getPropertyValue('--live-a')).toBe('3')
  })

  it('skips a set whose value equals the last flushed value', () => {
    const w = new Writer()
    const el = document.createElement('div')
    const spy = vi.spyOn(el.style, 'setProperty')

    w.set(el, '--live-a', '1')
    w.flush()
    expect(spy).toHaveBeenCalledTimes(1)

    // identical value, nothing pending → dropped, never reaches setProperty
    w.set(el, '--live-a', '1')
    w.flush()
    expect(spy).toHaveBeenCalledTimes(1)

    // a real change applies
    w.set(el, '--live-a', '2')
    w.flush()
    expect(spy).toHaveBeenCalledTimes(2)
    expect(el.style.getPropertyValue('--live-a')).toBe('2')
  })

  it('coalesces multiple flushes with no pending writes into no-ops', () => {
    const w = new Writer()
    const el = document.createElement('div')
    const spy = vi.spyOn(el.style, 'setProperty')

    w.flush() // nothing pending
    w.set(el, '--live-a', '1')
    w.flush()
    w.flush() // pending already cleared
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('forget() lets a re-set re-apply an identical value', () => {
    const w = new Writer()
    const el = document.createElement('div')
    const spy = vi.spyOn(el.style, 'setProperty')

    w.set(el, '--live-a', '1')
    w.flush()
    expect(spy).toHaveBeenCalledTimes(1)

    // without forget, an identical set is dropped
    w.set(el, '--live-a', '1')
    w.flush()
    expect(spy).toHaveBeenCalledTimes(1)

    // forget clears the cached last value so the same value re-applies
    w.forget(el, '--live-a')
    w.set(el, '--live-a', '1')
    w.flush()
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('forget() drops a queued (not-yet-flushed) write', () => {
    const w = new Writer()
    const el = document.createElement('div')

    w.set(el, '--live-a', '1')
    w.forget(el, '--live-a') // drop before it flushes
    w.flush()
    expect(el.style.getPropertyValue('--live-a')).toBe('')
  })

  it('diffs per element+property independently', () => {
    const w = new Writer()
    const a = document.createElement('div')
    const b = document.createElement('div')

    w.set(a, '--live-x', '1')
    w.set(b, '--live-x', '1')
    w.flush()
    expect(a.style.getPropertyValue('--live-x')).toBe('1')
    expect(b.style.getPropertyValue('--live-x')).toBe('1')

    const spyA = vi.spyOn(a.style, 'setProperty')
    w.set(a, '--live-x', '1') // unchanged on a → skipped
    w.set(b, '--live-x', '2') // changed on b
    w.flush()
    expect(spyA).toHaveBeenCalledTimes(0)
    expect(b.style.getPropertyValue('--live-x')).toBe('2')
  })
})
