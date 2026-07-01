import type { Source } from '../core/types'
import { register } from '../index'

import { scrollVelocity } from './scroll-velocity'
import { online } from './online'
import { pageFocused } from './page-focused'
import { pageVisible } from './page-visible'
import { navType } from './nav-type'
import { meta } from './meta'
import { network } from './network'
import { battery } from './battery'
import { clock } from './clock'
import { fps } from './fps'
import { visualViewport } from './visual-viewport'
import { keyboard } from './keyboard'
import { pointer } from './pointer'
import { pointerLocal } from './pointer-local'
import { media } from './media'
import { field } from './field'
import { fieldState } from './field-state'
import { formState } from './form-state'
import { select } from './select'
import { colorInput } from './color-input'
import { orientation } from './orientation'
import { motion } from './motion'
import { geo } from './geo'
import { cpuPressure } from './cpu-pressure'
import { img } from './img'
import { imgColor } from './img-color'
import { videoColor } from './video-color'
import { truncated } from './truncated'
import { ua } from './ua'

export {
  scrollVelocity,
  online,
  pageFocused,
  pageVisible,
  navType,
  meta,
  network,
  battery,
  clock,
  fps,
  visualViewport,
  keyboard,
  pointer,
  pointerLocal,
  media,
  field,
  fieldState,
  formState,
  select,
  colorInput,
  orientation,
  motion,
  geo,
  cpuPressure,
  img,
  imgColor,
  videoColor,
  truncated,
  ua,
}

/** Every plugin source, for `registerPlugins()` / bulk registration. */
export const allPlugins: Source[] = [
  scrollVelocity,
  online,
  pageFocused,
  pageVisible,
  navType,
  meta,
  network,
  battery,
  clock,
  fps,
  visualViewport,
  keyboard,
  pointer,
  pointerLocal,
  media,
  field,
  fieldState,
  formState,
  select,
  colorInput,
  orientation,
  motion,
  geo,
  cpuPressure,
  img,
  imgColor,
  videoColor,
  truncated,
  ua,
]

/**
 * Register plugin sources with the core registry so they work via
 * `bind`/`global`/`data-props-for`. Defaults to registering all plugins.
 *
 *   import { registerPlugins } from 'prop-for-that/plugins'
 *   registerPlugins()                 // register everything
 *   registerPlugins(battery, clock)   // register a subset
 */
export function registerPlugins(...sources: Source[]): void {
  for (const source of sources.length ? sources : allPlugins) register(source)
}
