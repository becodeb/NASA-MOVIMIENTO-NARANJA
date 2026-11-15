// Shared UI pieces used by every screen: HUD, meters, corner controls, radio log, field note, screen frame.
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react'
import { LANGS, getLang, setLang, useT, type Lang } from '../i18n'
import { game, useGame, type ScreenId, type Toast } from './store'
import { isMuted, onMuteChange, setMuted } from './sfx'
import { commsMode, loadTotal } from '../engine/engine'
import { PARAMS } from '../engine/data'
import type { MissionState } from '../engine/types'
import { Icon, isIconName, type IconName } from './icons'
import './ui.css'

export { Icon, ICON_NAMES, isIconName, type IconName, type IconTone } from './icons'

export type MeterTone = 'teal' | 'orange' | 'yellow' | 'green' | 'pink'

/**
 * Horizontal meter. `max` defines 100%. `warnBelow`/`dangerBelow` are absolute values.
 * - `icon`: an IconName (preferred) or any node.
 * - `tone`: fill colour while healthy; the bar gets hazard stripes on warn and turns red on danger.
 * - `warnAbove`/`dangerAbove` + `zoneFrom`: for "less is better" readings (radiation dose) that fill toward a red zone.
 * - `valueText`: replaces the default "value + unit" readout.
 */
export function Meter({ label, value, max, unit = '', icon, tone = 'teal', warnBelow, dangerBelow, warnAbove, dangerAbove, zoneFrom, valueText, hint, shortLabel }: {
  label: string; shortLabel?: string; value: number; max: number; unit?: string; icon?: IconName | ReactNode; tone?: MeterTone
  warnBelow?: number; dangerBelow?: number; warnAbove?: number; dangerAbove?: number; zoneFrom?: number
  valueText?: string; hint?: string
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  const danger = (dangerBelow !== undefined && value < dangerBelow) || (dangerAbove !== undefined && value > dangerAbove)
  const warn = (warnBelow !== undefined && value < warnBelow) || (warnAbove !== undefined && value > warnAbove)
  const level = danger ? 'danger' : warn ? 'warn' : 'ok'
  const zone = zoneFrom !== undefined ? Math.max(0, Math.min(100, (zoneFrom / max) * 100)) : undefined
  const trackStyle = zone !== undefined ? { ['--zone' as string]: `${zone}%` } as CSSProperties : undefined
  return (
    <div className={`ui-meter ui-meter--${level} ui-meter--${tone}`} title={hint}>
      <div className="ui-meter__top">
        {icon && <span className="ui-meter__icon" aria-hidden>{isIconName(icon) ? <Icon name={icon} size={22} /> : icon}</span>}
        {shortLabel
          ? <span className="ui-meter__label"><span className="ui-meter__full">{label}</span><span className="ui-meter__short" aria-hidden>{shortLabel}</span></span>
          : <span className="ui-meter__label">{label}</span>}
        <span className="ui-meter__value">{valueText ?? `${Number.isInteger(value) ? value : value.toFixed(1)}${unit}`}</span>
      </div>
      <div className={`ui-meter__track ${zone !== undefined ? 'ui-meter__track--zone' : ''}`} style={trackStyle}
        role="meter" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
        <div className="ui-meter__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

/** Mission resources HUD (levels 2–3 and transit): mission clock, three instrument clusters, comms link. */
export function Hud({ mission, compact = false, sticky = false }: { mission: MissionState; compact?: boolean; sticky?: boolean }) {
  const t = useT()
  const ref = useRef<HTMLDivElement>(null)
  // A sticky HUD publishes its height as `--hud-h`, so sticky siblings (the mission board) can sit right below it.
  useLayoutEffect(() => {
    const el = ref.current
    if (!sticky || !el) return
    const root = document.documentElement
    const publish = () => root.style.setProperty('--hud-h', `${el.offsetHeight}px`)
    publish()
    const ro = new ResizeObserver(publish)
    ro.observe(el)
    return () => { ro.disconnect(); root.style.removeProperty('--hud-h') }
  }, [sticky])
  const load = loadTotal(mission)
  const margin = mission.powerGeneration - load
  const comms = commsMode(mission)
  const limit = PARAMS.radiationLimit
  return (
    <div ref={ref} className={`ui-hud panel ${compact ? 'ui-hud--compact' : ''} ${sticky ? 'ui-hud--sticky' : ''}`}>
      <div className="ui-hud__clock"><Icon name="calendar" size={18} />{t('hud.month', { m: mission.monthsElapsed })}</div>
      <div className="ui-hud__group">
        <span className="label ui-hud__glabel">{t('hud.group.ship')}</span>
        <Meter icon="maneuver" tone="orange" label={t('hud.maneuver')} value={mission.maneuver} max={115} warnBelow={40} dangerBelow={20} hint={t('hud.maneuver.hint')} />
        <Meter icon="hull" tone="green" label={t('hud.structure')} value={mission.structure} max={100} warnBelow={70} dangerBelow={50} hint={t('hud.structure.hint')} />
      </div>
      <div className="ui-hud__group">
        <span className="label ui-hud__glabel">{t('hud.group.power')}</span>
        <Meter icon="power" tone="yellow" label={t('hud.power')} value={margin} max={75} valueText={t('hud.of', { a: margin, b: mission.powerGeneration })} warnBelow={10} dangerBelow={0} hint={t('hud.power.hint')} />
        <Meter icon="battery" tone="green" label={t('hud.battery')} value={mission.battery} max={30} warnBelow={15} dangerBelow={6} hint={t('hud.battery.hint')} />
      </div>
      <div className="ui-hud__group">
        <span className="label ui-hud__glabel">{t('hud.group.crew')}</span>
        <Meter icon="life-support" tone="teal" label={t('hud.vital')} shortLabel={t('hud.vital.short')} value={mission.vital} max={130} warnBelow={40} dangerBelow={16} hint={t('hud.vital.hint')} />
        <Meter icon="radiation" tone="pink" label={t('hud.radiation')} value={mission.radiation} max={40} zoneFrom={limit} warnAbove={limit * 0.66} dangerAbove={limit} hint={t('hud.radiation.hint')} />
      </div>
      <div className={`ui-hud__chip ui-hud__chip--${comms}`}>
        <Icon name={comms === 'none' ? 'em-comms' : comms === 'backup' ? 'antenna-twin' : 'antenna'} size={18} />{t(`hud.comms.${comms}`)}
      </div>
    </div>
  )
}

// ---------- corner controls: sound + language ----------

/** Tiny mount counter so App can tell whether a screen already shows the controls. */
function mountCounter() {
  let n = 0
  const subs = new Set<() => void>()
  const emit = () => subs.forEach(f => f())
  return {
    mount() { n++; emit(); return () => { n--; emit() } },
    subscribe(cb: () => void) { subs.add(cb); return () => { subs.delete(cb) } },
    get: () => n,
  }
}
const controlsMounted = mountCounter()

export function SoundButton({ className = '' }: { className?: string }) {
  const t = useT()
  const muted = useSyncExternalStore(onMuteChange, isMuted)
  const label = t(muted ? 'common.soundOn' : 'common.soundOff')
  return (
    <button type="button" className={`ui-ctl ui-ctl--sound ${muted ? 'is-muted' : ''} ${className}`} onClick={() => setMuted(!muted)}
      aria-label={label} title={label} aria-pressed={!muted}>
      <Icon name={muted ? 'sound-off' : 'sound-on'} size={22} tone={muted ? 'red' : undefined} />
    </button>
  )
}

function LangChip() {
  const t = useT()
  const lang = getLang()
  return (
    <label className="ui-ctl ui-lang" title={t('common.language')}>
      <Icon name="language" size={22} />
      <span className="ui-lang__code" aria-hidden>{lang.slice(0, 2).toUpperCase()}</span>
      <select value={lang} onChange={e => setLang(e.target.value as Lang)} aria-label={t('common.language')}>
        {LANGS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
      </select>
    </label>
  )
}

/** The corner cluster: sound toggle + language chip. Place it top-right; ScreenFrame already does. */
export function Controls() {
  useEffect(() => controlsMounted.mount(), [])
  return <div className="ui-controls"><SoundButton /><LangChip /></div>
}

/** Kept for existing call sites: it now renders the whole corner cluster (sound + language). */
export const LangSwitch = Controls

/** Rendered once by App: a lone sound button for screens that show no corner cluster (cinematics). */
export function FallbackControls() {
  const n = useSyncExternalStore(controlsMounted.subscribe, controlsMounted.get)
  return n > 0 ? null : <SoundButton className="ui-ctl--floating" />
}

// ---------- field note (the educational explanation) ----------

/** Hand-drawn underline for headings: <h2>Launch checks<Squiggle /></h2> (the heading needs `class="squiggled"`). */
export function Squiggle({ tone = 'orange' }: { tone?: 'orange' | 'yellow' | 'teal' | 'pink' }) {
  return (
    <svg className={`squiggle squiggle--${tone}`} viewBox="0 0 120 8" preserveAspectRatio="none" aria-hidden focusable="false">
      <path d="M2 5c8-4 12 3 20 0s12-4 20-1 12 3 20 0 12-3 20-1 12 3 16 1 12-2 20-.5" />
    </svg>
  )
}

/**
 * Field note: the paper card that carries the science. Collapsed by default on hard mode, open on easy mode.
 * Pass a specific `titleKey` at each call site ("How a Whipple shield works"); 'common.why' is only the fallback.
 * - `title`: already-translated title, wins over `titleKey`.
 * - `icon`: icon in the header (default `field-note`).
 * - `tilt`: rotation in degrees, between -1.5 and 1 (default -0.6). Use 0 inside narrow or dense layouts.
 */
export function Explain({ titleKey = 'common.why', title, textKey, params, defaultOpen, icon = 'field-note', tilt = -0.6 }: {
  titleKey?: string; title?: string; textKey: string; params?: Record<string, string | number | boolean>; defaultOpen?: boolean
  icon?: IconName; tilt?: number
}) {
  const t = useT()
  const { difficulty } = useGame()
  const [open, setOpen] = useState(defaultOpen ?? difficulty === 'easy')
  const p = params ? Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) : undefined
  return (
    <aside className={`ui-explain ui-note ${open ? 'is-open' : ''}`} style={{ ['--tilt' as string]: `${tilt}deg` }}>
      <span className="ui-note__tape" aria-hidden />
      <button type="button" className="ui-note__head ui-explain__head" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <Icon name={icon} size={24} />
        <span className="ui-note__title">{title ?? t(titleKey)}<Squiggle /></span>
        <Icon name="expand" size={18} className="ui-note__chev" />
      </button>
      {open && <p className="ui-note__body ui-explain__body">{t(textKey, p)}</p>}
    </aside>
  )
}

// ---------- radio log (replaces the toast stack) ----------

/** Screens where the dock keeps its slot even when silent, so a message arriving never shifts the layout. */
const RADIO_RESERVED: ScreenId[] = ['level1', 'level2', 'level3', 'reentry']

const KIND_ICON: Record<Toast['kind'], IconName> = { ok: 'ok', bad: 'fail', info: 'hint' }

/**
 * Crew radio log bound to the store's toasts. Shows the newest message only.
 * It is a flex sibling BELOW the scroll area (#app-scroll), so it can never cover or intercept clicks on content;
 * on mission screens it keeps a constant-height slot (empty when silent), so messages never shift or cover controls.
 * Its height is still published as `--dock-h` on <html> for layouts that size against the viewport.
 */
export function RadioLog() {
  const t = useT()
  const { toasts, screen } = useGame()
  const ref = useRef<HTMLDivElement>(null)
  // One message at a time keeps the dock a constant height, so it never moves the controls under the player's finger.
  const shown = toasts.slice(-1)
  const reserve = RADIO_RESERVED.includes(screen)
  const newest = shown[0]?.id
  useLayoutEffect(() => {
    const el = ref.current
    document.documentElement.style.setProperty('--dock-h', `${el && (shown.length || reserve) ? el.offsetHeight : 0}px`)
  })
  // Remember the last control pressed (it may be disabled, and so unfocused, by the time the message lands).
  const pressed = useRef<Element | null>(null)
  useEffect(() => {
    const onDown = (e: PointerEvent) => { pressed.current = e.target instanceof Element ? e.target : null }
    document.addEventListener('pointerdown', onDown, true)
    return () => document.removeEventListener('pointerdown', onDown, true)
  }, [])
  useEffect(() => {
    const el = ref.current
    const target = pressed.current
    if (!el || newest === undefined || !target || !target.isConnected || el.contains(target)) return
    const overlap = target.getBoundingClientRect().bottom + 16 - el.getBoundingClientRect().top
    if (overlap > 0) document.getElementById('app-scroll')?.scrollBy({ top: overlap, behavior: 'smooth' })
  }, [newest])
  return (
    <div ref={ref} className={`ui-radio ${shown.length ? 'is-on' : ''} ${reserve ? 'is-reserved' : ''}`} role="log" aria-live="polite" aria-label={t('common.radio')}>
      {(shown.length > 0 || reserve) && <span className="ui-radio__tag"><Icon name="antenna" size={18} /><span>{t('common.radio')}</span></span>}
      <div className="ui-radio__list">
        {shown.map(x => <RadioEntry key={x.id} toast={x} />)}
      </div>
    </div>
  )
}
/** Old name, kept so existing imports keep working. */
export const Toasts = RadioLog

function RadioEntry({ toast }: { toast: Toast }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const { id, kind } = toast
  useEffect(() => {
    if (open) return
    const h = setTimeout(() => game.dismissToast(id), kind === 'bad' ? 9000 : 7000)
    return () => clearTimeout(h)
  }, [id, kind, open])
  const p = stringify(toast.params)
  const more = toast.explanationKey ? t(toast.explanationKey, p) : ''
  return (
    <div className={`ui-radio__msg ui-radio__msg--${kind} ${open ? 'is-open' : ''}`}>
      <Icon name={KIND_ICON[kind]} size={20} />
      <button type="button" className="ui-radio__text" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <b>{t(toast.msgKey, p)}</b>
        {open && more && <span className="ui-radio__more">{more}</span>}
      </button>
      {more && <Icon name="expand" size={16} className="ui-radio__chev" />}
      <button type="button" className="ui-radio__x" onClick={() => game.dismissToast(id)} aria-label={t('common.dismiss')}><Icon name="close" size={14} /></button>
    </div>
  )
}

/** Convert engine Params (may contain nested i18n keys ending in Key) into display strings. */
export function stringify(params: Record<string, string | number | boolean>, tr?: (k: string) => string): Record<string, string | number> {
  const out: Record<string, string | number> = {}
  for (const [k, v] of Object.entries(params)) out[k] = typeof v === 'boolean' ? String(v) : (tr && typeof v === 'string' && k.endsWith('Key') ? tr(v) : v)
  return out
}

// ---------- screen frame ----------

const MISSION_SCREENS: ScreenId[] = ['level1', 'launch', 'arrival', 'level2', 'departure', 'level3', 'reentry']

/** Paper dialog shown before leaving a mission in progress. */
function LeaveDialog({ onStay, onLeave }: { onStay: () => void; onLeave: () => void }) {
  const t = useT()
  const stay = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    stay.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onStay() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onStay])
  return (
    <div className="ui-dialog" role="dialog" aria-modal="true" aria-labelledby="ui-leave-title" onClick={e => { if (e.target === e.currentTarget) onStay() }}>
      <div className="ui-dialog__card surface-paper">
        <h2 id="ui-leave-title" className="paper-title">{t('common.leave.title')}</h2>
        <p>{t('common.leave.body')}</p>
        <div className="ui-dialog__actions">
          <button ref={stay} type="button" className="btn btn--yellow" onClick={onStay}>{t('common.leave.stay')}</button>
          <button type="button" className="btn btn--metal" onClick={onLeave}>{t('common.leave.go')}</button>
        </div>
      </div>
    </div>
  )
}

/** Standard screen frame: top bar (menu, title, corner controls) + content. */
export function ScreenFrame({ title, subtitle, children, actions, alarm }: {
  title?: string; subtitle?: string; children: ReactNode; actions?: ReactNode; alarm?: boolean
}) {
  const t = useT()
  const { screen, mission } = useGame()
  const [asking, setAsking] = useState(false)
  const inProgress = !!mission && MISSION_SCREENS.includes(screen)
  return (
    <div className={`ui-frame ${alarm ? 'ui-frame--alarm' : ''}`}>
      <header className="ui-frame__bar">
        <button type="button" className="btn btn--metal ui-frame__menu" onClick={() => (inProgress ? setAsking(true) : game.go('menu'))}
          aria-label={t('common.menu')} title={t('common.menu')}>
          <Icon name="home" size={22} /><span className="ui-frame__menutxt">{t('common.menuShort')}</span>
        </button>
        <div className="ui-frame__titles">
          {title && <h1 className="title ui-frame__title">{title}</h1>}
          {subtitle && <p className="ui-frame__subtitle">{subtitle}</p>}
        </div>
        <div className="ui-frame__right">{actions}<Controls /></div>
      </header>
      <div className="ui-frame__body">{children}</div>
      {asking && <LeaveDialog onStay={() => setAsking(false)} onLeave={() => { setAsking(false); game.go('menu') }} />}
    </div>
  )
}
