import type { Source } from '../core/types'
import { register } from '../index'

import { scrollVelocity } from './scroll-velocity'
import { online } from './online'
import { network } from './network'
import { battery } from './battery'
import { clock } from './clock'
import { fps } from './fps'
import { visualViewport } from './visual-viewport'
import { elScroll } from './el-scroll'
import { pointerLocal } from './pointer-local'
import { media } from './media'
import { field } from './field'
import { orientation } from './orientation'
import { motion } from './motion'
import { geo } from './geo'

export {
  scrollVelocity,
  online,
  network,
  battery,
  clock,
  fps,
  visualViewport,
  elScroll,
  pointerLocal,
  media,
  field,
  orientation,
  motion,
  geo,
}

/** Every plugin source, for `registerPlugins()` / bulk registration. */
export const allPlugins: Source[] = [
  scrollVelocity,
  online,
  network,
  battery,
  clock,
  fps,
  visualViewport,
  elScroll,
  pointerLocal,
  media,
  field,
  orientation,
  motion,
  geo,
]

/**
 * Register plugin sources with the core registry so they work via
 * `bind`/`global`/`data-prop`. Defaults to registering all plugins.
 *
 *   import { registerPlugins } from 'prop-for-that/plugins'
 *   registerPlugins()                 // register everything
 *   registerPlugins(battery, clock)   // register a subset
 */
export function registerPlugins(...sources: Source[]): void {
  for (const source of sources.length ? sources : allPlugins) register(source)
}
