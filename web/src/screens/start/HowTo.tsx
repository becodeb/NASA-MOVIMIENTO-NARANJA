import { game, useGame } from '../../game/store'
import { useT } from '../../i18n'
import { ScreenFrame, Squiggle } from '../../game/ui'
import { Icon, type IconName } from '../../game/icons'
import { SpaceBackdrop } from '../../art/worlds'
import { Astronaut } from '../../avatar'
import { Bubble, hasMission, introReturn, resumeScreen } from './common'
import { useDestination } from '../../game/World'

const GL: [string, IconName][] = [
  ['delta', 'maneuver'], ['power', 'power'], ['battery', 'battery'], ['eclss', 'life-support'], ['redundancy', 'redundancy'],
  ['assist', 'gravity-assist'], ['corridor', 'corridor'], ['shelter', 'shelter'], ['au', 'au-ruler'], ['delay', 'light-delay'],
]
const STOPS: IconName[] = ['earth', 'saturn', 'return-home']

export function HowTo() {
  const dest = useDestination()
  const t = useT()
  const { avatar, mission, difficulty } = useGame()
  return (
    <ScreenFrame title={t('st.howto.title')} subtitle={t('st.howto.sub')}>
      <SpaceBackdrop fixed />
      <div className="st-how">
        <div className="st-how__top">
          <div className="st-how__astro"><Astronaut config={avatar} pose="point" expression="happy" size="100%" /></div>
          <div className="st-how__btns">
            <button className="btn btn--yellow" onClick={() => { introReturn.to = 'howto'; game.go('intro') }}><Icon name="clapper" size={24} /> {t('st.howto.replay')}</button>
            {hasMission(mission) && <button className="btn btn--green" onClick={() => game.go(resumeScreen(mission))}><Icon name="go" size={22} /> {t('st.howto.resume')}</button>}
            <button className="btn btn--metal" onClick={() => game.go('menu')}><Icon name="home" size={22} /> {t('st.howto.menu')}</button>
          </div>
        </div>

        <h2 className="st-how__h squiggled">{t('st.howto.steps')}<Squiggle /></h2>
        <ol className="st-plan">
          <svg className="st-plan__arc" viewBox="0 0 300 70" preserveAspectRatio="none" aria-hidden focusable="false"><path d="M0 60 Q150 -20 300 60" /></svg>
          {[1, 2, 3].map(n => (
            <li key={n} className="st-plan__stop" style={{ ['--k' as string]: n }}>
              <span className="st-plan__node"><Icon name={n === 2 && dest === 'mars' ? 'mars' : STOPS[n - 1]} size={30} /></span>
              <h3>{t(`st.howto.s${n}.t`)}</h3>
              <p>{t(`st.howto.s${n}.d`)}</p>
            </li>
          ))}
        </ol>

        <div className="surface-paper st-how__modes">
          <h3 className="paper-title">{t('st.howto.modes')}</h3>
          <div className="st-how__modegrid">
            {(['easy', 'hard'] as const).map(m => (
              <button key={m} type="button" className={`st-how__mode ${difficulty === m ? 'is-on' : ''}`} aria-pressed={difficulty === m} onClick={() => game.setDifficulty(m)}>
                <b><Icon name={m} size={24} /> {t(`st.menu.${m}`)}</b>
                {[1, 2, 3].map(i => <span key={i}><Icon name={m === 'easy' ? 'ok' : 'no-undo'} size={16} />{t(`st.menu.${m}.d${i}`)}</span>)}
              </button>
            ))}
          </div>
          <Bubble tail="left">{t('st.howto.modeNote')}</Bubble>
        </div>

        <h2 className="st-how__h squiggled">{t('st.howto.glossary')}<Squiggle /></h2>
        <dl className="st-how__gl">
          {GL.map(([id, icon], k) => (
            <div key={id} className="st-how__term" style={{ ['--k' as string]: k }}>
              <Icon name={icon} size={36} className="st-how__icon" />
              <div>
                <dt>{t(`st.gl.${id}.t`)}</dt>
                <dd>{t(`st.gl.${id}.d`)}</dd>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </ScreenFrame>
  )
}
