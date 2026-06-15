import type { Source } from '../core/types'

/**
 * Lazy, per-plugin loaders keyed by `data-props-for` key. Each value is a thunk
 * that dynamically imports a single plugin module — so the table itself pulls in
 * no plugin code, and a plugin's chunk is fetched only the first time a page
 * actually asks for it (see `auto`).
 *
 * The import specifiers are static string literals on purpose: that's what lets
 * the bundler code-split each plugin into its own chunk.
 *
 * When adding a plugin, add its key here too (alongside `src/plugins/index.ts`).
 */
export const loaders: Record<string, () => Promise<Source>> = {
  'scroll-velocity': () => import('./scroll-velocity').then((m) => m.scrollVelocity),
  online: () => import('./online').then((m) => m.online),
  'page-focused': () => import('./page-focused').then((m) => m.pageFocused),
  'page-visible': () => import('./page-visible').then((m) => m.pageVisible),
  'nav-type': () => import('./nav-type').then((m) => m.navType),
  meta: () => import('./meta').then((m) => m.meta),
  network: () => import('./network').then((m) => m.network),
  battery: () => import('./battery').then((m) => m.battery),
  clock: () => import('./clock').then((m) => m.clock),
  fps: () => import('./fps').then((m) => m.fps),
  'visual-viewport': () => import('./visual-viewport').then((m) => m.visualViewport),
  keyboard: () => import('./keyboard').then((m) => m.keyboard),
  pointer: () => import('./pointer').then((m) => m.pointer),
  'pointer-local': () => import('./pointer-local').then((m) => m.pointerLocal),
  media: () => import('./media').then((m) => m.media),
  field: () => import('./field').then((m) => m.field),
  'field-state': () => import('./field-state').then((m) => m.fieldState),
  'form-state': () => import('./form-state').then((m) => m.formState),
  select: () => import('./select').then((m) => m.select),
  'color-input': () => import('./color-input').then((m) => m.colorInput),
  orientation: () => import('./orientation').then((m) => m.orientation),
  motion: () => import('./motion').then((m) => m.motion),
  geo: () => import('./geo').then((m) => m.geo),
  'cpu-pressure': () => import('./cpu-pressure').then((m) => m.cpuPressure),
  img: () => import('./img').then((m) => m.img),
  'img-color': () => import('./img-color').then((m) => m.imgColor),
  'video-color': () => import('./video-color').then((m) => m.videoColor),
}
