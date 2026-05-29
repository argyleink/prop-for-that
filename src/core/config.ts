import type { Config } from './types'

export const config: Config = {
  livePrefix: '--live-',
  constPrefix: '--const-',
  root: (typeof document !== 'undefined'
    ? document.documentElement
    : undefined) as HTMLElement,
}
