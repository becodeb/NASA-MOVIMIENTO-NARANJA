// Types for the pure rules engine (SPEC section 7A). All state is plain JSON (deep-copyable).

export type StructureChoice = 'light' | 'reinforced'
export type PropulsionChoice = 'chemical' | 'combined'
export type PowerChoice = 'solar' | 'nuclear'
export type LifeSupportChoice = 'consumables' | 'regenerative'
export type CommsChoice = 'standard' | 'redundant'

export interface ShipConfig {
  structure: StructureChoice
  propulsion: PropulsionChoice
  power: PowerChoice
  lifeSupport: LifeSupportChoice
  comms: CommsChoice
}

export type Difficulty = 'easy' | 'hard'
export type EmergencyId = 'comms' | 'impact' | 'co2' | 'power' | 'thermal' | 'radiation'
export type InvestigationId = 'atmosphere' | 'rings' | 'magnetosphere' | 'moons'
export type RouteId = 'fast' | 'balanced' | 'slow'
export type ReentryCorridor = 'shallow' | 'nominal' | 'steep'
export type ReentryStepId = 'capsuleCheck' | 'corridor' | 'separation' | 'parachutes' | 'landing'

export type SystemStatus = 'operational' | 'degraded' | 'failed' | 'repaired'
export type SystemId =
  | 'structure'
  | 'propulsion'
  | 'power'
  | 'lifeSupport'
  | 'antennaMain'
  | 'antennaBackup'
  | 'navigation'
  | 'instruments'
  | 'thermal'
  | 'capsule'
export type SpareId = 'structural' | 'lifeSupport' | 'electronic'
/** Optional / toggleable electrical loads (essentials and regenerative life support are always on). */
export type LoadId = 'science' | 'commsRedundant' | 'electricPropulsion' | 'emergencyHeating'

export type Phase = 'design' | 'transit' | 'saturn' | 'return' | 'closing'
export type CrewStatus = 'safe' | 'compromised' | 'lost'
export type MissionResult = 'inProgress' | 'completed' | 'partial' | 'incomplete' | 'failed'
export type Classification = 'success' | 'partial' | 'incomplete' | 'failed'
export type CommsMode = 'main' | 'backup' | 'none'

export type ParamValue = string | number | boolean
export type Params = Record<string, ParamValue>

export interface Change {
  field: string
  from: ParamValue | null
  to: ParamValue | null
}

/** One decision-log entry. `key`/`params` are i18n; `changes` lists every tracked value that moved. */
export interface HistoryEntry {
  seq: number
  month: number
  level: 1 | 2 | 3
  kind: string
  key: string
  params: Params
  changes: Change[]
  success: boolean
}

export type EmergencyStatus = 'pending' | 'active' | 'resolved' | 'partial' | 'unresolved'

export interface EmergencyProgress {
  status: EmergencyStatus
  step: string
  turn: number
  data: Record<string, ParamValue>
  choice?: string
  closedAtMonth?: number
}

export interface ReentryState {
  done: ReentryStepId[]
  corridor: ReentryCorridor | null
  outcome: 'pending' | 'safe' | 'failed'
  failureKey?: string
}

/** Ongoing faults that carry across levels. */
export interface Faults {
  leak: 'none' | 'open' | 'contained' | 'sealed'
  co2: 'ok' | 'failing'
  powerFault: 'none' | 'event' | 'persistent' | 'isolated'
  thermal: 'ok' | 'cold'
  blackout: boolean
}

export interface MissionFlags {
  impactPrompt: boolean
  shelterUsed: boolean
  sparesHoarded: number
}

export interface MissionState {
  level: 1 | 2 | 3
  phase: Phase
  monthsElapsed: number
  config: ShipConfig
  difficulty: Difficulty
  budgetUsed: number
  totalMass: number
  maneuver: number
  powerGeneration: number
  battery: number
  vital: number
  vitalRate: number
  structure: number
  /** Functional integrity of equipment (thermal anomaly unresolved: -15). */
  equipment: number
  systems: Record<SystemId, SystemStatus>
  spares: Record<SpareId, number>
  radiation: number
  science: {
    collected: Record<InvestigationId, boolean>
    transmitted: Record<InvestigationId, boolean>
  }
  activeLoads: Record<LoadId, boolean>
  history: HistoryEntry[]
  crewStatus: CrewStatus
  result: MissionResult
  // Level 2 progress
  emergencies: Record<EmergencyId, EmergencyProgress>
  /** Months of the Saturn stay already closed (0-6). The next event is EMERGENCY_ORDER[saturnMonth]. */
  saturnMonth: number
  activeEmergency: EmergencyId | null
  faults: Faults
  backupActive: boolean
  backupTransmitted: number
  flags: MissionFlags
  // Level 3 progress
  titanAssist: boolean
  /** Mission destination (missing in saves from before Mars existed = Saturn). */
  destination?: 'saturn' | 'mars'
  route: RouteId | null
  reentry: ReentryState
}

export interface CheckResult {
  id: string
  ok: boolean
  msgKey: string
  params: Params
}

export interface DesignReport {
  cost: number
  mass: number
  powerGen: number
  essentialLoad: number
  powerMargin: number
  maneuver: number
  vital: number
  vitalRate: number
  autonomyMonths: number
  checks: CheckResult[]
  canLaunch: boolean
}

export interface ActionResult {
  state: MissionState
  ok: boolean
  msgKey: string
  params: Params
  explanationKey?: string
}

export interface Costs {
  battery?: number
  vital?: number
  spare?: SpareId
  turn?: boolean
}

export interface EmergencyOption {
  id: string
  labelKey: string
  descKey: string
  available: boolean
  reasonKey?: string
  reasonParams?: Params
  costs: Costs
}

export interface EmergencyView {
  id: EmergencyId
  status: EmergencyStatus
  step: string
  titleKey: string
  situationKey: string
  scienceKey: string
  /** True when it is this event's month and it has not been closed yet. */
  current: boolean
  options: EmergencyOption[]
}

export interface EmergencyOutcome {
  success: boolean
  msgKey: string
  params: Params
  explanationKey: string
  /** True when this choice closed the event (the month elapsed). */
  closed: boolean
}

export interface RouteFailure {
  variable: 'maneuver' | 'vital' | 'power' | 'safety' | 'navigation' | 'titan'
  msgKey: string
  params: Params
}

export interface RouteOption {
  id: RouteId
  months: number
  baseManeuver: number
  effectiveManeuver: number
  maneuverNeeded: number
  vitalNeeded: number
  maneuverAfter: number
  vitalAfter: number
  useTitan: boolean
  feasible: boolean
  failing: RouteFailure[]
}

export interface FinishReport {
  canProceed: boolean
  checks: CheckResult[]
  report: Record<string, ParamValue>
}

export interface ScoreBreakdown {
  crew: { total: number; safeReturn: number; habitability: number; protocol: number }
  ship: { total: number; structural: number; essentials: number; capsule: number }
  science: { total: number; perInvestigation: Record<InvestigationId, number> }
  resources: { total: number; vital: number; maneuver: number; energyMaterials: number }
  total: number
  classification: Classification
  safeReturn: boolean
  classificationKey: string
}

export interface Checkpoint {
  label: string
  month: number
  level: 1 | 2 | 3
  state: MissionState
}
