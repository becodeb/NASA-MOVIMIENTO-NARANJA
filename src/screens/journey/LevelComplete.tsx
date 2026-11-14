// Reusable "MISSION COMPLETE!" banner: badge, streaking stars, ship fly-by, 3-step progress bar.
// Fills its positioned parent (or the viewport with `fixed`). Pass `onContinue` to show a CONTINUE button.
import type { ReactNode } from 'react'
import { useT } from '../../i18n'
import { useGame } from '../../game/store'
import { Spaceship } from '../../art/ships'
import { DEFAULT_SHIP, thrustFor } from './cine'
import './journey.css'

export interface LevelCompleteProps {
  level: 1 | 2 | 3
  /** Shows a CONTINUE button when provided. */
  onContinue?: () => void
  /** Cover the viewport instead of the positioned parent. */
  fixed?: boolean
  /** Extra content under the progress bar (score, resources, short summary…). */
  children?: ReactNode
  className?: string
}

const TONE = ['#38D9D0', '#FF8C32', '#65D68A'] as const
const INK = '#111326'

// deterministic streaks: [top %, length vmin, delay s, duration s]
const STREAKS: Array<[number, number, number, number]> = [
  [6, 22, 0, 0.9], [14, 12, 0.5, 0.7], [22, 30, 0.2, 1.1], [31, 16, 0.8, 0.8], [39, 26, 0.35, 1], [48, 10, 0.1, 0.6],
  [56, 28, 0.65, 1.05], [64, 14, 0.25, 0.75], [72, 24, 0.9, 0.95], [80, 18, 0.45, 0.8], [88, 30, 0.15, 1.1], [95, 12, 0.7, 0.7],
]

function Badge({ level, label }: { level: 1 | 2 | 3; label: string }) {
  const tone = TONE[level - 1]
  const star = (cx: number, cy: number, r: number) => {
    let d = ''
    for (let i = 0; i < 10; i++) {
      const rr = i % 2 ? r * 0.45 : r
      const a = (Math.PI * i) / 5 - Math.PI / 2
      d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)} `
    }
    return `${d}Z`
  }
  return (
    <svg className="jy-lc__badge" viewBox="0 0 200 230" role="img" aria-label={label}>
      <g stroke={INK} strokeWidth={6} strokeLinejoin="round">
        <path d="M62,140 L44,220 L78,198 L100,224 Z" fill="#F04452" />
        <path d="M138,140 L156,220 L122,198 L100,224 Z" fill="#F46AA7" />
        <circle cx={100} cy={96} r={86} fill="#FFD447" />
        <circle cx={100} cy={96} r={66} fill="#101B3D" />
        <circle className="jy-lc__ring" cx={100} cy={96} r={66} fill="none" stroke={tone} strokeWidth={7} strokeDasharray="6 14" strokeLinecap="round" />
      </g>
      <path d={star(100, 62, 20)} fill="#FFD447" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
      {level >= 2 && <path d={star(62, 76, 11)} fill={tone} stroke={INK} strokeWidth={3} strokeLinejoin="round" />}
      {level >= 3 && <path d={star(138, 76, 11)} fill={tone} stroke={INK} strokeWidth={3} strokeLinejoin="round" />}
      <text x={100} y={138} textAnchor="middle" className="jy-lc__num" fill={tone} stroke={INK} strokeWidth={7} paintOrder="stroke">{level}</text>
    </svg>
  )
}

export function LevelComplete({ level, onContinue, fixed = false, children, className = '' }: LevelCompleteProps) {
  const t = useT()
  const { mission } = useGame()
  const config = mission?.config ?? DEFAULT_SHIP
  return (
    <section className={`jy-lc jy-lc--${level} ${fixed ? 'jy-lc--fixed' : ''} ${className}`} aria-live="polite">
      <div className="jy-lc__streaks" aria-hidden>
        {STREAKS.map(([top, len, delay, dur], i) => (
          <i key={i} style={{ top: `${top}%`, width: `${len}vmin`, animationDelay: `${delay}s`, animationDuration: `${dur}s` }} />
        ))}
      </div>
      <div className="jy-lc__ship" aria-hidden>
        <Spaceship config={config} thrust={thrustFor(config)} width="100%" />
      </div>
      <div className="jy-lc__body">
        <Badge level={level} label={t('jy.lc.badge', { n: level })} />
        <h2 className="jy-big jy-lc__title">{t('jy.lc.title')}</h2>
        <p className="jy-lc__level">{t('jy.lc.level', { n: level })} · {t(`jy.lc.name${level}`)}</p>
        <p className="jy-lc__quote">“{t('jy.lc.quote')}”</p>
        <div className="jy-lc__progress" role="progressbar" aria-label={t('jy.lc.progress')} aria-valuemin={0} aria-valuemax={3} aria-valuenow={level}>
          {([1, 2, 3] as const).map(n => (
            <div key={n} className={`jy-lc__step ${n <= level ? 'is-done' : ''} ${n === level ? 'is-new' : ''}`}>
              <span className="jy-lc__track"><span className="jy-lc__fill" /></span>
              <span className="jy-lc__name"><b>{n <= level ? '★' : n}</b> {t(`jy.lc.name${n}`)}</span>
            </div>
          ))}
        </div>
        <p className="jy-lc__unlock">{level < 3 ? `🔓 ${t('jy.lc.unlock', { n: level + 1 })}` : `🌍 ${t('jy.lc.final')}`}</p>
        {children}
        {onContinue && <button className="btn btn--yellow jy-lc__go" onClick={onContinue}>{t('common.continue')}</button>}
      </div>
    </section>
  )
}
