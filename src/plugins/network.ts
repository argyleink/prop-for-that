import type { Source } from '../core/types'

interface NetworkInformation extends EventTarget {
  downlink?: number
  rtt?: number
  saveData?: boolean
  effectiveType?: string
}

/** Maps `effectiveType` to a number: slow-2g=1, 2g=2, 3g=3, 4g=4, else 0. */
export function netTypeToNumber(effectiveType: string | undefined): number {
  switch (effectiveType) {
    case 'slow-2g':
      return 1
    case '2g':
      return 2
    case '3g':
      return 3
    case '4g':
      return 4
    default:
      return 0
  }
}

/**
 * `--live-net-downlink`, `--live-net-rtt`, `--live-net-save-data` (0/1),
 * `--live-net-type` (slow-2g=1, 2g=2, 3g=3, 4g=4, else 0).
 */
export const network: Source = {
  key: 'network',
  scope: 'global',
  start(ctx) {
    const connection = (navigator as { connection?: NetworkInformation }).connection
    if (!connection) return () => {}

    const update = () => {
      ctx.write('net-downlink', connection.downlink ?? 0)
      ctx.write('net-rtt', connection.rtt ?? 0)
      ctx.write('net-save-data', connection.saveData ? 1 : 0)
      ctx.write('net-type', netTypeToNumber(connection.effectiveType))
    }
    update()
    connection.addEventListener('change', update)
    return () => connection.removeEventListener('change', update)
  },
}
