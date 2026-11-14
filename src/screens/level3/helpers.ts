// Shared helpers for the level 3 screens: i18n with engine params, and the decision-history analysis.
import { useT } from '../../i18n'
import { stringify } from '../../game/ui'
import type { Change, HistoryEntry, MissionState, Params, ParamValue } from '../../engine/types'

/** Translate an engine key + params. Nested keys and a few code-like params are localised. */
export function useTP() {
  const t = useT()
  return (key: string, params: Params = {}): string => {
    const p: Record<string, ParamValue> = { ...params }
    if (typeof p.problems === 'string') p.problems = p.problems.split(',').filter(Boolean).map(c => t(`l3.problem.${c}`)).join(', ')
    if (typeof p.route === 'string' && ['fast', 'balanced', 'slow'].includes(p.route)) p.route = t(`l3.val.${p.route}`)
    if (typeof p.classification === 'string') p.classification = t(`engine.class.${p.classification}`)
    if (typeof p.variable === 'string') p.variable = t(`l3.var.${p.variable}`)
    if (typeof p.step === 'string') p.step = t(`l3.step.${p.step}.name`)
    return t(key, stringify(p, t))
  }
}

export const r1 = (n: number) => Math.round(n * 10) / 10

/** Fields worth showing as "what changed" chips (others are bookkeeping). */
const SHOWN = /^(maneuver|vital|structure|battery|powerGeneration|radiation|equipment|crewStatus|titanAssist|route|systems\..+|spares\..+|faults\..+|science\.collected\..+|science\.transmitted\..+)$/

export function shownChanges(e: HistoryEntry): Change[] {
  return e.changes.filter(c => SHOWN.test(c.field) && !(c.field === 'route' && e.kind !== 'return'))
}

export interface Influence { entry: HistoryEntry; score: number }

/** How much an entry moved the outcome: resources spent/lost, systems broken, crew hit, science gained. */
export function influenceOf(e: HistoryEntry): number {
  let s = 0
  for (const c of e.changes) {
    const a = typeof c.from === 'number' ? c.from : null
    const b = typeof c.to === 'number' ? c.to : null
    if (['maneuver', 'vital', 'structure'].includes(c.field) && a !== null && b !== null) s += Math.abs(b - a)
    else if (c.field.startsWith('systems.')) s += c.to === 'failed' ? 22 : c.to === 'degraded' ? 12 : c.to === 'repaired' ? 8 : 4
    else if (c.field === 'crewStatus') s += 20
    else if (c.field.startsWith('science.collected') && c.to === true) s += 8
    else if (c.field.startsWith('faults.')) s += 6
  }
  if (!e.success) s += 15
  return s
}

/** Most influential decisions (chronological). Baseline entries (launch, return burn) are excluded. */
export function keyDecisions(history: HistoryEntry[], max = 5): Influence[] {
  const list = history
    .filter(e => e.kind !== 'launch' && e.kind !== 'return' && e.kind !== 'emergencyStart' && e.kind !== 'finishSaturn')
    .map(entry => ({ entry, score: influenceOf(entry) }))
    .filter(x => x.score > 0)
  const top = [...list].sort((a, b) => b.score - a.score).slice(0, max)
  return top.sort((a, b) => a.entry.seq - b.entry.seq)
}

/** Earlier decisions that drained `field` the most (used by the dead-end explanation). */
export function drainers(history: HistoryEntry[], field: 'maneuver' | 'vital' | 'structure', max = 3): Influence[] {
  return history
    .map(entry => {
      const c = entry.changes.find(x => x.field === field)
      const d = c && typeof c.from === 'number' && typeof c.to === 'number' ? c.from - c.to : 0
      return { entry, score: d }
    })
    .filter(x => x.score > 0 && x.entry.kind !== 'return')
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
}

export function anyRoute(feasible: (boolean)[]): boolean {
  return feasible.some(Boolean)
}

export function isFinished(m: MissionState): boolean {
  return m.phase === 'closing' || m.result !== 'inProgress'
}
