import type { Source } from '../core/types'
import { viewport } from './global/viewport'
import { size } from './element/size'
import { visibility } from './element/visibility'
import { range } from './element/range'

export const coreSources: Record<string, Source> = {
  viewport,
  size,
  visibility,
  range,
}
