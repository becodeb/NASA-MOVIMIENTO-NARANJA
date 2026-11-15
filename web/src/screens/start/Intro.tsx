import { useMemo, useState, type ReactNode } from 'react'
import { game, useGame } from '../../game/store'
import { useT } from '../../i18n'
import { LangSwitch } from '../../game/ui'
import { Icon, type IconName } from '../../game/icons'
import { PARAMS } from '../../engine/data'
import { SpaceBackdrop, Earth } from '../../art/worlds'
import { Spaceship } from '../../art/ships'
import { Astronaut, randomAvatar, type AstronautExpression, type AstronautPose } from '../../avatar'
import { Bubble, introReturn } from './common'
import { World, MoonA, MoonB, useDestination } from '../../game/World'

const TOTAL = 5
const FULL = { structure: 'reinforced', propulsion: 'combined', power: 'nuclear', lifeSupport: 'regenerative', comms: 'redundant' } as const
const POSES: [AstronautPose, AstronautExpression][] = [['wave', 'happy'], ['point', 'surprised'], ['thumbs-up', 'determined'], ['worried', 'worried'], ['cheer', 'happy']]
const ICONS: IconName[][] = [
  [],
  ['saturn', 'rings', 'titan', 'enceladus'],
  ['budget', 'mass', 'sunlight', 'wrench'],
  ['em-impact', 'radiation', 'light-delay', 'return-home'],
  ['probe', 'science', 'simplified'],
]
const MARS_ICONS: IconName[] = ['mars', 'atmosphere', 'magnetosphere', 'moons']

export function Intro() {
  const t = useT()
  const dest = useDestination()
  const { avatar } = useGame()
  const [i, setI] = useState(1)
  const crew = useMemo(() => [avatar, randomAvatar(), randomAvatar(), randomAvatar()], [avatar])

  const finish = () => {
    game.markSeen('intro')
    const to = introReturn.to
    introReturn.to = null
    game.go(to ?? 'avatar')
  }
  const last = i === TOTAL
  const bullets = i === 1 ? 0 : i === 5 ? 3 : 4
  const [pose, expr] = POSES[i - 1]
  const bulletParams = { budget: PARAMS.budget, mass: PARAMS.launchMass }

  let visual: ReactNode
  if (i === 1) visual = <div className="st-intro__vis st-intro__vis--saturn"><World size="100%" tilt={22} roll={-12} glow /></div>
  else if (i === 2) visual = (
    <div className="st-intro__vis st-intro__vis--moons">
      <div className="st-intro__sat"><World size="100%" tilt={22} roll={-12} glow /></div>
      <div className="st-intro__titan"><MoonA size="100%" /></div>
      <div className="st-intro__enc"><MoonB size="100%" /></div>
    </div>
  )
  else if (i === 3) visual = (
    <div className="st-intro__vis st-intro__crew">
      {crew.map((c, k) => <div key={k} className="st-intro__bust" style={{ ['--k' as string]: k }}><Astronaut config={c} bust expression="happy" size="100%" /></div>)}
    </div>
  )
  else if (i === 4) visual = <div className="st-intro__vis st-intro__vis--ship"><Spaceship config={FULL} thrust="both" damage={0.25} width="100%" /></div>
  else visual = <div className="st-intro__vis st-intro__vis--earth"><Earth size="100%" /></div>

  return (
    <div className="st-intro">
      <SpaceBackdrop fixed />
      <header className="st-intro__bar">
        <h1 className="title st-intro__title">{t('st.intro.title')}</h1>
        <div className="st-intro__right">
          <LangSwitch />
          <button className="btn btn--metal st-intro__skip" onClick={finish}>{t('st.intro.skip')} <Icon name="skip" size={20} /></button>
        </div>
      </header>

      <main className="st-intro__main">
        <section className="st-intro__card" key={i} aria-labelledby="st-intro-h">
          <div className="st-intro__left">
            {visual}
          </div>
          <div className="st-intro__text">
            <h2 id="st-intro-h" className="st-intro__h">{t(`st.intro.${i}.h`)}</h2>
            <div className="st-intro__talk">
              <div className="st-intro__astro"><Astronaut config={avatar} pose={pose} expression={expr} size="100%" /></div>
              <Bubble>{t(`st.intro.${i}.say`)}</Bubble>
            </div>
            {bullets > 0 && (
              <ul className="st-intro__list surface-rows">
                {Array.from({ length: bullets }, (_, k) => (
                  <li key={k} style={{ ['--k' as string]: k }}><Icon name={(dest === 'mars' && i === 2 ? MARS_ICONS : ICONS[i - 1])[k]} size={26} /><span>{t(`st.intro.${i}.b${k + 1}`, bulletParams)}</span></li>
                ))}
              </ul>
            )}
            {last && <p className="st-intro__ready">{t('st.intro.ready')}</p>}
          </div>
        </section>
      </main>

      <footer className="st-intro__foot">
        <button className="btn btn--metal st-intro__prev" disabled={i === 1} onClick={() => setI(i - 1)}><Icon name="go" size={20} className="st-flip" /> {t('st.intro.back')}</button>
        <div className="st-dots" role="img" aria-label={t('st.intro.step', { n: i, total: TOTAL })}>
          {Array.from({ length: TOTAL }, (_, k) => <span key={k} className={`st-dot ${k + 1 === i ? 'is-on' : k + 1 < i ? 'is-past' : ''}`} />)}
        </div>
        {last
          ? <button className="btn btn--yellow st-intro__go" onClick={finish}>{introReturn.to ? t('st.intro.done') : <><Icon name="go" size={24} /> {t('st.intro.go')}</>}</button>
          : <button className="btn btn--yellow st-intro__nextbtn" onClick={() => setI(i + 1)} autoFocus>{t('st.intro.next')} <Icon name="go" size={20} /></button>}
      </footer>
    </div>
  )
}
