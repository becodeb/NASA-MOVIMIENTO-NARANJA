// Scenes 7–9: RETURN (route choice + Titan slingshot), REENTRY, END CARD.
import type { ReentryPhase, ShipConfig } from '../art/ships'
import type { MapRoute, RouteId } from '../art/worlds'
import { PARAMS, ROUTES } from '../engine/data'
import { At, Check, COMMANDER, Cursor, MAP_LABELS, MAstro, MCapsule, MMap, MSaturn, MShip, MTitan, Ring } from './art'
import { appear, countTo, easeIn, easeInOut, easeOut, hash, lerp, pop, prog, punch, slam } from './lib'
import { Logo, Sparkle } from './scenesA'
import type { SceneProps } from './Trailer'

const SHIP: ShipConfig = { structure: 'reinforced', propulsion: 'combined', power: 'nuclear', lifeSupport: 'regenerative', comms: 'standard' }

/* ------------------------------------------------------------------ */
/* 7 · RETURN                                                          */
/* ------------------------------------------------------------------ */
const ROUTE_IDS: RouteId[] = ['fast', 'balanced', 'slow']
const ROUTE_NAME: Record<RouteId, string> = { fast: 'FAST', balanced: 'BALANCED', slow: 'SLOW' }
const ROUTE_COLOR: Record<RouteId, string> = { fast: '#F46AA7', balanced: '#38D9D0', slow: '#FFD447' }
const ROUTES_IDLE: MapRoute[] = ROUTE_IDS.map((id) => ({ id, label: ROUTE_NAME[id] }))
const ROUTES_PICKED: MapRoute[] = ROUTE_IDS.map((id) => ({ id, label: ROUTE_NAME[id], highlighted: id === 'balanced', dashed: id !== 'balanced' }))
const PICK_AT = 1.05
const ZOOM = 1.45
// slingshot path around Titan (cubic Bézier, stage px)
const B: Array<[number, number]> = [[2010, 860], [1500, -80], [420, -80], [-90, 860]]
const bez = (u: number, k: 0 | 1) => {
  const v = 1 - u
  return v * v * v * B[0][k] + 3 * v * v * u * B[1][k] + 3 * v * u * u * B[2][k] + u * u * u * B[3][k]
}
const bezD = (u: number, k: 0 | 1) => {
  const v = 1 - u
  return 3 * v * v * (B[1][k] - B[0][k]) + 6 * v * u * (B[2][k] - B[1][k]) + 3 * u * u * (B[3][k] - B[2][k])
}
const PATH_D = `M${B[0]} C${B[1]} ${B[2]} ${B[3]}`

export function ReturnScene({ t }: SceneProps) {
  const picked = t >= PICK_AT
  const zp = easeIn(prog(t, ZOOM - 0.18, ZOOM))
  const cp = easeInOut(prog(t, 0.5, PICK_AT - 0.08))
  // slingshot: slow in, fastest at closest approach
  const lin = prog(t, ZOOM + 0.05, 3.3)
  const u = lin - (Math.sin(lin * Math.PI * 2) / (Math.PI * 2)) * 0.55
  const x = bez(u, 0)
  const y = bez(u, 1)
  const ang = (Math.atan2(bezD(u, 1), bezD(u, 0)) * 180) / Math.PI
  const zin = easeOut(prog(t, ZOOM, ZOOM + 0.3))
  return (
    <>
      {t < ZOOM && (
        <div className="tr-at tr-fill" style={{ transform: `scale(${1 + zp * 1.6})`, transformOrigin: '1000px 300px', opacity: 1 - zp * 0.6 }}>
          <div className="tr-shade tr-shade--soft" />
          <At x={70} y={34} s={pop(t, 0.1)} origin="left center" className="tr-tag tr-tag--teal">LEVEL 3 · CHOOSE YOUR WAY HOME</At>
          <div className="tr-at" style={{ left: 10, top: 110, width: 1180 }}>
            <MMap routes={picked ? ROUTES_PICKED : ROUTES_IDLE} activeRoute="balanced" progress={null} showTitanFlyby labels={MAP_LABELS} width={1180} />
          </div>
          {ROUTE_IDS.map((id, i) => {
            const mine = id === 'balanced'
            const s = pop(t, 0.16 + i * 0.1, 0.26) * (mine ? punch(t, PICK_AT, 0.1, 0.3) : 1)
            return (
              <At key={id} x={1230} y={150 + i * 176} w={620} s={s} className={`tr-route${picked ? (mine ? ' is-picked' : ' is-off') : ''}`} style={{ borderColor: picked && mine ? '#FFD447' : undefined }}>
                <i style={{ background: ROUTE_COLOR[id] }} />
                <div className="tr-route__name">{ROUTE_NAME[id]}</div>
                <div className="tr-route__stats"><b>{ROUTES[id].months}</b> months<span /> <b>{ROUTES[id].maneuver}</b> fuel</div>
                {picked && mine && <div className="tr-route__check"><Check size={54} /></div>}
              </At>
            )
          })}
          {t >= 0.45 && <Cursor x={lerp(1760, 1640, cp)} y={lerp(960, 150 + 176 + 80, cp)} s={punch(t, PICK_AT - 0.05, -0.25, 0.2)} />}
          <Ring x={1640} y={150 + 176 + 80} p={prog(t, PICK_AT, PICK_AT + 0.35)} size={260} />
        </div>
      )}

      {t >= ZOOM && (
        <div className="tr-at tr-fill" style={{ transform: `scale(${lerp(1.5, 1, zin)})`, transformOrigin: '960px 470px' }}>
          <div className="tr-at" style={{ left: 1390, top: 470, opacity: 0.55 }}><MSaturn size={620} tilt={16} roll={-14} glow={false} /></div>
          <svg className="tr-at" width="1920" height="1080" viewBox="0 0 1920 1080" style={{ left: 0, top: 0, overflow: 'visible' }} aria-hidden>
            <path d={PATH_D} fill="none" stroke="#F5F7FF" strokeOpacity="0.4" strokeWidth="6" strokeDasharray="4 22" strokeLinecap="round" />
            <path d={PATH_D} pathLength={1} fill="none" stroke="#111326" strokeWidth="22" strokeLinecap="round" strokeDasharray={`${u} 2`} />
            <path d={PATH_D} pathLength={1} fill="none" stroke="#FFD447" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${u} 2`} />
          </svg>
          <div className="tr-at" style={{ left: 960 - 270, top: 480 - 270, transform: `scale(${punch(t, ZOOM + 0.9, 0.05, 0.5)})` }}><MTitan size={540} /></div>
          <At x={960 - 110} y={690} w={220} s={pop(t, ZOOM + 0.15)} className="tr-tag tr-tag--orange tr-tag--center">TITAN</At>
          <div className="tr-at" style={{ left: x - 210, top: y - 133, width: 420, transform: `rotate(${ang - 180}deg)` }}>
            <MShip config={SHIP} width={420} facing="left" thrust="ion" />
          </div>
          <At x={70} y={34} s={pop(t, ZOOM + 0.1)} origin="left center" className="tr-tag tr-tag--teal">GRAVITY ASSIST</At>
          {t >= 2.55 && (
            <At x={1250} y={300} w={600} s={slam(t, 2.55, 0.14, 2.6) * punch(t, 2.75, 0.06, 0.3)} r={5} o={appear(t, 2.55)} className="tr-stamp tr-stamp--green">+{PARAMS.titanSaving} FUEL SAVED!</At>
          )}
          {t >= 2.2 && <At x={90} y={330} w={470} s={pop(t, 2.2)} r={-5} className="tr-stamp tr-stamp--yellow tr-stamp--small">FREE SPEED BOOST</At>}
        </div>
      )}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* 8 · REENTRY                                                         */
/* ------------------------------------------------------------------ */
const DROGUE = 1.2
const MAIN = 1.65
const SPLASH = 2.2
const TOUCH = SPLASH + 0.55
const STEPS: Array<[string, number]> = [['HEAT SHIELD', 1.0], ['DROGUE CHUTES', DROGUE + 0.15], ['MAIN CHUTES', MAIN + 0.2], ['SPLASHDOWN', TOUCH]]

export function ReentryScene({ t }: SceneProps) {
  const phase: ReentryPhase = t < 0 ? 'separation' : t < DROGUE ? 'entry' : t < MAIN ? 'drogue' : t < SPLASH ? 'main' : 'splashdown'
  // corridor needle: wobbles between "too shallow" and "too steep", then locks in the green
  const wob = Math.exp(-Math.max(0, t) * 3.6) * Math.cos(t * 10) * 205
  const locked = t >= 0.9
  const speed = t < DROGUE ? lerp(40000, 1400, easeOut(prog(t, 0, DROGUE))) : t < MAIN ? lerp(1400, 300, prog(t, DROGUE, MAIN)) : t < TOUCH ? lerp(300, 25, prog(t, MAIN, TOUCH)) : 0
  const home = t >= TOUCH
  return (
    <>
      <div className="tr-shade tr-shade--deep" />
      <div className="tr-heat" style={{ opacity: 1 - prog(t, DROGUE - 0.2, DROGUE + 0.3) }} />
      <At x={70} y={34} s={pop(t, 0.1)} origin="left center" className="tr-tag tr-tag--teal">RE-ENTRY</At>

      <div className="tr-window" style={{ left: 606, top: 22, width: 708, height: 885 }}>
        <MCapsule phase={phase} corridor="nominal" width={708} />
      </div>

      {/* entry corridor gauge */}
      <At x={70} y={130} w={470} h={740} s={pop(t, 0.05)} className="tr-corr">
        <div className="tr-corr__title">ENTRY ANGLE</div>
        <div className="tr-corr__bar">
          <div className="tr-corr__zone tr-corr__zone--y"><b>TOO SHALLOW</b><span>bounce off</span></div>
          <div className={`tr-corr__zone tr-corr__zone--g${locked ? ' is-lock' : ''}`}><b>CORRIDOR</b><span>{locked ? 'locked!' : 'aim here'}</span></div>
          <div className="tr-corr__zone tr-corr__zone--r"><b>TOO STEEP</b><span>burn up</span></div>
          <div className="tr-corr__needle" style={{ top: 280 + wob, transform: `scale(${punch(t, 0.9, 0.25, 0.3)})` }} />
        </div>
      </At>

      {/* checklist + crew */}
      <At x={1380} y={130} w={470} h={740} s={pop(t, 0.1)} className="tr-list">
        <div className="tr-list__speed"><span>SPEED</span><b>{Math.round(speed / (speed > 1000 ? 100 : 5)) * (speed > 1000 ? 100 : 5)}</b><small>km/h</small></div>
        {STEPS.map(([label, at]) => (
          <div key={label} className={`tr-list__row${t >= at ? ' is-done' : ''}`} style={{ transform: `scale(${punch(t, at, 0.08, 0.25)})` }}>
            <span className="tr-list__box">{t >= at && <span style={{ display: 'block', transform: `scale(${pop(t, at, 0.2)})` }}><Check size={46} /></span>}</span>
            {label}
          </div>
        ))}
        <div className="tr-list__crew">
          <div className="tr-cam__face"><MAstro config={COMMANDER} bust size={140} expression={home ? 'happy' : 'determined'} /></div>
          <div className="tr-cam__say">{home ? 'We made it!' : 'Hold on, crew!'}</div>
        </div>
      </At>

      {home && <At x={640} y={90} w={640} s={slam(t, TOUCH, 0.14, 2.8)} r={-5} o={appear(t, TOUCH)} className="tr-stamp tr-stamp--green">WELCOME HOME!</At>}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* 9 · END CARD                                                        */
/* ------------------------------------------------------------------ */
const SCORE = 92
const SUCCESS = 1.3
const CONFETTI = ['#FFD447', '#FF8C32', '#38D9D0', '#F46AA7', '#65D68A', '#F5F7FF']

function Medal() {
  return (
    <svg width="300" height="380" viewBox="0 0 150 190" aria-hidden>
      <g stroke="#111326" strokeWidth="5" strokeLinejoin="round">
        <path d="M36,6 H66 L84,70 H54 Z" fill="#FF8C32" />
        <path d="M114,6 H84 L66,70 H96 Z" fill="#38D9D0" />
        <circle cx="75" cy="118" r="60" fill="#FFD447" />
        <circle cx="75" cy="118" r="44" fill="#FFE680" strokeWidth="4" />
        <path d="M75,84 L84,106 L108,108 L90,123 L96,146 L75,133 L54,146 L60,123 L42,108 L66,106 Z" fill="#FF8C32" strokeWidth="4.5" />
      </g>
      <path d="M36,92 a52,52 0 0 1 30,-24" fill="none" stroke="#FFF6C9" strokeWidth="7" strokeLinecap="round" />
    </svg>
  )
}

export function EndScene({ t }: SceneProps) {
  const score = countTo(t, 0.3, 1.25, 0, SCORE)
  const rolling = t > 0.3 && t < 1.25
  return (
    <>
      <div className="tr-at" style={{ left: -420, top: 420, opacity: 0.5 }}><MSaturn size={1100} tilt={18} roll={-16} /></div>
      <div className="tr-shade" />

      <At x={320} y={26} w={1280} origin="center top"><Logo t={t} scale={0.58} /></At>

      <At x={170} y={250} w={300} s={pop(t, 0.2, 0.35) * punch(t, SUCCESS, 0.12, 0.35)} r={-8 + Math.sin(t * 2.4) * 3}><Medal /></At>
      <Sparkle x={220} y={300} size={90} p={prog(t, 1.4, 2.1)} />
      <Sparkle x={440} y={520} size={70} p={prog(t, 1.9, 2.6)} />
      <Sparkle x={410} y={270} size={56} p={prog(t, 2.3, 3.0)} />

      <At x={480} y={236} w={960} s={pop(t, 0.25, 0.3) * punch(t, 1.25, 0.14, 0.3) * (rolling ? 1 + 0.02 * Math.sin(t * 60) : 1)} className="tr-score">
        <b>{score}</b><span>/100</span>
      </At>
      {t >= SUCCESS && (
        <At x={560} y={478} w={800} s={slam(t, SUCCESS, 0.14, 3)} r={-3} o={appear(t, SUCCESS)} className="tr-stamp tr-stamp--green">MISSION SUCCESS</At>
      )}
      <Ring x={960} y={530} p={prog(t, SUCCESS, SUCCESS + 0.5)} size={1300} color="#65D68A" />

      <At x={360} y={612} w={1200} s={pop(t, 1.6, 0.25)} className="tr-cta">Learn real mission design — play free</At>
      <At x={560} y={688} w={800} s={pop(t, 1.85, 0.3) * (1 + 0.025 * Math.sin(Math.max(0, t - 2.15) * 7))} className="tr-url">nasa.becode.com.ar</At>
      <At x={360} y={826} w={1200} o={appear(t, 2.1, 0.3)} className="tr-foot">NASA Space Apps Challenge 2026 · Team Movimiento Naranja</At>

      <div className="tr-at" style={{ left: 1440, top: lerp(1100, 250, easeOut(prog(t, 0.15, 0.55))) }}>
        <MAstro config={COMMANDER} pose="cheer" expression="happy" size={580} />
      </div>

      {t >= SUCCESS && Array.from({ length: 70 }, (_, i) => {
        const t0 = SUCCESS + hash(i) * 0.5
        if (t < t0) return null
        const dt = t - t0
        const x = hash(i + 50) * 1920 + Math.sin(dt * 4 + i) * 40
        const y = -40 + dt * (420 + hash(i + 20) * 520)
        if (y > 900) return null
        return <i key={i} className="tr-confetti" style={{ left: x, top: y, background: CONFETTI[i % CONFETTI.length], transform: `rotate(${dt * (200 + hash(i + 9) * 500) + i * 40}deg) scaleY(${0.4 + 0.6 * Math.abs(Math.sin(dt * 7 + i))})` }} />
      })}
    </>
  )
}
