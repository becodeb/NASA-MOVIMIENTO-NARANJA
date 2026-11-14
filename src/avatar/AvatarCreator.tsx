// "CREATE YOUR ASTRONAUT" screen: categories (left) · live preview (centre) · option buttons (right).
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { useT } from '../i18n'
import { Astronaut } from './Astronaut'
import './avatar.css'
import {
  AVATAR_CATEGORIES, AVATAR_OPTIONS, DEFAULT_AVATAR, GLOVE_COLORS, HAIR_COLORS, NAME_MAX, SKIN_TONES,
  loadAvatar, randomAvatar, saveAvatar,
  type AvatarCategory, type AvatarConfig,
} from './types'

export interface AvatarCreatorProps {
  /** Fired by CONTINUE (the avatar is saved first). An empty name is replaced by a localized fallback. */
  onDone: (config: AvatarConfig) => void
  onBack?: () => void
  /** Starting avatar. Defaults to the saved one, else DEFAULT_AVATAR. */
  initial?: AvatarConfig
  /** Fired on every change (live preview elsewhere). */
  onChange?: (config: AvatarConfig) => void
  /** Drop the built-in gradient so an animated backdrop can sit behind the screen. */
  transparent?: boolean
}

const SWATCHES: Partial<Record<AvatarCategory, Record<string, string>>> = {
  hairColor: HAIR_COLORS,
  skin: SKIN_TONES,
  gloves: GLOVE_COLORS,
}
// Thumbnail framing per category (viewBox into the astronaut drawing).
const CROPS: Partial<Record<AvatarCategory, [number, number, number, number]>> = {
  faceShape: [52, 30, 136, 136],
  eyes: [80, 62, 80, 56],
  nose: [96, 86, 48, 44],
  mouth: [92, 104, 56, 46],
  eyebrows: [80, 54, 80, 50],
  ears: [142, 70, 56, 56],
  hair: [44, 18, 152, 152],
  suitColor: [56, 146, 128, 134],
  helmet: [34, 0, 172, 172],
  accessory: [52, 30, 136, 136],
}

/** Moves focus/selection with arrow keys inside a group of sibling buttons. */
function arrowNav(e: KeyboardEvent<HTMLElement>, index: number, count: number, go: (i: number) => void) {
  let next = -1
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (index + 1) % count
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (index - 1 + count) % count
  else if (e.key === 'Home') next = 0
  else if (e.key === 'End') next = count - 1
  if (next < 0) return
  e.preventDefault()
  go(next)
  const buttons = e.currentTarget.parentElement?.querySelectorAll<HTMLElement>('button')
  buttons?.[next]?.focus()
}

export function AvatarCreator({ onDone, onBack, initial, onChange, transparent }: AvatarCreatorProps) {
  const t = useT()
  const uid = useId()
  const [config, setConfig] = useState<AvatarConfig>(() => initial ?? loadAvatar() ?? DEFAULT_AVATAR)
  const [category, setCategory] = useState<AvatarCategory>('faceShape')
  const [toast, setToast] = useState<{ text: string; err?: boolean } | null>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  const bounce = useCallback(() => {
    const el = popRef.current
    if (!el?.animate || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    el.animate(
      [
        { transform: 'scale(1)' },
        { transform: 'scale(1.07, 0.95)', offset: 0.3 },
        { transform: 'scale(0.97, 1.04)', offset: 0.65 },
        { transform: 'scale(1)' },
      ],
      { duration: 320, easing: 'ease-out' },
    )
  }, [])

  const apply = useCallback((next: AvatarConfig, pop = true) => {
    setConfig(next)
    onChange?.(next)
    if (pop) bounce()
  }, [onChange, bounce])

  const flash = (text: string, err?: boolean) => {
    setToast({ text, err })
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2200)
  }

  const handleSave = () => {
    if (saveAvatar(config)) flash(t('avatar.saved'))
    else flash(t('avatar.saveFailed'), true)
  }
  const handleContinue = () => {
    const final = { ...config, commanderName: config.commanderName.trim() || t('avatar.name.fallback') }
    saveAvatar(final)
    onDone(final)
  }

  const options = AVATAR_OPTIONS[category] as readonly string[]
  const selected = config[category] as string
  const catLabel = t(`avatar.cat.${category}`)
  const panelId = `${uid}-panel`

  return (
    <div className={`av-creator${transparent ? ' av-creator--overlay' : ''}`}>
      <header className={`av-head${onBack ? ' av-head--back' : ''}`}>
        {onBack && (
          <button type="button" className="btn btn--metal av-back" onClick={onBack}>‹ {t('avatar.back')}</button>
        )}
        <h1 className="title">{t('avatar.title')}</h1>
      </header>

      <div className="av-main">
        <section className="av-stage" aria-label={t('avatar.preview')}>
          <div className="av-figure">
            <div className="av-figure-pop" ref={popRef}>
              <Astronaut config={config} pose="wave" expression="neutral" title={t('avatar.previewAlt')} />
            </div>
          </div>
          <div className="av-name">
            <label htmlFor={`${uid}-name`}>{t('avatar.name.label')}</label>
            <input
              id={`${uid}-name`}
              type="text"
              value={config.commanderName}
              maxLength={NAME_MAX}
              placeholder={t('avatar.name.placeholder')}
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="done"
              onChange={e => apply({ ...config, commanderName: e.target.value }, false)}
            />
          </div>
        </section>

        <div className="av-cats panel" role="tablist" aria-label={t('avatar.categories')} aria-orientation="vertical">
          {AVATAR_CATEGORIES.map((cat, i) => (
            <button
              key={cat}
              type="button"
              role="tab"
              id={`${uid}-tab-${cat}`}
              className="av-cat"
              aria-selected={cat === category}
              aria-controls={panelId}
              tabIndex={cat === category ? 0 : -1}
              onClick={() => setCategory(cat)}
              onKeyDown={e => arrowNav(e, i, AVATAR_CATEGORIES.length, n => setCategory(AVATAR_CATEGORIES[n]))}
              ref={el => { if (el && cat === category) el.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }) }}
            >
              {t(`avatar.cat.${cat}`)}
            </button>
          ))}
        </div>

        <section className="av-opts panel" id={panelId} role="tabpanel" aria-labelledby={`${uid}-tab-${category}`}>
          <h2 className="av-opts-title">{catLabel}</h2>
          <div className="av-opt-grid" role="radiogroup" aria-label={t('avatar.options', { category: catLabel })}>
            {options.map((opt, i) => {
              const label = t(`avatar.opt.${category}.${opt}`)
              const swatch = SWATCHES[category]?.[opt]
              const pickOpt = (n: number) => apply({ ...config, [category]: options[n] } as AvatarConfig)
              return (
                <button
                  key={opt}
                  type="button"
                  role="radio"
                  className="av-opt"
                  aria-checked={opt === selected}
                  tabIndex={opt === selected ? 0 : -1}
                  title={label}
                  onClick={() => pickOpt(i)}
                  onKeyDown={e => arrowNav(e, i, options.length, pickOpt)}
                >
                  <span className="av-opt-icon" aria-hidden="true">
                    {swatch ? (
                      <span className="av-swatch" style={{ background: swatch }} />
                    ) : (
                      <Astronaut
                        config={{
                          ...config,
                          helmet: 'no-helmet',
                          ...(category === 'accessory' || category === 'helmet' || category === 'ears' ? {} : { accessory: 'none' }),
                          [category]: opt,
                        } as AvatarConfig}
                        crop={CROPS[category]}
                        animate={false}
                      />
                    )}
                  </span>
                  <span className="av-opt-label">{label}</span>
                </button>
              )
            })}
          </div>
        </section>
      </div>

      <footer className="av-actions">
        <button type="button" className="btn btn--orange" onClick={() => apply(randomAvatar(config.commanderName))}>
          {t('avatar.random')}
        </button>
        <span className="av-spacer" aria-hidden="true" />
        <button type="button" className="btn" onClick={handleSave}>{t('avatar.save')}</button>
        <button type="button" className="btn btn--green" onClick={handleContinue}>{t('avatar.continue')}</button>
        <div className={`av-toast${toast?.err ? ' av-toast--err' : ''}`} role="status" aria-live="polite">{toast?.text}</div>
      </footer>
    </div>
  )
}

export default AvatarCreator
