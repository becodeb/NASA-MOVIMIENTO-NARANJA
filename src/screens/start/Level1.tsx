import { useEffect, useRef, useState } from 'react'
import { game, useGame } from '../../game/store'
import { useT } from '../../i18n'
import { Explain, ScreenFrame } from '../../game/ui'
import { COMPONENTS, LOADS, PARAMS } from '../../engine/data'
import { createMission, designReport, launch } from '../../engine/engine'
import type { CheckResult, ShipConfig } from '../../engine/types'
import { SpaceBackdrop } from '../../art/worlds'
import { Spaceship } from '../../art/ships'
import { Astronaut, type AstronautExpression, type AstronautPose } from '../../avatar'
import { Bubble } from './common'

type Part = keyof ShipConfig
const PARTS: Part[] = ['structure', 'propulsion', 'power', 'lifeSupport', 'comms']
const CHOICES: { [K in Part]: readonly ShipConfig[K][] } = {
  structure: ['light', 'reinforced'],
  propulsion: ['chemical', 'combined'],
  power: ['solar', 'nuclear'],
  lifeSupport: ['consumables', 'regenerative'],
  comms: ['standard', 'redundant'],
}
const ICON: Record<Part, string> = { structure: '🛡️', propulsion: '🚀', power: '⚡', lifeSupport: '🫁', comms: '📡' }
const OPT_ICON: Record<string, string> = {
  light: '🪶', reinforced: '🧱', chemical: '🔥', combined: '⚡', solar: '☀️', nuclear: '⚛️',
  consumables: '🛢️', regenerative: '♻️', standard: '📡', redundant: '📡📡',
}

type Stats = Record<string, number | boolean>
const comp = (part: Part, choice: string): Stats => (COMPONENTS[part] as unknown as Record<string, Stats>)[choice]
const other = (part: Part, choice: string): string => CHOICES[part].find(c => c !== choice) as string

/** Draft survives leaving the screen (menu button) and coming back. */
let draft: Partial<ShipConfig> = {}

/** Live numbers while the config is still incomplete. Complete configs use the engine's designReport. */
function partialCalc(cfg: Partial<ShipConfig>) {
  let cost = 0
  let mass = PARAMS.commonMass
  for (const p of PARTS) {
    const v = cfg[p]
    if (v) { const c = comp(p, v); cost += c.cost as number; mass += c.mass as number }
  }
  const gen = cfg.power ? COMPONENTS.power[cfg.power].generation : null
  const load = LOADS.essentials + (cfg.lifeSupport === 'regenerative' ? LOADS.regenerative : 0) + (cfg.comms === 'redundant' ? LOADS.commsRedundant : 0)
  const ls = cfg.lifeSupport ? COMPONENTS.lifeSupport[cfg.lifeSupport] : null
  return {
    cost, mass, gen, load,
    margin: gen === null ? null : gen - load,
    maneuver: cfg.propulsion ? COMPONENTS.propulsion[cfg.propulsion].maneuver : null,
    autonomy: ls ? ls.vital / ls.rate : null,
  }
}

function useTween(target: number, ms = 500) {
  const [v, setV] = useState(target)
  const from = useRef(target)
  useEffect(() => {
    const a = from.current
    const start = performance.now()
    let raf = 0
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / ms)
      const cur = a + (target - a) * (1 - Math.pow(1 - p, 3))
      from.current = cur
      setV(cur)
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return v
}

type Tone = 'ok' | 'warn' | 'bad' | 'idle'

function StMeter({ label, icon, value, max, marker, tone, sub, markerLabel }: {
  label: string; icon: string; value: number | null; max: number; marker?: number; tone: Tone; sub?: string; markerLabel?: string
}) {
  const shown = useTween(value ?? 0)
  const pct = Math.max(0, Math.min(100, (shown / max) * 100))
  const text = value === null ? '—' : Number.isInteger(value) ? Math.round(shown) : shown.toFixed(1)
  return (
    <div className={`st-m st-m--${value === null ? 'idle' : tone}`}>
      <div className="st-m__top">
        <span aria-hidden>{icon}</span>
        <span className="st-m__label">{label}</span>
        <b className="st-m__val">{text}</b>
      </div>
      <div className="st-m__track" role="meter" aria-label={label} aria-valuenow={value ?? 0} aria-valuemin={0} aria-valuemax={max}>
        <div className="st-m__fill" style={{ width: `${pct}%` }} />
        {marker !== undefined && <div className="st-m__mark" style={{ left: `${(marker / max) * 100}%` }} title={markerLabel} />}
      </div>
      {(sub || markerLabel) && <div className="st-m__sub">{sub}{sub && markerLabel ? ' · ' : ''}{markerLabel}</div>}
    </div>
  )
}

export function Level1() {
  const t = useT()
  const { avatar, difficulty } = useGame()
  const easy = difficulty === 'easy'
  const [cfg, setCfg] = useState<Partial<ShipConfig>>(draft)
  const [active, setActive] = useState<Part>(() => PARTS.find(p => !draft[p]) ?? 'structure')
  const [react, setReact] = useState<{ pose: AstronautPose; expr: AstronautExpression; lines: string[] } | null>(null)
  const [clunk, setClunk] = useState(0)
  const [report, setReport] = useState(false)
  const [launching, setLaunching] = useState(false)
  const timers = useRef<number[]>([])
  useEffect(() => { document.getElementById('root')?.scrollTo(0, 0) }, [])
  useEffect(() => { const ts = timers.current; return () => ts.forEach(clearTimeout) }, [])
  useEffect(() => {
    if (!report) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setReport(false) }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [report])

  const chosen = PARTS.filter(p => cfg[p]).length
  const complete = chosen === PARTS.length
  const rep = complete ? designReport(cfg as ShipConfig) : null
  const calc = partialCalc(cfg)
  const fails = rep ? rep.checks.filter(c => !c.ok) : []
  const ready = !!rep?.canLaunch

  // display transforms for engine params (negative margin shown as a positive shortfall, route ids translated)
  const fmt = (c: CheckResult) => {
    const p: Record<string, string | number> = {}
    for (const [k, v] of Object.entries(c.params)) {
      p[k] = typeof v === 'boolean' ? String(v) : v
    }
    if (typeof p.margin === 'number' && p.margin < 0) p.margin = Math.abs(p.margin)
    if (typeof p.route === 'string') p.route = t(`st.route.${p.route}`)
    return t(c.msgKey, p)
  }

  const tradeoff = (part: Part, choice: string): string[] => {
    const me = comp(part, choice)
    const alt = comp(part, other(part, choice))
    const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`)
    const lines = [t(`st.l1.trade.${part}.${choice}`)]
    lines.push(t('st.l1.delta', { cost: sign((me.cost as number) - (alt.cost as number)), mass: sign((me.mass as number) - (alt.mass as number)) }))
    if (part === 'lifeSupport' && choice === 'regenerative') lines.push(t('st.l1.side.regen', { load: LOADS.regenerative }))
    if (part === 'comms' && choice === 'redundant') lines.push(t('st.l1.side.redundant', { load: LOADS.commsRedundant }))
    if (part === 'propulsion' && choice === 'combined') lines.push(t('st.l1.side.combined', { load: LOADS.electricPropulsion }))
    return lines
  }

  const choose = <K extends Part>(part: K, choice: ShipConfig[K]) => {
    if (cfg[part] === choice || launching) return
    const prevRep = complete ? designReport(cfg as ShipConfig) : null
    const next = { ...cfg, [part]: choice } as Partial<ShipConfig>
    const nextComplete = PARTS.every(p => next[p])
    const nextRep = nextComplete ? designReport(next as ShipConfig) : null
    draft = next
    setCfg(next)
    setClunk(n => n + 1)

    let pose: AstronautPose = 'thumbs-up'
    let expr: AstronautExpression = 'happy'
    const lines: string[] = [t(`st.l1.quip.${part}.${choice}`)]
    if (nextRep) {
      const nf = nextRep.checks.filter(c => !c.ok).length
      const pf = prevRep ? prevRep.checks.filter(c => !c.ok).length : 0
      if (nf > pf) { pose = 'worried'; expr = 'worried'; lines.push(t('st.l1.say.worse')) }
      else if (prevRep && nf < pf) { pose = 'cheer'; lines.push(t('st.l1.say.better')) }
      if (nf > 0) { pose = 'worried'; expr = 'worried' }
    }
    if (easy) lines.push(...tradeoff(part, choice))
    setReact({ pose, expr, lines })
    timers.current.push(window.setTimeout(() => setReact(null), 6500))
    // move on to the next undecided system once the player picked in the current one
    if (!nextComplete) {
      const idx = PARTS.indexOf(part)
      const nxt = [...PARTS.slice(idx + 1), ...PARTS.slice(0, idx)].find(p => !next[p])
      if (nxt) timers.current.push(window.setTimeout(() => setActive(a => (a === part ? nxt : a)), 1300))
    }
  }

  const doLaunch = () => {
    if (!ready || launching) return
    setLaunching(true)
    setReact({ pose: 'cheer', expr: 'determined', lines: [t('st.l1.launching')] })
    timers.current.push(window.setTimeout(() => {
      const m = createMission(cfg as ShipConfig, difficulty)
      game.newMission(m)
      game.apply(launch(m), { toast: false })
      game.checkpoint('level2-start')
      game.go('launch')
    }, 1500))
  }

  // avatar + speech
  let pose: AstronautPose = 'idle'
  let expr: AstronautExpression = 'determined'
  let lines: string[]
  if (react) { pose = react.pose; expr = react.expr; lines = react.lines }
  else if (chosen === 0) { pose = 'point'; expr = 'happy'; lines = [t('st.l1.say.start')] }
  else if (!complete) { lines = [easy ? t('st.l1.say.partial', { n: chosen, left: PARTS.length - chosen }) : t('st.l1.say.hard')] }
  else if (ready) { pose = 'cheer'; expr = 'happy'; lines = [t('st.l1.say.ok')] }
  else { pose = 'worried'; expr = 'worried'; lines = [t('st.l1.say.bad', { n: fails.length })] }

  const budgetTone: Tone = calc.cost > PARAMS.budget ? 'bad' : calc.cost > PARAMS.budget * 0.9 ? 'warn' : 'ok'
  const massTone: Tone = calc.mass > PARAMS.launchMass ? 'bad' : calc.mass > PARAMS.launchMass * 0.9 ? 'warn' : 'ok'
  const needManeuver = PARAMS.outboundManeuver + PARAMS.insertionManeuver
  const v = {
    cost: rep?.cost ?? calc.cost, mass: rep?.mass ?? calc.mass,
    margin: rep?.powerMargin ?? calc.margin, maneuver: rep?.maneuver ?? calc.maneuver,
    autonomy: rep?.autonomyMonths ?? calc.autonomy,
    gen: rep?.powerGen ?? calc.gen, load: rep?.essentialLoad ?? calc.load,
  }
  const maxManeuver = Math.max(...CHOICES.propulsion.map(c => COMPONENTS.propulsion[c].maneuver))
  const maxAutonomy = Math.max(...CHOICES.lifeSupport.map(c => COMPONENTS.lifeSupport[c].vital / COMPONENTS.lifeSupport[c].rate))
  const maxGen = Math.max(...CHOICES.power.map(c => COMPONENTS.power[c].generation))

  const meters = (
    <>
      <StMeter icon="💰" label={t('st.l1.m.budget')} value={v.cost} max={Math.round(PARAMS.budget * 1.25)} marker={PARAMS.budget}
        markerLabel={t('st.l1.m.limit', { n: PARAMS.budget })} tone={budgetTone} sub={`${v.cost} / ${PARAMS.budget}`} />
      <StMeter icon="⚖️" label={t('st.l1.m.mass')} value={v.mass} max={Math.round(PARAMS.launchMass * 1.25)} marker={PARAMS.launchMass}
        markerLabel={t('st.l1.m.limit', { n: PARAMS.launchMass })} tone={massTone} sub={`${v.mass} / ${PARAMS.launchMass}`} />
      <StMeter icon="⚡" label={t('st.l1.m.power')} value={v.margin} max={maxGen}
        tone={v.margin !== null && v.margin < 0 ? 'bad' : v.margin !== null && v.margin < 10 ? 'warn' : 'ok'}
        sub={v.gen !== null ? t('st.l1.m.pow', { gen: v.gen, load: v.load }) : undefined} />
      <StMeter icon="🚀" label={t('st.l1.m.maneuver')} value={v.maneuver} max={maxManeuver} marker={needManeuver}
        markerLabel={t('st.l1.m.need', { n: needManeuver })} tone={v.maneuver !== null && v.maneuver < needManeuver ? 'bad' : 'ok'} />
      <StMeter icon="🫁" label={t('st.l1.m.autonomy')} value={v.autonomy} max={maxAutonomy}
        tone={rep && !rep.checks.find(c => c.id === 'autonomy')?.ok ? 'bad' : 'ok'}
        sub={v.autonomy !== null ? t('st.l1.m.months', { n: Math.round(v.autonomy) }) : undefined} />
    </>
  )

  const missing = PARTS.filter(p => !cfg[p]).map(p => t(`st.l1.part.${p}`)).join(', ')
  const launchHint = !complete ? t('st.l1.launch.blockedPick') : ready ? t('st.l1.launch.ready') : t('st.l1.launch.blockedFix', { n: fails.length })

  return (
    <ScreenFrame title={t('st.l1.title')} subtitle={t('st.l1.sub')}
      actions={<span className={`st-l1__mode st-l1__mode--${difficulty}`}>{easy ? "🌱" : "🔥"}<span className="st-l1__modetxt"> {t(`st.l1.mode.${difficulty}`)}</span></span>}>
      <SpaceBackdrop fixed density={0.8} />

      <div className="st-l1__mini" aria-hidden>
        <span className="st-mini st-mini--mode">{easy ? "🌱" : "🔥"}</span>
        <span className={`st-mini st-mini--${budgetTone}`}>💰 {v.cost}/{PARAMS.budget}</span>
        <span className={`st-mini st-mini--${massTone}`}>⚖️ {v.mass}/{PARAMS.launchMass}</span>
        <span className={`st-mini st-mini--${!complete ? 'idle' : ready ? 'ok' : 'bad'}`}>{!complete ? `${chosen}/5` : ready ? '✔' : `✖ ${fails.length}`}</span>
      </div>

      <div className="st-l1">
        {/* LEFT: systems */}
        <section className="panel st-l1__left" aria-label={t('st.l1.parts', { n: chosen })}>
          <h2 className="st-h">{t('st.l1.parts', { n: chosen })}</h2>
          <div className="st-tabs" role="tablist">
            {PARTS.map(p => (
              <button key={p} role="tab" title={t(`st.l1.part.${p}`)} aria-selected={active === p} className={`st-tab ${active === p ? 'is-active' : ''} ${cfg[p] ? 'is-done' : ''}`} onClick={() => setActive(p)}>
                <span className="st-tab__icon" aria-hidden>{ICON[p]}</span>
                <span className="st-tab__name">{t(`st.l1.part.${p}`)}</span>
                <span className="st-tab__val">{cfg[p] ? `✔ ${t(`st.l1.opt.${p}.${cfg[p]}`)}` : t('st.l1.empty')}</span>
              </button>
            ))}
          </div>

          <div className="st-cards" role="radiogroup" aria-label={t(`st.l1.part.${active}`)} key={active}>
            {CHOICES[active].map((choice, ci) => {
              const c = comp(active, choice)
              const on = cfg[active] === choice
              const cap = active === 'structure' ? t('st.l1.cap.structure', { loss: c.impactLoss as number })
                : active === 'propulsion' ? t('st.l1.cap.propulsion', { m: c.maneuver as number })
                : active === 'power' ? t('st.l1.cap.power', { g: c.generation as number })
                : active === 'lifeSupport' ? t('st.l1.cap.life', { v: c.vital as number, r: c.rate as number, months: (c.vital as number) / (c.rate as number) })
                : t(`st.l1.cap.comms.${choice}`)
              return (
                <button key={choice} type="button" role="radio" aria-checked={on} className={`st-card ${on ? 'is-on' : ''}`} style={{ ['--k' as string]: ci }}
                  onClick={() => choose(active, choice as never)}>
                  {on && <span className="st-card__stamp">{t('st.l1.installed')}</span>}
                  <span className="st-card__art" aria-hidden>{OPT_ICON[choice]}</span>
                  <span className="st-card__name">{t(`st.l1.opt.${active}.${choice}`)}</span>
                  <span className="st-card__chips">
                    <span className="st-chip st-chip--cost">💰 {c.cost as number}</span>
                    <span className="st-chip st-chip--mass">⚖️ {c.mass as number}</span>
                  </span>
                  <span className="st-card__cap">{cap}</span>
                  <span className="st-card__pro">+ {t(`st.l1.pro.${active}.${choice}`)}</span>
                  <span className="st-card__con">− {t(`st.l1.con.${active}.${choice}`)}</span>
                </button>
              )
            })}
          </div>

          <Explain key={`${active}-${difficulty}`} textKey={`st.l1.explain.${active}`} />
        </section>

        {/* CENTER: ship + avatar */}
        <section className="st-l1__center" aria-label="ship">
          <div className={`st-bay panel st-clunk-${clunk % 2} ${launching ? 'is-launching' : ''}`}>
            <div className="st-bay__grid" aria-hidden />
            {clunk > 0 && <div className="st-bay__flash" key={clunk} aria-hidden />}
            <div className="st-bay__ship">
              <Spaceship config={cfg} assembling thrust={launching ? 'both' : 'off'} width="100%" title="Spaceship" />
            </div>
            <div className="st-bay__chat">
              <div className="st-bay__avatar"><Astronaut config={avatar} pose={pose} expression={expr} size="100%" /></div>
              <Bubble tail="left" className="st-bay__bubble">
                {lines.map((l, i) => <p key={i} className={i === 0 ? 'st-bay__first' : 'st-bay__more'}>{l}</p>)}
              </Bubble>
            </div>
          </div>
          {easy && !react && <p className="st-l1__tip">💡 {fails.length > 0 && complete ? t('st.l1.tip.fix', { fix: t(`st.l1.fix.${fails[0].id}`) }) : t('st.l1.tip.easy')}</p>}
        </section>

        {/* RIGHT: meters, checks, actions */}
        <section className="panel st-l1__right" aria-label={t('st.l1.meters')}>
          <h2 className="st-h">{t('st.l1.meters')}</h2>
          <div className="st-meters">{meters}</div>

          <h2 className="st-h st-h--sm">{t('st.l1.checks')}</h2>
          {rep ? (
            <ul className="st-checks">
              {rep.checks.map(c => (
                <li key={c.id} className={c.ok ? 'is-ok' : 'is-bad'}>
                  <span className="st-checks__mark" aria-hidden>{c.ok ? '✔' : '✖'}</span>
                  <span>{fmt(c)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="st-checks__wait">{t('st.l1.checks.wait')}</p>}

          <div className="st-l1__actions">
            <button className="btn btn--orange" onClick={() => setReport(true)}>📋 {t('st.l1.eval')}</button>
            <button className={`btn btn--green st-launch ${ready ? 'is-ready' : ''}`} disabled={!ready || launching} onClick={doLaunch} aria-describedby="st-launch-hint">
              🚀 {launching ? t('st.l1.launching') : t('st.l1.launch')}
            </button>
            <p id="st-launch-hint" className={`st-l1__hint ${ready ? 'is-ok' : ''}`}>{launchHint}</p>
          </div>
        </section>
      </div>

      {report && (
        <div className="st-modal" role="dialog" aria-modal="true" aria-labelledby="st-rep-t" onClick={e => { if (e.target === e.currentTarget) setReport(false) }}>
          <div className="panel st-modal__card st-rep">
            <h2 id="st-rep-t" className="title st-rep__title">{t('st.l1.report.title')}</h2>
            {!rep ? (
              <p className="st-rep__lead">{t('st.l1.report.incomplete', { list: missing })}</p>
            ) : (
              <>
                <p className={`st-rep__lead ${ready ? 'is-ok' : 'is-bad'}`}>{ready ? t('st.l1.report.ok') : t('st.l1.report.bad', { n: fails.length })}</p>
                <ul className="st-rep__list">
                  {rep.checks.map(c => (
                    <li key={c.id} className={c.ok ? 'is-ok' : 'is-bad'}>
                      <div className="st-rep__row"><span className="st-checks__mark" aria-hidden>{c.ok ? '✔' : '✖'}</span><b>{fmt(c)}</b></div>
                      <p className="st-rep__why"><i>{t('st.l1.report.why')}:</i> {t(`st.l1.why.${c.id}`)}</p>
                      {!c.ok && <p className="st-rep__fix">🔧 {t('st.l1.tip.fix', { fix: t(`st.l1.fix.${c.id}`) })}</p>}
                    </li>
                  ))}
                </ul>
                <p className="st-rep__note">{t('st.l1.report.note')}</p>
              </>
            )}
            <button className="btn btn--yellow" autoFocus onClick={() => setReport(false)}>{t('st.l1.report.close')}</button>
          </div>
        </div>
      )}
    </ScreenFrame>
  )
}
