/**
 * Batched, diffed custom-property writer.
 *
 * Sources call `set()` as often as they like; writes are coalesced into a single
 * `requestAnimationFrame` flush, and each value is diffed against the last one
 * written to the same element+property so `setProperty` only fires on real
 * changes. One flush per frame, max.
 */
export class Writer {
  private pending = new Map<HTMLElement, Map<string, string>>()
  private last = new WeakMap<HTMLElement, Map<string, string>>()
  private frame = 0

  set(target: HTMLElement, prop: string, value: string): void {
    let props = this.pending.get(target)
    if (!props) this.pending.set(target, (props = new Map()))
    props.set(prop, value)

    if (!this.frame) {
      this.frame =
        typeof requestAnimationFrame === 'function'
          ? requestAnimationFrame(this.flush)
          : (this.flush(), 0)
    }
  }

  /** Apply queued writes immediately (used by the sync `<head>` path). */
  flush = (): void => {
    this.frame = 0
    for (const [target, props] of this.pending) {
      let seen = this.last.get(target)
      if (!seen) this.last.set(target, (seen = new Map()))
      for (const [prop, value] of props) {
        if (seen.get(prop) !== value) {
          target.style.setProperty(prop, value)
          seen.set(prop, value)
        }
      }
    }
    this.pending.clear()
  }
}

export const writer = new Writer()
