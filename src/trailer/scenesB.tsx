// Scenes 4–6: LAUNCH, CRUISE (Earth → Saturn map), SATURN OPS (emergency montage + decision).
import type { LaunchPhase, ShipConfig } from '../art/ships'
import type { MapRoute } from '../art/worlds'
import { COMPONENTS, PARAMS } from '../engine/data'
import { At, Check, COMMANDER, Cursor, MAP_LABELS, MAstro, MEnceladus, MMap, MRing, MRocket, MSaturn, MShip, MStreak, Ring, Warn } from './art'
import { appear, easeInOut, easeOut, hash, lerp, pop, prog, punch, slam } from './lib'
import type { SceneProps } from './Trailer'

const SHIP: ShipConfig = { structure: 'reinforced', propulsion: 'combined', power: 'nuclear', lifeSupport: 'regenerative', comms: 'standard' }

/* ------------------------------------------------------------------ */
/* 4 · LAUNCH                                                          */
/* ------------------------------------------------------------------ */
const LIFTOFF = 0.4
const ASCENT = 0.8
const CLOUDS: Array<[number, number, number]> = [[120, -300, 1.3], [1450, -520, 1.6], [700, -900, 1.1], [240, -1250, 1.5], [1300, -1500, 1.2], [860, -1900, 1.7]]
const STARS = Array.from({ length: 40 }, (_, i) => [hash(i) * 1920, hash(i + 99) * 1080, 3 + hash(i + 7) * 5])

export function LaunchScene({ t }: SceneProps) {
  const phase: LaunchPhase = t < 0 ? 'pad' : t < LIFTOFF ? 'ignition' : t < ASCENT ? 'liftoff' : 'ascent'
  const up = phase === 'ascent'
  const digit = t < 0.13 ? '3' : t < 0.26 ? '2' : t < LIFTOFF ? '1' : null
  const digitAt = t < 0.13 ? 0 : t < 0.26 ? 0.13 : 0.26
  const smoke = easeOut(prog(t, 0.05, 1.3))
  return (
    <div className={`tr-launch${up ? ' is-up' : ''}`}>
      <div className="tr-launch__sky" />
      <div className="tr-launch__space">
        {STARS.map(([x, y, r], i) => <i key={i} style={{ left: x, top: y, width: r, height: r }} />)}
      </div>
      <div className="tr-launch__clouds">
        {CLOUDS.map(([x, y, s], i) => <div key={i} className="tr-cloud" style={{ left: x, top: y, transform: `scale(${s})` }} />)}
      </div>
      <div className="tr-launch__ground">
        <div className="tr-launch__hills" />
        <div className="tr-launch__pad" />
        {[true, false].map((ink) => Array.from({ length: 14 }, (_, i) => {
          const side = i % 2 ? 1 : -1
          const d = (120 + (i >> 1) * 125) * smoke
          const r = (70 + hash(i) * 70) * (0.3 + 0.7 * smoke) + (ink ? 7 : 0)
          return <div key={`${ink}${i}`} className={ink ? 'tr-puff tr-puff--ink' : 'tr-puff'} style={{ left: 960 + side * d - r, top: 965 - (r - (ink ? 7 : 0)) * 0.8 - hash(i + 3) * 30 - (ink ? 7 : 0), width: r * 2, height: r * 2, opacity: smoke > 0 ? 1 : 0 }} />
        }))}
      </div>
      <div className="tr-at" style={{ left: 600, top: 0, width: 720 }}>
        <MRocket phase={phase} backdrop={false} width={720} />
      </div>

      {digit && <At x={1420} y={300} w={360} s={slam(t, digitAt, 0.1, 2.2)} className="tr-count">{digit}</At>}
      {t >= LIFTOFF && (
        <At x={70} y={330} w={560} s={slam(t, LIFTOFF, 0.15, 3) * punch(t, ASCENT, 0.08, 0.3)} r={-7} o={appear(t, LIFTOFF)} className="tr-stamp tr-stamp--yellow tr-stamp--big">LIFTOFF!</At>
      )}
      {t >= LIFTOFF + 0.25 && (
        <At x={1380} y={330} w={440} h={170} s={pop(t, LIFTOFF + 0.25)} r={4} className="tr-cam">
          <div className="tr-cam__face"><MAstro config={COMMANDER} bust size={140} expression="surprised" /></div>
          <div className="tr-cam__say">Woooo-hoo!</div>
        </At>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 5 · CRUISE                                                          */
/* ------------------------------------------------------------------ */
const OUT_ROUTE: MapRoute[] = [{ id: 'balanced', highlighted: true }]
const FUEL0 = COMPONENTS.propulsion[SHIP.propulsion].maneuver
const LIFE = COMPONENTS.lifeSupport[SHIP.lifeSupport]

function Gauge({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="tr-gauge">
      <div className="tr-gauge__head"><span>{label}</span><b>{value}</b></div>
      <div className="tr-gauge__bar"><div style={{ width: `${(value / max) * 100}%`, background: color }} /></div>
    </div>
  )
}

export function CruiseScene({ t }: SceneProps) {
  const p = easeInOut(prog(t, 0.2, 2.1))
  const month = Math.round(PARAMS.outboundMonths * p)
  const fuel = Math.round(FUEL0 - PARAMS.outboundManeuver * p)
  const life = Math.round(LIFE.vital - LIFE.outboundUse * p)
  const tick = 1 + 0.05 * Math.abs(Math.sin(p * PARAMS.outboundMonths * Math.PI))
  return (
    <>
      <div className="tr-shade tr-shade--deep" />
      <At x={70} y={34} s={pop(t, 0.1)} origin="left center" className="tr-tag tr-tag--teal">OUTBOUND · EARTH → SATURN</At>
      <div className="tr-at" style={{ left: 10, top: 70, width: 1440 }}>
        <MMap routes={OUT_ROUTE} activeRoute="balanced" progress={p} labels={MAP_LABELS} width={1440} />
      </div>
      <At x={1470} y={150} w={390} s={pop(t, 0.12)} className="tr-side">
        <div className="tr-side__label">MONTH</div>
        <div className="tr-side__big" style={{ transform: `scale(${tick})` }}>{month}<small>/ {PARAMS.outboundMonths}</small></div>
        <Gauge label="FUEL" value={fuel} max={FUEL0} color="#FF8C32" />
        <Gauge label="AIR · WATER · FOOD" value={life} max={LIFE.vital} color="#38D9D0" />
        <Gauge label="CREW" value={PARAMS.crew} max={PARAMS.crew} color="#65D68A" />
      </At>
      {t >= 2.1 && <At x={1040} y={150} w={420} s={slam(t, 2.1, 0.14, 2.6)} r={-5} o={appear(t, 2.1)} className="tr-stamp tr-stamp--yellow">ARRIVAL!</At>}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* 6 · SATURN OPS                                                      */
/* ------------------------------------------------------------------ */
const SCI_IN = 0.35
const SCI_OUT = 1.15
const EMERG = [1.2, 1.9, 2.6, 3.3]
const CARD = 3.9
const CLICK = 5.3
const FIXED = 5.5
const ALERTS = ['ANTENNA FAILURE!', 'MICROMETEOROID HIT!', 'CO₂ RISING!', 'POWER DROP!']
// callout chips: [text, x, y] around the ship
const CHIPS: Array<[string, number, number]> = [
  ['NO SIGNAL', 1010, 236],
  [`HULL −${COMPONENTS.structure[SHIP.structure].impactLoss}`, 640, 706],
  ['CO₂ ▲', 520, 300],
  [`BATTERY −${PARAMS.powerEventLoss}`, 1000, 720],
]
const OPTIONS = ['Shed optional loads', 'Locate the faulty circuit', 'Ignore it'] // engine.opt.power.*
const PICK = 0

export function OpsScene({ t }: SceneProps) {
  const crisis = t >= EMERG[0] && t < FIXED
  let n = -1
  for (let i = 0; i < EMERG.length; i++) if (t >= EMERG[i]) n = i
  const fixed = t >= FIXED
  const arrive = easeOut(prog(t, 0, 0.8))
  const shift = easeInOut(prog(t, CARD - 0.15, CARD + 0.25)) * 60
  const shipX = 400 + (1 - arrive) * 1100 - shift
  const shipY = 211 + Math.sin(t * 1.7) * 9
  const dark = t >= EMERG[3] && !fixed && (t < EMERG[3] + 0.5 ? Math.floor((t - EMERG[3]) * 14) % 2 === 0 : true)
  const pose = fixed ? 'thumbs-up' : crisis ? 'worried' : 'point'
  const expr = fixed ? 'happy' : crisis ? 'worried' : 'happy'
  // cursor glides to the chosen option, then clicks
  const cp = easeInOut(prog(t, CARD + 0.45, CLICK - 0.1))
  const optY = 362 + PICK * 112
  const curX = lerp(1780, 1640, cp)
  const curY = lerp(980, optY + 46, cp)
  const picked = t >= CLICK

  return (
    <>
      <div className="tr-at" style={{ left: 610 - t * 8, top: 190, opacity: 0.96 }}>
        <MSaturn size={1900} tilt={14} roll={-12} glow={false} />
      </div>
      <div className="tr-at tr-fill" style={{ opacity: 0.55 }}><MRing density={0.5} speed={1.4} /></div>
      <At x={70} y={34} s={pop(t, 0.15) * (crisis ? 0 : 1)} origin="left center" className="tr-tag tr-tag--teal">LEVEL 2 · SATURN ORBIT</At>

      <div className="tr-at" style={{ left: shipX, top: shipY, width: 1000, transform: `rotate(${crisis ? Math.sin(t * 9) * 1.2 : -2}deg) scale(${punch(t, FIXED, 0.08, 0.4)})` }}>
        <MShip
          config={SHIP}
          width={1000}
          thrust={t < 0.7 ? 'ion' : 'off'}
          antenna={t >= EMERG[0] && !fixed ? 'main-failed' : 'ok'}
          damage={t >= EMERG[1] && !fixed ? 0.7 : 0}
          alarm={crisis}
          lightsOn={!dark}
        />
      </div>
      {t >= EMERG[1] - 0.17 && t < EMERG[1] + 0.9 && <div className="tr-at tr-fill"><MStreak trigger={1} x={47 - shift / 19.2} y={49} scale={2.6} angle={24} /></div>}

      {/* science beat */}
      {t >= SCI_IN && t < SCI_OUT + 0.2 && (
        <At x={1380} y={70} w={430} h={430} s={pop(t, SCI_IN, 0.3) * (1 - easeOut(prog(t, SCI_OUT, SCI_OUT + 0.2)))} className="tr-lens">
          <div className="tr-lens__body"><MEnceladus size={300} /></div>
          <div className="tr-lens__label">ENCELADUS · ICE GEYSERS</div>
        </At>
      )}
      {t >= SCI_IN + 0.3 && t < SCI_OUT + 0.25 && (
        <At x={1010} y={250 - (t - SCI_IN - 0.3) * 70} w={420} s={pop(t, SCI_IN + 0.3, 0.22)} o={1 - prog(t, SCI_OUT, SCI_OUT + 0.25)} className="tr-float tr-float--yellow">+{PARAMS.investigationPoints} SCIENCE</At>
      )}

      {/* alarm banner + callouts */}
      {crisis && n >= 0 && (
        <At x={470} y={40} w={980} s={slam(t, EMERG[n], 0.12, 1.9)} className="tr-alert">
          <Warn size={76} />
          <span>{ALERTS[n]}</span>
          <b>{n + 1}/6</b>
        </At>
      )}
      {CHIPS.map(([text, x, y], i) => {
        if (t < EMERG[i] + 0.08 || fixed) return null
        return <At key={i} x={x - shift} y={y} s={pop(t, EMERG[i] + 0.08, 0.22)} r={i % 2 ? 4 : -5} className="tr-chip">{text}</At>
      })}

      {/* commander */}
      <div className="tr-at" style={{ left: 60, top: 430 + (1 - easeOut(prog(t, 0.2, 0.7))) * 700, transform: `scale(${punch(t, FIXED, 0.1, 0.4)})`, transformOrigin: 'center bottom' }}>
        <MAstro config={COMMANDER} pose={pose} expression={expr} size={520} />
      </div>

      {/* decision card */}
      {t >= CARD && (
        <At x={1300} y={250} w={560} s={pop(t, CARD, 0.3)} origin="center top" className="tr-decide">
          <div className="tr-decide__head">YOUR CALL, COMMANDER</div>
          {OPTIONS.map((o, i) => {
            const mine = i === PICK
            const cls = picked ? (mine ? ' is-picked' : ' is-off') : cp > 0.92 && mine ? ' is-hover' : ''
            return (
              <div key={o} className={`tr-decide__opt${cls}`} style={{ transform: `scale(${pop(t, CARD + 0.12 + i * 0.08, 0.22) * (mine ? punch(t, CLICK, 0.08, 0.25) : 1)})` }}>
                <i>{'ABC'[i]}</i>
                <span>{o}</span>
                {picked && mine && <Check size={44} />}
              </div>
            )
          })}
        </At>
      )}
      {t >= CARD + 0.35 && !fixed && <Cursor x={curX} y={curY} s={punch(t, CLICK - 0.05, -0.25, 0.2)} />}
      <Ring x={1640} y={optY + 46} p={prog(t, CLICK, CLICK + 0.35)} size={260} color="#65D68A" />

      {fixed && (
        <At x={520} y={90} w={720} s={slam(t, FIXED, 0.14, 3) * punch(t, FIXED + 0.14, 0.06, 0.3)} r={-6} o={appear(t, FIXED)} className="tr-stamp tr-stamp--green tr-stamp--big">FIXED!</At>
      )}
      {fixed && [0, 1, 2, 3, 4, 5].map((i) => (
        <Ring key={i} x={880 + Math.cos(i * 1.05) * 330} y={480 + Math.sin(i * 1.05) * 210} p={prog(t, FIXED + i * 0.03, FIXED + 0.45 + i * 0.03)} size={150} color={i % 2 ? '#65D68A' : '#FFD447'} />
      ))}
    </>
  )
}
