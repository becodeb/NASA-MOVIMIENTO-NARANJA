// Mission destination (Saturn = the original mission; Mars = a shorter hypothetical orbital mission).
// The engine reads the shared tables in data.ts; switching destination rewrites the few values that differ,
// in place, so every rule and screen picks them up without threading a parameter through the engine.
import { COMPONENTS, PARAMS, ROUTES } from './data.ts'

export type Destination = 'saturn' | 'mars'
export const DESTINATIONS: Destination[] = ['saturn', 'mars']

interface Profile {
  params: Pick<typeof PARAMS, 'outboundMonths' | 'outboundManeuver' | 'insertionManeuver'>
  routes: typeof ROUTES
  solarGeneration: number
  consumables: { vital: number; outboundUse: number }
  regenerative: { vital: number; outboundUse: number }
  /** A gravity assist (Titan) exists on the way home. */
  gravityAssist: boolean
}

const snap = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T

const SATURN: Profile = snap({
  params: { outboundMonths: PARAMS.outboundMonths, outboundManeuver: PARAMS.outboundManeuver, insertionManeuver: PARAMS.insertionManeuver },
  routes: ROUTES,
  solarGeneration: COMPONENTS.power.solar.generation,
  consumables: { vital: COMPONENTS.lifeSupport.consumables.vital, outboundUse: COMPONENTS.lifeSupport.consumables.outboundUse },
  regenerative: { vital: COMPONENTS.lifeSupport.regenerative.vital, outboundUse: COMPONENTS.lifeSupport.regenerative.outboundUse },
  gravityAssist: true,
})

// Mars: ~7-month transfer, 6 months in orbit, 6/8/10-month returns. Sunlight is ~43% of Earth's (vs ~1.1% at Saturn),
// so the same solar array yields more. Life-support stocks are scaled to the much shorter mission.
// Normalized game units, tuned so the same trade-offs appear (fast route needs combined propulsion, etc.).
const MARS: Profile = {
  params: { outboundMonths: 7, outboundManeuver: 30, insertionManeuver: 15 },
  routes: { fast: { months: 6, maneuver: 50 }, balanced: { months: 8, maneuver: 40 }, slow: { months: 10, maneuver: 32 } },
  solarGeneration: 125,
  consumables: { vital: 40, outboundUse: 7 },
  regenerative: { vital: 24, outboundUse: 3.5 },
  gravityAssist: false,
}

let current: Destination = 'saturn'

export function getDestination(): Destination { return current }
export function hasGravityAssist(): boolean { return (current === 'mars' ? MARS : SATURN).gravityAssist }

export function setDestination(d: Destination): void {
  current = d === 'mars' ? 'mars' : 'saturn'
  const p = current === 'mars' ? MARS : SATURN
  Object.assign(PARAMS, p.params)
  for (const id of Object.keys(p.routes) as (keyof typeof ROUTES)[]) ROUTES[id] = { ...p.routes[id] }
  COMPONENTS.power.solar.generation = p.solarGeneration
  Object.assign(COMPONENTS.lifeSupport.consumables, p.consumables)
  Object.assign(COMPONENTS.lifeSupport.regenerative, p.regenerative)
}
