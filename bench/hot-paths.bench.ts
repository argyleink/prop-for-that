import { bench, describe } from 'vitest'
import { writer } from '../src/core/writer'
import { onWindow } from '../src/core/window-events'
import { register, propsFor } from '../src/index'
import { pointer } from '../src/plugins/pointer'
import type { Source, SourceContext } from '../src/core/types'

// Park the frame loop: rAF never fires, so writes queue until we flush manually.
// Keeps every bench deterministic and measures only library code.
;(globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame = () => 1

const el = document.createElement('div')
document.body.appendChild(el)

// --- writer -----------------------------------------------------------------

describe('writer', () => {
  writer.set(el, '--live-warm', '1')
  writer.flush()

  bench('set — redundant (unchanged value)', () => {
    for (let i = 0; i < 8; i++) writer.set(el, '--live-warm', '1')
  })

  let n = 0
  bench('set ×8 changing + flush', () => {
    n++
    for (let i = 0; i < 8; i++) writer.set(el, `--live-p${i}`, String(n))
    writer.flush()
  })
})

// --- ctx.write (source → writer pipeline) ------------------------------------

let ctx: SourceContext
const fake: Source = {
  key: 'bench-fake',
  scope: 'element',
  gate: false,
  start(c) {
    ctx = c
    return () => {}
  },
}
register(fake)
propsFor(el, ['bench-fake'])

describe('ctx.write', () => {
  ctx.write('a', 1)
  ctx.write('b', 2)
  ctx.write('c', 3)
  ctx.write('d', 4)
  writer.flush()

  bench('redundant (unchanged values)', () => {
    ctx.write('a', 1)
    ctx.write('b', 2)
    ctx.write('c', 3)
    ctx.write('d', 4)
  })

  let n = 0
  bench('changing ×4 + flush', () => {
    n++
    ctx.write('a', n)
    ctx.write('b', n + 1)
    ctx.write('c', n + 2)
    ctx.write('d', n + 3)
    writer.flush()
  })
})

// --- onWindow dispatch --------------------------------------------------------

describe('events', () => {
  let hits = 0
  for (let i = 0; i < 8; i++) onWindow('bench-evt', () => hits++)
  const evt = new Event('bench-evt')

  bench('onWindow dispatch → 8 handlers', () => {
    window.dispatchEvent(evt)
  })

  // full path: window pointermove → pointer source → ctx.write ×4 → flush
  register(pointer)
  propsFor([pointer.key])
  let x = 0
  bench('pointermove → pointer source → flush', () => {
    x = (x + 7) % 1024
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: x, clientY: x }))
    writer.flush()
  })
})
