// LEVEL 2: Survival at Saturn. All rules come from the engine; this file only drives the flow and the feedback.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Explain, Hud, Icon, ScreenFrame, Squiggle, type IconName } from '../../game/ui'
import { game, useGame } from '../../game/store'
import { EMERGENCY_ORDER } from '../../engine/data'
import {
  finishSaturn, getEmergency, nextEmergencyId, repairSystem, resolveEmergency, runInvestigation, setLoad, transmitData, triggerEmergency,
} from '../../engine/engine'
import type {
  ActionResult, EmergencyId, EmergencyOption, EmergencyStatus, InvestigationId, LoadId, MissionState, Params, SpareId, SystemId,
} from '../../engine/types'
import type { AstronautExpression, AstronautPose } from '../../avatar'
import { useT } from '../../i18n'
import { Stage } from './Stage'
import { Board } from './Board'
import { EM_ICON, Failure, P, Report } from './Views'
import './level2.css'

interface OutcomeView {
  id: EmergencyId
  optionId: string
  success: boolean
  closed: boolean
  msgKey: string
  params: Params
  explanationKey: string
  status: EmergencyStatus
  month: number
  deltas: { key: string; d: number }[]
}

function deltas(a: MissionState, b: MissionState): { key: string; d: number }[] {
  const sum = (m: MissionState) => m.spares.structural + m.spares.lifeSupport + m.spares.electronic
  const pairs: [string, number, number][] = [
    ['vital', a.vital, b.vital], ['battery', a.battery, b.battery], ['structure', a.structure, b.structure],
    ['maneuver', a.maneuver, b.maneuver], ['radiation', a.radiation, b.radiation], ['generation', a.powerGeneration, b.powerGeneration],
    ['spares', sum(a), sum(b)], ['equipment', a.equipment, b.equipment],
  ]
  return pairs.map(([key, x, y]) => ({ key, d: Math.round((y - x) * 100) / 100 })).filter((x) => x.d !== 0)
}

const levelStamp = (t: (k: string) => string) => <span className="stamp stamp--flat">{t('l2.stamp.level')}</span>

export default function Level2() {
  const { mission, avatar } = useGame()
  const t = useT()
  if (!mission || mission.phase === 'design' || mission.phase === 'transit') {
    return (
      <ScreenFrame title={t('l2.title')} actions={levelStamp(t)}>
        <div className="l2-wrap"><div className="panel l2-empty">
          <p>{t('l2.noMission')}</p>
          <button className="btn btn--yellow" onClick={() => game.go('level1')}>{t('l2.toLevel1')}</button>
        </div></div>
      </ScreenFrame>
    )
  }
  if (mission.phase === 'return' && !mission.route) return <Report mission={mission} avatar={avatar} />
  if (mission.phase === 'closing' && !mission.route) return <Failure mission={mission} avatar={avatar} />
  if (mission.phase === 'return' || mission.phase === 'closing') {
    return (
      <ScreenFrame title={t('l2.title')} actions={levelStamp(t)}>
        <div className="l2-wrap"><div className="panel l2-empty">
          <p>{t('l2.finished')}</p>
          <button className="btn btn--yellow" onClick={() => game.go('report')}>{t('l2.toReport')}</button>
        </div></div>
      </ScreenFrame>
    )
  }
  return <Ops mission={mission} />
}

function Ops({ mission }: { mission: MissionState }) {
  const t = useT()
  const { avatar, difficulty } = useGame()
  const easy = difficulty === 'easy'
  const [outcome, setOutcome] = useState<OutcomeView | null>(null)
  const [last, setLast] = useState<'science' | 'sent' | 'fixed' | null>(null)
  const [fx, setFx] = useState({ shake: 0, streak: 0, scan: 0, tx: 0, fix: 0, bad: 0 })
  const bump = (...k: (keyof typeof fx)[]) => setFx((f) => { const n = { ...f }; for (const x of k) n[x] += 1; return n })
  const consoleRef = useRef<HTMLDivElement>(null)

  const active = mission.activeEmergency
  const nextId = nextEmergencyId(mission)
  const monthsDone = mission.saturnMonth
  const allDone = monthsDone >= EMERGENCY_ORDER.length && !active

  // Keep the decision area in view when something happens (important on phones).
  useEffect(() => {
    if (active || outcome) consoleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [active, outcome])

  /** Show engine refusals with their real reason (the toast component cannot translate nested reason keys). */
  const act = (r: ActionResult, effect?: () => void, opts: { toast?: boolean } = {}): boolean => {
    if (r.state === mission) {
      const rk = r.params.reasonKey
      if (typeof rk === 'string') game.toast('bad', rk, P(r.params, t) as Params)
      else game.toast('bad', r.msgKey, P(r.params, t) as Params)
      return false
    }
    if (r.msgKey === 'engine.load.deficit') {
      game.apply(r, { toast: false })
      game.toast('info', r.msgKey, P(r.params, t) as Params, r.explanationKey)
    } else game.apply(r, opts)
    effect?.()
    return true
  }

  const start = () => {
    const n = monthsDone + 1
    game.checkpoint(`month-${n}`)
    const r = triggerEmergency(mission)
    if (!act(r, undefined, { toast: false })) return
    setOutcome(null)
    setLast(null)
    bump('shake')
    if (nextId === 'impact') bump('streak')
  }

  const choose = (opt: EmergencyOption) => {
    if (!active) return
    const before = mission
    const { state, outcome: o } = resolveEmergency(before, active, opt.id)
    if (state === before) {
      game.toast('bad', typeof o.params.reasonKey === 'string' ? o.params.reasonKey : o.msgKey, P(o.params, t) as Params)
      return
    }
    game.apply({ state, ok: o.success, msgKey: o.msgKey, params: o.params, explanationKey: o.explanationKey }, { toast: false })
    setOutcome({
      id: active,
      optionId: opt.id,
      success: o.success,
      closed: o.closed,
      msgKey: o.msgKey,
      params: o.params,
      explanationKey: o.explanationKey,
      status: state.emergencies[active].status,
      month: state.saturnMonth,
      deltas: deltas(before, state),
    })
    if (o.success && (o.closed ? state.emergencies[active].status !== 'unresolved' : false)) {
      bump('fix')
      setLast('fixed')
    } else if (!o.success || state.emergencies[active].status === 'unresolved') bump('bad', 'shake')
  }

  const restore = () => {
    game.restore()
    setOutcome(null)
    setLast(null)
  }

  const finish = () => {
    const r = finishSaturn(mission)
    game.apply(r, { toast: false })
  }

  // ---- Mission board actions
  const doRun = (id: InvestigationId) => act(runInvestigation(mission, id), () => { bump('scan'); setLast('science') })
  const doTx = () => act(transmitData(mission), () => { bump('tx'); setLast('sent') })
  const doLoad = (l: LoadId, on: boolean) => act(setLoad(mission, l, on))
  const doRepair = (s: SystemId, sp: SpareId) => act(repairSystem(mission, s, sp), () => { bump('fix'); setLast('fixed') })

  // ---- Derived presentation
  const view = useMemo(() => (active ? getEmergency(mission, active) : null), [mission, active])
  const shownId: EmergencyId | null = outcome ? outcome.id : active
  const bad = outcome ? !outcome.success : false
  const pose: AstronautPose = outcome
    ? outcome.success ? (outcome.closed && outcome.status !== 'unresolved' ? 'cheer' : 'thumbs-up') : 'worried'
    : active ? 'worried' : last === 'science' ? 'point' : last === 'fixed' ? 'thumbs-up' : 'idle'
  const expression: AstronautExpression = outcome
    ? outcome.success ? 'happy' : 'worried'
    : active ? (active === 'impact' || active === 'radiation' ? 'surprised' : 'worried') : last ? 'happy' : 'determined'
  const bubble = outcome
    ? t(`l2.crew.${outcome.id}.${outcome.success ? 'good' : 'bad'}`)
    : active ? t(`l2.crew.${active}.alarm`)
    : last === 'science' ? t('l2.crew.science')
    : last === 'sent' ? t('l2.crew.sent')
    : last === 'fixed' ? t('l2.crew.fixed')
    : allDone ? t('l2.crew.done')
    : t(`l2.crew.calm.${monthsDone % 4}`)
  const screenText = allDone ? t('l2.screen.done') : nextId && monthsDone > 0 ? t('l2.screen.next', { n: monthsDone + 1 }) : t('l2.screen.ok')
  const alarmId = active

  const showUndo = easy && !!outcome && (bad || outcome.status === 'unresolved' || outcome.status === 'partial') && game.canRestore()

  return (
    <ScreenFrame title={t('l2.title')} subtitle={t('l2.subtitle')} alarm={!!active} actions={levelStamp(t)}>
      <div className={`l2-wrap ${active ? 'is-alarm' : ''}`}>
        <Hud mission={mission} compact />
        <div className="l2-main">
          <div className="l2-left">
            <Stage
              mission={mission}
              avatar={avatar}
              alarmId={alarmId}
              pose={pose}
              expression={expression}
              bubble={bubble}
              screenText={screenText}
              {...fx}
            />
            <Timeline mission={mission} activeId={active} />
            <div className="l2-console" ref={consoleRef}>
              {outcome ? (
                <OutcomeCard
                  key={`${outcome.id}-${outcome.optionId}-${mission.history.length}`}
                  o={outcome}
                  showUndo={showUndo}
                  onUndo={restore}
                  onContinue={() => setOutcome(null)}
                />
              ) : active && view ? (
                <EmergencyCard key={`${active}-${view.step}-${mission.history.length}`} mission={mission} view={view} easy={easy} onChoose={choose} />
              ) : allDone ? (
                <section className="l2-card l2-card--calm">
                  <h2 className="title l2-card__title">{t('l2.finish.title')}</h2>
                  <p>{t('l2.finish.sub')}</p>
                  <button className="btn btn--yellow l2-big" onClick={finish}>{t('l2.finish')} <Icon name="go" size={28} /></button>
                </section>
              ) : (
                <section className="l2-card l2-card--calm">
                  <h2 className="title l2-card__title">{t('l2.calm.title', { n: monthsDone + 1 })}</h2>
                  <p>{easy ? t('l2.calm.hint') : t('l2.calm.hintHard')}</p>
                  <button className="btn btn--orange l2-big" onClick={start}>{t('l2.start', { n: monthsDone + 1 })}</button>
                </section>
              )}
            </div>
          </div>
          <Board mission={mission} locked={!!active} hints={easy} onRun={doRun} onTransmit={doTx} onLoad={doLoad} onRepair={doRepair} />
        </div>
      </div>
      <span className="sr-only" aria-live="polite">{shownId ? t(`engine.em.${shownId}.title`) : ''}</span>
    </ScreenFrame>
  )
}

function Timeline({ mission, activeId }: { mission: MissionState; activeId: EmergencyId | null }) {
  const t = useT()
  return (
    <ol className="l2-timeline" aria-label={t('l2.tl.title')}>
      {EMERGENCY_ORDER.map((id, i) => {
        const st = mission.emergencies[id].status
        const current = i === mission.saturnMonth
        const cls = st === 'resolved' ? 'ok' : st === 'partial' ? 'partial' : st === 'unresolved' ? 'bad' : current ? 'current' : 'pending'
        const mark: IconName | null = st === 'resolved' ? 'ok' : st === 'partial' ? 'warning' : st === 'unresolved' ? 'fail' : null
        return (
          <li key={id} className={`l2-node l2-node--${cls} ${activeId === id ? 'is-active' : ''}`} aria-current={current ? 'step' : undefined}>
            <span className="l2-node__dot" aria-hidden><Icon name={EM_ICON[id]} size={26} />{mark && <i><Icon name={mark} size={20} /></i>}</span>
            <span className="l2-node__label">{t('l2.month', { n: i + 1 })}<small>{t(`l2.em.${id}`)}</small><small className="l2-node__st">{t(`l2.status.${st}`)}</small></span>
          </li>
        )
      })}
    </ol>
  )
}

/** Stable pseudo-shuffle so the "right" answer is not always in the same slot (engine order is by procedure, not by quality). */
function shuffled(list: EmergencyOption[], seed: string): EmergencyOption[] {
  const h = (str: string) => { let x = 0; for (const c of str) x = (x * 31 + c.charCodeAt(0)) % 9973; return x }
  return [...list].sort((a, b) => h(a.id + seed) - h(b.id + seed))
}

function CostChips({ o }: { o: EmergencyOption }) {
  const t = useT()
  const c = o.costs
  const chips: { icon?: IconName; text: string }[] = []
  if (c.battery) chips.push({ icon: 'battery', text: t('l2.cost.battery', { n: c.battery }) })
  if (c.vital) chips.push({ icon: 'life-support', text: t('l2.cost.vital', { n: c.vital }) })
  if (c.spare) chips.push({ icon: 'spare-kit', text: t('l2.cost.spare', { spare: t(`l2.spare.${c.spare}`) }) })
  if (c.turn) chips.push({ icon: 'turn', text: t('l2.cost.turn') })
  if (!chips.length) chips.push({ text: t('l2.cost.free') })
  return <div className="l2-chips">{chips.map((x) => <span key={x.text} className="chip">{x.icon && <Icon name={x.icon} size={18} />}{x.text}</span>)}</div>
}

function EmergencyCard({ mission, view, easy, onChoose }: { mission: MissionState; view: ReturnType<typeof getEmergency>; easy: boolean; onChoose: (o: EmergencyOption) => void }) {
  const t = useT()
  const prog = mission.emergencies[view.id]
  const step = view.id === 'power' ? t('l2.step.turn', { turn: prog.turn + 1, turns: 3 })
    : view.id === 'thermal' && Number(prog.data.heated) > 0 ? t('l2.step.heat', { heated: Number(prog.data.heated) + 1, turns: 2 })
    : t(`l2.step.${view.step}`)
  return (
    <section className="l2-incident surface-paper surface-paper--tape" aria-labelledby="l2-em-title">
      <div className="l2-incident__stripe" aria-hidden />
      <div className="l2-incident__top">
        <span className="stamp stamp--red"><Icon name="siren" size={18} />{t('l2.inc.title')}</span>
        <span className="label l2-incident__meta">{t('l2.month', { n: mission.saturnMonth + 1 })}</span>
        <span className="label l2-incident__meta">{step}</span>
      </div>
      <div className="l2-incident__head">
        <Icon name={EM_ICON[view.id]} size={52} />
        <h2 id="l2-em-title" className="paper-title l2-incident__title">{t(view.titleKey)}</h2>
      </div>
      <p className="l2-situation">{t(view.situationKey)}</p>
      <p className="l2-delay fine"><Icon name="light-delay" size={20} /> {t('l2.delay')}</p>
      <Explain title={t(`l2.note.${view.id}`)} textKey={view.scienceKey} tilt={0} />
      {easy && <p className="l2-hint"><span className="stamp stamp--yellow l2-hint__stamp"><Icon name="hint" size={16} />{t('l2.stamp.hint')}</span> {t(`l2.hint.${view.id}`)}</p>}
      <h3 className="l2-choose squiggled">{t('l2.choose')}<Squiggle /></h3>
      <ul className="l2-options">
        {shuffled(view.options, `${view.id}-${view.step}`).map((o) => (
          <li key={o.id}>
            <button className="l2-opt" disabled={!o.available} onClick={() => onChoose(o)}>
              <b>{t(o.labelKey)}</b>
              <span>{t(o.descKey)}</span>
              <CostChips o={o} />
              {!o.available && o.reasonKey && <em className="l2-opt__reason"><Icon name="lock" size={18} />{t('l2.locked', { reason: t(o.reasonKey, P(o.reasonParams ?? {}, t)) })}</em>}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function OutcomeCard({ o, showUndo, onUndo, onContinue }: { o: OutcomeView; showUndo: boolean; onUndo: () => void; onContinue: () => void }) {
  const t = useT()
  const title = o.closed
    ? o.status === 'resolved' ? 'fixed' : o.status === 'partial' ? 'partial' : 'unresolved'
    : o.success ? 'progress' : 'nope'
  const tone = o.closed ? (o.status === 'resolved' ? 'ok' : o.status === 'partial' ? 'mid' : 'bad') : o.success ? 'ok' : 'bad'
  const icon: IconName = !o.closed && o.success ? 'go' : tone === 'ok' ? 'ok' : tone === 'mid' ? 'warning' : o.closed ? 'burst' : 'fail'
  const stampTone = o.status === 'resolved' ? 'green' : o.status === 'partial' ? 'yellow' : 'red'
  return (
    <section className={`l2-out surface-paper surface-paper--tape is-${tone}`} role="status">
      <div className="l2-out__top">
        <span className="label">{t('l2.out.report')}</span>
        <span className="label">{t('l2.month', { n: o.month })}</span>
      </div>
      <div className="l2-out__head">
        <Icon name={icon} size={40} />
        <h2 className="paper-title l2-out__title">{t(`l2.out.title.${title}`)}</h2>
        {o.closed && <span key={o.status} className={`stamp stamp-in stamp--${stampTone} l2-out__stamp`}>{t(`l2.status.${o.status}`)}</span>}
      </div>
      <div className="l2-flow">
        <div className="l2-flow__box">
          <small className="label">{t('l2.out.cause')}</small>
          <b>{t(`engine.opt.${o.id}.${o.optionId}`)}</b>
        </div>
        <Icon name="go" size={28} className="l2-flow__arrow" />
        <div className="l2-flow__box">
          <small className="label">{t('l2.out.effect')}</small>
          <b>{t(o.msgKey, P(o.params, t))}</b>
        </div>
      </div>
      {o.deltas.length > 0 && (
        <div className="l2-chips" aria-label={t('l2.out.changes')}>
          {o.deltas.map((d) => (
            <span key={d.key} className={`chip tnum ${d.d > 0 ? (d.key === 'radiation' ? 'chip--red' : 'chip--green') : d.key === 'radiation' ? 'chip--green' : 'chip--red'}`}>
              {t(`l2.delta.${d.key}`)} {d.d > 0 ? '+' : '−'}{Math.abs(d.d)}
            </span>
          ))}
        </div>
      )}
      {o.params.blackout === true && <p className="l2-blackout"><Icon name="blackout" size={26} /> {t('l2.out.blackout')}</p>}
      <Explain titleKey={`l2.outnote.${o.id}`} textKey={o.explanationKey} params={o.params} defaultOpen tilt={0} />
      {o.closed && <p className="l2-closed">{t('l2.out.closed', { n: o.month, status: t(`l2.status.${o.status}`) })}</p>}
      <div className="l2-actions">
        {showUndo && <button className="btn btn--yellow" onClick={onUndo}><Icon name="undo" size={22} /> {t('common.restore')}</button>}
        <button className="btn btn--green" onClick={onContinue}>{o.closed ? t('l2.out.continue') : t('l2.out.next')}</button>
      </div>
    </section>
  )
}
