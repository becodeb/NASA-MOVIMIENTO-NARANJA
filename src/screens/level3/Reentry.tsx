// Reentry: the 5 procedures of SPEC 5G, each one going through engine.reentryStep().
import { useEffect, useRef, useState } from 'react'
import { useT } from '../../i18n'
import { game, useGame } from '../../game/store'
import { Explain, ScreenFrame } from '../../game/ui'
import { reentryStep } from '../../engine/engine'
import type { Params, ReentryCorridor, ReentryStepId } from '../../engine/types'
import { SpaceBackdrop, usePrefersReducedMotion } from '../../art/worlds'
import { ReentryCapsule, type ReentryPhase } from '../../art/ships'
import { Astronaut } from '../../avatar'
import { useTP } from './helpers'
import './level3.css'

const ORDER: ReentryStepId[] = ['capsuleCheck', 'corridor', 'separation', 'parachutes', 'landing']
const CORRIDORS: ReentryCorridor[] = ['shallow', 'nominal', 'steep']

// Simulated descent profile for procedure 4 (educational values, not flight data).
const DROGUE_ALT = 7 // km
const DROGUE_SPEED = 350 // m/s
const MAIN_ALT = 3 // km
const MAIN_SPEED = 150 // m/s
const altAt = (s: number) => Math.max(0.6, 12 - s * 1.1)
const speedAt = (s: number) => 90 + 560 * Math.exp(-s / 2.4)

interface Feedback { ok: boolean; key: string; params: Params; expl?: string }

/** Mini corridor diagram. All three look alike (same colours): the player has to reason about the geometry. */
function CorridorDiagram({ kind, uid }: { kind: ReentryCorridor; uid: string }) {
  const path = kind === 'shallow' ? 'M0,64 Q100,108 200,56' : kind === 'nominal' ? 'M0,14 Q92,52 152,104' : 'M44,0 L122,112'
  const end: [number, number] = kind === 'shallow' ? [0, 64] : kind === 'nominal' ? [0, 14] : [44, 0]
  return (
    <svg viewBox="0 0 200 130" className="l3-diagram" role="img" aria-label={kind}>
      <defs>
        <clipPath id={`${uid}-c`}><rect width="200" height="130" rx="10" /></clipPath>
        <linearGradient id={`${uid}-a`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7FD8FF" stopOpacity="0" /><stop offset="1" stopColor="#7FD8FF" stopOpacity=".65" /></linearGradient>
      </defs>
      <g clipPath={`url(#${uid}-c)`}>
        <rect width="200" height="130" fill="#0E1636" />
        <circle cx="100" cy="260" r="182" fill={`url(#${uid}-a)`} />
        <circle cx="100" cy="260" r="150" fill="#2E7FE0" stroke="#111326" strokeWidth="3" />
        <path d="M40,130 q30,-14 60,-8 q24,6 40,-2 L140,130 Z" fill="#65D68A" opacity=".85" />
        <path d={path} fill="none" stroke="#F5F7FF" strokeWidth="3" strokeDasharray="7 5" strokeLinecap="round" />
        <circle cx={end[0]} cy={end[1]} r="5" fill="#FF8C32" stroke="#111326" strokeWidth="2" />
        <text x="196" y="16" textAnchor="end" fill="#B9C4DC" fontSize="9" fontWeight="800">▲ SPACE</text>
        <text x="196" y="86" textAnchor="end" fill="#DFF6FF" fontSize="8" fontWeight="800">ATMOSPHERE</text>
      </g>
    </svg>
  )
}

export function Reentry() {
  const t = useT()
  const tp = useTP()
  const { mission, difficulty, avatar } = useGame()
  const reduced = usePrefersReducedMotion()
  const easy = difficulty === 'easy'
  const [fb, setFb] = useState<Feedback | null>(null)
  const [seq, setSeq] = useState(0) // separation sequencer progress (0..3)
  const [drogue, setDrogue] = useState(false)
  const [clock, setClock] = useState(0) // seconds of simulated descent
  const [shake, setShake] = useState(false)
  const timer = useRef(0)

  const done = mission?.reentry.done.length ?? 0
  const step: ReentryStepId | null = ORDER[done] ?? null
  const outcome = mission?.reentry.outcome ?? 'pending'

  useEffect(() => { if (!mission) game.go('menu') }, [mission])

  // separation sequencer
  useEffect(() => {
    if (step !== 'separation' || outcome !== 'pending') return
    if (reduced) { setSeq(3); return }
    setSeq(0)
    const h = window.setInterval(() => setSeq(s => { if (s >= 3) { window.clearInterval(h); return s }; return s + 1 }), 700)
    return () => window.clearInterval(h)
  }, [step, outcome, reduced])

  // simulated descent clock for the parachute procedure
  useEffect(() => {
    if (step !== 'parachutes' || outcome !== 'pending') return
    if (reduced) { setClock(12); return }
    setClock(0)
    timer.current = window.setInterval(() => setClock(c => { if (c >= 12) { window.clearInterval(timer.current); return c }; return Math.min(12, c + 0.12) }), 100)
    return () => window.clearInterval(timer.current)
  }, [step, outcome, reduced])

  if (!mission) return null

  const run = (s: ReentryStepId, corridor?: ReentryCorridor) => {
    const r = reentryStep(mission, s, corridor)
    game.apply(r, { toast: false })
    setFb({ ok: r.ok, key: r.msgKey, params: r.params, expl: r.explanationKey })
    if (!r.ok && r.state !== mission) { setShake(true); window.setTimeout(() => setShake(false), 1400) }
    return r
  }

  if (!mission.route) {
    return (
      <ScreenFrame title={t('l3.re.title')} subtitle={t('l3.re.sub')}>
        <SpaceBackdrop fixed />
        <div className="panel l3-stage l3-wrap l3-center">
          <p>{t('l3.re.notReady')}</p>
          <button className="btn btn--yellow" onClick={() => game.go(mission.phase === 'closing' ? 'report' : 'level3')}>{mission.phase === 'closing' ? t('l3.dead.report') : t('l3.re.back')}</button>
        </div>
      </ScreenFrame>
    )
  }

  const failed = outcome === 'failed'
  const safe = outcome === 'safe'
  const corridor = mission.reentry.corridor
  const alt = altAt(clock)
  const speed = speedAt(clock)
  const drogueOk = alt <= DROGUE_ALT && speed <= DROGUE_SPEED
  const mainsOk = drogue && alt <= MAIN_ALT && speed <= MAIN_SPEED

  let phase: ReentryPhase = 'separation'
  if (failed) phase = 'entry'
  else if (safe || step === 'landing') phase = step === 'landing' && !safe ? 'main' : 'splashdown'
  else if (step === 'parachutes') phase = drogue ? 'drogue' : 'entry'
  else if (step === 'separation') phase = 'entry'
  else if (step === 'corridor' && corridor) phase = 'entry'

  const sysCapsule = mission.systems.capsule
  const checks = ['shield', 'nav', 'attitude', 'chutes']

  return (
    <ScreenFrame title={t('l3.re.title')} subtitle={t('l3.re.sub')} alarm={failed}>
      <SpaceBackdrop fixed tint={failed ? 'alarm' : 'calm'} warp={step === 'corridor' && !corridor ? 0.2 : 0} />
      <div className={`l3-wrap l3-re ${shake ? 'l3-shake' : ''}`}>
        <ol className="l3-stepper" aria-label={t('l3.re.title')}>
          {ORDER.map((s, i) => {
            const st = mission.reentry.done.includes(s) ? 'done' : failed && s === step ? 'fail' : s === step ? 'now' : 'todo'
            return <li key={s} className={`l3-stepper__i is-${st}`} aria-current={st === 'now' ? 'step' : undefined}><span>{st === 'done' ? '✓' : st === 'fail' ? '✗' : i + 1}</span><em>{t(`l3.step.${s}.name`)}</em></li>
          })}
        </ol>

        <div className="l3-re__grid">
          <div className={`panel l3-re__scene l3-re__scene--${phase} ${failed ? 'is-failed' : ''}`}>
            <ReentryCapsule key={`${phase}-${corridor ?? 'n'}`} phase={phase} corridor={corridor ?? 'nominal'} width="100%" title={t('l3.re.title')} />
          </div>

          <div className="l3-re__side">
            {fb && !failed && (
              <div className={`l3-fb ${fb.ok ? 'is-ok' : 'is-bad'}`} role="status">
                <b>{fb.ok ? '✅' : '⚠️'} {tp(fb.key, fb.params)}</b>
                {fb.expl && <p>{tp(fb.expl, fb.params)}</p>}
              </div>
            )}

            {failed && (
              <section className="panel l3-stage l3-fail" role="alert">
                <h2 className="l3-h2">💥 {t('l3.re.fail.title')}</h2>
                <p><b>{tp(mission.reentry.failureKey ?? 'engine.reentry.notReady', { step: step ?? 'corridor' })}</b></p>
                <p>{tp(`${mission.reentry.failureKey}.why`)}</p>
                <p className="l3-note">{t('l3.re.fail.after')}</p>
                <div className="l3-actions">
                  <button className="btn btn--red" onClick={() => game.go('report')}>{t('l3.re.fail.report')}</button>
                  {game.canRestore() && <button className="btn btn--green" onClick={() => game.restore()}>↩ {t('common.restore')}</button>}
                </div>
              </section>
            )}

            {!failed && !safe && step && (
              <section className="panel l3-stage" aria-live="polite">
                <header className="l3-stage__head"><span className="l3-num">{done + 1}</span><h2 className="l3-h2">{t(`l3.step.${step}.title`)}</h2></header>
                <p className="l3-lead">{t(`l3.step.${step}.intro`)}</p>

                {step === 'capsuleCheck' && (
                  <>
                    <ul className="l3-checks">
                      {checks.map(c => {
                        const bad = sysCapsule === 'failed'
                        const half = sysCapsule === 'degraded'
                        return <li key={c} className={bad ? 'is-bad' : half ? 'is-warn' : 'is-ok'}>{bad ? '❌' : half ? '⚠️' : '✅'} {t(`l3.check.${c}`)}</li>
                      })}
                    </ul>
                    <p className="l3-note">{t('l3.check.status', { status: t(`l3.status.${sysCapsule}`) })}</p>
                    <button className="btn btn--yellow l3-go" onClick={() => run('capsuleCheck')}>{t('l3.step.capsuleCheck.cta')}</button>
                  </>
                )}

                {step === 'corridor' && (
                  <>
                    <div className="l3-corr" role="radiogroup" aria-label={t('l3.step.corridor.title')}>
                      {CORRIDORS.map(c => (
                        <button key={c} role="radio" aria-checked={false} className="l3-corr__card" onClick={() => run('corridor', c)}>
                          <CorridorDiagram kind={c} uid={`l3d-${c}`} />
                          <b>{t(`l3.corr.${c}`)}</b>
                          <span>{t(`l3.corr.${c}.d`)}</span>
                        </button>
                      ))}
                    </div>
                    {easy && <div className="l3-note">💡 {t('l3.corr.hint')}</div>}
                  </>
                )}

                {step === 'separation' && (
                  <>
                    <ul className="l3-checks">
                      {[1, 2, 3].map(n => <li key={n} className={seq >= n ? 'is-ok' : 'is-wait'}>{seq >= n ? '✅' : '⏳'} {t(`l3.sep.${n}`)}</li>)}
                    </ul>
                    <button className="btn btn--yellow l3-go" disabled={seq < 3} onClick={() => run('separation')}>{t('l3.step.separation.cta')}</button>
                  </>
                )}

                {step === 'parachutes' && (
                  <>
                    <div className="l3-gauges">
                      <div><span>{t('l3.chute.alt')}</span><b>{alt.toFixed(1)} km</b></div>
                      <div><span>{t('l3.chute.speed')}</span><b>{Math.round(speed)} m/s</b></div>
                    </div>
                    <ul className="l3-checks l3-conds">
                      <li className={drogue ? 'is-ok' : drogueOk ? 'is-ready' : 'is-wait'}>{drogue ? '✅' : drogueOk ? '🟢' : '⏳'} {t('l3.chute.drogue.cond', { alt: DROGUE_ALT, speed: DROGUE_SPEED })}</li>
                      <li className={mainsOk ? 'is-ready' : 'is-wait'}>{mainsOk ? '🟢' : '⏳'} {t('l3.chute.main.cond', { alt: MAIN_ALT, speed: MAIN_SPEED })}</li>
                    </ul>
                    <div className="l3-actions">
                      <button className="btn btn--orange" disabled={!drogueOk || drogue} onClick={() => setDrogue(true)}>{t('l3.chute.drogue.cta')}</button>
                      <button className="btn btn--yellow" disabled={!mainsOk} onClick={() => run('parachutes')}>{t('l3.chute.main.cta')}</button>
                    </div>
                    <p className="l3-note">{drogueOk ? (drogue ? t('l3.chute.window') : t('l3.chute.window')) : t('l3.chute.waiting', { alt: alt.toFixed(1), speed: Math.round(speed) })}</p>
                    <p className="l3-note">{t('l3.chute.sim')}</p>
                  </>
                )}

                {step === 'landing' && (
                  <>
                    <ul className="l3-checks">
                      {[1, 2, 3].map(n => <li key={n} className="is-ok">🛟 {t(`l3.land.${n}`)}</li>)}
                    </ul>
                    <button className="btn btn--green l3-go" onClick={() => run('landing')}>{t('l3.step.landing.cta')}</button>
                  </>
                )}
              </section>
            )}

            {safe && (
              <section className="panel l3-stage l3-landed">
                <div className="l3-landed__av"><Astronaut config={avatar} pose="cheer" expression="happy" size={170} /></div>
                <div>
                  <h2 className="l3-h2">🌊 {t('l3.re.safe.title')}</h2>
                  <p>{t('l3.re.safe.text')}</p>
                  <button className="btn btn--yellow l3-go" onClick={() => game.go('report')}>{t('l3.re.safe.cta')} ▶</button>
                </div>
              </section>
            )}

            {corridor && (
              <section className="panel l3-stage l3-debrief">
                <h3 className="l3-h3">{t('l3.corr.debrief')}</h3>
                {CORRIDORS.map(c => (
                  <div key={c} className={`l3-debrief__row ${c === corridor ? 'is-picked' : ''}`}>
                    <b>{c === corridor ? '👉 ' : ''}{t(`l3.corr.${c}`)}</b>
                    <p>{t(`l3.corr.explain.${c}`)}</p>
                  </div>
                ))}
              </section>
            )}

            {!failed && !safe && <Explain textKey={`l3.step.${step ?? 'landing'}.why`} />}
          </div>
        </div>
      </div>
    </ScreenFrame>
  )
}
