import { afterEach, describe, expect, it } from 'vitest'
import { createMission, designReport, launch, routeOptions, titanAvailability } from './engine.ts'
import { PARAMS, ROUTES, COMPONENTS } from './data.ts'
import { setDestination } from './destination.ts'
import type { ShipConfig } from './types.ts'

const ECONOMY: ShipConfig = { structure: 'light', propulsion: 'chemical', power: 'solar', lifeSupport: 'consumables', comms: 'standard' }
const FULL: ShipConfig = { structure: 'light', propulsion: 'combined', power: 'nuclear', lifeSupport: 'regenerative', comms: 'standard' }

afterEach(() => setDestination('saturn'))

describe('Mars destination', () => {
  it('switches the tables and restores Saturn exactly', () => {
    const saturn = JSON.stringify({ PARAMS, ROUTES, COMPONENTS })
    setDestination('mars')
    expect(PARAMS.outboundMonths).toBe(7)
    expect(ROUTES.fast.months).toBe(6)
    expect(COMPONENTS.power.solar.generation).toBe(125)
    setDestination('saturn')
    expect(JSON.stringify({ PARAMS, ROUTES, COMPONENTS })).toBe(saturn)
  })

  it('records the destination on the mission', () => {
    setDestination('mars')
    expect(createMission(ECONOMY, 'easy').destination).toBe('mars')
    setDestination('saturn')
    expect(createMission(ECONOMY, 'easy').destination).toBe('saturn')
  })

  it('both reference ships pass the Mars engineering report', () => {
    setDestination('mars')
    for (const cfg of [ECONOMY, FULL]) {
      const rep = designReport(cfg)
      expect(rep.checks.filter(c => !c.ok).map(c => c.id)).toEqual([])
    }
  })

  it('has no gravity assist and keeps a route trade-off', () => {
    setDestination('mars')
    const eco = launch(createMission(ECONOMY, 'easy')).state
    expect(titanAvailability(eco).available).toBe(false)
    const opts = routeOptions(eco, false)
    // Chemical propulsion cannot afford the fast route; balanced and slow are open.
    expect(opts.find(o => o.id === 'fast')?.feasible).toBe(false)
    expect(opts.find(o => o.id === 'balanced')?.feasible).toBe(true)
    const full = launch(createMission(FULL, 'easy')).state
    expect(routeOptions(full, false).every(o => o.feasible)).toBe(true)
  })
})
