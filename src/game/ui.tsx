// Shared UI pieces used by every screen: HUD, meters, language switch, toasts, explanation box.
import { useEffect, useState, type ReactNode } from 'react'
import { LANGS, getLang, setLang, useT, type Lang } from '../i18n'
import { game, useGame } from './store'
import { commsMode, loadTotal } from '../engine/engine'
import type { MissionState } from '../engine/types'
import './ui.css'

/** Horizontal meter. `max` defines 100%. `warnBelow`/`dangerBelow` are absolute values. */
export function Meter({ label, value, max, unit = '', icon, warnBelow, dangerBelow, hint }: {
  label: string; value: number; max: number; unit?: string; icon?: ReactNode
  warnBelow?: number; dangerBelow?: number; hint?: string
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  const level = dangerBelow !== undefined && value < dangerBelow ? 'danger' : warnBelow !== undefined && value < warnBelow ? 'warn' : 'ok'
  return (
    <div className={`ui-meter ui-meter--${level}`} title={hint}>
      <div className="ui-meter__top">
        {icon && <span className="ui-meter__icon" aria-hidden>{icon}</span>}
        <span className="ui-meter__label">{label}</span>
        <span className="ui-meter__value">{Number.isInteger(value) ? value : value.toFixed(1)}{unit}</span>
      </div>
      <div className="ui-meter__track" role="meter" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
        <div className="ui-meter__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

/** Mission resources HUD (levels 2–3 and transit). Reads the live mission state. */
export function Hud({ mission, compact = false }: { mission: MissionState; compact?: boolean }) {
  const t = useT()
  const load = loadTotal(mission)
  const margin = mission.powerGeneration - load
  const comms = commsMode(mission)
  return (
    <div className={`ui-hud panel ${compact ? 'ui-hud--compact' : ''}`}>
      <div className="ui-hud__chip">{t('hud.month', { m: mission.monthsElapsed })}</div>
      <Meter icon="🚀" label={t('hud.maneuver')} value={mission.maneuver} max={115} warnBelow={40} dangerBelow={20} hint={t('hud.maneuver.hint')} />
      <Meter icon="⚡" label={t('hud.power')} value={margin} max={75} unit={` / ${mission.powerGeneration}`} warnBelow={10} dangerBelow={0} hint={t('hud.power.hint')} />
      <Meter icon="🔋" label={t('hud.battery')} value={mission.battery} max={30} warnBelow={15} dangerBelow={6} hint={t('hud.battery.hint')} />
      <Meter icon="🫁" label={t('hud.vital')} value={mission.vital} max={130} warnBelow={40} dangerBelow={16} hint={t('hud.vital.hint')} />
      <Meter icon="🛡️" label={t('hud.structure')} value={mission.structure} max={100} warnBelow={70} dangerBelow={50} hint={t('hud.structure.hint')} />
      <Meter icon="☢️" label={t('hud.radiation')} value={mission.radiation} max={40} hint={t('hud.radiation.hint')} />
      <div className={`ui-hud__chip ui-hud__chip--${comms}`}>📡 {t(`hud.comms.${comms}`)}</div>
    </div>
  )
}

export function LangSwitch() {
  const t = useT()
  const lang = getLang()
  return (
    <label className="ui-lang">
      <span className="sr-only">{t('common.language')}</span>
      <span aria-hidden>🌐</span>
      <select value={lang} onChange={e => setLang(e.target.value as Lang)} aria-label={t('common.language')}>
        {LANGS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
      </select>
    </label>
  )
}

/** "Why?" educational box. Collapsible on hard mode, open by default on easy mode. */
export function Explain({ titleKey = 'common.why', textKey, params, defaultOpen }: {
  titleKey?: string; textKey: string; params?: Record<string, string | number | boolean>; defaultOpen?: boolean
}) {
  const t = useT()
  const { difficulty } = useGame()
  const [open, setOpen] = useState(defaultOpen ?? difficulty === 'easy')
  const p = params ? Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) : undefined
  return (
    <div className={`ui-explain ${open ? 'is-open' : ''}`}>
      <button className="ui-explain__head" onClick={() => setOpen(o => !o)} aria-expanded={open}>💡 {t(titleKey)}</button>
      {open && <p className="ui-explain__body">{t(textKey, p)}</p>}
    </div>
  )
}

/** Toast stack bound to the store. */
export function Toasts() {
  const t = useT()
  const { toasts } = useGame()
  return (
    <div className="ui-toasts" aria-live="polite">
      {toasts.map(x => <ToastItem key={x.id} id={x.id} kind={x.kind}>
        <b>{t(x.msgKey, stringify(x.params))}</b>
        {x.explanationKey && <p>{t(x.explanationKey, stringify(x.params))}</p>}
      </ToastItem>)}
    </div>
  )
}

function ToastItem({ id, kind, children }: { id: number; kind: string; children: ReactNode }) {
  useEffect(() => { const h = setTimeout(() => game.dismissToast(id), 9000); return () => clearTimeout(h) }, [id])
  return <div className={`ui-toast ui-toast--${kind}`} role="status" onClick={() => game.dismissToast(id)}>{children}</div>
}

/** Convert engine Params (may contain nested i18n keys ending in Key) into display strings. */
export function stringify(params: Record<string, string | number | boolean>, tr?: (k: string) => string): Record<string, string | number> {
  const out: Record<string, string | number> = {}
  for (const [k, v] of Object.entries(params)) out[k] = typeof v === 'boolean' ? String(v) : (tr && typeof v === 'string' && k.endsWith('Key') ? tr(v) : v)
  return out
}

/** Standard screen frame: top bar (title, lang, menu) + content. */
export function ScreenFrame({ title, subtitle, children, actions, alarm }: {
  title?: string; subtitle?: string; children: ReactNode; actions?: ReactNode; alarm?: boolean
}) {
  const t = useT()
  return (
    <div className={`ui-frame ${alarm ? 'ui-frame--alarm' : ''}`}>
      <header className="ui-frame__bar">
        <button className="btn btn--metal ui-frame__menu" onClick={() => game.go('menu')} aria-label={t('common.menu')}>☰</button>
        <div className="ui-frame__titles">
          {title && <h1 className="title ui-frame__title">{title}</h1>}
          {subtitle && <p className="ui-frame__subtitle">{subtitle}</p>}
        </div>
        <div className="ui-frame__right">{actions}<LangSwitch /></div>
      </header>
      <div className="ui-frame__body">{children}</div>
    </div>
  )
}
