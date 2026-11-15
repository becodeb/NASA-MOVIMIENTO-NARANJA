// Arrival at Saturn: Level 1 complete banner → Level 2 title → Arrival Report (why the ship has less than at liftoff).
import { useEffect, type ReactNode } from 'react'
import { useT } from '../../i18n'
import { game, useGame } from '../../game/store'
import { Explain, LangSwitch, Squiggle } from '../../game/ui'
import { Icon, type IconName } from '../../game/icons'
import { RingParticles, Saturn, SpaceBackdrop } from '../../art/worlds'
import { Spaceship } from '../../art/ships'
import { PARAMS } from '../../engine/data'
import { LevelComplete } from './LevelComplete'
import { Porthole, Stage, tripNumbers, useBeats, useCommanderName, usePrefersReducedMotion } from './cine'

// beats: 0 level-1 complete · 1 level-2 title · 2 report
const BEATS = [3200, 3400] as const

function Row({ icon, label, from, to, max, children, tone, delay }: {
  icon: IconName; label: string; from?: number; to: ReactNode; max?: number; children: ReactNode; tone: string; delay: number
}) {
  const t = useT()
  const hasBar = typeof from === 'number' && typeof to === 'number' && !!max
  return (
    <li className="jy-row row" style={{ ['--tone' as string]: tone, animationDelay: `${delay}s` }}>
      <span className="jy-row__icon"><Icon name={icon} size={26} /></span>
      <div className="jy-row__main">
        <div className="jy-row__top">
          <span className="jy-row__label">{label}</span>
          <span className="jy-row__vals">
            {typeof from === 'number' && <><s title={t('jy.ar.atLaunch')}>{from}</s><i aria-hidden><Icon name="go" size={12} /></i></>}
            <b>{to}</b>
          </span>
        </div>
        {hasBar && (
          <div className="jy-row__bar" aria-hidden style={{ ['--from' as string]: `${(from / max) * 100}%`, ['--to' as string]: `${((to as number) / max) * 100}%` }}>
            <span className="jy-row__ghost" />
            <span className="jy-row__fill" style={{ animationDelay: `${delay + 0.3}s` }} />
          </div>
        )}
        <p className="jy-row__why">{children}</p>
      </div>
    </li>
  )
}

export function Arrival() {
  const t = useT()
  const { mission } = useGame()
  const reduced = usePrefersReducedMotion()
  const name = useCommanderName()
  const [rawBeat, setBeat] = useBeats(BEATS, !reduced)
  const beat = reduced ? 2 : rawBeat

  useEffect(() => { if (!mission) game.go('menu') }, [mission])
  if (!mission) return null
  const trip = tripNumbers(mission)
  const regen = mission.config.lifeSupport === 'regenerative'
  const report = beat >= 2

  return (
    <Stage className={`jy-ar jy-ar--b${beat}`} onSkip={report ? undefined : () => setBeat(2)} bars={!report} scroll={report}>
      <SpaceBackdrop fixed />
      <div className="jy-ar-saturn"><Saturn size="100%" tilt={18} roll={-14} /></div>
      <div className="jy-ar-rings"><RingParticles density={1.1} speed={0.5} direction={-10} /></div>
      <div className="jy-ar-ship"><Spaceship config={mission.config} width="100%" title={t('jy.ship.aria')} /></div>

      {beat === 0 && <LevelComplete level={1} />}

      {beat === 1 && (
        <div className="jy-card">
          <p className="jy-card__kicker">{t('jy.ar.level')}</p>
          <h1 className="jy-big jy-card__title">{t('jy.ar.title')}</h1>
          <p className="jy-card__sub">{t('jy.ar.subtitle', { months: PARAMS.saturnMonths })}</p>
        </div>
      )}

      {report && (
        <div className="jy-ar-layout">
          <div className="jy-ar-top"><LangSwitch /></div>
          <header className="jy-ar-intro">
            <p className="jy-card__kicker">{t('jy.ar.level')}</p>
            <h1 className="jy-big jy-ar-intro__title">{t('jy.ar.title')}</h1>
            <p className="jy-card__sub">{t('jy.ar.subtitle', { months: PARAMS.saturnMonths })}</p>
            <div className="jy-ar-crew">
              <Porthole expression="happy" />
              <p className="jy-bubble">{t('jy.ar.hello', { name })}</p>
            </div>
          </header>
          <div className="jy-ar-col">
          <section className="jy-report surface-paper surface-paper--tilt-r surface-paper--tape" aria-labelledby="jy-ar-report">
            <h2 id="jy-ar-report" className="paper-title squiggled"><Icon name="clipboard" size={26} /> {t('jy.ar.report')}<Squiggle /></h2>
            <p className="fine jy-report__sub">{t('jy.ar.reportSub')}</p>
            <ul className="jy-rows surface-rows">
              <Row icon="calendar" label={t('jy.ar.time')} to={t('jy.ar.timeVal', { months: trip.months })} tone="var(--pink)" delay={0.15}>
                {t('jy.ar.timeWhy')}
              </Row>
              <Row icon="maneuver" label={t('jy.ar.maneuver')} from={trip.depManeuver} to={trip.arrManeuver} max={trip.depManeuver} tone="var(--orange)" delay={0.35}>
                {t('jy.ar.maneuverWhy', { outbound: trip.outbound, insertion: trip.insertion })}
              </Row>
              <Row icon="life-support" label={t('jy.ar.vital')} from={trip.depVital} to={trip.arrVital} max={trip.depVital} tone="var(--teal)" delay={0.55}>
                {t(regen ? 'jy.ar.vitalWhyRegen' : 'jy.ar.vitalWhyCons', { used: trip.vitalUsed, other: trip.vitalUsedOther, crew: PARAMS.crew, months: trip.months })}
              </Row>
              <Row icon="hull" label={t('jy.ar.hull')} to={`${mission.structure} / ${PARAMS.structureMax}`} tone="var(--green)" delay={0.75}>
                {t('jy.ar.hullWhy')}
              </Row>
              <Row icon="antenna" label={t('jy.ar.systems')} to={t('jy.ar.systemsVal')} tone="var(--yellow)" delay={0.95}>
                {t('jy.ar.systemsWhy')}
              </Row>
            </ul>
          </section>
          <Explain textKey="engine.launch.arrivedWhy" titleKey="jy.ar.note" />
          <button className="btn btn--yellow jy-report__go" onClick={() => game.go('level2')}>{t('jy.ar.go')} <Icon name="go" size={20} /></button>
          </div>
        </div>
      )}
    </Stage>
  )
}
