import { useState } from 'react'
import { game, useGame } from '../../game/store'
import { useT } from '../../i18n'
import { LangSwitch } from '../../game/ui'
import { Icon } from '../../game/icons'
import { SpaceBackdrop, Saturn } from '../../art/worlds'
import { Spaceship } from '../../art/ships'
import { Astronaut, AVATAR_STORAGE_KEY } from '../../avatar'
import { Bubble, hasMission, resumeScreen } from './common'

const SHIP = { structure: 'reinforced', propulsion: 'combined', power: 'nuclear', lifeSupport: 'regenerative', comms: 'redundant' } as const

function avatarCustomized(): boolean {
  try { return !!localStorage.getItem(AVATAR_STORAGE_KEY) } catch { return false }
}

export function Menu() {
  const t = useT()
  const { avatar, difficulty, mission } = useGame()
  const [confirmNew, setConfirmNew] = useState(false)
  const [hello, setHello] = useState(false)
  const inProgress = hasMission(mission)

  const startNew = () => {
    setConfirmNew(false)
    game.restart()
    game.go(avatarCustomized() ? 'level1' : 'intro')
  }
  const play = () => {
    if (inProgress && mission.level > 1) { setConfirmNew(true); return }
    if (inProgress) game.restart()
    game.go(avatarCustomized() ? 'level1' : 'intro')
  }
  const modes = ['easy', 'hard'] as const

  return (
    <div className="st-menu">
      <SpaceBackdrop fixed />
      <div className="st-menu__lang"><LangSwitch /></div>

      <div className="st-menu__saturn" aria-hidden><Saturn size="100%" tilt={20} roll={-14} glow /></div>
      <div className="st-menu__ship" aria-hidden><Spaceship config={SHIP} thrust="both" width="100%" /></div>
      <button type="button" className="st-menu__astro" onClick={() => setHello(true)} aria-label={t('st.menu.hello')}>
        {hello && <Bubble tail="bottom" className="st-menu__hello">{t('st.menu.hello')}</Bubble>}
        <Astronaut config={avatar} pose="wave" expression="happy" size="100%" />
      </button>

      <main className="st-menu__main">
        <h1 className="st-title">
          <span className="st-title__1" data-text={t('st.title.1')}>{t('st.title.1')}</span>
          <span className="st-title__2" data-text={t('st.title.2')}>{t('st.title.2')}</span>
        </h1>
        <p className="st-menu__tag">{t('st.menu.tagline')}</p>

        <nav className="st-menu__btns" aria-label="Menu">
          {inProgress && (
            <button className="btn btn--green st-menu__btn st-pop" style={{ ['--d' as string]: '0.45s' }} onClick={() => game.go(resumeScreen(mission))}>
              <Icon name="go" size={22} /> {t('st.menu.continue')}
              <small>{t('st.menu.continueSub', { m: mission.monthsElapsed, l: mission.level })}</small>
            </button>
          )}
          <button className="btn btn--yellow st-menu__btn st-menu__btn--big st-pop" style={{ ['--d' as string]: '0.55s' }} onClick={play}><Icon name="go" size={30} /> {t('st.menu.play')}</button>

          <div className="st-diff surface-paper st-pop" style={{ ['--d' as string]: '0.65s' }} role="group" aria-label={t('st.menu.diff')}>
            <div className="st-diff__seg">
              {modes.map(m => (
                <button key={m} type="button" className={`st-diff__opt st-diff__opt--${m}`} aria-pressed={difficulty === m}
                  onClick={() => game.setDifficulty(m)}>
                  <Icon name={m} size={22} /> {t(`st.menu.${m}`)}
                </button>
              ))}
            </div>
            <ul className="st-diff__list" key={difficulty}>
              {[1, 2, 3].map(i => <li key={i}><Icon name={difficulty === 'easy' ? 'ok' : 'no-undo'} size={18} />{t(`st.menu.${difficulty}.d${i}`)}</li>)}
            </ul>
            <p className="st-diff__same fine">{t('st.menu.same')}</p>
          </div>

          <div className="st-menu__row st-pop" style={{ ['--d' as string]: '0.75s' }}>
            <button className="btn btn--orange st-menu__btn st-menu__btn--avatar" onClick={() => game.go('avatar')}>
              <span className="st-menu__head" aria-hidden><Astronaut config={avatar} bust expression="happy" size="100%" /></span>
              {t('st.menu.avatar')}
            </button>
            <button className="btn btn--metal st-menu__btn" onClick={() => game.go('howto')}><Icon name="manual" size={22} /> {t('st.menu.howto')}</button>
          </div>
        </nav>
        <p className="st-menu__note fine">{t('st.menu.note')}</p>
      </main>

      {confirmNew && (
        <div className="st-modal" role="dialog" aria-modal="true" aria-labelledby="st-new-t">
          <div className="panel st-modal__card">
            <h2 id="st-new-t" className="st-modal__h">{t('st.menu.newTitle')}</h2>
            <p>{t('st.menu.newBody')}</p>
            <div className="st-modal__btns">
              <button className="btn btn--green" autoFocus onClick={() => setConfirmNew(false)}>{t('st.menu.newNo')}</button>
              <button className="btn btn--red" onClick={startNew}>{t('st.menu.newYes')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
