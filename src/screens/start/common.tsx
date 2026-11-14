import type { ReactNode } from 'react'
import { game } from '../../game/store'
import type { ScreenId } from '../../game/store'
import type { MissionState } from '../../engine/types'
import './start.css'

/** Speech bubble for the talking astronaut. `tail` points at the speaker. */
export function Bubble({ children, tail = 'left', className = '' }: { children: ReactNode; tail?: 'left' | 'bottom' | 'right'; className?: string }) {
  return <div className={`st-bubble st-bubble--${tail} ${className}`} role="status" aria-live="polite">{children}</div>
}

/** Screen that matches a mission in progress (used by CONTINUE and HOW TO PLAY). */
export function resumeScreen(m: MissionState): ScreenId {
  if (m.result !== 'inProgress') return 'report'
  if (m.phase === 'closing') return 'reentry'
  if (m.phase === 'return' || m.level === 3) return 'level3'
  if (m.level === 2) return m.saturnMonth === 0 && m.history.length <= 1 && m.phase === 'saturn' ? 'arrival' : 'level2'
  return 'level1'
}

export function hasMission(m: MissionState | null): m is MissionState {
  return !!m && m.result === 'inProgress'
}

export const go = (s: ScreenId) => game.go(s)

/** Where the briefing should return after a replay from HOW TO PLAY. */
export const introReturn: { to: ScreenId | null } = { to: null }
