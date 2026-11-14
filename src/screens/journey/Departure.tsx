// Leaving Saturn: Level 2 complete banner → one last look → engines ignite "THE RETURN BEGINS" → Level 3 briefing.
import { useEffect } from 'react'
import { useT } from '../../i18n'
import { game, useGame } from '../../game/store'
import { Hud, LangSwitch } from '../../game/ui'
import { Earth, RingParticles, Saturn, SpaceBackdrop } from '../../art/worlds'
import { Spaceship } from '../../art/ships'
import { LevelComplete } from './LevelComplete'
import { Porthole, Stage, thrustFor, useBeats, useCommanderName, usePrefersReducedMotion } from './cine'

// beats: 0 level-2 complete · 1 last look · 2 ignition · 3 briefing
const BEATS = [3200, 3000, 3600] as const

export function Departure() {
  const t = useT()
  const { mission } = useGame()
  const reduced = usePrefersReducedMotion()
  const name = useCommanderName()
  const [rawBeat, setBeat] = useBeats(BEATS, !reduced)
  const beat = reduced ? 3 : rawBeat

  useEffect(() => { if (!mission) game.go('menu') }, [mission])
  if (!mission) return null
  const brief = beat >= 3
  const burning = beat >= 2
  const collected = Object.values(mission.science.collected).filter(Boolean).length
  const sent = Object.values(mission.science.transmitted).filter(Boolean).length
  const total = Object.keys(mission.science.collected).length

  return (
    <Stage className={`jy-de jy-de--b${beat}`} onSkip={brief ? undefined : () => setBeat(3)} bars={!brief} scroll={brief}>
      <SpaceBackdrop fixed warp={beat === 2 ? 0.45 : brief ? 0.12 : 0} />
      <div className="jy-de-saturn"><Saturn size="100%" tilt={22} roll={12} /></div>
      <div className="jy-de-rings"><RingParticles density={0.8} speed={burning ? 2.4 : 0.4} direction={4} /></div>
      <div className="jy-de-earth">
        <Earth size="100%" glow />
        <span>{t('jy.de.earth')}</span>
      </div>
      <div className="jy-de-ship">
        <Spaceship config={mission.config} facing="left" thrust={burning ? thrustFor(mission.config) : 'off'} width="100%" title={t('jy.ship.aria')} />
      </div>

      {beat === 0 && <LevelComplete level={2} />}

      {beat === 1 && (
        <div className="jy-de-look">
          <Porthole expression="neutral" className="jy-port--big" />
          <div>
            <p className="jy-de-look__title">{t('jy.de.look')}</p>
            <p className="jy-de-look__sub">{t('jy.de.lookSub')}</p>
          </div>
        </div>
      )}

      {beat === 2 && (
        <>
          <div className="jy-flash" aria-hidden />
          <div className="jy-card jy-card--low">
            <h1 className="jy-big jy-card__title jy-card__title--hot">{t('jy.de.ignite')}</h1>
            <p className="jy-card__kicker">{t('jy.de.level')} — {t('jy.de.title')}</p>
          </div>
        </>
      )}

      {brief && (
        <div className="jy-de-layout">
          <div className="jy-ar-top"><LangSwitch /></div>
          <header className="jy-de-intro">
            <p className="jy-de-intro__ignite">{t('jy.de.ignite')}</p>
            <p className="jy-card__kicker">{t('jy.de.level')}</p>
            <h1 className="jy-big jy-ar-intro__title">{t('jy.de.title')}</h1>
            <p className="jy-card__sub">{t('jy.de.subtitle')}</p>
          </header>
          <section className="jy-report jy-report--wide panel" aria-labelledby="jy-de-summary">
            <div className="jy-de-crew">
              <Porthole expression="determined" />
              <p className="jy-bubble">{t('jy.de.bye', { name })}</p>
            </div>
            <h2 id="jy-de-summary" className="jy-report__title">🎒 {t('jy.de.summary')}</h2>
            <Hud mission={mission} compact />
            <p className="jy-de-text">{t('jy.de.remain', { maneuver: mission.maneuver, vital: mission.vital })}</p>
            <p className="jy-de-text">🔬 {t('jy.de.science', { collected, total, sent })}</p>
            <p className="jy-de-text jy-de-text--next">🧭 {t('jy.de.next')}</p>
            <button className="btn btn--yellow jy-report__go" onClick={() => game.go('level3')}>{t('jy.de.go')} ▶</button>
          </section>
        </div>
      )}
    </Stage>
  )
}
