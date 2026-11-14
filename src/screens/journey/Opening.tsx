// Title cinematic: Earth → warp through the stars → Saturn reveal → ship fly-by → title slam → menu.
import { useCallback, useEffect } from 'react'
import { useT } from '../../i18n'
import { game, useGame } from '../../game/store'
import { Earth, Saturn, SpaceBackdrop } from '../../art/worlds'
import { Spaceship } from '../../art/ships'
import { PARAMS } from '../../engine/data'
import { DEFAULT_SHIP, Stage, thrustFor, useBeats, usePrefersReducedMotion } from './cine'

// beats: 0 Earth · 1 pull-away warp · 2 slowing at Saturn · 3 ship + title · 4 done
const BEATS = [1000, 4100, 1500, 5200] as const
const WARP = [0, 1, 0.35, 0.05, 0.05]

export function Opening() {
  const t = useT()
  const { mission } = useGame()
  const reduced = usePrefersReducedMotion()
  const [beat] = useBeats(BEATS, !reduced)
  const config = mission?.config ?? DEFAULT_SHIP

  const end = useCallback(() => {
    game.markSeen('opening')
    game.go('menu')
  }, [])
  useEffect(() => { if (beat >= BEATS.length) end() }, [beat, end])

  return (
    <Stage className="jy-op" onSkip={end} skipLabel={reduced ? t('common.continue') : undefined}>
      <SpaceBackdrop warp={reduced ? 0 : WARP[beat]} />
      <div className="jy-op-earth"><Earth size="100%" /></div>
      <div className="jy-op-saturn"><Saturn size="100%" tilt={20} roll={-16} /></div>
      <div className="jy-op-ship">
        <Spaceship config={config} thrust={thrustFor(config)} width="100%" title={t('jy.ship.aria')} />
      </div>
      <p className="jy-cap jy-op-cap jy-op-cap--1">{t('jy.op.cap1')}</p>
      <p className="jy-cap jy-op-cap jy-op-cap--2">{t('jy.op.cap2')}</p>
      <div className="jy-flash jy-op-flash" aria-hidden />
      <div className="jy-op-title">
        <h1 className="jy-big jy-op-title__main">{t('jy.op.title')}</h1>
        <p className="jy-op-title__sub">{t('jy.op.subtitle')}</p>
        <p className="jy-op-title__tag">{t('jy.op.tagline', { crew: PARAMS.crew })}</p>
      </div>
    </Stage>
  )
}
