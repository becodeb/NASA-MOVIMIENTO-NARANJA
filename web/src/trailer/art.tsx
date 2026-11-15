// Memoised art so the 60 fps clock only re-renders what actually changes.
import { memo, type CSSProperties, type ReactNode } from 'react'
import { Earth, Enceladus, MicrometeoroidStreak, RingParticles, Saturn, SolarSystemMap, SpaceBackdrop, Titan } from '../art/worlds'
import { LaunchRocket, ReentryCapsule, Spaceship, Sparks } from '../art/ships'
import { Astronaut, type AvatarConfig } from '../avatar'

export const MSaturn = memo(Saturn)
export const MEarth = memo(Earth)
export const MTitan = memo(Titan)
export const MEnceladus = memo(Enceladus)
export const MMap = memo(SolarSystemMap)
export const MStreak = memo(MicrometeoroidStreak)
export const MRing = memo(RingParticles)
export const MBackdrop = memo(SpaceBackdrop)
export const MShip = memo(Spaceship)
export const MRocket = memo(LaunchRocket)
export const MCapsule = memo(ReentryCapsule)
export const MSparks = memo(Sparks)
export const MAstro = memo(Astronaut)

/** The trailer's Commander — an original character, fixed so every take is identical. */
export const COMMANDER: AvatarConfig = {
  faceShape: 'round',
  eyes: 'big-round',
  nose: 'upturned',
  mouth: 'big-smile',
  eyebrows: 'arched',
  ears: 'medium',
  hair: 'curly',
  hairColor: 'violet',
  skin: 'brown',
  suitColor: 'orange',
  helmet: 'open-visor',
  gloves: 'teal',
  accessory: 'freckles',
  commanderName: 'Commander',
}

export const MAP_LABELS = { sun: 'Sun', earth: 'Earth', saturn: 'Saturn', titan: 'Titan' }

/** Absolutely positioned box in stage pixels. */
export function At({ x, y, w, h, s = 1, r = 0, o = 1, origin = 'center', className, style, children }: {
  x: number; y: number; w?: number; h?: number; s?: number; r?: number; o?: number; origin?: string
  className?: string; style?: CSSProperties; children?: ReactNode
}) {
  if (o <= 0 || s === 0) return null
  return (
    <div
      className={className ? `tr-at ${className}` : 'tr-at'}
      style={{ left: x, top: y, width: w, height: h, opacity: o < 1 ? o : undefined, transform: s !== 1 || r ? `scale(${s}) rotate(${r}deg)` : undefined, transformOrigin: origin, ...style }}
    >
      {children}
    </div>
  )
}

export function Check({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" aria-hidden>
      <circle cx="22" cy="22" r="19" fill="#65D68A" stroke="#111326" strokeWidth="4" />
      <path d="M12,23 l7,7 l13,-15" fill="none" stroke="#111326" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Warn({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <path d="M32,6 L60,56 H4 Z" fill="#FFD447" stroke="#111326" strokeWidth="5" strokeLinejoin="round" />
      <path d="M32,24 V40" stroke="#111326" strokeWidth="6" strokeLinecap="round" />
      <circle cx="32" cy="48" r="3.6" fill="#111326" />
    </svg>
  )
}

export function Cursor({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <svg className="tr-cursor" style={{ left: x, top: y, transform: `scale(${s})` }} width="70" height="84" viewBox="0 0 35 42" aria-hidden>
      <path d="M3,2 L3,32 L11,25 L16,38 L22,35.5 L17,23 L28,22 Z" fill="#F5F7FF" stroke="#111326" strokeWidth="3.4" strokeLinejoin="round" />
    </svg>
  )
}

/** Expanding ring for clicks / snaps. p = 0..1. */
export function Ring({ x, y, p, size = 160, color = '#FFD447' }: { x: number; y: number; p: number; size?: number; color?: string }) {
  if (p <= 0 || p >= 1) return null
  const d = size * (0.2 + 0.8 * p)
  return <div className="tr-ring" style={{ left: x - d / 2, top: y - d / 2, width: d, height: d, borderColor: color, opacity: 1 - p }} />
}
