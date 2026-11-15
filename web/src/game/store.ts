// Global game store: current screen, mission state, avatar, checkpoints. Autosaves after every change.
import { useSyncExternalStore } from 'react'
import type { ActionResult, Checkpoint, Difficulty, MissionState, Params } from '../engine/types'
import { createCheckpoint, restoreCheckpoint, canRestore } from '../engine/engine'
import { DEFAULT_AVATAR, loadAvatar, type AvatarConfig } from '../avatar'
import { play } from './sfx'
import { setDestination, type Destination } from '../engine/destination'
import { setVariant } from '../i18n'

/** Screen flow:
 * opening → menu → intro → avatar → level1 → launch → arrival → level2 → departure → level3 → reentry → report
 * `howto` (instructions + glossary) is reachable from the menu and the in-game pause button. */
export type ScreenId =
  | 'opening' | 'menu' | 'howto' | 'intro' | 'avatar'
  | 'level1' | 'launch' | 'arrival' | 'level2' | 'departure' | 'level3' | 'reentry' | 'report'

export interface Toast { id: number; kind: 'ok' | 'bad' | 'info'; msgKey: string; params: Params; explanationKey?: string }

export interface GameState {
  screen: ScreenId
  difficulty: Difficulty
  /** Chosen mission destination (menu). A mission in progress only continues under its own destination. */
  destination: Destination
  avatar: AvatarConfig
  mission: MissionState | null
  checkpoints: Checkpoint[]
  toasts: Toast[]
  /** Free-form per-screen memory (e.g. cinematic already seen). */
  seen: Record<string, boolean>
}

const SAVE_KEY = 'so.save.v1'

function initial(): GameState {
  const base: GameState = {
    screen: 'opening', difficulty: 'easy', destination: 'saturn', avatar: loadAvatar() ?? DEFAULT_AVATAR,
    mission: null, checkpoints: [], toasts: [], seen: {},
  }
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (raw) {
      const saved = JSON.parse(raw) as Partial<GameState>
      return { ...base, ...saved, toasts: [], screen: saved.seen?.opening ? 'menu' : 'opening' }
    }
  } catch { /* corrupted or unavailable storage */ }
  return base
}

let state: GameState = initial()

/** Point the engine tables and the text variant at the chosen destination. */
function syncDestination() {
  const d: Destination = state.destination === 'mars' ? 'mars' : 'saturn'
  setDestination(d)
  setVariant(d === 'mars' ? 'mars' : null)
}
syncDestination()
const listeners = new Set<() => void>()
let toastSeq = 1

function persist() {
  try {
    const { toasts: _t, ...rest } = state
    void _t
    localStorage.setItem(SAVE_KEY, JSON.stringify(rest))
  } catch { /* ignore */ }
}

function set(patch: Partial<GameState>) {
  const prev = state
  state = { ...state, ...patch }
  if (patch.destination && patch.destination !== prev.destination) syncDestination()
  // Sound cues driven by state transitions (screens stay sound-agnostic).
  if (patch.mission && patch.mission.activeEmergency && patch.mission.activeEmergency !== prev.mission?.activeEmergency) play('alarm')
  if (patch.screen && patch.screen !== prev.screen) {
    if (patch.screen === 'launch') setTimeout(() => play('launch'), 900)
    else if (patch.screen === 'report' && state.mission?.reentry.outcome === 'safe') setTimeout(() => play('fanfare'), 600)
    else play('whoosh')
  }
  persist()
  listeners.forEach(l => l())
}

export function getGame(): GameState { return state }

export function useGame(): GameState {
  return useSyncExternalStore(cb => { listeners.add(cb); return () => listeners.delete(cb) }, () => state)
}

export const game = {
  go(screen: ScreenId) { set({ screen }); window.scrollTo?.(0, 0); document.getElementById('app-scroll')?.scrollTo(0, 0) },
  setDifficulty(difficulty: Difficulty) { set({ difficulty }) },
  setDestination(destination: Destination) { set({ destination }) },
  setAvatar(avatar: AvatarConfig) { set({ avatar }) },
  markSeen(key: string) { set({ seen: { ...state.seen, [key]: true } }) },

  /** Replace the mission (e.g. createMission at the start of level 1). Clears checkpoints. */
  newMission(mission: MissionState) { set({ mission, checkpoints: [] }) },

  /** Apply an engine ActionResult: stores the new state and shows a toast with the explanation. */
  apply(r: ActionResult | { state: MissionState; ok?: boolean; msgKey?: string; params?: Params; explanationKey?: string }, opts: { toast?: boolean } = {}) {
    const patch: Partial<GameState> = { mission: r.state }
    if (opts.toast !== false && 'msgKey' in r && r.msgKey) {
      const t: Toast = { id: toastSeq++, kind: r.ok === false ? 'bad' : 'ok', msgKey: r.msgKey, params: r.params ?? {}, explanationKey: r.explanationKey }
      patch.toasts = [...state.toasts.slice(-2), t]
      play(r.ok === false ? 'bad' : 'ok')
    }
    set(patch)
    return r
  },

  toast(kind: Toast['kind'], msgKey: string, params: Params = {}, explanationKey?: string) {
    set({ toasts: [...state.toasts.slice(-2), { id: toastSeq++, kind, msgKey, params, explanationKey }] })
  },
  dismissToast(id: number) { set({ toasts: state.toasts.filter(t => t.id !== id) }) },

  /** Save a learning checkpoint (only restorable in easy mode — see engine.canRestore). */
  checkpoint(label: string) {
    if (!state.mission) return
    set({ checkpoints: [...state.checkpoints, createCheckpoint(state.mission, label)].slice(-12) })
  },
  canRestore(): boolean { return !!state.mission && canRestore(state.mission) && state.checkpoints.length > 0 },
  /** Restore the most recent checkpoint (or a specific one) and jump to its level's screen. */
  restore(index = state.checkpoints.length - 1) {
    const cp = state.checkpoints[index]
    if (!cp) return
    const mission = restoreCheckpoint(cp)
    const screen: ScreenId = cp.level === 1 ? 'level1' : cp.level === 2 ? 'level2' : 'level3'
    set({ mission, checkpoints: state.checkpoints.slice(0, index + 1), screen })
  },

  /** Start over from level 1 keeping avatar, language and difficulty. */
  restart() { set({ mission: null, checkpoints: [], screen: 'level1' }) },
}
