// Scenes 1–3: OPEN (Earth → Saturn), TITLE slam, BUILD (ship design with truthful engine numbers).
import { useMemo, type ReactNode } from 'react'
import type { ShipConfig, ShipPart } from '../art/ships'
import { COMPONENTS, LOADS, PARAMS } from '../engine/data'
import { designReport } from '../engine/engine'
import { At, Check, COMMANDER, MAstro, MEarth, MSaturn, MShip, Ring } from './art'
import { appear, backOut, easeIn, easeInOut, easeOut, lerp, pop, prog, punch, slam } from './lib'
import type { SceneProps } from './Trailer'

/* ------------------------------------------------------------------ */
/* 1 · OPEN                                                            */
/* ------------------------------------------------------------------ */
export const SATURN_REST = { x: 1090, y: 430, size: 1280 }

export function OpenScene({ t }: SceneProps) {
  // camera pulls back: Earth shrinks into the distance…
  const eP = easeIn(prog(t, 0.45, 1.75))
  const eS = lerp(1, 0.02, eP)
  const eO = 1 - prog(t, 1.55, 1.8)
  // …and Saturn sweeps in from behind the camera
  const sP = easeOut(prog(t, 1.45, 2.8))
  const sS = lerp(3.2, 1, sP)
  const sX = lerp(2700, SATURN_REST.x, sP)
  const sY = lerp(120, SATURN_REST.y, sP)
  return (
    <>
      {eO > 0 && (
        <div className="tr-at" style={{ left: 960 - 330, top: 450 - 330, opacity: eO, transform: `translate(${lerp(0, -40, eP)}px, ${lerp(0, 30, eP)}px) scale(${eS})` }}>
          <MEarth size={660} />
        </div>
      )}
      <At x={110} y={90} s={pop(t, 0.2) * (1 - prog(t, 0.9, 1.1))} origin="left center" className="tr-tag tr-tag--teal">EARTH · 2061</At>

      {t > 1.4 && (
        <div className="tr-at" style={{ left: sX - SATURN_REST.size / 2, top: sY - SATURN_REST.size / 2, transform: `scale(${sS})` }}>
          <MSaturn size={SATURN_REST.size} tilt={20} roll={-16} />
        </div>
      )}
      <At x={110} y={90} s={pop(t, 2.45)} origin="left center" className="tr-tag tr-tag--yellow">SATURN</At>
      <At x={110} y={178} s={pop(t, 2.6)} origin="left center" className="tr-tag tr-tag--small">1.4 BILLION KM FROM THE SUN</At>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* 2 · TITLE                                                           */
/* ------------------------------------------------------------------ */
const SPARKS: Array<[number, number, number, number]> = [
  [170, 250, 0.2, 70], [1190, 180, 0.32, 90], [1010, 640, 0.45, 60], [330, 690, 0.55, 80], [690, 150, 0.7, 54], [1290, 520, 0.85, 64],
]

export function Sparkle({ x, y, size, p }: { x: number; y: number; size: number; p: number }) {
  if (p <= 0 || p >= 1) return null
  const s = Math.sin(p * Math.PI)
  return (
    <svg className="tr-at" style={{ left: x - size / 2, top: y - size / 2, transform: `scale(${s}) rotate(${p * 90}deg)` }} width={size} height={size} viewBox="-10 -10 20 20" aria-hidden>
      <path d="M0,-10 L2.2,-2.2 L10,0 L2.2,2.2 L0,10 L-2.2,2.2 L-10,0 L-2.2,-2.2 Z" fill="#FFF6C9" stroke="#111326" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}

export function Logo({ t, at = 0, scale = 1 }: { t: number; at?: number; scale?: number }) {
  return (
    <div className="tr-logo" style={{ transform: `scale(${scale})` }}>
      <div className="tr-logo__top" style={{ opacity: appear(t, at), transform: `scale(${slam(t, at, 0.17, 3.4)}) rotate(-3deg)` }}>SPACE ODYSSEY</div>
      <div className="tr-logo__sub" style={{ transform: `scale(${pop(t, at + 0.2, 0.3)}) rotate(-3deg)` }}>MISSION SATURN</div>
    </div>
  )
}

export function TitleScene({ t }: SceneProps) {
  const rise = backOut(prog(t, 0.22, 0.6), 1.2)
  return (
    <>
      <div className="tr-at" style={{ left: SATURN_REST.x - SATURN_REST.size / 2, top: SATURN_REST.y - SATURN_REST.size / 2, opacity: 0.5 }}>
        <MSaturn size={SATURN_REST.size} tilt={20} roll={-16} />
      </div>
      <div className="tr-shade" />
      <At x={80} y={190} w={1280}>
        <Logo t={t} />
      </At>
      {SPARKS.map(([x, y, at, size], i) => <Sparkle key={i} x={x} y={y} size={size} p={prog(t, at, at + 0.55)} />)}
      <div className="tr-at" style={{ left: 1370, top: lerp(1100, 250, rise) }}>
        <MAstro config={COMMANDER} pose="wave" expression="happy" size={720} />
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* 3 · BUILD                                                           */
/* ------------------------------------------------------------------ */
const PARTS: ShipPart[] = ['structure', 'propulsion', 'power', 'lifeSupport', 'comms']
const FIRST: ShipConfig = { structure: 'reinforced', propulsion: 'combined', power: 'nuclear', lifeSupport: 'regenerative', comms: 'redundant' }
const FINAL: ShipConfig = { ...FIRST, comms: 'standard' }
const FLY = [0.42, 0.97, 1.52, 2.07, 2.62]
const FLY_DUR = 0.25
const INSTALL = FLY.map((f) => f + FLY_DUR) // .67 1.22 1.77 2.32 2.87
const SWAP = 3.5
const NAMES: Record<ShipPart, string> = { structure: 'STRUCTURE', propulsion: 'PROPULSION', power: 'POWER', lifeSupport: 'LIFE SUPPORT', comms: 'COMMS' }
const OPTION: Record<string, string> = {
  reinforced: 'Reinforced hull', combined: 'Chemical + ion', nuclear: 'Nuclear reactor', regenerative: 'Recycling system', redundant: 'Twin antennas', standard: 'Single antenna',
}
const TILE: Record<ShipPart, string> = { structure: '#8896B3', propulsion: '#FF8C32', power: '#FFD447', lifeSupport: '#65D68A', comms: '#38D9D0' }
// where each part snaps on the ship (Spaceship viewBox units; the ship is drawn 1:1 at 760 px)
const ANCHOR: Record<ShipPart, [number, number]> = { structure: [540, 240], propulsion: [228, 240], power: [350, 96], lifeSupport: [363, 240], comms: [540, 150] }
const SHIP_W = 1140
const SHIP_K = SHIP_W / 760
const SHIP_X = 998 - SHIP_W / 2
const SHIP_Y = 406 - (SHIP_W * 480) / 760 / 2
const CARD_X = 70
const CARD_Y = 116
const CARD_GAP = 148

const partCost = (part: ShipPart, cfg: Partial<ShipConfig>) => {
  const choice = cfg[part]
  return choice ? (COMPONENTS[part] as Record<string, { cost: number; mass: number }>)[choice] : undefined
}

interface Numbers { cost: number; mass: number; gen: number; load: number; ready: boolean }

/** Meter values for a (possibly partial) design. Complete designs come straight from the rules engine. */
function numbers(cfg: Partial<ShipConfig>): Numbers {
  if (PARTS.every((p) => cfg[p])) {
    const r = designReport(cfg as ShipConfig)
    return { cost: r.cost, mass: r.mass, gen: r.powerGen, load: r.essentialLoad, ready: r.canLaunch }
  }
  let cost = 0
  let mass = PARAMS.commonMass
  for (const p of PARTS) {
    const c = partCost(p, cfg)
    if (c) { cost += c.cost; mass += c.mass }
  }
  const gen = cfg.power ? COMPONENTS.power[cfg.power].generation : 0
  const load = !cfg.power ? 0
    : LOADS.essentials + (cfg.lifeSupport === 'regenerative' ? LOADS.regenerative : 0) + (cfg.comms === 'redundant' ? LOADS.commsRedundant : 0)
  return { cost, mass, gen, load, ready: false }
}

const configAt = (step: number): Partial<ShipConfig> => {
  const cfg: Partial<ShipConfig> = {}
  const src = step > 5 ? FINAL : FIRST
  PARTS.forEach((p, i) => { if (i < Math.min(step, 5)) (cfg as Record<string, string>)[p] = src[p] })
  return cfg
}
// step 0 = empty hologram … 5 = everything on (over budget) … 6 = cheaper comms (ready)
const STEP_T = [-9, ...INSTALL, SWAP]
const STEP_CFG = STEP_T.map((_, i) => configAt(i))
const STEP_NUM = STEP_CFG.map(numbers)

function PartIcon({ part }: { part: ShipPart }) {
  const common = { fill: 'none', stroke: '#111326', strokeWidth: 5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  let body: ReactNode
  if (part === 'structure') body = <><path d="M32,8 L54,20 V44 L32,56 L10,44 V20 Z" {...common} fill="#F5F7FF" /><path d="M10,20 L32,32 L54,20 M32,32 V56" {...common} /></>
  else if (part === 'propulsion') body = <><path d="M32,6 Q48,22 42,40 H22 Q16,22 32,6 Z" {...common} fill="#F5F7FF" /><path d="M24,42 Q32,62 40,42 Z" {...common} fill="#F04452" /><circle cx="32" cy="24" r="5" {...common} fill="#38D9D0" /></>
  else if (part === 'power') body = <path d="M36,6 L14,36 H30 L26,58 L50,26 H34 Z" {...common} fill="#F5F7FF" />
  else if (part === 'lifeSupport') body = <><path d="M32,8 Q52,32 44,46 Q32,60 20,46 Q12,32 32,8 Z" {...common} fill="#F5F7FF" /><path d="M26,42 q6,6 12,0" {...common} strokeWidth={4} /></>
  else body = <><path d="M12,30 Q32,50 52,30 Q32,36 12,30 Z" {...common} fill="#F5F7FF" /><path d="M32,34 V54 M22,56 H42 M32,30 V20" {...common} /><circle cx="32" cy="15" r="4" fill="#111326" /></>
  return <svg width="72" height="72" viewBox="0 0 64 64" aria-hidden>{body}</svg>
}

function Meter({ label, value, limit, text, state, bump }: { label: string; value: number; limit: number; text: string; state: 'ok' | 'bad' | 'good' | 'idle'; bump: number }) {
  const max = limit * 1.18
  return (
    <div className={`tr-meter tr-meter--${state}`} style={{ transform: `scale(${bump})` }}>
      <div className="tr-meter__head">
        <span>{label}</span>
        <b>{text}</b>
      </div>
      <div className="tr-meter__bar">
        <div className="tr-meter__fill" style={{ width: `${Math.min(1, value / max) * 100}%` }} />
        <div className="tr-meter__limit" style={{ left: `${(limit / max) * 100}%` }} />
      </div>
    </div>
  )
}

export function BuildScene({ t }: SceneProps) {
  let step = 0
  while (step < STEP_T.length - 1 && t >= STEP_T[step + 1]) step++
  const config = STEP_CFG[step]
  const from = STEP_NUM[Math.max(0, step - 1)]
  const to = STEP_NUM[step]
  const k = easeOut(prog(t, STEP_T[step], STEP_T[step] + 0.28))
  const cost = Math.round(lerp(from.cost, to.cost, k))
  const mass = Math.round(lerp(from.mass, to.mass, k))
  const gen = Math.round(lerp(from.gen, to.gen, k))
  const load = Math.round(lerp(from.load, to.load, k))
  const over = step === 5
  const ready = step === 6 && to.ready
  const bump = punch(t, STEP_T[step], 0.07, 0.25)
  const stamp = useMemo(() => ({ over: `OVER BUDGET!  +${STEP_NUM[5].cost - PARAMS.budget}`, saved: STEP_NUM[5].cost - STEP_NUM[6].cost }), [])
  const blink = over && Math.floor((t - INSTALL[4]) * 9) % 2 === 0

  return (
    <>
      <div className="tr-shade tr-shade--deep" />
      <At x={70} y={34} s={pop(t, 0.02)} origin="left center" className="tr-tag tr-tag--teal">LEVEL 1 · DESIGN YOUR SHIP</At>

      {/* hangar bay with the ship */}
      <div className="tr-bay" style={{ left: 590, top: 116, width: 816, height: 580 }}>
        <div className="tr-bay__grid" />
      </div>
      <div className="tr-at" style={{ left: SHIP_X, top: SHIP_Y + Math.sin(t * 2.2) * 5, width: SHIP_W, transform: `scale(${ready ? punch(t, SWAP, 0.06, 0.4) : 1})` }}>
        <MShip config={config} assembling width={SHIP_W} thrust={ready && t > SWAP + 0.5 ? 'both' : 'off'} />
      </div>

      {/* part cards */}
      {PARTS.map((part, i) => {
        const y = CARD_Y + i * CARD_GAP
        const inP = pop(t, 0.06 + i * 0.06, 0.3)
        if (inP <= 0) return null
        const flying = t >= FLY[i] && t < INSTALL[i]
        const done = t >= INSTALL[i]
        const swapped = part === 'comms' && t >= SWAP
        const flip = part === 'comms' ? Math.abs(Math.cos(prog(t, SWAP - 0.13, SWAP + 0.13) * Math.PI)) : 1
        const choice = (swapped ? FINAL : FIRST)[part]
        const c = partCost(part, swapped ? FINAL : FIRST)!
        const hot = part === 'comms' && over
        const s = inP * (flying ? 1.06 : 1) * punch(t, INSTALL[i], 0.08, 0.25) * (part === 'comms' ? punch(t, SWAP, 0.12, 0.35) : 1)
        return (
          <div
            key={part}
            className={`tr-card${done ? ' is-done' : ''}${flying ? ' is-flying' : ''}${hot && blink ? ' is-hot' : ''}${swapped ? ' is-swapped' : ''}`}
            style={{ left: CARD_X, top: y, transform: `scale(${s}, ${s * flip})` }}
          >
            <div className="tr-card__tile" style={{ background: TILE[part] }}><PartIcon part={part} /></div>
            <div className="tr-card__txt">
              <div className="tr-card__name">{NAMES[part]}</div>
              <div className="tr-card__opt">{OPTION[choice]}</div>
            </div>
            <div className="tr-card__cost"><i />{c.cost}</div>
            {done && <div className="tr-card__check" style={{ transform: `scale(${pop(t, INSTALL[i], 0.25)})` }}><Check size={46} /></div>}
          </div>
        )
      })}
      {t >= SWAP && t < SWAP + 0.9 && (
        <At x={600} y={610 - (t - SWAP) * 70} o={1 - prog(t, SWAP + 0.5, SWAP + 0.9)} s={pop(t, SWAP, 0.2)} className="tr-float tr-float--green">−{stamp.saved} BUDGET</At>
      )}

      {/* parts flying from card to ship */}
      {PARTS.map((part, i) => {
        if (t < FLY[i] || t >= INSTALL[i] + 0.35) return null
        const [ax, ay] = ANCHOR[part]
        const tx = SHIP_X + ax * SHIP_K
        const ty = SHIP_Y + ay * SHIP_K
        if (t >= INSTALL[i]) return <Ring key={part} x={tx} y={ty} p={prog(t, INSTALL[i], INSTALL[i] + 0.35)} size={300} color="#FFD447" />
        const p = easeInOut(prog(t, FLY[i], INSTALL[i]))
        const x = lerp(CARD_X + 520, tx, p)
        const y = lerp(CARD_Y + i * CARD_GAP + 66, ty, p) - Math.sin(p * Math.PI) * 110
        return <div key={part} className="tr-orb" style={{ left: x - 34, top: y - 34, background: TILE[part], transform: `scale(${0.7 + Math.sin(p * Math.PI) * 0.6})` }} />
      })}

      {/* live meters */}
      <At x={1446} y={116} w={410} s={pop(t, 0.1)} origin="center top">
        <Meter label="BUDGET" value={cost} limit={PARAMS.budget} text={`${cost} / ${PARAMS.budget}`} state={to.cost > PARAMS.budget ? 'bad' : ready ? 'good' : 'ok'} bump={bump * (over ? punch(t, INSTALL[4], 0.12, 0.4) : 1)} />
        <Meter label="MASS" value={mass} limit={PARAMS.launchMass} text={`${mass} / ${PARAMS.launchMass} t`} state={mass > PARAMS.launchMass ? 'bad' : ready ? 'good' : 'ok'} bump={bump} />
        <Meter label="POWER" value={load} limit={Math.max(gen, 1)} text={gen ? `${load} / ${gen}` : '— / —'} state={!gen ? 'idle' : load > gen ? 'bad' : ready ? 'good' : 'ok'} bump={bump} />
      </At>

      {/* commander reacting */}
      <At x={1446} y={700} w={410} h={160} s={pop(t, 0.3)} className="tr-cam">
        <div className="tr-cam__face"><MAstro config={COMMANDER} bust size={140} expression={over ? 'worried' : ready ? 'happy' : 'determined'} /></div>
        <div className="tr-cam__say">{over ? 'Too expensive!' : ready ? "Let's fly!" : 'Pick your parts…'}</div>
      </At>

      {/* verdict stamp */}
      {over && (
        <At x={640} y={716} w={716} s={slam(t, INSTALL[4], 0.14, 2.4)} r={-3} o={appear(t, INSTALL[4])} className={`tr-stamp tr-stamp--red${blink ? ' is-blink' : ''}`}>{stamp.over}</At>
      )}
      {ready && (
        <At x={640} y={716} w={716} s={slam(t, SWAP + 0.06, 0.14, 2.4) * punch(t, SWAP + 0.5, 0.05, 0.4)} r={-3} o={appear(t, SWAP + 0.06)} className="tr-stamp tr-stamp--green">READY TO LAUNCH</At>
      )}
    </>
  )
}
