// Final Mission Report: score count-up, medal, category bars, resources, science, decision timeline, recommendations.
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { t as tr, useT } from '../../i18n'
import { game, useGame } from '../../game/store'
import { Meter, ScreenFrame, Squiggle } from '../../game/ui'
import { Icon, type IconName } from '../../game/icons'
import { loadTotal, score } from '../../engine/engine'
import { INVESTIGATION_ORDER, SCORE } from '../../engine/data'
import type { Change, Classification, HistoryEntry, InvestigationId, MissionState, ParamValue, ScoreBreakdown } from '../../engine/types'
import { SpaceBackdrop, usePrefersReducedMotion } from '../../art/worlds'
import { ReentryCapsule, Spaceship } from '../../art/ships'
import { Astronaut } from '../../avatar'
import { influenceOf, keyDecisions, r1, shownChanges, useTP } from './helpers'
import { LevelStamp } from './parts'
import './level3.css'

const CLASS_COLORS: Record<Classification, { fill: string; glyph: 'star' | 'check' | 'dots' | 'retry' }> = {
  success: { fill: '#FFD447', glyph: 'star' },
  partial: { fill: '#E4EAF7', glyph: 'check' },
  incomplete: { fill: '#F2B27A', glyph: 'dots' },
  failed: { fill: '#8896B3', glyph: 'retry' },
}
const STAR = Array.from({ length: 10 }, (_, i) => {
  const a = (Math.PI / 5) * i - Math.PI / 2
  const r = i % 2 ? 11 : 27
  return `${(60 + r * Math.cos(a)).toFixed(1)},${(92 + r * Math.sin(a)).toFixed(1)}`
}).join(' ')


function useCountUp(target: number, delay = 500, dur = 2200): number {
  const reduced = usePrefersReducedMotion()
  const [v, setV] = useState(0)
  useEffect(() => {
    if (reduced) { setV(target); return }
    let raf = 0
    const h = window.setTimeout(() => {
      const start = performance.now()
      const tick = (now: number) => {
        const k = Math.min(1, (now - start) / dur)
        setV(Math.round(target * (1 - Math.pow(1 - k, 3))))
        if (k < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }, delay)
    const fallback = window.setTimeout(() => setV(target), delay + dur + 400) // rAF is paused in background tabs
    return () => { window.clearTimeout(h); window.clearTimeout(fallback); cancelAnimationFrame(raf) }
  }, [target, delay, dur, reduced])
  return v
}

const CONFETTI_COLORS = ['#FFD447', '#38D9D0', '#FF8C32', '#F46AA7', '#65D68A', '#F5F7FF', '#6637B8']
function Confetti({ count }: { count: number }) {
  const [on, setOn] = useState(true)
  const pieces = useMemo(() => Array.from({ length: count }, (_, i) => ({
    left: Math.random() * 100, delay: Math.random() * 0.9, dur: 2.4 + Math.random() * 1.4, rot: Math.round(Math.random() * 720 - 360),
    sway: Math.round(Math.random() * 120 - 60), color: CONFETTI_COLORS[i % CONFETTI_COLORS.length], w: 6 + Math.random() * 7, round: i % 3 === 0,
  })), [count])
  useEffect(() => { const h = window.setTimeout(() => setOn(false), 4600); return () => window.clearTimeout(h) }, [])
  if (!on) return null
  return (
    <div className="l3-confetti" aria-hidden>
      {pieces.map((p, i) => (
        <i key={i} style={{ left: `${p.left}%`, background: p.color, width: p.w, height: p.w * (p.round ? 1 : 1.7), borderRadius: p.round ? '50%' : 2, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, '--rot': `${p.rot}deg`, '--sway': `${p.sway}px` } as CSSProperties} />
      ))}
    </div>
  )
}

function Medal({ cls, show }: { cls: Classification; show: boolean }) {
  const t = useT()
  const c = CLASS_COLORS[cls]
  return (
    <div className={`l3-medal ${show ? 'is-shown' : ''}`} role="img" aria-label={t(`l3.medal.${cls}`)}>
      <svg viewBox="0 0 120 150">
        <path d="M28,0 L60,52 L50,70 L14,10 Z" fill="#F04452" stroke="#111326" strokeWidth="4" strokeLinejoin="round" />
        <path d="M92,0 L60,52 L70,70 L106,10 Z" fill="#2A4FB8" stroke="#111326" strokeWidth="4" strokeLinejoin="round" />
        <circle cx="60" cy="92" r="46" fill={c.fill} stroke="#111326" strokeWidth="5" />
        <circle cx="60" cy="92" r="35" fill="none" stroke="#111326" strokeOpacity=".35" strokeWidth="3" strokeDasharray="4 5" />
        {c.glyph === 'star' && <polygon points={STAR} fill="#FF8C32" stroke="#111326" strokeWidth="4" strokeLinejoin="round" />}
        {c.glyph === 'check' && <path d="M43 93 l12 12 l23 -26" fill="none" stroke="#111326" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />}
        {c.glyph === 'dots' && [44, 60, 76].map(x => <circle key={x} cx={x} cy="92" r="5.5" fill="#111326" />)}
        {c.glyph === 'retry' && <path d="M76 88 a17 17 0 1 0 -4 14 M76 74 v14 h-14" fill="none" stroke="#111326" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
      <span className={`stamp stamp-in ${cls === 'success' ? 'stamp--yellow' : cls === 'failed' ? 'stamp--paper' : cls === 'incomplete' ? 'stamp--orange' : 'stamp--paper'}`}>{t(`l3.medal.${cls}`)}</span>
    </div>
  )
}

function Bar({ value, max, shown, tone = 'teal' }: { value: number; max: number; shown: boolean; tone?: string }) {
  return (
    <div className="l3-sbar" role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div className={`l3-sbar__fill is-${tone}`} style={{ width: shown ? `${(value / max) * 100}%` : '0%' }} />
    </div>
  )
}

function Category({ title, icon, total, max, items, shown, tone }: { title: string; icon: IconName; total: number; max: number; items: Array<[string, number, number]>; shown: boolean; tone: string }) {
  return (
    <div className="l3-cat">
      <div className="l3-cat__head"><h3><Icon name={icon} size={22} />{title}</h3><b className="tnum">{total}<small>/{max}</small></b></div>
      <Bar value={total} max={max} shown={shown} tone={tone} />
      <ul>
        {items.map(([label, v, m]) => (
          <li key={label}><span>{label}</span><Bar value={v} max={m} shown={shown} tone={tone} /><b>{v}/{m}</b></li>
        ))}
      </ul>
    </div>
  )
}

function fieldLabel(f: string): string {
  const [head, , tail] = f.split('.')
  if (f.startsWith('systems.')) return tr(`l3.sys.${f.slice(8)}`)
  if (f.startsWith('spares.')) return tr('l3.f.spare', { s: tr(`l3.spare.${f.slice(7)}`) })
  if (f.startsWith('faults.')) return tr(`l3.f.faults.${f.slice(7)}`)
  if (f.startsWith('science.')) return tr(head === 'science' && f.includes('transmitted') ? 'l3.f.sent' : 'l3.f.collected', { i: tr(`l3.inv.${tail}`) })
  return tr(`l3.f.${f}`)
}
function fmtVal(v: ParamValue | null): string {
  if (v === null) return '–'
  if (typeof v === 'number') return String(r1(v))
  if (typeof v === 'boolean') return tr(v ? 'l3.val.yes' : 'l3.val.no')
  const s = tr(`l3.val.${v}`)
  return s === `l3.val.${v}` ? v : s
}
function tone(c: Change): 'good' | 'bad' | 'warn' {
  if (typeof c.from === 'number' && typeof c.to === 'number') {
    const up = c.to > c.from
    return (c.field === 'radiation' ? !up : up) ? 'good' : 'bad'
  }
  if (c.to === 'failed' || c.to === 'lost' || c.to === 'compromised' || c.to === 'open' || c.to === 'failing' || c.to === 'cold') return 'bad'
  if (c.to === 'degraded') return 'warn'
  if (typeof c.to === 'boolean' && c.field.startsWith('science')) return c.to ? 'good' : 'bad'
  return 'good'
}
function Chips({ e }: { e: HistoryEntry }) {
  const list = shownChanges(e)
  if (!list.length) return null
  return (
    <ul className="l3-chips">
      {list.slice(0, 8).map(c => <li key={c.field} className={`is-${tone(c)}`}>{fieldLabel(c.field)}: <b>{fmtVal(c.from)} <Icon name="go" size={12} /> {fmtVal(c.to)}</b></li>)}
    </ul>
  )
}

/** 2–3 recommendations derived from the final state. Each is [key, params]. */
function recommend(m: MissionState, sc: ScoreBreakdown): string[] {
  const out: string[] = []
  const hasExpl = m.reentry.outcome === 'failed'
  if (hasExpl) out.push(m.reentry.failureKey === 'engine.reentry.capsule.fail' ? 'l3.rec.capsule' : 'l3.rec.corridor')
  if (!m.route && m.reentry.outcome === 'pending') out.push(m.maneuver < 46 ? 'l3.rec.maneuver' : 'l3.rec.vital')
  if (m.maneuver < 20 && !out.includes('l3.rec.maneuver')) out.push('l3.rec.maneuver')
  if (m.vital < 20 && m.config.lifeSupport === 'consumables') out.push('l3.rec.vital')
  if (m.structure < 80 && m.config.structure === 'light') out.push('l3.rec.structure')
  const collected = INVESTIGATION_ORDER.filter(i => m.science.collected[i]).length
  const sent = INVESTIGATION_ORDER.filter(i => m.science.transmitted[i]).length
  if (collected < 4) out.push('l3.rec.science')
  else if (sent < collected && !sc.safeReturn) out.push('l3.rec.transmit')
  if (!m.flags.shelterUsed) out.push('l3.rec.protocol')
  if (m.faults.blackout) out.push('l3.rec.power')
  if ((['structure', 'propulsion', 'power', 'lifeSupport', 'navigation'] as const).some(k => m.systems[k] === 'failed')) out.push('l3.rec.systems')
  for (const fallback of ['l3.rec.hard', 'l3.rec.explore', 'l3.rec.titan']) if (out.length < 2) out.push(fallback)
  return [...new Set(out)].slice(0, 3)
}

export function Report() {
  const t = useT()
  const tp = useTP()
  const { mission, difficulty, avatar } = useGame()
  useEffect(() => { if (!mission) game.go('menu') }, [mission])
  const sc = useMemo(() => (mission ? score(mission) : null), [mission])
  const total = sc?.total ?? 0
  const shownScore = useCountUp(total)
  const [barsOn, setBarsOn] = useState(false)
  const [medalOn, setMedalOn] = useState(false)
  useEffect(() => {
    const a = window.setTimeout(() => setBarsOn(true), 400)
    const b = window.setTimeout(() => setMedalOn(true), 2900)
    return () => { window.clearTimeout(a); window.clearTimeout(b) }
  }, [])
  if (!mission || !sc) return null

  const cls = sc.classification
  const m = mission
  const keyList = keyDecisions(m.history)
  const key = new Set(keyList.map(x => x.entry.seq))
  const win = cls === 'success' || cls === 'partial'
  const reFailed = m.reentry.outcome === 'failed'
  const crewHome = sc.safeReturn ? 4 : 0
  const margin = m.powerGeneration - loadTotal(m)
  const collected = INVESTIGATION_ORDER.filter(i => m.science.collected[i])
  const sent = INVESTIGATION_ORDER.filter(i => m.science.transmitted[i])
  const recs = recommend(m, sc)
  const pose = cls === 'success' ? 'cheer' : cls === 'partial' ? 'thumbs-up' : cls === 'incomplete' ? 'idle' : 'worried'
  const expr = win ? 'happy' : cls === 'incomplete' ? 'determined' : 'worried'
  const restorable = difficulty === 'easy' && game.canRestore()
  const cfgKeys = (['structure', 'propulsion', 'power', 'lifeSupport', 'comms'] as const).map(k => `l3.cfg.${m.config[k]}`)

  const stampTone = cls === 'success' ? 'green' : cls === 'partial' ? 'yellow' : cls === 'incomplete' ? 'orange' : 'red'
  const H = ({ icon, children }: { icon: IconName; children: string }) => (
    <h2 className="paper-title squiggled l3-ph"><Icon name={icon} size={26} />{children}<Squiggle tone="orange" /></h2>
  )

  return (
    <ScreenFrame title={t('l3.rp.title')} subtitle={t('l3.rp.sub')}>
      <SpaceBackdrop fixed density={win ? 1.2 : 0.8} />
      {cls === 'success' && <Confetti count={80} />}
      {cls === 'partial' && <Confetti count={40} />}
      <div className="l3-wrap l3-rp">
        <LevelStamp />
        {/* ------------------------------------------------ hero: the debrief sheet */}
        <section className={`surface-paper surface-paper--tape surface-paper--tilt-l l3-paper l3-hero l3-hero--${cls}`}>
          <div className="l3-hero__stamps">
            <span className="stamp stamp-in">{t('l3.rp.debrief')}</span>
            <span className={`stamp stamp--flat stamp--${stampTone}`}>{t(sc.classificationKey)}</span>
          </div>
          <h2 className="paper-title l3-hero__title">{t(`l3.rp.head.${cls}`)}</h2>
          <p className="l3-hero__lead">{t(`l3.rp.lead.${cls}`)}</p>
          <div className="l3-hero__row">
            <div className="l3-hero__score">
              <div className="l3-score" aria-label={t('l3.rp.score', { n: total })}>
                <span className="l3-score__n">{shownScore}</span><span className="l3-score__max">/100</span>
              </div>
              <div className="label l3-score__label">{t('l3.rp.finalScore')}</div>
              <Medal cls={cls} show={medalOn} />
            </div>
            <div className="l3-hero__scene">
              <div className="l3-hero__frame"><div className="l3-hero__crop">
              {sc.safeReturn
                ? <ReentryCapsule phase="splashdown" width="100%" title={t('l3.rp.scene.splash')} />
                : reFailed
                  ? <ReentryCapsule phase="entry" corridor={m.reentry.corridor ?? 'steep'} width="100%" title={t('l3.rp.scene.fail')} />
                  : <div className="l3-hero__space"><Spaceship config={m.config} alarm lightsOn={false} damage={0.5} width="100%" title={t('l3.rp.scene.stuck')} /></div>}
              </div></div>
              <div className="l3-hero__av"><Astronaut config={avatar} pose={pose} expression={expr} size={190} /></div>
            </div>
          </div>
          <div className="l3-crewline">
            <span className={sc.safeReturn ? 'is-ok' : 'is-bad'}><Icon name="helmet" size={22} />{t('l3.rp.crew', { n: crewHome })}</span>
            <span><Icon name="calendar" size={22} />{t('l3.rp.months', { m: m.monthsElapsed })}</span>
            <span><Icon name="route" size={22} />{m.route ? t(`l3.route.${m.route}.name`) : t('l3.rp.noRoute')}{m.titanAssist ? ' + Titan' : ''}</span>
          </div>
        </section>

        {/* ------------------------------------------------ what went wrong */}
        {!sc.safeReturn && (
          <section className="surface-paper surface-paper--tilt-r l3-paper l3-stage l3-fail">
            <H icon="magnifier">{t('l3.rp.wrong')}</H>
            {reFailed
              ? <><p><b>{tp(m.reentry.failureKey ?? '', { step: 'corridor' })}</b></p><p>{tp(`${m.reentry.failureKey}.why`)}</p></>
              : <p>{t(m.route ? 'l3.rp.wrong.other' : 'l3.rp.wrong.noRoute')}</p>}
            <p className="l3-note">{t('l3.rp.encourage')}</p>
          </section>
        )}

        {/* ------------------------------------------------ score breakdown */}
        <section className="surface-paper l3-paper l3-stage">
          <H icon="score">{t('l3.rp.breakdown')}</H>
          <div className="l3-cats">
            <Category shown={barsOn} tone="teal" icon="buoy" title={t('l3.rp.cat.crew')} total={sc.crew.total} max={40}
              items={[[t('l3.rp.sub.return'), sc.crew.safeReturn, SCORE.crewReturn], [t('l3.rp.sub.hab'), sc.crew.habitability, SCORE.crewHabitability], [t('l3.rp.sub.protocol'), sc.crew.protocol, SCORE.crewProtocol]]} />
            <Category shown={barsOn} tone="orange" icon="maneuver" title={t('l3.rp.cat.ship')} total={sc.ship.total} max={25}
              items={[[t('l3.rp.sub.hull'), sc.ship.structural, SCORE.shipStructure], [t('l3.rp.sub.essentials'), sc.ship.essentials, SCORE.shipEssentials], [t('l3.rp.sub.capsule'), sc.ship.capsule, SCORE.shipCapsule]]} />
            <Category shown={barsOn} tone="violet" icon="science" title={t('l3.rp.cat.science')} total={sc.science.total} max={20}
              items={INVESTIGATION_ORDER.map(i => [t(`l3.inv.${i}`), sc.science.perInvestigation[i], SCORE.perInvestigation] as [string, number, number])} />
            <Category shown={barsOn} tone="yellow" icon="battery" title={t('l3.rp.cat.resources')} total={sc.resources.total} max={15}
              items={[[t('l3.rp.sub.vital'), sc.resources.vital, SCORE.resVital], [t('l3.rp.sub.maneuver'), sc.resources.maneuver, SCORE.resManeuver], [t('l3.rp.sub.energy'), sc.resources.energyMaterials, SCORE.resEnergy + SCORE.resMaterials]]} />
          </div>
          <p className="fine l3-rule">{t('l3.rp.classRule')}</p>
        </section>

        {/* ------------------------------------------------ resources + science */}
        <div className="l3-two">
          <section className="panel l3-stage">
            <h2 className="l3-h2 l3-h2--icon"><Icon name="battery" size={28} />{t('l3.rp.resources')}</h2>
            <div className="l3-meters">
              <Meter icon="maneuver" tone="orange" label={t('hud.maneuver')} value={r1(m.maneuver)} max={115} warnBelow={40} dangerBelow={20} />
              <Meter icon="life-support" tone="teal" label={t('hud.vital')} value={r1(m.vital)} max={130} warnBelow={40} dangerBelow={16} />
              <Meter icon="power" tone="yellow" label={t('hud.power')} value={margin} max={75} valueText={t('hud.of', { a: margin, b: m.powerGeneration })} warnBelow={10} dangerBelow={0} />
              <Meter icon="battery" tone="green" label={t('hud.battery')} value={m.battery} max={30} warnBelow={15} dangerBelow={6} />
              <Meter icon="hull" tone="green" label={t('hud.structure')} value={m.structure} max={100} warnBelow={70} dangerBelow={50} />
            </div>
          </section>
          <section className="surface-paper l3-paper l3-stage">
            <H icon="science">{t('l3.rp.science')}</H>
            <p className="l3-lead">{t('l3.rp.science.sum', { c: collected.length, s: sent.length })}</p>
            <ul className="l3-sci surface-rows">
              {INVESTIGATION_ORDER.map((i: InvestigationId) => (
                <li key={i} className={m.science.collected[i] ? 'is-ok' : 'is-no'}>
                  <b>{t(`l3.inv.${i}`)}</b>
                  <span className={`stamp stamp--flat ${!m.science.collected[i] ? 'stamp--ghost' : m.science.transmitted[i] || sc.safeReturn ? 'stamp--green' : 'stamp--red'}`}>
                    {!m.science.collected[i] ? t('l3.sci.none') : m.science.transmitted[i] ? t('l3.sci.sent') : sc.safeReturn ? t('l3.sci.home') : t('l3.sci.lost')}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* ------------------------------------------------ decisions timeline */}
        <section className="surface-paper l3-paper l3-stage">
          <H icon="timeline">{t('l3.rp.decisions')}</H>
          <p className="l3-lead">{t('l3.rp.decisions.intro')}</p>
          <p className="l3-cfg"><b>{t('l3.rp.config')}</b> {cfgKeys.map(k => <span key={k} className="chip chip--paper">{t(k)}</span>)}</p>
          <ol className="l3-tl surface-rows">
            {keyList.map(({ entry }) => {
              const why = tr(`engine.expl.${entry.key.replace('engine.out.', '')}`)
              const hasWhy = entry.key.startsWith('engine.out.') && why !== `engine.expl.${entry.key.replace('engine.out.', '')}`
              return (
                <li key={entry.seq} className={entry.success ? '' : 'is-bad'}>
                  <div className="l3-tl__meta"><span className="chip">L{entry.level}</span><span className="chip">{t('l3.month', { m: entry.month })}</span><span className="l3-star"><Icon name="key-decision" size={16} />{t('l3.rp.key')}</span></div>
                  <div className="l3-tl__cause"><small className="label">{t('l3.rp.cause')}</small><p>{tp(entry.key, entry.params)}</p></div>
                  <div className="l3-tl__arrow" aria-hidden><Icon name="go" size={24} /></div>
                  <div className="l3-tl__eff"><small className="label">{t('l3.rp.effect')}</small><Chips e={entry} />{hasWhy && <p className="l3-tl__why"><Icon name="field-note" size={18} />{tp(`engine.expl.${entry.key.replace('engine.out.', '')}`, entry.params)}</p>}</div>
                </li>
              )
            })}
            {keyList.length === 0 && <li><p>{t('l3.rp.noKey')}</p></li>}
          </ol>
          <details className="l3-log-all">
            <summary>{t('l3.rp.fullLog', { n: m.history.length })}</summary>
            <ol>
              {m.history.map(e => (
                <li key={e.seq} className={`${e.success ? '' : 'is-bad'} ${key.has(e.seq) ? 'is-key' : ''}`}>
                  <span className="chip">L{e.level} · {t('l3.month', { m: e.month })}</span> {key.has(e.seq) && <Icon name="key-decision" size={16} />} {tp(e.key, e.params)}
                  <Chips e={e} />
                  <span className="sr-only">{influenceOf(e)}</span>
                </li>
              ))}
            </ol>
          </details>
        </section>

        {/* ------------------------------------------------ recommendations */}
        <section className="surface-paper surface-paper--tilt-r l3-paper l3-stage">
          <H icon="target">{t('l3.rp.next')}</H>
          <ul className="l3-recs surface-rows">{recs.map((k, i) => <li key={k}><span className="l3-num">{i + 1}</span><p>{t(k)}</p></li>)}</ul>
        </section>

        <div className="l3-actions l3-actions--end">
          <button className="btn btn--yellow l3-go" onClick={() => game.restart()}>{t('common.retry')}</button>
          <button className="btn btn--metal l3-go" onClick={() => game.go('menu')}>{t('common.menu')}</button>
          {restorable && <button className="btn btn--green l3-go" onClick={() => game.restore()}><Icon name="undo" size={20} /> {t('l3.rp.restore')}</button>}
        </div>
      </div>
    </ScreenFrame>
  )
}
