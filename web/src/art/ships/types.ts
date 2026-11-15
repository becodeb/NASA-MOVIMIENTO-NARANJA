export type ShipConfig = {
  structure: 'light' | 'reinforced'
  propulsion: 'chemical' | 'combined'
  power: 'solar' | 'nuclear'
  lifeSupport: 'consumables' | 'regenerative'
  comms: 'standard' | 'redundant'
}

export type ShipPart = keyof ShipConfig
export type ThrustMode = 'off' | 'chemical' | 'ion' | 'both'
export type AntennaState = 'ok' | 'main-failed' | 'all-failed'
export type Facing = 'right' | 'left'
export type LaunchPhase = 'pad' | 'ignition' | 'liftoff' | 'ascent'
export type ReentryPhase = 'separation' | 'entry' | 'drogue' | 'main' | 'splashdown'
export type ReentryCorridor = 'shallow' | 'nominal' | 'steep'

export const SHIP_PARTS: readonly ShipPart[] = ['structure', 'propulsion', 'power', 'lifeSupport', 'comms']

/** Shared ship palette (docs/VISUAL.md §3). */
export const C = {
  ink: '#111326',
  white: '#F5F7FF',
  shade: '#CDD5EA',
  metal: '#8896B3',
  metalDark: '#5F6B88',
  metalLight: '#B9C4DC',
  orange: '#FF8C32',
  orangeDark: '#E06A10',
  teal: '#38D9D0',
  tealDark: '#1FA9A1',
  yellow: '#FFD447',
  red: '#F04452',
  green: '#65D68A',
  space: '#101B3D',
  deep: '#0A1128',
  panel: '#2A4FB8',
  panelDark: '#213F96',
} as const

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
