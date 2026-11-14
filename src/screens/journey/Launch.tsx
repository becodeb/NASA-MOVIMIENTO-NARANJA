// Launch cinematic: liftoff → interplanetary cruise (map, month counter, resources ticking down) → Saturn Orbit Insertion.
// The engine already applied launch(): this screen only SHOWS what the trip cost.
import { useCallback, useEffect, useState } from 'react'
import { useT } from '../../i18n'
import { game, useGame } from '../../game/store'
import { RingParticles, Saturn, SolarSystemMap, SpaceBackdrop } from '../../art/worlds'
import { LaunchRocket, Spaceship, type LaunchPhase } from '../../art/ships'
import type { MissionState } from '../../engine/types'
import { Stage, thrustFor, tripNumbers, usePrefersReducedMotion, useProgress, type TripNumbers } from './cine'

type Scene = 'liftoff' | 'transit' | 'insertion'
const TRANSIT_MS = 9800
const INSERTION_MS = 5000
const SATURN_AU = 9.5
const ease = (x: number) => x * x * (3 - 2 * x)

function Chip({ icon, label, value, max, unit = '', tone }: { icon: string; label: string; value: number; max: number; unit?: string; tone: string }) {
  return (
    <div className="jy-chip" style={{ ['--tone' as string]: tone }}>
      <span className="jy-chip__icon" aria-hidden>{icon}</span>
      <span className="jy-chip__label">{label}</span>
      <b className="jy-chip__value">{Math.round(value)}{unit}</b>
      <span className="jy-chip__track"><span style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` }} /></span>
    </div>
  )
}

function Counters({ trip, maneuver, vital, sunlight }: { trip: TripNumbers; maneuver: number; vital: number; sunlight: number }) {
  const t = useT()
  return (
    <div className="jy-chips">
      <Chip icon="🚀" label={t('jy.la.maneuver')} value={maneuver} max={trip.depManeuver} tone="var(--orange)" />
      <Chip icon="🫁" label={t('jy.la.vital')} value={vital} max={trip.depVital} tone="var(--teal)" />
      <Chip icon="☀️" label={t('jy.la.sun')} value={sunlight} max={100} unit="%" tone="var(--yellow)" />
    </div>
  )
}

function MonthCounter({ month, total }: { month: number; total: number }) {
  const t = useT()
  return (
    <div className="jy-month" aria-live="off">
      <span className="jy-month__label">{t('jy.la.month')}</span>
      <b className="jy-month__num">{String(month).padStart(2, '0')}</b>
      <span className="jy-month__of">{t('jy.la.of', { total })}</span>
    </div>
  )
}

function Liftoff({ mission, onDone }: { mission: MissionState; onDone: () => void }) {
  const t = useT()
  const [phase, setPhase] = useState<LaunchPhase>('pad')
  return (
    <div className={`jy-la-lift jy-la-lift--${phase}`}>
      <div className="jy-la-rocket">
        <LaunchRocket autoPlay onComplete={onDone} onPhaseChange={setPhase} width="100%" title={t('jy.la.rocketAria')} />
      </div>
      <p key={phase} className="jy-big jy-la-call">{t(`jy.la.${phase}`)}</p>
      <div className="jy-la-payload panel">
        <Spaceship config={mission.config} width="100%" title={t('jy.ship.aria')} />
        <span>{t('jy.la.payload')}</span>
      </div>
    </div>
  )
}

function Transit({ trip, onDone, still }: { trip: TripNumbers; onDone: () => void; still: boolean }) {
  const t = useT()
  const p = useProgress(TRANSIT_MS, !still)
  useEffect(() => { if (!still && p >= 1) onDone() }, [p, still, onDone])
  const e = ease(p)
  const fact = Math.min(2, Math.floor(p * 3))
  const au = 1 + (SATURN_AU - 1) * e
  return (
    <div className="jy-la-transit">
      <header className="jy-la-head">
        <h2 className="jy-la-kicker">{still ? t('jy.la.staticTitle') : t('jy.la.transit')}</h2>
        <MonthCounter month={Math.round(e * trip.months)} total={trip.months} />
      </header>
      <div className="jy-la-map">
        <SolarSystemMap
          routes={[{ id: 'balanced', highlighted: true, color: '#38D9D0' }]}
          progress={e}
          labels={{ sun: t('jy.map.sun'), earth: t('jy.map.earth'), saturn: t('jy.map.saturn') }}
          note={t('jy.map.note')}
          width="100%"
        />
      </div>
      <Counters trip={trip} maneuver={trip.depManeuver - trip.outbound * e} vital={trip.depVital - trip.vitalUsed * e} sunlight={100 / (au * au)} />
      {still ? (
        <div className="jy-fact panel">
          <p>{t('jy.la.staticSub', { months: trip.months, outbound: trip.outbound, insertion: trip.insertion })}</p>
          {[1, 2, 3].map(n => <p key={n}><b>💡 </b>{t(`jy.la.fact${n}`, { months: trip.months })}</p>)}
        </div>
      ) : (
        <div key={fact} className="jy-fact panel">
          <b className="jy-fact__did">💡 {t('jy.la.did')}</b>
          <p>{t(`jy.la.fact${fact + 1}`, { months: trip.months })}</p>
          <span className="jy-fact__timer" aria-hidden />
        </div>
      )}
    </div>
  )
}

function Insertion({ mission, trip, onDone }: { mission: MissionState; trip: TripNumbers; onDone: () => void }) {
  const t = useT()
  const p = useProgress(INSERTION_MS)
  useEffect(() => { if (p >= 1) onDone() }, [p, onDone])
  const burn = Math.max(0, Math.min(1, (p - 0.4) / 0.48))
  const burning = burn > 0 && burn < 1
  return (
    <div className={`jy-la-soi ${burning ? 'is-burning' : ''}`}>
      <div className="jy-la-soi__saturn"><Saturn size="100%" tilt={16} roll={-12} /></div>
      <div className="jy-la-soi__rings"><RingParticles density={1.2} speed={1.6} direction={-6} /></div>
      <div className="jy-la-soi__path">
        <div className="jy-la-soi__flip">
          <Spaceship config={mission.config} thrust={burning ? thrustFor(mission.config) : 'off'} width="100%" title={t('jy.ship.aria')} />
        </div>
      </div>
      <header className="jy-la-head">
        <h2 className="jy-la-kicker jy-la-kicker--hot">{t('jy.la.soi')}</h2>
        <MonthCounter month={trip.months} total={trip.months} />
      </header>
      <Counters trip={trip} maneuver={trip.depManeuver - trip.outbound - trip.insertion * burn} vital={trip.arrVital} sunlight={100 / (SATURN_AU * SATURN_AU)} />
      <div className="jy-fact jy-fact--soi panel"><p>{t('jy.la.soiSub', { insertion: trip.insertion })}</p></div>
    </div>
  )
}

export function Launch() {
  const t = useT()
  const { mission } = useGame()
  const reduced = usePrefersReducedMotion()
  const [scene, setScene] = useState<Scene>('liftoff')
  const launched = !!mission && mission.phase !== 'design'

  useEffect(() => { if (!launched) game.go(mission ? 'level1' : 'menu') }, [launched, mission])

  const toArrival = useCallback(() => game.go('arrival'), [])
  const toTransit = useCallback(() => setScene('transit'), [])
  const toInsertion = useCallback(() => setScene('insertion'), [])

  if (!mission || !launched) return null
  const trip = tripNumbers(mission)

  if (reduced) {
    return (
      <Stage className="jy-la jy-la--static" onSkip={toArrival} skipLabel={t('common.continue')} bars={false} scroll>
        <SpaceBackdrop animate={false} />
        <Transit trip={trip} onDone={toArrival} still />
      </Stage>
    )
  }

  return (
    <Stage className={`jy-la jy-la--${scene}`} onSkip={toArrival}>
      <SpaceBackdrop warp={scene === 'transit' ? 0.3 : scene === 'insertion' ? 0.08 : 0} nebula={scene !== 'liftoff'} />
      {scene === 'liftoff' && <Liftoff mission={mission} onDone={toTransit} />}
      {scene === 'transit' && <Transit trip={trip} onDone={toInsertion} still={false} />}
      {scene === 'insertion' && <Insertion mission={mission} trip={trip} onDone={toArrival} />}
    </Stage>
  )
}
