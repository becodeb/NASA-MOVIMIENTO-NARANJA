// Configurable data tables (SPEC 2.1, 3C, 3D, 5D). Abstract game units; edit here without touching engine logic.
import type {
  CommsChoice,
  EmergencyId,
  InvestigationId,
  LifeSupportChoice,
  PowerChoice,
  PropulsionChoice,
  RouteId,
  StructureChoice,
} from './types.ts'

export const COMPONENTS = {
  structure: {
    light: { cost: 12, mass: 15, impactLoss: 30, leakLoss: 6 },
    reinforced: { cost: 20, mass: 25, impactLoss: 12, leakLoss: 3 },
  } satisfies Record<StructureChoice, { cost: number; mass: number; impactLoss: number; leakLoss: number }>,
  propulsion: {
    chemical: { cost: 12, mass: 20, maneuver: 100, electric: false },
    combined: { cost: 23, mass: 25, maneuver: 115, electric: true },
  } satisfies Record<PropulsionChoice, { cost: number; mass: number; maneuver: number; electric: boolean }>,
  power: {
    solar: { cost: 18, mass: 35, generation: 105 },
    nuclear: { cost: 29, mass: 18, generation: 135 },
  } satisfies Record<PowerChoice, { cost: number; mass: number; generation: number }>,
  lifeSupport: {
    consumables: { cost: 12, mass: 28, vital: 130, rate: 1, degradedRate: 1, outboundUse: 48, regenerative: false },
    regenerative: { cost: 23, mass: 18, vital: 75, rate: 0.5, degradedRate: 0.75, outboundUse: 24, regenerative: true },
  } satisfies Record<
    LifeSupportChoice,
    { cost: number; mass: number; vital: number; rate: number; degradedRate: number; outboundUse: number; regenerative: boolean }
  >,
  comms: {
    standard: { cost: 8, mass: 8, redundant: false },
    redundant: { cost: 14, mass: 12, redundant: true },
  } satisfies Record<CommsChoice, { cost: number; mass: number; redundant: boolean }>,
}

/** Electrical loads (SPEC 3D.3). Optional loads only count when active. */
export const LOADS = {
  essentials: 60,
  regenerative: 25,
  commsRedundant: 5,
  science: 20,
  electricPropulsion: 20,
  emergencyHeating: 20,
}

export const PARAMS = {
  crew: 4,
  budget: 105,
  launchMass: 130,
  commonMass: 20,
  outboundMonths: 48,
  outboundManeuver: 35,
  insertionManeuver: 20,
  saturnMonths: 6,
  battery: 30,
  minManeuverReserve: 8,
  minVitalReserve: 8,
  titanPrep: 4,
  titanSaving: 12,
  repairKitRecovery: 15,
  structureMax: 100,
  co2ExtraordinaryVital: 8,
  powerEventLoss: 30,
  powerPersistentLoss: 15,
  thermalIntegrityLoss: 15,
  recalibrateBattery: 2,
  investigationPoints: 5,
  // --- values NOT given by the SPEC (game-design choices, tunable) ---
  /** Operational turns the power anomaly lasts before it becomes a persistent fault. */
  powerEventTurns: 3,
  /** Turns of emergency heating needed to recover cold equipment. */
  thermalHeatingTurns: 2,
  /** Radiation exposure indicator added by the event: sheltered / unprotected. */
  radiationSheltered: 5,
  radiationExposed: 20,
  /** Above this indicator the crew safety status is "compromised". */
  radiationLimit: 15,
  /** Backup antenna: total investigations it can transmit (lower capacity). */
  backupTransmitCapacity: 2,
  /** Minimum structural integrity to attempt the return. */
  minReturnIntegrity: 50,
  /** Minimum investigations for a fully "successful" classification. */
  successMinInvestigations: 2,
}

export const SPARES_START = { structural: 1, lifeSupport: 1, electronic: 1 }

export const ROUTES: Record<RouteId, { months: number; maneuver: number }> = {
  fast: { months: 42, maneuver: 48 },
  balanced: { months: 54, maneuver: 38 },
  slow: { months: 66, maneuver: 28 },
}
export const ROUTE_ORDER: RouteId[] = ['fast', 'balanced', 'slow']

export const EMERGENCY_ORDER: EmergencyId[] = ['comms', 'impact', 'co2', 'power', 'thermal', 'radiation']
export const INVESTIGATION_ORDER: InvestigationId[] = ['atmosphere', 'rings', 'magnetosphere', 'moons']

/** Option ids per emergency (used by UI and by the string-coverage tests). */
export const EMERGENCY_OPTION_IDS: Record<EmergencyId, string[]> = {
  comms: ['diagnose', 'ignore', 'recalibrate', 'activateBackup', 'repairElectronic', 'repairLifeSupportSpare', 'continueAutonomous'],
  impact: ['isolate', 'isolateLate', 'ignore', 'useKit', 'skipRepair'],
  co2: ['replaceWithSpare', 'switchModule', 'useReserves', 'ignore'],
  power: ['shedOptional', 'locate', 'isolate', 'repairWithSpare', 'ignore'],
  thermal: ['heat', 'reconfigure', 'ignore'],
  radiation: ['shelter', 'continueScience', 'ignore'],
}

/** Scoring weights (SPEC 9). */
export const SCORE = {
  crewReturn: 25,
  crewHabitability: 10,
  crewProtocol: 5,
  shipStructure: 15,
  shipEssentials: 7,
  shipCapsule: 3,
  perInvestigation: 5,
  resVital: 5,
  resManeuver: 5,
  resEnergy: 3,
  resMaterials: 2,
}
