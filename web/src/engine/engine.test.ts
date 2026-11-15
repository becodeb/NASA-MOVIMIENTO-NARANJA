import { describe, expect, it } from 'vitest'
import {
  canRestore,
  createCheckpoint,
  createMission,
  designReport,
  executeReturn,
  finishSaturn,
  getEmergency,
  launch,
  loadTotal,
  powerMargin,
  reentryStep,
  repairSystem,
  resolveEmergency,
  restoreCheckpoint,
  routeOptions,
  runInvestigation,
  score,
  setLoad,
  snapshot,
  transmitData,
  triggerEmergency,
  commsMode,
} from './engine.ts'
import { EMERGENCY_OPTION_IDS, EMERGENCY_ORDER, INVESTIGATION_ORDER } from './data.ts'
import strings from './strings.ts'
import type { EmergencyId, MissionState, ReentryCorridor, RouteId, ShipConfig } from './types.ts'

// ------------------------------------------------------------------ helpers

const cfg = (o: Partial<ShipConfig> = {}): ShipConfig => ({
  structure: 'light',
  propulsion: 'chemical',
  power: 'nuclear',
  lifeSupport: 'consumables',
  comms: 'standard',
  ...o,
})

function sane(s: MissionState): void {
  expect(s.vital).toBeGreaterThanOrEqual(0)
  expect(s.battery).toBeGreaterThanOrEqual(0)
  expect(s.maneuver).toBeGreaterThanOrEqual(0)
  expect(s.structure).toBeGreaterThanOrEqual(0)
  expect(s.structure).toBeLessThanOrEqual(100)
  expect(s.equipment).toBeGreaterThanOrEqual(0)
  expect(s.radiation).toBeGreaterThanOrEqual(0)
  expect(s.powerGeneration).toBeGreaterThanOrEqual(0)
  for (const v of Object.values(s.spares)) expect(v).toBeGreaterThanOrEqual(0)
}

function arrive(config: ShipConfig, difficulty: 'easy' | 'hard' = 'hard'): MissionState {
  const r = launch(createMission(config, difficulty))
  expect(r.ok).toBe(true)
  return r.state
}

/** Play options in order (each call is validated and logged by the engine). */
function ev(s: MissionState, id: EmergencyId, ...opts: string[]): MissionState {
  let st = s
  for (const o of opts) {
    st = resolveEmergency(st, id, o).state
    sane(st)
  }
  return st
}

function bestPolicy(config: ShipConfig): Record<EmergencyId, string[]> {
  return {
    comms: config.comms === 'redundant' ? ['diagnose', 'activateBackup'] : ['diagnose', 'repairElectronic'],
    impact: ['isolate', 'useKit'],
    co2: config.lifeSupport === 'regenerative' ? ['switchModule'] : ['replaceWithSpare'],
    power: ['shedOptional', 'locate', 'isolate'],
    thermal: ['reconfigure'],
    radiation: ['shelter'],
  }
}

/** Resolve every event before `id`, leaving the next event untriggered (calm window). */
function toEvent(s: MissionState, id: EmergencyId): MissionState {
  let st = s
  for (const e of EMERGENCY_ORDER) {
    if (e === id) return st
    st = ev(st, e, ...bestPolicy(st.config)[e])
  }
  return st
}

function playAllBest(s: MissionState): MissionState {
  let st = s
  for (const e of EMERGENCY_ORDER) st = ev(st, e, ...bestPolicy(st.config)[e])
  return st
}

function land(s: MissionState, corridor: ReentryCorridor = 'nominal'): MissionState {
  let st = s
  st = reentryStep(st, 'capsuleCheck').state
  st = reentryStep(st, 'corridor', corridor).state
  for (const step of ['separation', 'parachutes', 'landing'] as const) st = reentryStep(st, step).state
  return st
}

const SOLAR = cfg({ power: 'solar', lifeSupport: 'regenerative', comms: 'redundant' })

// ------------------------------------------------------------------ Level 1

describe('Level 1: engineering report and launch', () => {
  it('blocks a 109-credit design (limit 105) and says by how much', () => {
    const c = cfg({ structure: 'reinforced', propulsion: 'combined', power: 'nuclear', lifeSupport: 'regenerative', comms: 'redundant' })
    const rep = designReport(c)
    expect(rep.cost).toBe(109)
    expect(rep.canLaunch).toBe(false)
    const b = rep.checks.find((x) => x.id === 'budget')!
    expect(b.ok).toBe(false)
    expect(b.msgKey).toBe('engine.check.budget.fail')
    expect(b.params.over).toBe(4)
    const m = createMission(c, 'hard')
    const r = launch(m)
    expect(r.ok).toBe(false)
    expect(r.state).toBe(m)
    expect(m.phase).toBe('design')
  })

  it('blocks a mass over 130', () => {
    const rep = designReport(cfg({ structure: 'reinforced', propulsion: 'combined', power: 'solar', lifeSupport: 'consumables', comms: 'redundant' }))
    expect(rep.mass).toBe(145)
    expect(rep.checks.find((x) => x.id === 'mass')!.params.over).toBe(15)
    expect(rep.canLaunch).toBe(false)
  })

  it('computes the numbers of the report', () => {
    const rep = designReport(cfg({ lifeSupport: 'regenerative', comms: 'redundant' }))
    expect(rep.essentialLoad).toBe(60 + 25 + 5)
    expect(rep.powerMargin).toBe(135 - 90)
    expect(rep.autonomyMonths).toBe(150)
    expect(designReport(cfg()).autonomyMonths).toBe(130)
    expect(designReport(cfg({ lifeSupport: 'regenerative' })).vitalRate).toBe(0.5)
  })

  it('launch applies the outbound transit: 48 months, -55 maneuver, -48 / -24 vital', () => {
    const a = arrive(cfg())
    expect(a.monthsElapsed).toBe(48)
    expect(a.maneuver).toBe(45)
    expect(a.vital).toBe(82)
    expect(a.level).toBe(2)
    expect(a.structure).toBe(100)
    expect(a.battery).toBe(30)
    expect(a.spares).toEqual({ structural: 1, lifeSupport: 1, electronic: 1 })
    expect(a.history[0].changes.some((c) => c.field === 'maneuver' && c.from === 100 && c.to === 45)).toBe(true)
    const b = arrive(cfg({ propulsion: 'combined', lifeSupport: 'regenerative' }))
    expect(b.maneuver).toBe(60)
    expect(b.vital).toBe(51)
  })
})

// ------------------------------------------------------------------ Level 2: impact and kit

describe('Level 2: impact, kit', () => {
  it('light structure loses 30, reinforced loses 12', () => {
    const l = triggerEmergency(toEvent(arrive(cfg()), 'impact')).state
    expect(l.structure).toBe(70)
    const r = triggerEmergency(toEvent(arrive(cfg({ structure: 'reinforced' })), 'impact')).state
    expect(r.structure).toBe(88)
  })

  it('isolating promptly costs 6 / 3 vital, late or ignoring doubles it', () => {
    const light = toEvent(arrive(cfg()), 'impact')
    const v0 = light.vital
    expect(ev(light, 'impact', 'isolate').vital).toBe(v0 - 6)
    expect(ev(light, 'impact', 'isolateLate').vital).toBe(v0 - 12)
    const reinf = toEvent(arrive(cfg({ structure: 'reinforced' })), 'impact')
    expect(ev(reinf, 'impact', 'isolate').vital).toBe(reinf.vital - 3)
    expect(ev(reinf, 'impact', 'ignore').vital).toBe(reinf.vital - 6 - 1) // 6 lost + 1 month of consumption
  })

  it('kit recovers up to 15 and is consumed; cannot be used again', () => {
    const s = ev(toEvent(arrive(cfg()), 'impact'), 'impact', 'isolate', 'useKit')
    expect(s.structure).toBe(85)
    expect(s.spares.structural).toBe(0)
    expect(s.faults.leak).toBe('sealed')
    const again = repairSystem(s, 'structure', 'structural')
    expect(again.ok).toBe(false)
    expect(again.params.reasonKey).toBe('engine.reason.noSpare')
    // cap at 100
    const r = ev(toEvent(arrive(cfg({ structure: 'reinforced' })), 'impact'), 'impact', 'isolate', 'useKit')
    expect(r.structure).toBe(100)
    // the option itself is unavailable when no kit is left
    const noKit = { ...toEvent(arrive(cfg()), 'impact'), spares: { structural: 0, lifeSupport: 1, electronic: 1 } }
    const s2 = ev(noKit, 'impact', 'isolate')
    const opt = getEmergency(s2, 'impact').options.find((o) => o.id === 'useKit')!
    expect(opt.available).toBe(false)
    expect(resolveEmergency(s2, 'impact', 'useKit').outcome.success).toBe(false)
  })

  it('ignoring the leak is critical: crew compromised, cannot leave Saturn until sealed', () => {
    const s = ev(toEvent(arrive(cfg()), 'impact'), 'impact', 'ignore')
    expect(s.crewStatus).toBe('compromised')
    expect(s.faults.leak).toBe('open')
    const rest = ev(s, 'co2', 'replaceWithSpare')
    expect(rest.activeEmergency).toBeNull()
    // later the kit still seals it
    const fixed = repairSystem(rest, 'structure', 'structural')
    expect(fixed.ok).toBe(true)
    expect(fixed.state.faults.leak).toBe('sealed')
    expect(fixed.state.crewStatus).toBe('safe')
  })
})

// ------------------------------------------------------------------ comms

describe('Level 2: communications', () => {
  it('standard comms cannot activate a backup that does not exist', () => {
    const s0 = arrive(cfg())
    const s = ev(s0, 'comms', 'diagnose')
    const opt = getEmergency(s, 'comms').options.find((o) => o.id === 'activateBackup')!
    expect(opt.available).toBe(false)
    expect(opt.reasonKey).toBe('engine.reason.noBackupInstalled')
    const r = resolveEmergency(s, 'comms', 'activateBackup')
    expect(r.outcome.success).toBe(false)
    expect(r.state).toBe(s)
  })

  it('redundant comms can activate the backup (limited link)', () => {
    const s = ev(arrive(cfg({ comms: 'redundant' })), 'comms', 'diagnose', 'activateBackup')
    expect(s.emergencies.comms.status).toBe('partial')
    expect(commsMode(s)).toBe('backup')
  })

  it('diagnosis comes first; recalibration costs 2 battery and fails with an explanation', () => {
    const s0 = arrive(cfg())
    expect(resolveEmergency(s0, 'comms', 'recalibrate').outcome.msgKey).toBe('engine.err.unknownOption')
    const s1 = ev(s0, 'comms', 'diagnose')
    const r = resolveEmergency(s1, 'comms', 'recalibrate')
    expect(r.outcome.success).toBe(false)
    expect(r.outcome.explanationKey).toBe('engine.expl.comms.recalibrate')
    expect(r.state.battery).toBe(28)
    expect(r.state.systems.antennaMain).toBe('failed')
    expect(r.outcome.closed).toBe(false)
  })

  it('a life-support spare cannot fix an antenna; the electronic spare can', () => {
    const s1 = ev(arrive(cfg()), 'comms', 'diagnose')
    const bad = resolveEmergency(s1, 'comms', 'repairLifeSupportSpare')
    expect(bad.outcome.msgKey).toBe('engine.err.unavailable')
    expect(bad.outcome.params.reasonKey).toBe('engine.reason.incompatibleSpare')
    expect(s1.spares.lifeSupport).toBe(1)
    const good = ev(s1, 'comms', 'repairElectronic')
    expect(good.systems.antennaMain).toBe('repaired')
    expect(good.spares.electronic).toBe(0)
    const later = ev(arrive(cfg()), 'comms', 'ignore')
    expect(repairSystem(later, 'antennaMain', 'lifeSupport').params.reasonKey).toBe('engine.reason.incompatibleSpare')
    expect(repairSystem(later, 'antennaMain', 'electronic').ok).toBe(true)
  })

  it('data is never deleted by a link loss; it is sent when the link is back', () => {
    let s = arrive(cfg())
    s = runInvestigation(s, 'rings').state
    s = ev(s, 'comms', 'ignore')
    expect(s.science.collected.rings).toBe(true)
    expect(transmitData(s).ok).toBe(false)
    expect(transmitData(s).params.reasonKey).toBe('engine.reason.noLink')
    s = repairSystem(s, 'antennaMain', 'electronic').state
    const t = transmitData(s)
    expect(t.ok).toBe(true)
    expect(t.state.science.transmitted.rings).toBe(true)
  })

  it('backup antenna transmits with limited capacity', () => {
    let s = arrive(cfg({ comms: 'redundant' }))
    for (const i of INVESTIGATION_ORDER) s = runInvestigation(s, i).state
    s = ev(s, 'comms', 'diagnose', 'activateBackup')
    const t = transmitData(s)
    expect(t.params.sent).toBe(2)
    expect(t.params.waiting).toBe(2)
    expect(transmitData(t.state).ok).toBe(false)
  })
})

// ------------------------------------------------------------------ CO2

describe('Level 2: CO2', () => {
  it('consumables use the spare; no spare => unavailable', () => {
    const s0 = toEvent(arrive(cfg()), 'co2')
    const s = ev(s0, 'co2', 'replaceWithSpare')
    expect(s.spares.lifeSupport).toBe(0)
    expect(s.systems.lifeSupport).toBe('repaired')
    const none = { ...toEvent(arrive(cfg()), 'co2'), spares: { structural: 1, lifeSupport: 0, electronic: 1 } }
    const o = getEmergency(none, 'co2').options
    expect(o.find((x) => x.id === 'replaceWithSpare')!.available).toBe(false)
    expect(o.find((x) => x.id === 'switchModule')!.available).toBe(false)
  })

  it('regenerative switch-over needs power margin', () => {
    let s = toEvent(arrive(SOLAR), 'co2')
    s = setLoad(s, 'science', true).state // 105 - (90+20) = -5
    expect(powerMargin(s)).toBe(-5)
    const opt = getEmergency(s, 'co2').options.find((o) => o.id === 'switchModule')!
    expect(opt.available).toBe(false)
    expect(opt.reasonKey).toBe('engine.reason.noPowerMargin')
    s = setLoad(s, 'science', false).state
    const done = ev(s, 'co2', 'switchModule')
    expect(done.emergencies.co2.status).toBe('resolved')
    expect(done.vitalRate).toBe(0.5)
  })

  it('extraordinary reserves cost 8 vital; regenerative then degrades to 0.75/month', () => {
    const s0 = toEvent(arrive(SOLAR), 'co2')
    const s = ev(s0, 'co2', 'useReserves')
    expect(s.systems.lifeSupport).toBe('degraded')
    expect(s.vitalRate).toBe(0.75)
    expect(s.vital).toBe(s0.vital - 8 - 0.75)
    const c = toEvent(arrive(cfg()), 'co2')
    const c2 = ev(c, 'co2', 'useReserves')
    expect(c2.vital).toBe(c.vital - 8 - 1)
    // repairing later brings it back to 0.5
    const fixed = repairSystem(s, 'lifeSupport', 'lifeSupport')
    expect(fixed.ok).toBe(true)
    expect(fixed.state.vitalRate).toBe(0.5)
  })

  it('ignoring CO2 removal is a fatal habitability failure', () => {
    const s = ev(toEvent(arrive(cfg()), 'co2'), 'co2', 'ignore')
    expect(s.result).toBe('failed')
    expect(s.crewStatus).toBe('lost')
    expect(resolveEmergency(s, 'power', 'locate').outcome.msgKey).toBe('engine.err.missionOver')
    expect(score(s).classification).toBe('failed')
  })
})

// ------------------------------------------------------------------ power and thermal

describe('Level 2: power', () => {
  it('locate then isolate restores generation; the deficit drains the battery turn by turn', () => {
    const s0 = triggerEmergency(toEvent(arrive(SOLAR), 'power')).state
    expect(s0.powerGeneration).toBe(75)
    expect(powerMargin(s0)).toBe(-15)
    const a = ev(s0, 'power', 'locate')
    expect(a.battery).toBe(15)
    const b = ev(a, 'power', 'isolate')
    expect(b.battery).toBe(0)
    expect(b.powerGeneration).toBe(105)
    expect(b.emergencies.power.status).toBe('resolved')
    expect(b.faults.blackout).toBe(false)
  })

  it('shedding optional loads first avoids a blackout', () => {
    const c = cfg({ power: 'solar', lifeSupport: 'regenerative' })
    let s0 = toEvent(arrive(c), 'power')
    s0 = setLoad(s0, 'science', true).state // 85 + 20 = 105 now; -30 during the event => deficit 30 per turn
    s0 = triggerEmergency(s0).state
    const blind = ev(s0, 'power', 'locate', 'ignore')
    expect(blind.faults.blackout).toBe(true)
    const s = ev(s0, 'power', 'shedOptional', 'locate', 'isolate')
    expect(s.activeLoads.science).toBe(false)
    expect(s.faults.blackout).toBe(false)
    expect(s.battery).toBe(30 - 10 - 10) // 85 demand vs 75 generated
    expect(s.emergencies.power.status).toBe('resolved')
  })

  it('electronic spare repairs instantly without draining the battery', () => {
    const s0 = triggerEmergency(toEvent(arrive(SOLAR), 'power')).state
    const s = ev(s0, 'power', 'locate', 'repairWithSpare')
    expect(s.battery).toBe(15)
    expect(s.spares.electronic).toBe(0)
  })

  it('holding with a deficit exhausts the battery => critical condition (blackout)', () => {
    const s0 = triggerEmergency(toEvent(arrive(SOLAR), 'power')).state
    const s = ev(s0, 'power', 'ignore', 'ignore', 'ignore')
    expect(s.faults.blackout).toBe(true)
    expect(s.battery).toBe(0)
    expect(s.crewStatus).toBe('compromised')
    expect(s.faults.powerFault).toBe('persistent')
    expect(s.powerGeneration).toBe(90)
  })

  it('unresolved without deficit leaves a persistent -15 that carries to Level 3', () => {
    let s = ev(triggerEmergency(toEvent(arrive(cfg()), 'power')).state, 'power', 'ignore', 'ignore', 'ignore')
    expect(s.faults.powerFault).toBe('persistent')
    expect(s.powerGeneration).toBe(120)
    expect(s.faults.blackout).toBe(false)
    s = repairSystem({ ...s, spares: { ...s.spares, electronic: 1 } }, 'power', 'electronic').state
    expect(s.powerGeneration).toBe(135)
    // solar + regenerative + combined: 90 generated < 105 needed for the electric burn
    const c = cfg({ power: 'solar', lifeSupport: 'regenerative', propulsion: 'combined' })
    let t = ev(triggerEmergency(toEvent(arrive(c), 'power')).state, 'power', 'shedOptional', 'ignore', 'ignore', 'ignore')
    t = ev(t, 'thermal', 'reconfigure')
    expect(t.powerGeneration).toBe(90)
    t = ev(t, 'radiation', 'shelter')
    const fin = finishSaturn(t)
    expect(fin.canProceed).toBe(false) // no return route works: the persistent loss starves the electric burn
    expect(fin.checks.find((c) => c.id === 'route')!.ok).toBe(false)
    const routes = routeOptions(t, false)
    expect(routes.every((r) => r.failing.some((f) => f.variable === 'power'))).toBe(true)
    expect(routes.every((r) => !r.feasible)).toBe(true)
  })
})

describe('Level 2: thermal', () => {
  it('heaters need a power margin: shed an optional load first', () => {
    let s = toEvent(arrive(cfg({ power: 'solar', lifeSupport: 'regenerative' })), 'thermal')
    expect(getEmergency(s, 'thermal').options.find((x) => x.id === 'heat')!.available).toBe(true) // 85 + 20 = 105
    s = setLoad(s, 'science', true).state
    s = triggerEmergency(s).state
    const o = getEmergency(s, 'thermal').options.find((x) => x.id === 'heat')!
    expect(o.available).toBe(false)
    expect(o.reasonKey).toBe('engine.reason.shedOptionalFirst')
    s = setLoad(s, 'science', false).state
    expect(getEmergency(s, 'thermal').options.find((x) => x.id === 'heat')!.available).toBe(true)
    s = ev(s, 'thermal', 'heat', 'heat')
    expect(s.emergencies.thermal.status).toBe('resolved')
    expect(s.activeLoads.emergencyHeating).toBe(false)
    expect(s.equipment).toBe(100)
  })

  it('reconfiguring needs a healthy bus; ignoring costs 15 integrity', () => {
    const base = toEvent(arrive(cfg()), 'thermal')
    expect(ev(base, 'thermal', 'reconfigure').emergencies.thermal.status).toBe('resolved')
    const ign = ev(base, 'thermal', 'ignore')
    expect(ign.equipment).toBe(85)
    expect(ign.systems.instruments).toBe('degraded')
    const faulty = { ...base, faults: { ...base.faults, powerFault: 'persistent' as const } }
    const o = getEmergency(faulty, 'thermal').options.find((x) => x.id === 'reconfigure')!
    expect(o.available).toBe(false)
    expect(o.reasonKey).toBe('engine.reason.sharedBus')
  })
})

describe('Level 2: radiation', () => {
  it('shelter vs continue science vs ignore', () => {
    const base = toEvent(arrive(cfg()), 'radiation')
    const sh = ev(base, 'radiation', 'shelter')
    expect(sh.radiation).toBe(5)
    expect(sh.crewStatus).toBe('safe')
    const sci = ev(base, 'radiation', 'continueScience')
    expect(sci.radiation).toBe(20)
    expect(sci.science.collected.atmosphere).toBe(true)
    expect(sci.crewStatus).toBe('compromised')
    const ig = ev(base, 'radiation', 'ignore')
    expect(ig.radiation).toBe(20)
    expect(ig.science.collected.atmosphere).toBe(false)
  })
})

// ------------------------------------------------------------------ loads and science

describe('Power, loads and science', () => {
  it('insufficient power with instruments on: requires shedding, battery or recovery', () => {
    let s = arrive(SOLAR)
    expect(loadTotal(s)).toBe(90)
    const on = setLoad(s, 'science', true)
    expect(on.msgKey).toBe('engine.load.deficit')
    expect(on.params.margin).toBe(-5)
    // battery covers the gap for an observation
    const r = runInvestigation(s, 'atmosphere')
    expect(r.ok).toBe(true)
    expect(r.state.battery).toBe(25)
    // not enough battery: refused with explanation
    const weak = { ...s, battery: 3 }
    const bad = runInvestigation(weak, 'atmosphere')
    expect(bad.ok).toBe(false)
    expect(bad.params.reasonKey).toBe('engine.reason.powerShortage')
    // shedding a load recovers the margin
    s = setLoad(weak, 'commsRedundant', false).state
    const ok = runInvestigation(s, 'atmosphere')
    expect(ok.ok).toBe(true)
    expect(ok.state.battery).toBe(3)
  })

  it('a sustained deficit cannot go on forever: it drains the battery every month', () => {
    let s = setLoad(arrive(SOLAR), 'science', true).state
    s = ev(s, 'comms', 'diagnose', 'activateBackup')
    expect(s.battery).toBe(25)
    s = ev(s, 'impact', 'isolate', 'useKit')
    expect(s.battery).toBe(20)
    // with an almost empty battery the same deficit becomes a blackout
    const weak = { ...setLoad(arrive(SOLAR), 'science', true).state, battery: 3 }
    const out = ev(weak, 'comms', 'diagnose', 'activateBackup')
    expect(out.faults.blackout).toBe(true)
    expect(out.battery).toBe(0)
    expect(out.crewStatus).toBe('compromised')
  })

  it('science: 5 points each (max 20), instruments required, no repeats, no active critical emergency', () => {
    let s = arrive(cfg())
    for (const i of INVESTIGATION_ORDER) s = runInvestigation(s, i).state
    expect(INVESTIGATION_ORDER.filter((i) => s.science.collected[i]).length).toBe(4)
    expect(runInvestigation(s, 'rings').ok).toBe(false)
    expect(score(s).science.total).toBe(0) // nothing transmitted, no return yet
    const broken = { ...arrive(cfg()), systems: { ...arrive(cfg()).systems, instruments: 'failed' as const } }
    expect(runInvestigation(broken, 'rings').params.reasonKey).toBe('engine.reason.instrumentsDown')
    const active = triggerEmergency(toEvent(arrive(cfg()), 'impact')).state
    expect(runInvestigation(active, 'rings').params.reasonKey).toBe('engine.reason.criticalActive')
  })

  it('actions never mutate their input', () => {
    const s = arrive(SOLAR)
    const before = JSON.stringify(s)
    runInvestigation(s, 'rings')
    setLoad(s, 'science', true)
    triggerEmergency(s)
    resolveEmergency(s, 'comms', 'diagnose')
    getEmergency(s, 'comms')
    expect(JSON.stringify(s)).toBe(before)
  })

  it('every decision appends to the history with what changed', () => {
    let s = arrive(cfg())
    const n = s.history.length
    s = ev(s, 'comms', 'diagnose', 'repairElectronic')
    expect(s.history.length).toBe(n + 2)
    const last = s.history[s.history.length - 1]
    expect(last.key).toBe('engine.out.comms.repairElectronic')
    expect(last.changes.some((c) => c.field === 'spares.electronic' && c.from === 1 && c.to === 0)).toBe(true)
    expect(last.changes.some((c) => c.field === 'vital')).toBe(true)
    expect(last.changes.some((c) => c.field === 'monthsElapsed' && c.to === 49)).toBe(true)
  })
})

// ------------------------------------------------------------------ Level 3

describe('Level 3: routes, Titan, reentry', () => {
  it('route with insufficient vital is blocked with an explanation', () => {
    const s = { ...finishSaturn(playAllBest(arrive(cfg()))).state }
    const poor = { ...s, vital: 30 }
    const r = routeOptions(poor, false)
    const fast = r.find((x) => x.id === 'fast')!
    expect(fast.feasible).toBe(false)
    expect(fast.failing.some((f) => f.variable === 'vital')).toBe(true)
    expect(fast.failing.find((f) => f.variable === 'vital')!.msgKey).toBe('engine.route.fail.vital')
    const blocked = executeReturn(poor, 'balanced', true)
    expect(blocked.ok).toBe(false)
    expect(blocked.state).toBe(poor)
  })

  it('Titan assist needs navigation; it deducts the prep and applies the saving', () => {
    const s = finishSaturn(playAllBest(arrive(cfg()))).state
    expect(s.maneuver).toBe(45)
    const noTitan = routeOptions(s, false).find((r) => r.id === 'balanced')!
    expect(noTitan.feasible).toBe(false)
    expect(noTitan.failing.map((f) => f.variable)).toEqual(['maneuver'])
    expect(noTitan.failing[0].params.short).toBe(1)
    const withTitan = routeOptions(s, true).find((r) => r.id === 'balanced')!
    expect(withTitan.feasible).toBe(true)
    const done = executeReturn(s, 'balanced', true)
    expect(done.state.maneuver).toBe(45 - 4 - (38 - 12))
    expect(done.state.titanAssist).toBe(true)
    const blind = { ...s, systems: { ...s.systems, navigation: 'failed' as const } }
    expect(routeOptions(blind, true).every((r) => !r.feasible && r.failing.some((f) => f.variable === 'titan'))).toBe(true)
  })

  it('only the nominal corridor gives a safe return', () => {
    const ready = executeReturn(finishSaturn(playAllBest(arrive(cfg()))).state, 'balanced', true).state
    for (const c of ['shallow', 'steep'] as const) {
      const end = land(ready, c)
      expect(end.reentry.outcome).toBe('failed')
      expect(end.crewStatus).toBe('lost')
      expect(score(end).safeReturn).toBe(false)
      expect(score(end).classification).toBe('failed')
      expect(score(end).crew.safeReturn).toBe(0)
    }
    const ok = land(ready, 'nominal')
    expect(ok.reentry.outcome).toBe('safe')
    expect(score(ok).safeReturn).toBe(true)
    expect(reentryStep(ready, 'landing').ok).toBe(false) // order is enforced
  })

  it('finishSaturn blocks Level 3 when no route is possible (stranded, never success)', () => {
    const s = playAllBest(arrive(cfg()))
    const stranded = { ...s, maneuver: 5 }
    const r = finishSaturn(stranded)
    expect(r.canProceed).toBe(false)
    expect(r.state.result).toBe('incomplete')
    expect(score(r.state).classification).toBe('incomplete')
    expect(score(r.state).classification).not.toBe('success')
  })

  it('the Saturn stay is only over after the six events', () => {
    expect(finishSaturn(arrive(cfg())).canProceed).toBe(false)
    expect(finishSaturn(arrive(cfg())).state.phase).toBe('saturn')
  })
})

// ------------------------------------------------------------------ checkpoints

describe('Checkpoints', () => {
  it('restore returns exactly the saved values; the snapshot is a deep copy', () => {
    let s = arrive(cfg(), 'easy')
    s = runInvestigation(s, 'rings').state
    const cp = createCheckpoint(s, 'before-comms')
    const saved = JSON.stringify(s)
    let later = ev(s, 'comms', 'diagnose', 'repairElectronic')
    later = ev(later, 'impact', 'ignore')
    expect(JSON.stringify(later)).not.toBe(saved)
    const back = restoreCheckpoint(cp)
    expect(back).toEqual(s)
    expect(JSON.stringify(back)).toBe(saved)
    back.vital = 0
    expect(restoreCheckpoint(cp).vital).toBe(s.vital)
    expect(snapshot(s)).not.toBe(s)
    expect(snapshot(s)).toEqual(s)
    expect(canRestore(s)).toBe(true)
    expect(canRestore(arrive(cfg(), 'hard'))).toBe(false)
  })
})

// ------------------------------------------------------------------ full numeric examples (SPEC 6)

describe('SPEC example 1: regenerative life support', () => {
  it('step by step', () => {
    const full = cfg({ structure: 'reinforced', propulsion: 'combined', power: 'nuclear', lifeSupport: 'regenerative', comms: 'redundant' })
    const rep1 = designReport(full)
    expect(rep1.cost).toBe(109)
    expect(rep1.canLaunch).toBe(false)
    expect(rep1.checks.find((c) => c.id === 'budget')!.params.over).toBe(4)

    const c = { ...full, comms: 'standard' as const }
    const rep = designReport(c)
    expect(rep.cost).toBe(103)
    expect(rep.mass).toBe(20 + 25 + 25 + 18 + 18 + 8)
    expect(rep.mass).toBe(114)
    expect(rep.essentialLoad).toBe(85)
    expect(rep.powerGen).toBe(135)
    expect(rep.maneuver).toBe(115)
    expect(rep.vital).toBe(75)
    expect(rep.canLaunch).toBe(true)

    const a = arrive(c)
    expect(a.maneuver).toBe(115 - 55)
    expect(a.vital).toBe(75 - 24)

    // Level 2 with correct answers. Spec: 6 months of nominal regenerative use = 3 vital units.
    const end = playAllBest(a)
    expect(end.monthsElapsed).toBe(48 + 6)
    expect(end.structure).toBe(100) // reinforced 88 + kit capped at 100
    expect(end.maneuver).toBe(60)
    // The spec's 48 assumes no other loss, but sealing the leak costs 3 vital units (reinforced hull).
    // Engine: 51 - 3 (leak) - 3 (six months x 0.5) = 45; spec's 48 = 45 + the 3-unit leak loss.
    expect(end.vital).toBe(45)
    expect(end.vital + 3).toBe(48)

    // Apply the spec's assumption (no leak loss) and run the slow route.
    const fin = finishSaturn({ ...end, vital: 48 })
    expect(fin.canProceed).toBe(true)
    const slow = routeOptions(fin.state, false).find((r) => r.id === 'slow')!
    expect(slow.vitalNeeded).toBe(66 * 0.5 + 8) // 41
    expect(slow.vitalNeeded).toBe(41)
    expect(slow.feasible).toBe(true)
    const ret = executeReturn(fin.state, 'slow', false)
    expect(ret.ok).toBe(true)
    expect(ret.state.vital).toBe(48 - 33)
    expect(ret.state.vital).toBe(15)
    // with the real engine numbers (45) the slow route is feasible too, ending at 12
    const real = executeReturn(finishSaturn(end).state, 'slow', false)
    expect(real.state.vital).toBe(12)
    sane(ret.state)
    expect(score(land(ret.state)).safeReturn).toBe(true)
  })
})

describe('SPEC example 2: economic light-structure mission', () => {
  it('step by step', () => {
    const c = cfg()
    const rep = designReport(c)
    expect(rep.cost).toBe(12 + 12 + 29 + 12 + 8)
    expect(rep.cost).toBe(73)
    expect(rep.mass).toBe(20 + 15 + 20 + 18 + 28 + 8)
    expect(rep.mass).toBe(109)
    expect(rep.maneuver).toBe(100)
    expect(rep.vital).toBe(130)
    expect(rep.essentialLoad).toBe(60)
    expect(rep.powerGen).toBe(135)

    const a = arrive(c)
    expect(a.maneuver).toBe(45)
    expect(a.vital).toBe(82)

    // impact: light structure loses 30; isolate (-6 vital), kit (+15)
    let s = a
    s = ev(s, 'comms', 'diagnose', 'repairElectronic')
    s = triggerEmergency(s).state
    expect(s.structure).toBe(70)
    s = ev(s, 'impact', 'isolate')
    expect(s.vital).toBe(82 - 1 - 6) // one month of comms consumed already
    s = ev(s, 'impact', 'useKit')
    expect(s.structure).toBe(85)
    for (const e of ['co2', 'power', 'thermal', 'radiation'] as const) s = ev(s, e, ...bestPolicy(s.config)[e])
    expect(s.vital).toBe(82 - 6 - 6) // 70
    expect(s.vital).toBe(70)
    expect(s.structure).toBe(85)
    expect(s.maneuver).toBe(45)

    const fin = finishSaturn(s)
    expect(fin.canProceed).toBe(true)
    const noTitan = routeOptions(fin.state, false).find((r) => r.id === 'balanced')!
    expect(noTitan.maneuverNeeded).toBe(46)
    expect(noTitan.feasible).toBe(false)
    expect(noTitan.failing[0].variable).toBe('maneuver')
    expect(executeReturn(fin.state, 'balanced', false).ok).toBe(false)

    const titan = routeOptions(fin.state, true).find((r) => r.id === 'balanced')!
    expect(titan.feasible).toBe(true)
    const ret = executeReturn(fin.state, 'balanced', true)
    expect(ret.ok).toBe(true)
    expect(ret.state.vital).toBe(70 - 54)
    expect(ret.state.vital).toBe(16)
    expect(ret.state.maneuver).toBe(15)
    expect(ret.state.vital).toBeGreaterThanOrEqual(8)
    const end = land(ret.state)
    expect(end.reentry.outcome).toBe('safe')
    expect(score(end).classification).not.toBe('failed')
  })
})

// ------------------------------------------------------------------ scoring

describe('Scoring', () => {
  function perfect(): MissionState {
    let s = arrive(cfg({ structure: 'reinforced' }))
    for (const i of INVESTIGATION_ORDER) s = runInvestigation(s, i).state
    s = transmitData(s).state
    s = playAllBest(s)
    s = finishSaturn(s).state
    s = executeReturn(s, 'balanced', true).state
    return land(s)
  }

  it('a flawless mission scores 100 and is a success', () => {
    const sc = score(perfect())
    expect(sc.crew).toMatchObject({ total: 40, safeReturn: 25, habitability: 10, protocol: 5 })
    expect(sc.ship).toMatchObject({ total: 25, structural: 15, essentials: 7, capsule: 3 })
    expect(sc.science.total).toBe(20)
    expect(sc.resources.total).toBe(15)
    expect(sc.total).toBe(100)
    expect(sc.classification).toBe('success')
    expect(perfect().result).toBe('completed')
  })

  it('no safe return can never be a success, whatever the other points', () => {
    const s = perfect()
    const hacked: MissionState = { ...s, reentry: { ...s.reentry, outcome: 'pending' }, result: 'inProgress' }
    const sc = score(hacked)
    expect(sc.classification).not.toBe('success')
    expect(sc.crew.safeReturn).toBe(0)
  })

  it('weak points give a partial success: limited comms, low science', () => {
    let s = arrive(cfg({ comms: 'redundant' }))
    s = playAllBest(s) // backup antenna => degraded comms
    s = finishSaturn(s).state
    s = executeReturn(s, 'balanced', true).state
    const end = land(s)
    expect(score(end).classification).toBe('partial')
    expect(end.result).toBe('partial')
  })
})

// ------------------------------------------------------------------ invariants over every design

describe('No resource ever goes negative', () => {
  const opts = {
    structure: ['light', 'reinforced'],
    propulsion: ['chemical', 'combined'],
    power: ['solar', 'nuclear'],
    lifeSupport: ['consumables', 'regenerative'],
    comms: ['standard', 'redundant'],
  } as const
  const all: ShipConfig[] = []
  for (const st of opts.structure)
    for (const pr of opts.propulsion)
      for (const pw of opts.power)
        for (const ls of opts.lifeSupport)
          for (const cm of opts.comms) all.push({ structure: st, propulsion: pr, power: pw, lifeSupport: ls, comms: cm })

  it('best play: every launchable design finishes with a feasible route and safe landing', () => {
    let launchable = 0
    for (const c of all) {
      const m = createMission(c, 'hard')
      if (!designReport(c).canLaunch) {
        expect(launch(m).ok).toBe(false)
        continue
      }
      launchable++
      let s = arrive(c)
      sane(s)
      s = playAllBest(s)
      const fin = finishSaturn(s)
      expect(fin.canProceed).toBe(true)
      s = fin.state
      const feasible = (['slow', 'balanced', 'fast'] as RouteId[]).flatMap((r) => [false, true].map((t) => ({ r, t }))).find(({ r, t }) => routeOptions(s, t).find((x) => x.id === r)!.feasible)
      expect(feasible).toBeDefined()
      s = executeReturn(s, feasible!.r, feasible!.t).state
      sane(s)
      expect(s.vital).toBeGreaterThanOrEqual(8)
      expect(s.maneuver).toBeGreaterThanOrEqual(8)
      s = land(s)
      sane(s)
      expect(s.reentry.outcome).toBe('safe')
    }
    expect(launchable).toBeGreaterThan(10)
  })

  it('every option of every emergency, from every launchable design, keeps resources >= 0', () => {
    for (const c of all) {
      if (!designReport(c).canLaunch) continue
      for (const e of EMERGENCY_ORDER) {
        const base = toEvent(arrive(c), e)
        const stack: MissionState[] = [triggerEmergency(base).state]
        const seen = new Set<string>()
        while (stack.length) {
          const st = stack.pop() as MissionState
          const key = JSON.stringify(st.emergencies[e]) + st.battery + st.vital
          if (seen.has(key)) continue
          seen.add(key)
          for (const o of getEmergency(st, e).options) {
            const r = resolveEmergency(st, e, o.id)
            sane(r.state)
            if (o.available) expect(r.state).not.toBe(st)
            else expect(r.state).toBe(st)
            if (r.state.emergencies[e].status === 'active' && stack.length < 40) stack.push(r.state)
          }
        }
      }
    }
  })
})

// ------------------------------------------------------------------ i18n coverage

describe('i18n keys', () => {
  const src = Object.values(import.meta.glob('./engine.ts', { query: '?raw', import: 'default', eager: true }))[0] as string
  const staticKeys = [...src.matchAll(/'(engine\.[A-Za-z0-9_.]+)'/g)].map((m) => m[1]).filter((k) => !k.endsWith('.'))
  const dynamic: string[] = []
  for (const e of EMERGENCY_ORDER) {
    for (const t of ['title', 'situation', 'science', 'start']) dynamic.push(`engine.em.${e}.${t}`)
    for (const o of EMERGENCY_OPTION_IDS[e]) {
      dynamic.push(`engine.opt.${e}.${o}`, `engine.opt.${e}.${o}.desc`, `engine.out.${e}.${o}`, `engine.expl.${e}.${o}`)
    }
  }
  for (const i of INVESTIGATION_ORDER) dynamic.push(`engine.science.explain.${i}`)
  for (const k of ['capsule.ok', 'capsule.fail', 'shallow', 'steep', 'nominal', 'separation', 'parachutes', 'landing']) dynamic.push(`engine.reentry.${k}.why`)
  for (const k of ['success', 'partial', 'incomplete', 'failed']) dynamic.push(`engine.class.${k}`)
  for (const k of ['budget', 'mass', 'power', 'maneuver', 'autonomy']) dynamic.push(`engine.check.${k}.ok`, `engine.check.${k}.fail`)
  for (const k of ['events', 'crew', 'critical', 'systems', 'route']) dynamic.push(`engine.finish.${k}.ok`, `engine.finish.${k}.fail`)

  it('every key used by the engine exists in English and Spanish', () => {
    expect(staticKeys.length).toBeGreaterThan(80)
    for (const k of [...new Set([...staticKeys, ...dynamic])]) {
      expect(strings.en[k], `en ${k}`).toBeTruthy()
      expect(strings.es[k], `es ${k}`).toBeTruthy()
    }
  })

  it('English and Spanish define the same keys, all namespaced engine.*', () => {
    expect(Object.keys(strings.en).sort()).toEqual(Object.keys(strings.es).sort())
    for (const k of Object.keys(strings.en)) expect(k.startsWith('engine.')).toBe(true)
  })
})
