// Level 3 — Return to Earth: Titan assist choice, route selection, animated transit.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useT } from '../../i18n'
import { game, getGame, useGame } from '../../game/store'
import { Explain, Hud, Meter, ScreenFrame } from '../../game/ui'
import { executeReturn, routeOptions, titanAvailability } from '../../engine/engine'
import { PARAMS, ROUTES } from '../../engine/data'
import type { ActionResult, MissionState, RouteId, RouteOption } from '../../engine/types'
import { Saturn, SolarSystemMap, SpaceBackdrop, Titan, usePrefersReducedMotion, type MapRoute } from '../../art/worlds'
import { Spaceship } from '../../art/ships'
import { drainers, r1, useTP } from './helpers'
import './level3.css'

const ROUTE_IDS: RouteId[] = ['fast', 'balanced', 'slow']
const ROUTE_COLOR: Record<RouteId, string> = { fast: '#F46AA7', balanced: '#38D9D0', slow: '#FFD447' }

function Bar({ have, need, ok }: { have: number; need: number; ok: boolean }) {
  const pct = Math.max(0, Math.min(100, (have / Math.max(1, need)) * 100))
  return (
    <div className={`l3-bar ${ok ? 'is-ok' : 'is-bad'}`} aria-hidden>
      <div className="l3-bar__fill" style={{ width: `${pct}%` }} />
    </div>
  )
}

function RouteCard({ o, selected, onPick, mission }: { o: RouteOption; selected: boolean; onPick: () => void; mission: MissionState }) {
  const t = useT()
  const tp = useTP()
  const prep = o.useTitan ? PARAMS.titanPrep : 0
  const manFail = o.failing.some(f => f.variable === 'maneuver')
  const vitFail = o.failing.some(f => f.variable === 'vital')
  return (
    <div
      role="radio"
      aria-checked={selected}
      aria-disabled={!o.feasible}
      tabIndex={0}
      className={`l3-card ${selected ? 'is-selected' : ''} ${o.feasible ? '' : 'is-blocked'}`}
      style={{ '--rc': ROUTE_COLOR[o.id] } as React.CSSProperties}
      onClick={() => o.feasible && onPick()}
      onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && o.feasible) { e.preventDefault(); onPick() } }}
    >
      <div className="l3-card__head">
        <span className="l3-card__dot" />
        <h3>{t(`l3.route.${o.id}.name`)}</h3>
        <span className={`l3-tag ${o.feasible ? 'is-ok' : 'is-bad'}`}>{o.feasible ? t('l3.card.ok') : t('l3.card.blocked')}</span>
      </div>
      <p className="l3-card__desc">{t(`l3.route.${o.id}.desc`)}</p>
      <dl className="l3-card__rows">
        <div><dt>{t('l3.card.duration')}</dt><dd className="l3-big">{t('l3.card.months', { m: o.months })}</dd></div>
        <div>
          <dt>{t('l3.card.maneuver')}</dt>
          <dd className={manFail ? 'l3-bad' : ''}><span className="l3-big">{r1(o.maneuverNeeded)}</span> <small>{t('l3.card.have', { n: r1(mission.maneuver) })}</small></dd>
          <Bar have={mission.maneuver} need={o.maneuverNeeded} ok={!manFail} />
          <small className="l3-sub">{prep ? t('l3.card.maneuver.calcTitan', { burn: o.effectiveManeuver, prep, reserve: PARAMS.minManeuverReserve }) : t('l3.card.maneuver.calc', { burn: o.effectiveManeuver, reserve: PARAMS.minManeuverReserve })}</small>
        </div>
        <div>
          <dt>{t('l3.card.vital')}</dt>
          <dd className={vitFail ? 'l3-bad' : ''}><span className="l3-big">{r1(o.vitalNeeded)}</span> <small>{t('l3.card.have', { n: r1(mission.vital) })}</small></dd>
          <Bar have={mission.vital} need={o.vitalNeeded} ok={!vitFail} />
          <small className="l3-sub">{t('l3.card.vital.calc', { months: o.months, rate: mission.vitalRate, reserve: PARAMS.minVitalReserve })}</small>
        </div>
        <div>
          <dt>{t('l3.card.after')}</dt>
          <dd>
            <span className={o.maneuverAfter < PARAMS.minManeuverReserve ? 'l3-bad' : ''}>🚀 {r1(o.maneuverAfter)}</span>
            {' · '}
            <span className={o.vitalAfter < PARAMS.minVitalReserve ? 'l3-bad' : ''}>🫁 {r1(o.vitalAfter)}</span>
          </dd>
        </div>
      </dl>
      {!o.feasible && (
        <ul className="l3-card__fails">
          {o.failing.map(f => <li key={f.variable + f.msgKey}>⚠️ {tp(f.msgKey, f.params)}</li>)}
        </ul>
      )}
    </div>
  )
}

function transitLog(p: number, titan: boolean): string {
  if (p < 0.12) return titan ? 'l3.transit.burnTitan' : 'l3.transit.burn'
  if (p < 0.9) return 'l3.transit.cruise'
  if (p < 1) return 'l3.transit.approach'
  return 'l3.transit.arrived'
}

export function Level3() {
  const t = useT()
  const tp = useTP()
  const { mission, difficulty, checkpoints } = useGame()
  const reduced = usePrefersReducedMotion()
  const [wantTitan, setWantTitan] = useState(false)
  const [sel, setSel] = useState<RouteId | null>(null)
  const [transit, setTransit] = useState<{ before: MissionState; result: ActionResult } | null>(null)
  const [p, setP] = useState(0)
  const raf = useRef(0)
  const easy = difficulty === 'easy'

  const av = mission ? titanAvailability(mission) : null
  const titanOn = wantTitan && !!av?.available
  const opts = useMemo(() => (mission && !mission.route ? routeOptions(mission, titanOn) : []), [mission, titanOn])
  const anyWithout = useMemo(() => (mission && !mission.route ? routeOptions(mission, false).some(o => o.feasible) : false), [mission])
  const anyWith = useMemo(() => (mission && !mission.route && av?.available ? routeOptions(mission, true).some(o => o.feasible) : false), [mission, av?.available])
  const deadEnd = !!mission && !mission.route && !anyWithout && !anyWith

  // Learning checkpoint at the start of the level (only when there is something to play).
  useEffect(() => {
    const g = getGame()
    if (!g.mission) { game.go('menu'); return }
    if (!g.mission.route && g.mission.phase === 'return' && !g.checkpoints.some(c => c.level === 3) && !deadEnd) game.checkpoint('Level 3 start')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Transit animation (ship marker + month counter + resources ticking down).
  useEffect(() => {
    if (!transit) return
    if (reduced) { setP(1); return }
    const start = performance.now()
    const dur = 8000
    const tick = (now: number) => {
      const v = Math.min(1, (now - start) / dur)
      setP(v)
      if (v < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [transit, reduced])

  if (!mission) return null

  const confirm = () => {
    const chosen = opts.find(o => o.id === sel && o.feasible)
    if (!chosen) return
    const before = mission
    const result = executeReturn(mission, chosen.id, titanOn)
    if (!result.ok) { game.apply(result); return }
    game.apply(result, { toast: false })
    setP(0)
    setTransit({ before, result })
  }

  // ---------------------------------------------------------------- transit / completed view
  const finishedState = mission.route && (transit || mission.phase === 'return')
  if (finishedState) {
    const before = transit?.before ?? mission
    const after = mission
    const prog = transit ? p : 1
    const routeId = mission.route as RouteId
    const done = prog >= 1
    const live: MissionState = {
      ...after,
      monthsElapsed: Math.round(before.monthsElapsed + (after.monthsElapsed - before.monthsElapsed) * prog),
      maneuver: r1(before.maneuver - (before.maneuver - after.maneuver) * Math.min(1, prog / 0.12)),
      vital: r1(before.vital - (before.vital - after.vital) * prog),
    }
    const routes: MapRoute[] = [{ id: routeId, color: ROUTE_COLOR[routeId], highlighted: true }]
    return (
      <ScreenFrame title={t('l3.title')} subtitle={t('l3.transit.sub')}>
        <SpaceBackdrop fixed warp={done ? 0 : 0.35} />
        <div className="l3-wrap">
          <Hud mission={live} compact />
          <section className="panel l3-stage l3-transit">
            <div className="l3-transit__map">
              <SolarSystemMap routes={routes} activeRoute={routeId} progress={prog} showTitanFlyby={mission.titanAssist} note={t('l3.map.note')} labels={{ sun: t('l3.map.sun'), earth: t('l3.map.earth'), saturn: t('l3.map.saturn'), titan: 'Titan' }} />
            </div>
            <div className="l3-transit__side">
              <div className="l3-clock" aria-live="off">
                <span className="l3-clock__n">{live.monthsElapsed}</span>
                <span className="l3-clock__l">{t('l3.transit.month', { total: after.monthsElapsed })}</span>
              </div>
              <div className="l3-ship"><Spaceship config={mission.config} thrust={prog < 0.12 ? (mission.config.propulsion === 'combined' ? 'both' : 'chemical') : mission.config.propulsion === 'combined' ? 'ion' : 'off'} width="100%" title="ship" /></div>
              <p className="l3-log" aria-live="polite">{t(transitLog(prog, mission.titanAssist))}</p>
              <Meter icon="🚀" label={t('hud.maneuver')} value={live.maneuver} max={115} warnBelow={40} dangerBelow={20} />
              <Meter icon="🫁" label={t('hud.vital')} value={live.vital} max={130} warnBelow={40} dangerBelow={16} />
              {!done && <button className="btn btn--metal" onClick={() => { cancelAnimationFrame(raf.current); setP(1) }}>{t('common.skip')}</button>}
            </div>
          </section>
          {done && (
            <section className="panel l3-stage l3-done">
              <h2 className="l3-h2">{t('l3.transit.done')}</h2>
              <p>{transit ? tp(transit.result.msgKey, transit.result.params) : t('l3.transit.doneSaved')}</p>
              {transit?.result.explanationKey && <Explain textKey={transit.result.explanationKey} />}
              <p className="l3-note">{t('l3.transit.next')}</p>
              <button className="btn btn--yellow l3-go" onClick={() => game.go('reentry')}>{t('l3.transit.cta')} ▶</button>
            </section>
          )}
        </div>
      </ScreenFrame>
    )
  }

  if (mission.phase !== 'return') {
    return (
      <ScreenFrame title={t('l3.title')} subtitle={t('l3.sub')}>
        <SpaceBackdrop fixed />
        <div className="panel l3-stage l3-wrap l3-center">
          <p>{t('l3.notReady')}</p>
          <button className="btn btn--yellow" onClick={() => game.go(mission.phase === 'closing' ? 'report' : 'menu')}>{mission.phase === 'closing' ? t('l3.dead.report') : t('common.menu')}</button>
        </div>
      </ScreenFrame>
    )
  }

  // ---------------------------------------------------------------- dead end
  if (deadEnd) return <DeadEnd mission={mission} checkpoints={checkpoints.length} />

  // ---------------------------------------------------------------- planning
  const routes: MapRoute[] = ROUTE_IDS.map(id => ({ id, color: ROUTE_COLOR[id], highlighted: sel === id, dashed: id === 'slow' }))
  const chosen = opts.find(o => o.id === sel && o.feasible)
  const titanBackfires = titanOn && !opts.some(o => o.feasible) && anyWithout
  return (
    <ScreenFrame title={t('l3.title')} subtitle={t('l3.sub')}>
      <SpaceBackdrop fixed />
      <div className="l3-wrap">
        <Hud mission={mission} compact />

        {/* ---- stage 1 */}
        <section className="panel l3-stage" aria-labelledby="l3-s1">
          <header className="l3-stage__head"><span className="l3-num">1</span><h2 id="l3-s1" className="l3-h2">{t('l3.s1.title')}</h2></header>
          <div className="l3-s1">
            <div className="l3-s1__art" aria-hidden>
              <Saturn size="100%" tilt={22} />
              <div className="l3-s1__titan"><Titan size="100%" /></div>
              <svg className="l3-s1__arc" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M0,90 Q40,95 70,55 T100,8" /></svg>
              <div className="l3-s1__ship"><Spaceship config={mission.config} width="100%" title="ship" /></div>
            </div>
            <div className="l3-s1__body">
              <p>{t('l3.s1.intro')}</p>
              <div className="l3-math">
                <div><b>−{PARAMS.titanPrep}</b><span>{t('l3.s1.prep')}</span></div>
                <div><b>+{PARAMS.titanSaving}</b><span>{t('l3.s1.save')}</span></div>
                <div className="is-net"><b>+{PARAMS.titanSaving - PARAMS.titanPrep}</b><span>{t('l3.s1.net')}</span></div>
              </div>
              <div className="l3-toggle" role="radiogroup" aria-label={t('l3.s1.title')}>
                <button role="radio" aria-checked={!titanOn} className={`l3-opt ${!titanOn ? 'is-on' : ''}`} onClick={() => setWantTitan(false)}>
                  <b>{t('l3.s1.direct')}</b><span>{t('l3.s1.direct.d')}</span>
                </button>
                <button role="radio" aria-checked={titanOn} aria-disabled={!av?.available} disabled={!av?.available} className={`l3-opt ${titanOn ? 'is-on' : ''}`} onClick={() => setWantTitan(true)}>
                  <b>🪐 {t('l3.s1.assist')}</b><span>{t('l3.s1.assist.d')}</span>
                </button>
              </div>
              {av && !av.available && av.reasonKey && <div className="l3-warn" role="alert">🔒 {tp(av.reasonKey, av.params)}</div>}
              {titanOn && <div className="l3-note">🧭 {t('l3.s1.geometry')}</div>}
              {titanBackfires && <div className="l3-warn" role="alert">⚠️ {t('l3.s1.backfire')}</div>}
              <Explain textKey="l3.s1.why" />
            </div>
          </div>
        </section>

        {/* ---- stage 2 */}
        <section className="panel l3-stage" aria-labelledby="l3-s2">
          <header className="l3-stage__head"><span className="l3-num">2</span><h2 id="l3-s2" className="l3-h2">{t('l3.s2.title')}</h2></header>
          <p className="l3-lead">{t('l3.s2.intro')}</p>
          <div className="l3-map">
            <SolarSystemMap routes={routes} activeRoute={sel ?? undefined} showTitanFlyby={titanOn} note={t('l3.map.note')} labels={{ sun: t('l3.map.sun'), earth: t('l3.map.earth'), saturn: t('l3.map.saturn'), titan: 'Titan' }} />
            <ul className="l3-legend">{ROUTE_IDS.map(id => <li key={id}><i style={{ background: ROUTE_COLOR[id] }} />{t(`l3.route.${id}.name`)} · {t('l3.card.months', { m: ROUTES[id].months })}</li>)}</ul>
          </div>
          <div className="l3-cards" role="radiogroup" aria-label={t('l3.s2.title')}>
            {opts.map(o => <RouteCard key={o.id} o={o} mission={mission} selected={sel === o.id && o.feasible} onPick={() => setSel(o.id)} />)}
          </div>
          {easy && <div className="l3-note">💡 {t('l3.s2.hint')}</div>}
          <Explain textKey="l3.s2.why" />
          <div className="l3-confirm">
            <p className="l3-confirm__txt">
              {chosen
                ? t('l3.confirm.preview', { route: t(`l3.route.${chosen.id}.name`), months: chosen.months, man: r1(chosen.maneuverAfter), vit: r1(chosen.vitalAfter) })
                : t('l3.confirm.pick')}
            </p>
            <button className="btn btn--orange l3-go" disabled={!chosen} onClick={confirm}>{t('l3.confirm.cta')} 🚀</button>
          </div>
        </section>
      </div>
    </ScreenFrame>
  )
}

function DeadEnd({ mission, checkpoints }: { mission: MissionState; checkpoints: number }) {
  const t = useT()
  const tp = useTP()
  const { checkpoints: cps } = useGame()
  const base = routeOptions(mission, false)
  // The "closest" failure per variable (smallest shortfall), so the player sees how far from a way home they were.
  const vars = new Map<string, { msgKey: string; params: Record<string, string | number | boolean> }>()
  for (const o of base) for (const f of o.failing) {
    const prev = vars.get(f.variable)
    const short = Number(f.params.short ?? 0)
    if (!prev || short < Number(prev.params.short ?? 1e9)) vars.set(f.variable, { msgKey: f.msgKey, params: f.params })
  }
  const causeFields: Array<'maneuver' | 'vital' | 'structure'> = []
  if (vars.has('maneuver')) causeFields.push('maneuver')
  if (vars.has('vital')) causeFields.push('vital')
  if (vars.has('safety')) causeFields.push('structure')
  const restorable = game.canRestore() && checkpoints > 0
  const restore = () => {
    // Prefer a Level 2 decision point: the level 3 checkpoint would land in the same dead end.
    let idx = -1
    cps.forEach((c, i) => { if (c.level < 3) idx = i })
    game.restore(idx >= 0 ? idx : undefined)
  }
  return (
    <ScreenFrame title={t('l3.title')} subtitle={t('l3.dead.sub')} alarm>
      <SpaceBackdrop fixed tint="alarm" />
      <div className="l3-wrap">
        <Hud mission={mission} compact />
        <section className="panel l3-stage l3-dead">
          <h2 className="l3-h2">🛑 {t('l3.dead.title')}</h2>
          <p>{t('l3.dead.intro')}</p>
          <h3>{t('l3.dead.what')}</h3>
          <ul className="l3-card__fails">{[...vars.entries()].map(([k, v]) => <li key={k}>⚠️ {tp(v.msgKey, v.params)}</li>)}</ul>
          <h3>{t('l3.dead.why')}</h3>
          {causeFields.length === 0 && <p>{t('l3.dead.lesson.other')}</p>}
          {causeFields.map(f => (
            <div key={f} className="l3-cause">
              <p><b>{t(`l3.dead.lesson.${f}`)}</b></p>
              <ul>
                {drainers(mission.history, f).map(({ entry, score }) => (
                  <li key={entry.seq}><span className="l3-chip">{t('l3.month', { m: entry.month })}</span> {tp(entry.key, entry.params)} <b className="l3-bad">−{r1(score)}</b></li>
                ))}
              </ul>
            </div>
          ))}
          <p className="l3-note">{t('l3.dead.rule')}</p>
          <div className="l3-actions">
            {restorable && <button className="btn btn--green" onClick={restore}>↩ {t('common.restore')}</button>}
            <button className="btn btn--yellow" onClick={() => game.restart()}>{t('common.retry')}</button>
            <button className="btn btn--metal" onClick={() => game.go('report')}>{t('l3.dead.report')}</button>
          </div>
        </section>
      </div>
    </ScreenFrame>
  )
}
