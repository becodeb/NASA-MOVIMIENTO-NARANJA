// Shared cinematic plumbing for the journey screens: stage, skip handling, beat timeline, trip numbers.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useT } from '../../i18n'
import { usePrefersReducedMotion } from '../../art/worlds'
import type { ShipConfig, ThrustMode } from '../../art/ships'
import { Astronaut } from '../../avatar'
import { useGame } from '../../game/store'
import { designReport } from '../../engine/engine'
import { COMPONENTS, PARAMS } from '../../engine/data'
import type { MissionState } from '../../engine/types'
import './journey.css'

/** A fully built ship for moments where no mission exists yet (title cinematic). */
export const DEFAULT_SHIP: ShipConfig = {
  structure: 'reinforced', propulsion: 'combined', power: 'nuclear', lifeSupport: 'regenerative', comms: 'redundant',
}

export const thrustFor = (c: ShipConfig): ThrustMode => (c.propulsion === 'combined' ? 'both' : 'chemical')

export { usePrefersReducedMotion }

/** Esc / Space trigger `onSkip` (Space is left alone while a control has focus). */
export function useSkipKeys(onSkip: (() => void) | undefined) {
  const ref = useRef(onSkip)
  useEffect(() => { ref.current = onSkip })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!ref.current) return
      const el = e.target as HTMLElement | null
      const interactive = !!el && /^(BUTTON|SELECT|INPUT|TEXTAREA|A)$/.test(el.tagName)
      if (e.key === 'Escape' || ((e.key === ' ' || e.code === 'Space') && !interactive)) {
        e.preventDefault()
        ref.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

/** Beat timeline: beat n lasts durations[n] ms, then advances. Stops after the last duration. */
export function useBeats(durations: readonly number[], run = true): [number, (n: number) => void] {
  const [beat, setBeat] = useState(0)
  useEffect(() => {
    if (!run || beat >= durations.length) return
    const h = window.setTimeout(() => setBeat(b => b + 1), durations[beat])
    return () => clearTimeout(h)
  }, [beat, run, durations])
  return [beat, setBeat]
}

/** 0..1 progress over `ms`, updated every animation frame while `run` is true. */
export function useProgress(ms: number, run = true): number {
  const [p, setP] = useState(run ? 0 : 1)
  useEffect(() => {
    if (!run) { setP(1); return }
    let raf = 0
    const t0 = performance.now()
    const tick = (now: number) => {
      const v = Math.min(1, (now - t0) / ms)
      setP(v)
      if (v < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [ms, run])
  return p
}

/** Full-viewport cinematic stage with letterbox bars and an optional SKIP button (also Esc / Space). */
export function Stage({ className = '', children, onSkip, skipLabel, bars = true, scroll = false }: {
  className?: string; children: ReactNode; onSkip?: () => void; skipLabel?: string; bars?: boolean; scroll?: boolean
}) {
  const t = useT()
  const reduced = usePrefersReducedMotion()
  useSkipKeys(onSkip)
  return (
    <div className={`jy-stage ${reduced ? 'jy-still' : ''} ${scroll ? 'jy-stage--scroll' : ''} ${className}`}>
      {children}
      <div className={`jy-bar jy-bar--top ${bars ? '' : 'is-off'}`} aria-hidden />
      <div className={`jy-bar jy-bar--bottom ${bars ? '' : 'is-off'}`} aria-hidden />
      {onSkip && (
        <button className="btn btn--metal jy-skip" onClick={onSkip}>
          {skipLabel ?? t('common.skip')} <span className="jy-skip__key" aria-hidden>{t('jy.skipHint')}</span>
        </button>
      )}
    </div>
  )
}

/** Round cockpit window with the player's astronaut inside. */
export function Porthole({ expression = 'happy', className = '' }: {
  expression?: 'happy' | 'worried' | 'surprised' | 'determined' | 'neutral'; className?: string
}) {
  const { avatar } = useGame()
  return (
    <div className={`jy-port ${className}`}>
      <div className="jy-port__glass">
        <Astronaut config={avatar} bust expression={expression} size="100%" />
        <span className="jy-port__shine" aria-hidden />
      </div>
      {[0, 60, 120, 180, 240, 300].map(a => <i key={a} className="jy-port__bolt" style={{ ['--a' as string]: `${a}deg` }} aria-hidden />)}
    </div>
  )
}

export function useCommanderName(): string {
  const t = useT()
  const { avatar } = useGame()
  return avatar.commanderName.trim() || t('jy.commander')
}

export interface TripNumbers {
  months: number
  depManeuver: number
  depVital: number
  outbound: number
  insertion: number
  vitalUsed: number
  /** What the other life-support option would have used on the way (for comparison). */
  vitalUsedOther: number
  arrManeuver: number
  arrVital: number
}

/** Outbound-trip numbers, all from the engine: design values at liftoff and what the launch step charged. */
export function tripNumbers(mission: MissionState): TripNumbers {
  const rep = designReport(mission.config)
  const p = mission.history.find(h => h.kind === 'launch')?.params ?? {}
  const num = (v: unknown, fallback: number) => (typeof v === 'number' ? v : fallback)
  const ls = COMPONENTS.lifeSupport
  const outbound = num(p.outbound, PARAMS.outboundManeuver)
  const insertion = num(p.insertion, PARAMS.insertionManeuver)
  const vitalUsed = num(p.vitalUsed, ls[mission.config.lifeSupport].outboundUse)
  return {
    months: num(p.months, PARAMS.outboundMonths),
    depManeuver: rep.maneuver,
    depVital: rep.vital,
    outbound,
    insertion,
    vitalUsed,
    vitalUsedOther: ls[mission.config.lifeSupport === 'regenerative' ? 'consumables' : 'regenerative'].outboundUse,
    arrManeuver: num(p.maneuverLeft, rep.maneuver - outbound - insertion),
    arrVital: num(p.vitalLeft, rep.vital - vitalUsed),
  }
}
