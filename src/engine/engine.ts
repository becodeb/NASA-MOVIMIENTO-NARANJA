// Pure rules engine for "Space Odyssey: Mission Saturn". No randomness, no mutation of inputs:
// every exported action deep-copies the state and returns a new one. All player-facing text is an
// i18n key (see strings.ts) plus params.
import {
  COMPONENTS,
  EMERGENCY_ORDER,
  INVESTIGATION_ORDER,
  LOADS,
  PARAMS,
  ROUTES,
  ROUTE_ORDER,
  SCORE,
  SPARES_START,
} from './data.ts'
import type {
  ActionResult,
  Change,
  Checkpoint,
  CheckResult,
  Classification,
  CommsMode,
  Costs,
  Difficulty,
  DesignReport,
  EmergencyId,
  EmergencyOption,
  EmergencyOutcome,
  EmergencyProgress,
  EmergencyStatus,
  EmergencyView,
  FinishReport,
  InvestigationId,
  LoadId,
  MissionState,
  ParamValue,
  Params,
  ReentryCorridor,
  ReentryStepId,
  RouteFailure,
  RouteId,
  RouteOption,
  ScoreBreakdown,
  ShipConfig,
  SpareId,
  SystemId,
  SystemStatus,
} from './types.ts'

// ---------------------------------------------------------------- helpers

function clone<T>(x: T): T {
  return structuredClone(x)
}

const round2 = (n: number) => Math.round(n * 100) / 100

function nowOk(s: SystemStatus): boolean {
  return s === 'operational' || s === 'repaired'
}

/** Electrical demand of everything that is currently on (SPEC 3D.3). */
export function loadTotal(s: MissionState): number {
  let t = LOADS.essentials
  if (s.config.lifeSupport === 'regenerative') t += LOADS.regenerative
  if (s.activeLoads.commsRedundant) t += LOADS.commsRedundant
  if (s.activeLoads.science) t += LOADS.science
  if (s.activeLoads.electricPropulsion) t += LOADS.electricPropulsion
  if (s.activeLoads.emergencyHeating) t += LOADS.emergencyHeating
  return t
}

/** P_margin = P_generation - P_active_loads (SPEC 3D.3). */
export function powerMargin(s: MissionState): number {
  return s.powerGeneration - loadTotal(s)
}

export function commsMode(s: MissionState): CommsMode {
  if (nowOk(s.systems.antennaMain)) return 'main'
  if (s.config.comms === 'redundant' && s.backupActive && s.activeLoads.commsRedundant) return 'backup'
  return 'none'
}

function recalc(s: MissionState): void {
  const base = COMPONENTS.power[s.config.power].generation
  const loss =
    s.faults.powerFault === 'event' ? PARAMS.powerEventLoss : s.faults.powerFault === 'persistent' ? PARAMS.powerPersistentLoss : 0
  s.powerGeneration = base - loss
  const ls = COMPONENTS.lifeSupport[s.config.lifeSupport]
  s.vitalRate = s.systems.lifeSupport === 'degraded' ? ls.degradedRate : ls.rate
  s.vital = Math.max(0, round2(s.vital))
  s.battery = Math.max(0, round2(s.battery))
  s.maneuver = Math.max(0, round2(s.maneuver))
  s.structure = Math.min(PARAMS.structureMax, Math.max(0, s.structure))
  s.equipment = Math.min(100, Math.max(0, s.equipment))
  s.radiation = Math.max(0, s.radiation)
  if (s.crewStatus !== 'lost') {
    const bad = s.faults.leak === 'open' || s.faults.co2 === 'failing' || s.faults.blackout || s.radiation > PARAMS.radiationLimit
    s.crewStatus = bad ? 'compromised' : 'safe'
  }
  if (s.vital <= 0 && s.phase !== 'design' && s.phase !== 'transit') {
    // Reserves exhausted before landing.
    if (s.reentry.outcome !== 'safe') {
      s.crewStatus = 'lost'
      s.result = 'failed'
      s.phase = 'closing'
    }
  }
}

function flat(s: MissionState): Record<string, ParamValue | null> {
  const o: Record<string, ParamValue | null> = {
    level: s.level,
    phase: s.phase,
    monthsElapsed: s.monthsElapsed,
    maneuver: s.maneuver,
    powerGeneration: s.powerGeneration,
    battery: s.battery,
    vital: s.vital,
    vitalRate: s.vitalRate,
    structure: s.structure,
    equipment: s.equipment,
    radiation: s.radiation,
    crewStatus: s.crewStatus,
    result: s.result,
    titanAssist: s.titanAssist,
    route: s.route,
    backupActive: s.backupActive,
  }
  for (const [k, v] of Object.entries(s.systems)) o[`systems.${k}`] = v
  for (const [k, v] of Object.entries(s.spares)) o[`spares.${k}`] = v
  for (const [k, v] of Object.entries(s.activeLoads)) o[`activeLoads.${k}`] = v
  for (const [k, v] of Object.entries(s.faults)) o[`faults.${k}`] = v
  for (const [k, v] of Object.entries(s.science.collected)) o[`science.collected.${k}`] = v
  for (const [k, v] of Object.entries(s.science.transmitted)) o[`science.transmitted.${k}`] = v
  return o
}

function diff(a: MissionState, b: MissionState): Change[] {
  const fa = flat(a)
  const fb = flat(b)
  const out: Change[] = []
  for (const k of Object.keys(fb)) if (fa[k] !== fb[k]) out.push({ field: k, from: fa[k] ?? null, to: fb[k] ?? null })
  return out
}

/** SPEC 7C: recompute, then log the action and everything it changed. Returns the finished state. */
function commit(prev: MissionState, s: MissionState, kind: string, key: string, params: Params, success = true): MissionState {
  recalc(s)
  s.history.push({
    seq: prev.history.length + 1,
    month: s.monthsElapsed,
    level: s.level,
    kind,
    key,
    params,
    changes: diff(prev, s),
    success,
  })
  return s
}

function refuse(state: MissionState, msgKey: string, params: Params = {}): ActionResult {
  return { state, ok: false, msgKey, params }
}

function missionOver(s: MissionState): boolean {
  return s.result === 'failed' || s.phase === 'closing'
}

// ---------------------------------------------------------------- Level 1: design

function sumConfig(config: ShipConfig, field: 'cost' | 'mass'): number {
  const c = COMPONENTS
  return (
    c.structure[config.structure][field] +
    c.propulsion[config.propulsion][field] +
    c.power[config.power][field] +
    c.lifeSupport[config.lifeSupport][field] +
    c.comms[config.comms][field]
  )
}

/** Engineering report (SPEC 3E). Launch is blocked when any check fails. */
export function designReport(config: ShipConfig): DesignReport {
  const cost = sumConfig(config, 'cost')
  const mass = PARAMS.commonMass + sumConfig(config, 'mass')
  const powerGen = COMPONENTS.power[config.power].generation
  const ls = COMPONENTS.lifeSupport[config.lifeSupport]
  const essentialLoad =
    LOADS.essentials + (ls.regenerative ? LOADS.regenerative : 0) + (COMPONENTS.comms[config.comms].redundant ? LOADS.commsRedundant : 0)
  const margin = powerGen - essentialLoad
  const maneuver = COMPONENTS.propulsion[config.propulsion].maneuver
  const outboundNeed = PARAMS.outboundManeuver + PARAMS.insertionManeuver
  const autonomyMonths = ls.vital / ls.rate

  // Autonomy: reserves left when leaving Saturn must cover at least one route + the 8-unit reserve.
  const atDeparture = ls.vital - ls.outboundUse - PARAMS.saturnMonths * ls.rate
  const cheapest = ROUTE_ORDER.reduce((best, r) => (ROUTES[r].months < ROUTES[best].months ? r : best), ROUTE_ORDER[0])
  const needVital = ROUTES[cheapest].months * ls.rate + PARAMS.minVitalReserve

  const checks: CheckResult[] = [
    {
      id: 'budget',
      ok: cost <= PARAMS.budget,
      msgKey: cost <= PARAMS.budget ? 'engine.check.budget.ok' : 'engine.check.budget.fail',
      params: { cost, limit: PARAMS.budget, over: Math.max(0, cost - PARAMS.budget) },
    },
    {
      id: 'mass',
      ok: mass <= PARAMS.launchMass,
      msgKey: mass <= PARAMS.launchMass ? 'engine.check.mass.ok' : 'engine.check.mass.fail',
      params: { mass, limit: PARAMS.launchMass, over: Math.max(0, mass - PARAMS.launchMass) },
    },
    {
      id: 'power',
      ok: margin >= 0,
      msgKey: margin >= 0 ? 'engine.check.power.ok' : 'engine.check.power.fail',
      params: { generation: powerGen, load: essentialLoad, margin },
    },
    {
      id: 'maneuver',
      ok: maneuver >= outboundNeed,
      msgKey: maneuver >= outboundNeed ? 'engine.check.maneuver.ok' : 'engine.check.maneuver.fail',
      params: { maneuver, needed: outboundNeed, outbound: PARAMS.outboundManeuver, insertion: PARAMS.insertionManeuver },
    },
    {
      id: 'autonomy',
      ok: atDeparture >= needVital,
      msgKey: atDeparture >= needVital ? 'engine.check.autonomy.ok' : 'engine.check.autonomy.fail',
      params: { available: atDeparture, needed: needVital, route: cheapest, months: ROUTES[cheapest].months, reserve: PARAMS.minVitalReserve },
    },
  ]
  return {
    cost,
    mass,
    powerGen,
    essentialLoad,
    powerMargin: margin,
    maneuver,
    vital: ls.vital,
    vitalRate: ls.rate,
    autonomyMonths,
    checks,
    canLaunch: checks.every((c) => c.ok),
  }
}

function emptyEmergencies(): Record<EmergencyId, EmergencyProgress> {
  const o = {} as Record<EmergencyId, EmergencyProgress>
  for (const id of EMERGENCY_ORDER) o[id] = { status: 'pending', step: 'pending', turn: 0, data: {} }
  return o
}

export function createMission(config: ShipConfig, difficulty: Difficulty): MissionState {
  const rep = designReport(config)
  const s: MissionState = {
    level: 1,
    phase: 'design',
    monthsElapsed: 0,
    config: { ...config },
    difficulty,
    budgetUsed: rep.cost,
    totalMass: rep.mass,
    maneuver: rep.maneuver,
    powerGeneration: rep.powerGen,
    battery: PARAMS.battery,
    vital: rep.vital,
    vitalRate: rep.vitalRate,
    structure: PARAMS.structureMax,
    equipment: 100,
    systems: {
      structure: 'operational',
      propulsion: 'operational',
      power: 'operational',
      lifeSupport: 'operational',
      antennaMain: 'operational',
      antennaBackup: 'operational',
      navigation: 'operational',
      instruments: 'operational',
      thermal: 'operational',
      capsule: 'operational',
    },
    spares: { ...SPARES_START },
    radiation: 0,
    science: {
      collected: { atmosphere: false, rings: false, magnetosphere: false, moons: false },
      transmitted: { atmosphere: false, rings: false, magnetosphere: false, moons: false },
    },
    activeLoads: {
      science: false,
      commsRedundant: COMPONENTS.comms[config.comms].redundant,
      electricPropulsion: false,
      emergencyHeating: false,
    },
    history: [],
    crewStatus: 'safe',
    result: 'inProgress',
    emergencies: emptyEmergencies(),
    saturnMonth: 0,
    activeEmergency: null,
    faults: { leak: 'none', co2: 'ok', powerFault: 'none', thermal: 'ok', blackout: false },
    backupActive: false,
    backupTransmitted: 0,
    flags: { impactPrompt: false, shelterUsed: false, sparesHoarded: 0 },
    titanAssist: false,
    route: null,
    reentry: { done: [], corridor: null, outcome: 'pending' },
  }
  recalc(s)
  return s
}

/** Replace the configuration while still in the design phase (fresh mission, nothing carried over). */
export function redesign(state: MissionState, config: ShipConfig): ActionResult {
  if (state.phase !== 'design') return refuse(state, 'engine.err.wrongPhase', { phase: state.phase })
  return { state: createMission(config, state.difficulty), ok: true, msgKey: 'engine.design.updated', params: {} }
}

/** Launch + outbound transit + Saturn insertion, computed automatically (SPEC 3F). State at Saturn arrival. */
export function launch(state: MissionState): ActionResult {
  if (state.phase !== 'design') return refuse(state, 'engine.err.wrongPhase', { phase: state.phase })
  const rep = designReport(state.config)
  if (!rep.canLaunch) {
    const failed = rep.checks.filter((c) => !c.ok)
    return refuse(state, 'engine.launch.blocked', { count: failed.length, firstCheck: failed[0].id, firstKey: failed[0].msgKey, ...failed[0].params })
  }
  const s = clone(state)
  const ls = COMPONENTS.lifeSupport[s.config.lifeSupport]
  const maneuverUsed = PARAMS.outboundManeuver + PARAMS.insertionManeuver
  s.maneuver -= maneuverUsed
  s.vital -= ls.outboundUse
  s.monthsElapsed += PARAMS.outboundMonths
  s.phase = 'saturn'
  s.level = 2
  const params: Params = {
    months: PARAMS.outboundMonths,
    maneuverUsed,
    maneuverLeft: s.maneuver,
    vitalUsed: ls.outboundUse,
    vitalLeft: s.vital,
    outbound: PARAMS.outboundManeuver,
    insertion: PARAMS.insertionManeuver,
  }
  const next = commit(state, s, 'launch', 'engine.launch.arrived', params)
  return { state: next, ok: true, msgKey: 'engine.launch.arrived', params, explanationKey: 'engine.launch.arrivedWhy' }
}

// ---------------------------------------------------------------- Level 2: loads, repairs, science

/** Turn an optional load on/off. Deficits are never free: they drain the battery at the next operational turn / month. */
export function setLoad(state: MissionState, load: LoadId, on: boolean): ActionResult {
  if (missionOver(state)) return refuse(state, 'engine.err.missionOver')
  if (state.phase !== 'saturn' && state.phase !== 'return') return refuse(state, 'engine.err.wrongPhase', { phase: state.phase })
  if (load === 'commsRedundant' && state.config.comms !== 'redundant') return refuse(state, 'engine.err.unavailable', { reasonKey: 'engine.reason.notInstalled', load })
  if (load === 'electricPropulsion' && !COMPONENTS.propulsion[state.config.propulsion].electric)
    return refuse(state, 'engine.err.unavailable', { reasonKey: 'engine.reason.notInstalled', load })
  if (load === 'science' && on && state.systems.instruments === 'failed')
    return refuse(state, 'engine.err.unavailable', { reasonKey: 'engine.reason.instrumentsDown', load })
  if (state.activeLoads[load] === on) return refuse(state, 'engine.err.unavailable', { reasonKey: 'engine.reason.alreadySet', load })
  const s = clone(state)
  s.activeLoads[load] = on
  recalc(s)
  const margin = powerMargin(s)
  const params: Params = { load, on, margin, generation: s.powerGeneration, demand: loadTotal(s), battery: s.battery }
  const key = margin < 0 ? 'engine.load.deficit' : 'engine.load.ok'
  const next = commit(state, s, 'load', key, params)
  return { state: next, ok: true, msgKey: key, params, explanationKey: 'engine.load.explain' }
}

type RepairCheck = { ok: true } | { ok: false; reasonKey: string }

const REPAIR_SPARE: Partial<Record<SystemId, SpareId>> = {
  structure: 'structural',
  lifeSupport: 'lifeSupport',
  antennaMain: 'electronic',
  instruments: 'electronic',
  power: 'electronic',
}

function repairCheck(s: MissionState, system: SystemId, spare: SpareId): RepairCheck {
  const needed = REPAIR_SPARE[system]
  if (!needed) return { ok: false, reasonKey: 'engine.reason.nothingToRepair' }
  if (needed !== spare) return { ok: false, reasonKey: 'engine.reason.incompatibleSpare' }
  if (s.spares[spare] <= 0) return { ok: false, reasonKey: 'engine.reason.noSpare' }
  const damaged =
    system === 'structure'
      ? s.structure < PARAMS.structureMax || s.faults.leak === 'open' || s.faults.leak === 'contained'
      : system === 'power'
        ? s.faults.powerFault === 'persistent'
        : !nowOk(s.systems[system])
  if (!damaged) return { ok: false, reasonKey: 'engine.reason.nothingToRepair' }
  return { ok: true }
}

function applyRepair(s: MissionState, system: SystemId, spare: SpareId): Params {
  s.spares[spare] -= 1
  const before = { structure: s.structure, equipment: s.equipment }
  switch (system) {
    case 'structure':
      s.structure = Math.min(PARAMS.structureMax, s.structure + PARAMS.repairKitRecovery)
      if (s.faults.leak === 'open' || s.faults.leak === 'contained') s.faults.leak = 'sealed'
      s.systems.structure = 'repaired'
      break
    case 'lifeSupport':
      s.systems.lifeSupport = 'repaired'
      s.faults.co2 = 'ok'
      break
    case 'antennaMain':
      s.systems.antennaMain = 'repaired'
      break
    case 'instruments':
      s.systems.instruments = 'repaired'
      s.equipment = Math.min(100, s.equipment + PARAMS.thermalIntegrityLoss)
      break
    case 'power':
      s.faults.powerFault = 'isolated'
      s.systems.power = 'repaired'
      break
    default:
      break
  }
  return { system, spare, recovered: s.structure - before.structure, left: s.spares[spare] }
}

/** Use a spare on a damaged system after an event (e.g. fix the antenna later). Spares are consumed and type-checked. */
export function repairSystem(state: MissionState, system: SystemId, spare: SpareId): ActionResult {
  if (missionOver(state)) return refuse(state, 'engine.err.missionOver')
  if (state.phase !== 'saturn') return refuse(state, 'engine.err.wrongPhase', { phase: state.phase })
  if (state.activeEmergency) return refuse(state, 'engine.err.unavailable', { reasonKey: 'engine.reason.criticalActive' })
  const chk = repairCheck(state, system, spare)
  if (!chk.ok) return refuse(state, 'engine.err.unavailable', { reasonKey: chk.reasonKey, system, spare })
  const s = clone(state)
  const params = applyRepair(s, system, spare)
  const next = commit(state, s, 'repair', 'engine.repair.done', params)
  return { state: next, ok: true, msgKey: 'engine.repair.done', params, explanationKey: 'engine.repair.explain' }
}

function investigationCheck(s: MissionState, id: InvestigationId, ignoreActive: boolean): { ok: true; deficit: number } | { ok: false; reasonKey: string; params: Params } {
  if (s.science.collected[id]) return { ok: false, reasonKey: 'engine.reason.alreadyDone', params: {} }
  if (s.systems.instruments === 'failed') return { ok: false, reasonKey: 'engine.reason.instrumentsDown', params: {} }
  if (!ignoreActive && s.activeEmergency && s.activeEmergency !== 'comms')
    return { ok: false, reasonKey: 'engine.reason.criticalActive', params: { emergency: s.activeEmergency } }
  if (s.crewStatus === 'lost') return { ok: false, reasonKey: 'engine.err.missionOver', params: {} }
  const extra = s.activeLoads.science ? 0 : LOADS.science
  const demand = loadTotal(s) + extra
  const deficit = Math.max(0, demand - s.powerGeneration)
  if (deficit > s.battery) {
    return {
      ok: false,
      reasonKey: 'engine.reason.powerShortage',
      params: { deficit, battery: s.battery, margin: s.powerGeneration - demand, science: LOADS.science },
    }
  }
  return { ok: true, deficit }
}

function doInvestigation(s: MissionState, id: InvestigationId, deficit: number): Params {
  s.battery -= deficit
  s.science.collected[id] = true
  const n = INVESTIGATION_ORDER.filter((i) => s.science.collected[i]).length
  return { investigation: id, points: PARAMS.investigationPoints, collected: n, total: INVESTIGATION_ORDER.length, batteryUsed: deficit }
}

/** One investigation (5 points). Needs working instruments, power (+20 or battery) and no critical emergency. No months pass. */
export function runInvestigation(state: MissionState, id: InvestigationId): ActionResult {
  if (missionOver(state)) return refuse(state, 'engine.err.missionOver')
  if (state.phase !== 'saturn') return refuse(state, 'engine.err.wrongPhase', { phase: state.phase })
  const chk = investigationCheck(state, id, false)
  if (!chk.ok) return refuse(state, 'engine.err.unavailable', { reasonKey: chk.reasonKey, ...chk.params })
  const s = clone(state)
  const params = doInvestigation(s, id, chk.deficit)
  const next = commit(state, s, 'science', 'engine.science.done', params)
  return { state: next, ok: true, msgKey: 'engine.science.done', params, explanationKey: `engine.science.explain.${id}` }
}

/** Send stored data to Earth. Main antenna: everything. Backup antenna: limited total capacity. Data is never deleted by a link loss. */
export function transmitData(state: MissionState): ActionResult {
  if (missionOver(state) && state.reentry.outcome !== 'safe') return refuse(state, 'engine.err.missionOver')
  if (state.phase !== 'saturn' && state.phase !== 'return') return refuse(state, 'engine.err.wrongPhase', { phase: state.phase })
  const mode = commsMode(state)
  if (mode === 'none') return refuse(state, 'engine.err.unavailable', { reasonKey: 'engine.reason.noLink' })
  const pending = INVESTIGATION_ORDER.filter((i) => state.science.collected[i] && !state.science.transmitted[i])
  if (pending.length === 0) return refuse(state, 'engine.science.nothingToSend')
  const room = mode === 'main' ? pending.length : Math.max(0, PARAMS.backupTransmitCapacity - state.backupTransmitted)
  if (room === 0) return refuse(state, 'engine.err.unavailable', { reasonKey: 'engine.reason.backupFull', capacity: PARAMS.backupTransmitCapacity })
  const s = clone(state)
  const sent = pending.slice(0, room)
  for (const i of sent) s.science.transmitted[i] = true
  if (mode === 'backup') s.backupTransmitted += sent.length
  const params: Params = { sent: sent.length, waiting: pending.length - sent.length, mode }
  const next = commit(state, s, 'transmit', 'engine.science.sent', params)
  return { state: next, ok: true, msgKey: 'engine.science.sent', params, explanationKey: 'engine.science.transmitExplain' }
}

// ---------------------------------------------------------------- Level 2: emergencies

export function nextEmergencyId(state: MissionState): EmergencyId | null {
  return state.saturnMonth < EMERGENCY_ORDER.length ? EMERGENCY_ORDER[state.saturnMonth] : null
}

function ensureTriggered(s: MissionState, id: EmergencyId): void {
  const p = s.emergencies[id]
  if (p.status !== 'pending') return
  p.status = 'active'
  s.activeEmergency = id
  switch (id) {
    case 'comms':
      s.systems.antennaMain = 'failed' // hardware fault (deterministic scenario): recalibration cannot fix it
      p.step = 'diagnose'
      break
    case 'impact': {
      const st = COMPONENTS.structure[s.config.structure]
      s.structure -= st.impactLoss
      s.systems.structure = 'degraded'
      s.faults.leak = 'open'
      p.step = 'contain'
      break
    }
    case 'co2':
      s.faults.co2 = 'failing'
      s.systems.lifeSupport = 'failed'
      p.step = 'respond'
      break
    case 'power':
      s.faults.powerFault = 'event'
      p.step = 'turn'
      p.data.located = false
      break
    case 'thermal':
      s.faults.thermal = 'cold'
      s.systems.thermal = 'degraded'
      p.step = 'respond'
      p.data.heated = 0
      break
    case 'radiation':
      p.step = 'respond'
      p.data.kind = 'trappedParticles' // magnetospheric energetic particles, NOT a solar storm
      break
  }
  recalc(s)
}

/** Start the next monthly event (SPEC 4C). Between events the player has "calm" windows for science and repairs. */
export function triggerEmergency(state: MissionState): ActionResult {
  if (missionOver(state)) return refuse(state, 'engine.err.missionOver')
  if (state.phase !== 'saturn') return refuse(state, 'engine.err.wrongPhase', { phase: state.phase })
  if (state.activeEmergency) return refuse(state, 'engine.err.unavailable', { reasonKey: 'engine.reason.criticalActive', emergency: state.activeEmergency })
  const id = nextEmergencyId(state)
  if (!id) return refuse(state, 'engine.err.unavailable', { reasonKey: 'engine.reason.noMoreEvents' })
  const s = clone(state)
  ensureTriggered(s, id)
  const params: Params = { emergency: id, month: s.saturnMonth + 1 }
  const next = commit(state, s, 'emergencyStart', `engine.em.${id}.start`, params)
  return { state: next, ok: true, msgKey: `engine.em.${id}.start`, params, explanationKey: `engine.em.${id}.science` }
}

function opt(em: EmergencyId, id: string, costs: Costs = {}, unavailable?: { reasonKey: string; params?: Params }): EmergencyOption {
  return {
    id,
    labelKey: `engine.opt.${em}.${id}`,
    descKey: `engine.opt.${em}.${id}.desc`,
    available: !unavailable,
    reasonKey: unavailable?.reasonKey,
    reasonParams: unavailable?.params,
    costs,
  }
}

function optionalLoadsOn(s: MissionState): boolean {
  return s.activeLoads.science || s.activeLoads.electricPropulsion || (s.activeLoads.commsRedundant && !s.backupActive)
}

function emOptions(s: MissionState, id: EmergencyId): EmergencyOption[] {
  const p = s.emergencies[id]
  if (p.status === 'resolved' || p.status === 'partial' || p.status === 'unresolved' || p.status === 'pending') return []
  switch (id) {
    case 'comms': {
      if (p.step === 'diagnose') return [opt(id, 'diagnose'), opt(id, 'ignore')]
      return [
        opt(id, 'recalibrate', { battery: PARAMS.recalibrateBattery, turn: true }, s.battery >= PARAMS.recalibrateBattery ? undefined : { reasonKey: 'engine.reason.noBattery', params: { battery: s.battery } }),
        opt(id, 'activateBackup', {}, s.config.comms === 'redundant' ? undefined : { reasonKey: 'engine.reason.noBackupInstalled' }),
        opt(id, 'repairElectronic', { spare: 'electronic' }, s.spares.electronic > 0 ? undefined : { reasonKey: 'engine.reason.noSpare' }),
        opt(id, 'repairLifeSupportSpare', { spare: 'lifeSupport' }, { reasonKey: 'engine.reason.incompatibleSpare' }),
        opt(id, 'continueAutonomous'),
      ]
    }
    case 'impact': {
      const loss = COMPONENTS.structure[s.config.structure].leakLoss
      if (p.step === 'contain')
        return [opt(id, 'isolate', { vital: loss }), opt(id, 'isolateLate', { vital: loss * 2 }), opt(id, 'ignore', { vital: loss * 2 })]
      return [
        opt(id, 'useKit', { spare: 'structural' }, s.spares.structural > 0 ? undefined : { reasonKey: 'engine.reason.noSpare' }),
        opt(id, 'skipRepair'),
      ]
    }
    case 'co2': {
      const regen = s.config.lifeSupport === 'regenerative'
      const margin = powerMargin(s)
      return [
        opt(id, 'replaceWithSpare', { spare: 'lifeSupport' }, s.spares.lifeSupport > 0 ? undefined : { reasonKey: 'engine.reason.noSpare' }),
        opt(
          id,
          'switchModule',
          {},
          !regen ? { reasonKey: 'engine.reason.notInstalled' } : margin >= 0 ? undefined : { reasonKey: 'engine.reason.noPowerMargin', params: { margin } },
        ),
        opt(id, 'useReserves', { vital: PARAMS.co2ExtraordinaryVital }, s.vital > PARAMS.co2ExtraordinaryVital ? undefined : { reasonKey: 'engine.reason.noReserves', params: { vital: s.vital } }),
        opt(id, 'ignore'),
      ]
    }
    case 'power': {
      const located = p.data.located === true
      const turnsLeft = PARAMS.powerEventTurns - p.turn
      const deficit = Math.max(0, loadTotal(s) - s.powerGeneration)
      return [
        opt(id, 'shedOptional', {}, optionalLoadsOn(s) ? undefined : { reasonKey: 'engine.reason.nothingToShed' }),
        opt(id, 'locate', { battery: deficit, turn: true }, located ? { reasonKey: 'engine.reason.alreadyLocated' } : undefined),
        opt(id, 'isolate', { battery: deficit, turn: true }, located ? undefined : { reasonKey: 'engine.reason.notLocated' }),
        opt(
          id,
          'repairWithSpare',
          { spare: 'electronic' },
          !located ? { reasonKey: 'engine.reason.notLocated' } : s.spares.electronic > 0 ? undefined : { reasonKey: 'engine.reason.noSpare' },
        ),
        opt(id, 'ignore', { battery: deficit, turn: true }, turnsLeft > 0 ? undefined : { reasonKey: 'engine.reason.noTurnsLeft' }),
      ]
    }
    case 'thermal': {
      const heatingOn = s.activeLoads.emergencyHeating
      const marginAfter = s.powerGeneration - (loadTotal(s) + (heatingOn ? 0 : LOADS.emergencyHeating))
      const drain = Math.max(0, -marginAfter)
      let heatBlock: { reasonKey: string; params?: Params } | undefined
      if (marginAfter < 0 && optionalLoadsOn(s)) heatBlock = { reasonKey: 'engine.reason.shedOptionalFirst', params: { margin: marginAfter } }
      else if (drain > s.battery) heatBlock = { reasonKey: 'engine.reason.powerShortage', params: { deficit: drain, battery: s.battery, margin: marginAfter } }
      const reconfBlock =
        s.systems.thermal === 'failed' || s.systems.power === 'failed'
          ? { reasonKey: 'engine.reason.equipmentDown' }
          : s.faults.powerFault === 'persistent'
            ? { reasonKey: 'engine.reason.sharedBus' }
            : undefined
      return [opt(id, 'heat', { battery: drain, turn: true }, heatBlock), opt(id, 'reconfigure', {}, reconfBlock), opt(id, 'ignore')]
    }
    case 'radiation': {
      const next = INVESTIGATION_ORDER.find((i) => !s.science.collected[i])
      let sciBlock: { reasonKey: string; params?: Params } | undefined
      if (!next) sciBlock = { reasonKey: 'engine.reason.noInvestigationLeft' }
      else {
        const chk = investigationCheck(s, next, true)
        if (!chk.ok) sciBlock = { reasonKey: chk.reasonKey, params: chk.params }
      }
      return [opt(id, 'shelter'), opt(id, 'continueScience', {}, sciBlock), opt(id, 'ignore')]
    }
  }
}

function powerTurn(s: MissionState, p: EmergencyProgress): { deficit: number; blackout: boolean } {
  p.turn += 1
  const deficit = Math.max(0, loadTotal(s) - s.powerGeneration)
  if (deficit > s.battery) {
    s.battery = 0
    s.faults.blackout = true
    return { deficit, blackout: true }
  }
  s.battery -= deficit
  return { deficit, blackout: false }
}

interface Applied {
  success: boolean
  params: Params
  close?: EmergencyStatus
  /** The event already paid its own battery draw turn by turn, so the month-end draw is skipped. */
  skipDraw?: boolean
}

function applyOption(s: MissionState, id: EmergencyId, optionId: string): Applied {
  const p = s.emergencies[id]
  p.choice = optionId
  switch (id) {
    case 'comms':
      switch (optionId) {
        case 'diagnose':
          p.step = 'fix'
          p.data.fault = 'hardware'
          return { success: true, params: { fault: 'hardware' } }
        case 'ignore':
        case 'continueAutonomous':
          return { success: true, params: {}, close: 'unresolved' }
        case 'recalibrate':
          s.battery -= PARAMS.recalibrateBattery
          p.data.recalibrations = (Number(p.data.recalibrations) || 0) + 1
          return { success: false, params: { battery: PARAMS.recalibrateBattery, left: s.battery } }
        case 'activateBackup':
          s.backupActive = true
          s.activeLoads.commsRedundant = true
          return { success: true, params: { capacity: PARAMS.backupTransmitCapacity }, close: 'partial' }
        case 'repairElectronic':
          s.spares.electronic -= 1
          s.systems.antennaMain = 'repaired'
          return { success: true, params: { left: s.spares.electronic }, close: 'resolved' }
      }
      break
    case 'impact': {
      const loss = COMPONENTS.structure[s.config.structure].leakLoss
      switch (optionId) {
        case 'isolate':
          s.vital -= loss
          s.faults.leak = 'contained'
          s.flags.impactPrompt = true
          p.step = 'repair'
          return { success: true, params: { vitalLost: loss, integrity: s.structure } }
        case 'isolateLate':
          s.vital -= loss * 2
          s.faults.leak = 'contained'
          p.step = 'repair'
          return { success: true, params: { vitalLost: loss * 2, integrity: s.structure } }
        case 'ignore':
          s.vital -= loss * 2
          return { success: false, params: { vitalLost: loss * 2, integrity: s.structure }, close: 'unresolved' }
        case 'useKit': {
          const params = applyRepair(s, 'structure', 'structural')
          return { success: true, params: { ...params, integrity: s.structure }, close: 'resolved' }
        }
        case 'skipRepair':
          return { success: true, params: { integrity: s.structure }, close: 'partial' }
      }
      break
    }
    case 'co2':
      switch (optionId) {
        case 'replaceWithSpare':
          s.spares.lifeSupport -= 1
          s.systems.lifeSupport = 'repaired'
          s.faults.co2 = 'ok'
          return { success: true, params: { left: s.spares.lifeSupport }, close: 'resolved' }
        case 'switchModule':
          s.systems.lifeSupport = 'repaired'
          s.faults.co2 = 'ok'
          return { success: true, params: { margin: powerMargin(s) }, close: 'resolved' }
        case 'useReserves': {
          s.vital -= PARAMS.co2ExtraordinaryVital
          s.faults.co2 = 'ok'
          const regen = s.config.lifeSupport === 'regenerative'
          s.systems.lifeSupport = regen ? 'degraded' : 'repaired'
          return {
            success: true,
            params: { vitalLost: PARAMS.co2ExtraordinaryVital, regenerative: regen, rate: regen ? COMPONENTS.lifeSupport.regenerative.degradedRate : COMPONENTS.lifeSupport.consumables.rate },
            close: regen ? 'partial' : 'resolved',
          }
        }
        case 'ignore':
          s.crewStatus = 'lost'
          s.result = 'failed'
          s.phase = 'closing'
          return { success: false, params: {}, close: 'unresolved' }
      }
      break
    case 'power':
      switch (optionId) {
        case 'shedOptional': {
          s.activeLoads.science = false
          s.activeLoads.electricPropulsion = false
          s.activeLoads.emergencyHeating = false
          if (!s.backupActive) s.activeLoads.commsRedundant = false
          recalc(s)
          return { success: true, params: { margin: powerMargin(s), demand: loadTotal(s), generation: s.powerGeneration } }
        }
        case 'locate':
        case 'ignore': {
          if (optionId === 'locate') p.data.located = true
          const t = powerTurn(s, p)
          return finishPowerTurn(s, p, { success: !t.blackout, params: { deficit: t.deficit, battery: s.battery, turn: p.turn, turns: PARAMS.powerEventTurns, blackout: t.blackout } })
        }
        case 'isolate': {
          const t = powerTurn(s, p)
          if (t.blackout) return finishPowerTurn(s, p, { success: false, params: { deficit: t.deficit, battery: 0, turn: p.turn, turns: PARAMS.powerEventTurns, blackout: true } })
          s.faults.powerFault = 'isolated'
          s.systems.power = 'repaired'
          return { success: true, params: { deficit: t.deficit, battery: s.battery, turn: p.turn }, close: 'resolved', skipDraw: true }
        }
        case 'repairWithSpare':
          s.spares.electronic -= 1
          s.faults.powerFault = 'isolated'
          s.systems.power = 'repaired'
          return { success: true, params: { left: s.spares.electronic, battery: s.battery }, close: 'resolved', skipDraw: true }
      }
      break
    case 'thermal':
      switch (optionId) {
        case 'heat': {
          s.activeLoads.emergencyHeating = true
          recalc(s)
          const deficit = Math.max(0, loadTotal(s) - s.powerGeneration)
          s.battery -= deficit
          p.turn += 1
          p.data.heated = Number(p.data.heated) + 1
          if (Number(p.data.heated) >= PARAMS.thermalHeatingTurns) {
            s.activeLoads.emergencyHeating = false
            s.faults.thermal = 'ok'
            s.systems.thermal = 'repaired'
            return { success: true, params: { deficit, battery: s.battery, heated: Number(p.data.heated), turns: PARAMS.thermalHeatingTurns }, close: 'resolved', skipDraw: true }
          }
          return { success: true, params: { deficit, battery: s.battery, heated: Number(p.data.heated), turns: PARAMS.thermalHeatingTurns } }
        }
        case 'reconfigure':
          s.faults.thermal = 'ok'
          s.systems.thermal = 'repaired'
          return { success: true, params: {}, close: 'resolved', skipDraw: true }
        case 'ignore':
          s.equipment -= PARAMS.thermalIntegrityLoss
          s.systems.instruments = 'degraded'
          s.activeLoads.emergencyHeating = false
          s.activeLoads.science = false
          return { success: false, params: { lost: PARAMS.thermalIntegrityLoss, equipment: s.equipment }, close: 'unresolved', skipDraw: true }
      }
      break
    case 'radiation':
      switch (optionId) {
        case 'shelter':
          s.radiation += PARAMS.radiationSheltered
          s.activeLoads.science = false
          s.flags.shelterUsed = true
          return { success: true, params: { added: PARAMS.radiationSheltered, radiation: s.radiation }, close: 'resolved' }
        case 'continueScience': {
          const next = INVESTIGATION_ORDER.find((i) => !s.science.collected[i]) as InvestigationId
          const chk = investigationCheck(s, next, true)
          const deficit = chk.ok ? chk.deficit : 0
          const sci = doInvestigation(s, next, deficit)
          s.radiation += PARAMS.radiationExposed
          return { success: false, params: { ...sci, added: PARAMS.radiationExposed, radiation: s.radiation, limit: PARAMS.radiationLimit }, close: 'partial' }
        }
        case 'ignore':
          s.radiation += PARAMS.radiationExposed
          return { success: false, params: { added: PARAMS.radiationExposed, radiation: s.radiation, limit: PARAMS.radiationLimit }, close: 'unresolved' }
      }
      break
  }
  return { success: false, params: {} }
}

/** After a power-event turn: blackout or out of turns turns the anomaly into a persistent -15 generation fault. */
function finishPowerTurn(s: MissionState, p: EmergencyProgress, applied: Applied): Applied {
  const blackout = applied.params.blackout === true
  if (blackout || p.turn >= PARAMS.powerEventTurns) {
    s.faults.powerFault = 'persistent'
    s.systems.power = 'degraded'
    return { ...applied, close: 'unresolved', skipDraw: true }
  }
  return applied
}

function closeMonth(s: MissionState, id: EmergencyId, status: EmergencyStatus, skipDraw: boolean, params: Params): void {
  const p = s.emergencies[id]
  p.status = status
  p.step = 'closed'
  p.closedAtMonth = s.monthsElapsed + 1
  if (status === 'unresolved') {
    const spare: SpareId | null = id === 'comms' || id === 'power' ? 'electronic' : id === 'impact' ? 'structural' : null
    if (spare && s.spares[spare] > 0) s.flags.sparesHoarded += 1
  }
  s.activeEmergency = null
  s.saturnMonth += 1
  s.monthsElapsed += 1
  recalc(s)
  if (!skipDraw) {
    const deficit = Math.max(0, loadTotal(s) - s.powerGeneration)
    if (deficit > 0) {
      if (deficit <= s.battery) s.battery -= deficit
      else {
        s.battery = 0
        s.faults.blackout = true
      }
    }
  }
  // The month is charged at the consumption rate in force when it closes (after the event's effects).
  const used = s.vitalRate
  s.vital -= used
  params.vitalUsed = used
  params.month = s.saturnMonth
}

/** Read-only view of an emergency and its currently valid options (previews the trigger if the month has not started). */
export function getEmergency(state: MissionState, id: EmergencyId): EmergencyView {
  const s = clone(state)
  const current = nextEmergencyId(state) === id && state.emergencies[id].status !== 'resolved'
  if (nextEmergencyId(state) === id && s.emergencies[id].status === 'pending' && !s.activeEmergency) ensureTriggered(s, id)
  return {
    id,
    status: state.emergencies[id].status,
    step: s.emergencies[id].step,
    titleKey: `engine.em.${id}.title`,
    situationKey: `engine.em.${id}.situation`,
    scienceKey: `engine.em.${id}.science`,
    current: current && state.phase === 'saturn',
    options: current ? emOptions(s, id) : [],
  }
}

export function resolveEmergency(state: MissionState, id: EmergencyId, optionId: string): { state: MissionState; outcome: EmergencyOutcome } {
  const bad = (msgKey: string, params: Params = {}) => ({
    state,
    outcome: { success: false, msgKey, params, explanationKey: 'engine.err.explain', closed: false },
  })
  if (missionOver(state)) return bad('engine.err.missionOver')
  if (state.phase !== 'saturn') return bad('engine.err.wrongPhase', { phase: state.phase })
  if (nextEmergencyId(state) !== id) return bad('engine.err.notCurrent', { emergency: id, current: nextEmergencyId(state) ?? 'none' })
  if (state.activeEmergency && state.activeEmergency !== id) return bad('engine.err.notCurrent', { emergency: id })
  const s = clone(state)
  ensureTriggered(s, id)
  const o = emOptions(s, id).find((x) => x.id === optionId)
  if (!o) return bad('engine.err.unknownOption', { emergency: id, option: optionId })
  if (!o.available) return bad('engine.err.unavailable', { reasonKey: o.reasonKey ?? 'engine.reason.notAvailable', option: optionId, ...(o.reasonParams ?? {}) })
  const applied = applyOption(s, id, optionId)
  recalc(s)
  const params: Params = { emergency: id, option: optionId, ...applied.params }
  let closed = false
  if (applied.close) {
    closeMonth(s, id, applied.close, applied.skipDraw === true, params)
    closed = true
  }
  const msgKey = id === 'power' && optionId === 'isolate' && applied.params.blackout === true
    ? 'engine.out.power.isolateLate'
    : `engine.out.${id}.${optionId}`
  const next = commit(state, s, 'emergency', msgKey, params, applied.success)
  return { state: next, outcome: { success: applied.success, msgKey, params, explanationKey: `engine.expl.${id}.${optionId}`, closed } }
}

// ---------------------------------------------------------------- end of Level 2

function essentialsFailed(s: MissionState): SystemId[] {
  const list: SystemId[] = ['structure', 'propulsion', 'power', 'lifeSupport', 'navigation']
  return list.filter((k) => s.systems[k] === 'failed')
}

/** Read-only: can the player start Level 3? (SPEC 4G, 8B). */
export function finishChecks(state: MissionState): FinishReport {
  const failed = essentialsFailed(state)
  const essentialPower = LOADS.essentials + (state.config.lifeSupport === 'regenerative' ? LOADS.regenerative : 0)
  const critical: string[] = []
  if (state.faults.leak === 'open') critical.push('leak')
  if (state.faults.co2 === 'failing') critical.push('co2')
  if (state.powerGeneration < essentialPower) critical.push('power')
  const routesOk = [false, true].flatMap((t) => routeOptions(state, t)).filter((r) => r.feasible)
  const checks: CheckResult[] = [
    { id: 'events', ok: state.saturnMonth >= PARAMS.saturnMonths, msgKey: state.saturnMonth >= PARAMS.saturnMonths ? 'engine.finish.events.ok' : 'engine.finish.events.fail', params: { months: state.saturnMonth, total: PARAMS.saturnMonths } },
    { id: 'crew', ok: state.crewStatus !== 'lost', msgKey: state.crewStatus !== 'lost' ? 'engine.finish.crew.ok' : 'engine.finish.crew.fail', params: { crew: state.crewStatus } },
    { id: 'critical', ok: critical.length === 0, msgKey: critical.length === 0 ? 'engine.finish.critical.ok' : 'engine.finish.critical.fail', params: { problems: critical.join(',') } },
    { id: 'systems', ok: failed.length === 0, msgKey: failed.length === 0 ? 'engine.finish.systems.ok' : 'engine.finish.systems.fail', params: { failed: failed.join(',') } },
    { id: 'route', ok: routesOk.length > 0, msgKey: routesOk.length > 0 ? 'engine.finish.route.ok' : 'engine.finish.route.fail', params: { count: routesOk.length, maneuver: state.maneuver, vital: state.vital } },
  ]
  const count = (st: EmergencyStatus) => EMERGENCY_ORDER.filter((e) => state.emergencies[e].status === st).length
  const report: Record<string, ParamValue> = {
    structure: state.structure,
    propulsion: state.systems.propulsion,
    maneuver: state.maneuver,
    generation: state.powerGeneration,
    battery: state.battery,
    vital: state.vital,
    vitalRate: state.vitalRate,
    lifeSupport: state.systems.lifeSupport,
    antennaMain: state.systems.antennaMain,
    antennaBackup: state.config.comms === 'redundant' ? (state.backupActive ? 'active' : 'standby') : 'none',
    sparesStructural: state.spares.structural,
    sparesLifeSupport: state.spares.lifeSupport,
    sparesElectronic: state.spares.electronic,
    radiation: state.radiation,
    collected: INVESTIGATION_ORDER.filter((i) => state.science.collected[i]).length,
    transmitted: INVESTIGATION_ORDER.filter((i) => state.science.transmitted[i]).length,
    resolved: count('resolved'),
    partial: count('partial'),
    unresolved: count('unresolved'),
  }
  return { canProceed: checks.every((c) => c.ok), checks, report }
}

/** Close the Saturn stay. If the checks pass the mission moves to Level 3, otherwise it ends (stranded or failed). */
export function finishSaturn(state: MissionState): ActionResult & FinishReport {
  const fin = finishChecks(state)
  if (state.phase !== 'saturn') return { ...refuse(state, 'engine.err.wrongPhase', { phase: state.phase }), ...fin, canProceed: false }
  const s = clone(state)
  if (fin.canProceed) {
    s.level = 3
    s.phase = 'return'
    const next = commit(state, s, 'finishSaturn', 'engine.finish.proceed', fin.report)
    return { state: next, ok: true, msgKey: 'engine.finish.proceed', params: fin.report, explanationKey: 'engine.finish.proceedWhy', ...fin }
  }
  const eventsDone = fin.checks.find((c) => c.id === 'events')?.ok
  if (!eventsDone) return { ...refuse(state, 'engine.finish.events.fail', { months: state.saturnMonth, total: PARAMS.saturnMonths }), ...fin }
  s.phase = 'closing'
  s.result = s.crewStatus === 'lost' ? 'failed' : 'incomplete'
  if (s.result === 'failed') s.crewStatus = 'lost'
  const next = commit(state, s, 'finishSaturn', 'engine.finish.blocked', { failed: fin.checks.filter((c) => !c.ok).map((c) => c.id).join(',') }, false)
  return { state: next, ok: false, msgKey: 'engine.finish.blocked', params: { failed: fin.checks.filter((c) => !c.ok).map((c) => c.id).join(',') }, explanationKey: 'engine.finish.blockedWhy', ...fin, canProceed: false }
}

// ---------------------------------------------------------------- Level 3: return

export function titanAvailability(state: MissionState): { available: boolean; reasonKey?: string; params: Params } {
  if (state.systems.navigation === 'failed') return { available: false, reasonKey: 'engine.titan.noNavigation', params: {} }
  if (state.systems.propulsion === 'failed') return { available: false, reasonKey: 'engine.titan.noPropulsion', params: {} }
  if (state.maneuver < PARAMS.titanPrep) return { available: false, reasonKey: 'engine.titan.noManeuver', params: { maneuver: state.maneuver, prep: PARAMS.titanPrep } }
  return { available: true, params: { prep: PARAMS.titanPrep, saving: PARAMS.titanSaving, net: PARAMS.titanSaving - PARAMS.titanPrep } }
}

function returnPowerNeed(s: MissionState): number {
  // Optional loads (science, redundant comms) are shed for the return burn; electric propulsion needs its +20.
  return (
    LOADS.essentials +
    (s.config.lifeSupport === 'regenerative' ? LOADS.regenerative : 0) +
    (COMPONENTS.propulsion[s.config.propulsion].electric ? LOADS.electricPropulsion : 0)
  )
}

/** Validate each route (SPEC 5E): M >= Mroute + 8, R >= T*C + 8, power, safety, navigation. */
export function routeOptions(state: MissionState, useTitan: boolean): RouteOption[] {
  const titan = titanAvailability(state)
  return ROUTE_ORDER.map((id) => {
    const r = ROUTES[id]
    const eff = useTitan ? Math.max(0, r.maneuver - PARAMS.titanSaving) : r.maneuver
    const maneuverNeeded = (useTitan ? PARAMS.titanPrep : 0) + eff + PARAMS.minManeuverReserve
    const vitalNeeded = round2(r.months * state.vitalRate + PARAMS.minVitalReserve)
    const failing: RouteFailure[] = []
    if (useTitan && !titan.available) failing.push({ variable: 'titan', msgKey: titan.reasonKey as string, params: titan.params })
    if (state.maneuver < maneuverNeeded)
      failing.push({
        variable: 'maneuver',
        msgKey: useTitan ? 'engine.route.fail.maneuver' : 'engine.route.fail.maneuverNoTitan',
        params: { have: state.maneuver, need: maneuverNeeded, short: maneuverNeeded - state.maneuver, route: eff, reserve: PARAMS.minManeuverReserve, prep: useTitan ? PARAMS.titanPrep : 0 },
      })
    if (state.vital < vitalNeeded)
      failing.push({
        variable: 'vital',
        msgKey: 'engine.route.fail.vital',
        params: { have: state.vital, need: vitalNeeded, short: round2(vitalNeeded - state.vital), months: r.months, rate: state.vitalRate, reserve: PARAMS.minVitalReserve },
      })
    const pNeed = returnPowerNeed(state)
    if (state.powerGeneration < pNeed)
      failing.push({ variable: 'power', msgKey: 'engine.route.fail.power', params: { have: state.powerGeneration, need: pNeed, short: pNeed - state.powerGeneration } })
    if (state.systems.navigation === 'failed') failing.push({ variable: 'navigation', msgKey: 'engine.route.fail.navigation', params: {} })
    const unsafe: string[] = []
    if (state.crewStatus === 'lost') unsafe.push('crew')
    if (state.systems.lifeSupport === 'failed') unsafe.push('lifeSupport')
    if (state.systems.propulsion === 'failed') unsafe.push('propulsion')
    if (state.faults.leak === 'open') unsafe.push('leak')
    if (state.structure < PARAMS.minReturnIntegrity) unsafe.push('structure')
    if (unsafe.length) failing.push({ variable: 'safety', msgKey: 'engine.route.fail.safety', params: { problems: unsafe.join(','), structure: state.structure, min: PARAMS.minReturnIntegrity } })
    return {
      id,
      months: r.months,
      baseManeuver: r.maneuver,
      effectiveManeuver: eff,
      maneuverNeeded,
      vitalNeeded,
      maneuverAfter: round2(state.maneuver - (useTitan ? PARAMS.titanPrep : 0) - eff),
      vitalAfter: round2(state.vital - r.months * state.vitalRate),
      useTitan,
      feasible: failing.length === 0,
      failing,
    }
  })
}

/** Commit to a route: prep + route burn, whole-trip consumption at the real consumption rate. No refuelling. */
export function executeReturn(state: MissionState, routeId: RouteId, useTitan: boolean): ActionResult {
  if (missionOver(state)) return refuse(state, 'engine.err.missionOver')
  if (state.phase !== 'return' || state.route) return refuse(state, 'engine.err.wrongPhase', { phase: state.phase })
  const opt1 = routeOptions(state, useTitan).find((r) => r.id === routeId) as RouteOption
  if (!opt1.feasible) return refuse(state, 'engine.route.blocked', { route: routeId, count: opt1.failing.length, variable: opt1.failing[0].variable })
  const s = clone(state)
  if (useTitan) s.maneuver -= PARAMS.titanPrep
  s.maneuver -= opt1.effectiveManeuver
  const used = round2(opt1.months * s.vitalRate)
  s.vital -= used
  s.monthsElapsed += opt1.months
  s.route = routeId
  s.titanAssist = useTitan
  s.activeLoads.science = false
  s.activeLoads.emergencyHeating = false
  const params: Params = {
    route: routeId,
    months: opt1.months,
    titan: useTitan,
    maneuverUsed: state.maneuver - s.maneuver,
    maneuverLeft: s.maneuver,
    vitalUsed: used,
    vitalLeft: s.vital,
    rate: s.vitalRate,
    saved: useTitan ? PARAMS.titanSaving - PARAMS.titanPrep : 0,
  }
  const next = commit(state, s, 'return', 'engine.return.done', params)
  return { state: next, ok: true, msgKey: 'engine.return.done', params, explanationKey: useTitan ? 'engine.return.titanWhy' : 'engine.return.whyNoTitan' }
}

const REENTRY_ORDER: ReentryStepId[] = ['capsuleCheck', 'corridor', 'separation', 'parachutes', 'landing']

/** Reentry procedures in order (SPEC 5G). Only the nominal corridor leads to a safe return. */
export function reentryStep(state: MissionState, step: ReentryStepId, corridor?: ReentryCorridor): ActionResult {
  if (state.phase !== 'return' || !state.route || state.reentry.outcome !== 'pending') return refuse(state, 'engine.reentry.notReady')
  const expected = REENTRY_ORDER[state.reentry.done.length]
  if (step !== expected) return refuse(state, 'engine.reentry.outOfOrder', { expected, got: step })
  const s = clone(state)
  const fail = (key: string, params: Params = {}): ActionResult => {
    s.reentry.outcome = 'failed'
    s.reentry.failureKey = key
    s.crewStatus = 'lost'
    s.result = 'failed'
    s.phase = 'closing'
    if (step === 'corridor') s.reentry.corridor = corridor ?? null
    const next = commit(state, s, 'reentry', key, { step, ...params }, false)
    return { state: next, ok: false, msgKey: key, params: { step, ...params }, explanationKey: `${key}.why` }
  }
  const pass = (key: string, params: Params = {}): ActionResult => {
    s.reentry.done.push(step)
    const next = commit(state, s, 'reentry', key, { step, ...params })
    return { state: next, ok: true, msgKey: key, params: { step, ...params }, explanationKey: `${key}.why` }
  }
  switch (step) {
    case 'capsuleCheck':
      if (s.systems.capsule === 'failed') return fail('engine.reentry.capsule.fail')
      return pass('engine.reentry.capsule.ok')
    case 'corridor':
      if (!corridor) return refuse(state, 'engine.reentry.needCorridor')
      s.reentry.corridor = corridor
      if (corridor === 'shallow') return fail('engine.reentry.shallow', { corridor })
      if (corridor === 'steep') return fail('engine.reentry.steep', { corridor })
      return pass('engine.reentry.nominal', { corridor })
    case 'separation':
      return pass('engine.reentry.separation')
    case 'parachutes':
      return pass('engine.reentry.parachutes')
    case 'landing': {
      s.reentry.done.push(step)
      s.reentry.outcome = 'safe'
      s.phase = 'closing'
      const sc = scoreInternal(s)
      s.result = sc.classification === 'success' ? 'completed' : sc.classification === 'partial' ? 'partial' : sc.classification === 'incomplete' ? 'incomplete' : 'failed'
      const next = commit(state, s, 'reentry', 'engine.reentry.landing', { step, total: sc.total, classification: sc.classification })
      return { state: next, ok: true, msgKey: 'engine.reentry.landing', params: { step, total: sc.total, classification: sc.classification }, explanationKey: 'engine.reentry.landing.why' }
    }
  }
}

// ---------------------------------------------------------------- scoring

function commsStatusFactor(s: MissionState): number {
  const m = commsMode(s)
  return m === 'main' ? (s.systems.antennaMain === 'operational' || s.systems.antennaMain === 'repaired' ? 1 : 0) : m === 'backup' ? 0.5 : 0
}

function statusFactor(st: SystemStatus): number {
  return st === 'operational' || st === 'repaired' ? 1 : st === 'degraded' ? 0.5 : 0
}

function shipEssentialFactors(s: MissionState): number[] {
  return [
    statusFactor(s.systems.propulsion),
    s.faults.powerFault === 'persistent' ? 0.5 : statusFactor(s.systems.power),
    statusFactor(s.systems.lifeSupport),
    statusFactor(s.systems.navigation),
    commsStatusFactor(s),
  ]
}

function scoreInternal(s: MissionState): ScoreBreakdown {
  const safeReturn = s.reentry.outcome === 'safe'
  // --- crew safety (40)
  const retPts = safeReturn ? SCORE.crewReturn : 0
  let hab = SCORE.crewHabitability
  if (s.emergencies.co2.status === 'unresolved') hab -= 4
  if (s.emergencies.impact.status === 'unresolved' || s.faults.leak === 'open') hab -= 4
  else if (s.emergencies.impact.choice === 'isolateLate') hab -= 1
  if (s.faults.blackout) hab -= 2
  // A lost crew means habitability was not maintained, whatever happened earlier.
  hab = s.crewStatus === 'lost' ? 0 : Math.max(0, hab)
  let protocol = 0
  if (s.flags.shelterUsed) protocol += 3
  if (s.flags.impactPrompt) protocol += 1
  if (!s.faults.blackout && s.emergencies.power.status !== 'pending') protocol += 1
  protocol = Math.min(SCORE.crewProtocol, protocol)
  // --- ship (25)
  const structural = Math.round((SCORE.shipStructure * s.structure) / PARAMS.structureMax)
  const factors = shipEssentialFactors(s)
  const essentials = Math.round((SCORE.shipEssentials * factors.reduce((a, b) => a + b, 0)) / factors.length)
  const capsule = s.reentry.outcome === 'failed' ? 0 : Math.round(SCORE.shipCapsule * statusFactor(s.systems.capsule))
  // --- science (20): stored data counts if it came home; otherwise only what reached Earth
  const per = {} as Record<InvestigationId, number>
  for (const i of INVESTIGATION_ORDER) per[i] = s.science.collected[i] && (safeReturn || s.science.transmitted[i]) ? SCORE.perInvestigation : 0
  const sci = INVESTIGATION_ORDER.reduce((a, i) => a + per[i], 0)
  // --- resources (15)
  // Reserves are judged at the end of the return (spec 9D): without a completed return they earn nothing.
  const vitalPts = safeReturn ? Math.round(Math.min(1, s.vital / PARAMS.minVitalReserve) * SCORE.resVital) : 0
  const manPts = safeReturn ? Math.round(Math.min(1, s.maneuver / PARAMS.minManeuverReserve) * SCORE.resManeuver) : 0
  const energyMat = (s.faults.blackout ? 0 : SCORE.resEnergy) + Math.max(0, SCORE.resMaterials - s.flags.sparesHoarded)
  const crewTotal = retPts + hab + protocol
  const shipTotal = structural + essentials + capsule
  const total = crewTotal + shipTotal + sci + vitalPts + manPts + energyMat

  let classification: Classification
  if (!safeReturn) classification = s.crewStatus === 'lost' || s.result === 'failed' ? 'failed' : 'incomplete'
  else {
    const essentialsFull = factors.every((f) => f === 1)
    const nSci = INVESTIGATION_ORDER.filter((i) => s.science.collected[i]).length
    classification = s.crewStatus === 'safe' && essentialsFull && nSci >= PARAMS.successMinInvestigations ? 'success' : 'partial'
  }
  return {
    crew: { total: crewTotal, safeReturn: retPts, habitability: hab, protocol },
    ship: { total: shipTotal, structural, essentials, capsule },
    science: { total: sci, perInvestigation: per },
    resources: { total: vitalPts + manPts + energyMat, vital: vitalPts, maneuver: manPts, energyMaterials: energyMat },
    total,
    classification,
    safeReturn,
    classificationKey: `engine.class.${classification}`,
  }
}

/** Score breakdown (100 max) + classification. No safe return => never "success". */
export function score(state: MissionState): ScoreBreakdown {
  return scoreInternal(state)
}

// ---------------------------------------------------------------- checkpoints (learning feature)

/** Deep copy of the state (also usable as the autosave payload). */
export function snapshot(state: MissionState): MissionState {
  return clone(state)
}

export function createCheckpoint(state: MissionState, label: string): Checkpoint {
  return { label, month: state.monthsElapsed, level: state.level, state: clone(state) }
}

/** Easy mode may restore the last checkpoint; hard mode may not. */
export function canRestore(state: MissionState): boolean {
  return state.difficulty === 'easy'
}

/** Returns exactly the saved values (a fresh copy, so the checkpoint can be reused). */
export function restoreCheckpoint(cp: Checkpoint): MissionState {
  return clone(cp.state)
}

/** Hints are shown in easy mode only. */
export function showHints(state: MissionState): boolean {
  return state.difficulty === 'easy'
}
