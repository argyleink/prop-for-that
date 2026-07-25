import type { Disposer } from './types'

/** The shared do-nothing disposer, for sources that attached nothing. */
export const noop: Disposer = () => {}
