import { requestTick, setFlush } from './frame'
import { styleFor } from './root-style'

/**
 * Batched, diffed custom-property writer.
 *
 * Sources call `set()` as often as they like; writes are coalesced and applied
 * in the shared frame loop, diffed against the last value written to the same
 * element+property so `setProperty` only fires on real changes. Redundant sets
 * (value already on the element, nothing pending) are dropped without waking a
 * frame.
 */
export class Writer {
  private pending = new Map<HTMLElement, Map<string, string>>()
  private last = new WeakMap<HTMLElement, Map<string, string>>()

  set(target: HTMLElement, prop: string, value: string): void {
    const props = this.pending.get(target)
    if (props?.has(prop)) {
      // already queued this frame: overwrite, the frame is already scheduled
      props.set(prop, value)
      return
    }
    if (this.last.get(target)?.get(prop) === value) return // unchanged, skip
    if (props) props.set(prop, value)
    else this.pending.set(target, new Map([[prop, value]]))
    requestTick()
  }

  /** Drop cached/queued state for a property (used when a source is disposed). */
  forget(target: HTMLElement, prop: string): void {
    this.last.get(target)?.delete(prop)
    this.pending.get(target)?.delete(prop)
  }

  /** Apply all queued writes. Runs once per frame via the shared loop. */
  flush = (): void => {
    if (this.pending.size === 0) return
    for (const [target, props] of this.pending) {
      let seen = this.last.get(target)
      if (!seen) this.last.set(target, (seen = new Map()))
      const style = styleFor(target)
      for (const [prop, value] of props) {
        if (seen.get(prop) !== value) {
          style.setProperty(prop, value)
          seen.set(prop, value)
        }
      }
    }
    this.pending.clear()
  }
}

export const writer = new Writer()
setFlush(writer.flush)
