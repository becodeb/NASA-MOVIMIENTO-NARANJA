import { game, useGame } from '../../game/store'
import { useT } from '../../i18n'
import { ScreenFrame } from '../../game/ui'
import { SpaceBackdrop } from '../../art/worlds'
import { Astronaut } from '../../avatar'
import { Bubble, hasMission, introReturn, resumeScreen } from './common'

const GL: [string, string][] = [
  ['delta', '🚀'], ['power', '⚡'], ['battery', '🔋'], ['eclss', '🫁'], ['redundancy', '🧩'],
  ['assist', '🌀'], ['corridor', '🎯'], ['shelter', '☢️'], ['au', '📏'], ['delay', '⏳'],
]

export function HowTo() {
  const t = useT()
  const { avatar, mission, difficulty } = useGame()
  return (
    <ScreenFrame title={t('st.howto.title')} subtitle={t('st.howto.sub')}>
      <SpaceBackdrop fixed />
      <div className="st-how">
        <div className="st-how__top">
          <div className="st-how__astro"><Astronaut config={avatar} pose="point" expression="happy" size="100%" /></div>
          <div className="st-how__btns">
            <button className="btn btn--yellow" onClick={() => { introReturn.to = 'howto'; game.go('intro') }}>🎬 {t('st.howto.replay')}</button>
            {hasMission(mission) && <button className="btn btn--green" onClick={() => game.go(resumeScreen(mission))}>▶ {t('st.howto.resume')}</button>}
            <button className="btn btn--metal" onClick={() => game.go('menu')}>{t('st.howto.menu')}</button>
          </div>
        </div>

        <h2 className="st-how__h">{t('st.howto.steps')}</h2>
        <div className="st-how__steps">
          {[1, 2, 3].map(n => (
            <article key={n} className="panel st-how__step" style={{ ['--k' as string]: n }}>
              <span className="st-how__num">{n}</span>
              <h3>{t(`st.howto.s${n}.t`)}</h3>
              <p>{t(`st.howto.s${n}.d`)}</p>
            </article>
          ))}
        </div>

        <div className="panel st-how__modes">
          <h3>{t('st.howto.modes')}</h3>
          <div className="st-how__modegrid">
            {(['easy', 'hard'] as const).map(m => (
              <button key={m} type="button" className={`st-how__mode ${difficulty === m ? 'is-on' : ''}`} aria-pressed={difficulty === m} onClick={() => game.setDifficulty(m)}>
                <b>{m === 'easy' ? '🌱' : '🔥'} {t(`st.menu.${m}`)}</b>
                {[1, 2, 3].map(i => <span key={i}>• {t(`st.menu.${m}.d${i}`)}</span>)}
              </button>
            ))}
          </div>
          <Bubble tail="left">{t('st.howto.modeNote')}</Bubble>
        </div>

        <h2 className="st-how__h">{t('st.howto.glossary')}</h2>
        <div className="st-how__gl">
          {GL.map(([id, icon], k) => (
            <article key={id} className="panel st-how__term" style={{ ['--k' as string]: k }}>
              <span className="st-how__icon" aria-hidden>{icon}</span>
              <h3>{t(`st.gl.${id}.t`)}</h3>
              <p>{t(`st.gl.${id}.d`)}</p>
            </article>
          ))}
        </div>
      </div>
    </ScreenFrame>
  )
}
