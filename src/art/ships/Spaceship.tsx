import { useId, useState, type ReactNode } from 'react'
import './ships.css'
import { ExhaustPlume, SmokePuff, Sparkle, Sparks } from './bits'
import { CapsuleShape } from './CapsuleShape'
import { C, SHIP_PARTS, cx, type AntennaState, type Facing, type ShipConfig, type ShipPart, type ThrustMode } from './types'

export type SpaceshipProps = {
  /** Missing keys render as holographic teal outlines (design screen). */
  config: Partial<ShipConfig>
  /** When true, the part whose value just changed snaps in with a bounce + sparkle. */
  assembling?: boolean
  thrust?: ThrustMode
  /** 0..1 — dents, sparks, smoke. */
  damage?: number
  alarm?: boolean
  antenna?: AntennaState
  lightsOn?: boolean
  facing?: Facing
  width?: number | string
  animate?: boolean
  className?: string
  /** Accessible label. */
  title?: string
}

const VB_W = 760
const VB_H = 480
const CY = 240

const SNAP_ANCHOR: Record<ShipPart, [number, number]> = {
  structure: [540, 240],
  propulsion: [228, 240],
  power: [350, 96],
  lifeSupport: [363, 240],
  comms: [540, 150],
}

/* ---------- small drawing helpers ---------- */

function Hull({ x, y, w, h, rx, fill = C.white, shade = C.shade }: { x: number; y: number; w: number; h: number; rx: number; fill?: string; shade?: string }) {
  const sy = y + h * 0.62
  return (
    <>
      <rect x={x} y={y} width={w} height={h} rx={rx} fill={fill} />
      <path
        className="sh-nog"
        d={`M${x},${sy} H${x + w} V${y + h - rx} Q${x + w},${y + h} ${x + w - rx},${y + h} H${x + rx} Q${x},${y + h} ${x},${y + h - rx} Z`}
        fill={shade}
        stroke="none"
      />
      <rect x={x} y={y} width={w} height={h} rx={rx} fill="none" />
    </>
  )
}

function Trefoil({ x, y, r }: { x: number; y: number; r: number }) {
  const blade = (a: number) => {
    const a0 = ((a - 30) * Math.PI) / 180
    const a1 = ((a + 30) * Math.PI) / 180
    const ri = r * 0.28
    const ro = r * 0.82
    return `M${Math.cos(a0) * ri},${Math.sin(a0) * ri} L${Math.cos(a0) * ro},${Math.sin(a0) * ro} A${ro},${ro} 0 0 1 ${Math.cos(a1) * ro},${Math.sin(a1) * ro} L${Math.cos(a1) * ri},${Math.sin(a1) * ri} Z`
  }
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={r} fill={C.yellow} strokeWidth={3} />
      <g className="sh-nog" fill={C.ink} stroke="none">
        <path d={blade(-90)} />
        <path d={blade(30)} />
        <path d={blade(150)} />
        <circle r={r * 0.16} />
      </g>
    </g>
  )
}

function Dish({ x, y, scale = 1, tilt = 22, failed = false }: { x: number; y: number; scale?: number; tilt?: number; failed?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M-9,0 L-4,-10 L4,-10 L9,0 Z" fill={C.metal} />
      <line x1={0} y1={-10} x2={0} y2={-32} strokeWidth={6} />
      <line className="sh-nog" x1={0} y1={-10} x2={0} y2={-32} stroke={C.metalLight} strokeWidth={2.5} />
      <g transform="translate(0 -32)">
        <g className={cx(failed && 'sh-droop')} transform={failed ? undefined : `rotate(${tilt})`}>
          {/* feed struts + horn */}
          <path d={failed ? 'M-30,-14 L-6,-40 M30,-14 L-2,-30' : 'M-30,-14 L0,-48 M30,-14 L0,-48'} fill="none" strokeWidth={3} />
          <circle cx={failed ? -6 : 0} cy={failed ? -40 : -48} r={5.5} fill={C.orange} strokeWidth={3} />
          {/* bowl */}
          <path d="M-46,-14 C-32,22 32,22 46,-14 Z" fill={C.white} />
          <path className="sh-nog" d="M-2,13 C22,12 38,2 46,-14 L36,-14 C28,0 14,8 -2,13 Z" fill={C.shade} stroke="none" />
          <ellipse cx={0} cy={-14} rx={46} ry={9} fill={C.metalLight} />
          <ellipse className="sh-nog" cx={0} cy={-13} rx={30} ry={4.5} fill={C.metal} stroke="none" opacity="0.6" />
          {failed && (
            <g className="sh-nog">
              <path d="M46,-14 L30,-10 L36,-2 L24,2 L30,10 C38,4 43,-4 46,-14 Z" fill="#2B3350" strokeWidth={2.5} />
              <path d="M-22,8 L-12,-2 L-20,-8 L-8,-16 M8,12 L4,2 L12,-6" fill="none" strokeWidth={2.5} />
            </g>
          )}
        </g>
        <circle r={6} fill={C.metalDark} strokeWidth={3} />
        {failed && <Sparks as="g" size={18} count={5} />}
      </g>
    </g>
  )
}

function Rcs({ x, y, flip = false, delay = 0, lit = true }: { x: number; y: number; flip?: boolean; delay?: number; lit?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(1 ${flip ? -1 : 1})`}>
      <path d="M-8,0 L-11,-9 L-4,-9 L0,-3 L4,-9 L11,-9 L8,0 Z" fill={C.metalDark} strokeWidth={3} />
      {lit && <ellipse className="sh-rcs sh-nog" style={{ animationDelay: `${delay}s` }} cx={-8} cy={-17} rx={5} ry={9} fill="#FFFFFF" stroke="none" />}
    </g>
  )
}

function Dent({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g className="sh-dent" transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse rx={15} ry={10} fill="#2B3350" stroke="none" opacity="0.32" />
      <path d="M-9,-3 L-2,-6 L5,-4 L9,2 L3,6 L-5,5 Z" fill="#4A5270" strokeWidth={2.5} />
      <path d="M9,2 L17,6 L21,2 M-9,-3 L-17,-8 M3,6 L6,14" fill="none" strokeWidth={2.2} />
    </g>
  )
}

/* ---------- parts ---------- */

function SolarWings({ clip }: { clip: string }) {
  const X = 256, Y = 20, W = 188, H = 146
  const wing = (
    <g>
      <rect x={346} y={Y + H - 2} width={8} height={CY - Y - H} fill={C.metal} strokeWidth={3} />
      <path d={`M350,${Y + H + 22} L${X + 50},${Y + H} M350,${Y + H + 22} L${X + W - 50},${Y + H}`} fill="none" strokeWidth={3.5} />
      <rect x={X} y={Y} width={W} height={H} rx={8} fill={C.panel} />
      <g className="sh-nog" clipPath={`url(#${clip})`} stroke="none">
        <rect x={X} y={Y + H * 0.62} width={W} height={H * 0.38} fill={C.panelDark} />
        <g stroke="#7FB2FF" strokeWidth={1.6} opacity="0.85">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => <line key={`v${i}`} x1={X + (W * i) / 8} y1={Y} x2={X + (W * i) / 8} y2={Y + H} />)}
          {[1, 2, 3, 4].map((j) => <line key={`h${j}`} x1={X} y1={Y + (H * j) / 5} x2={X + W} y2={Y + (H * j) / 5} />)}
        </g>
        <rect className="sh-glint" x={X - 90} y={Y - 20} width={46} height={H + 40} fill="#FFFFFF" opacity="0.28" transform={`skewX(-22)`} />
      </g>
      <line className="sh-nog" x1={350} y1={Y} x2={350} y2={Y + H} strokeWidth={4} />
      <rect className="sh-nog" x={X + 4} y={Y + H - 9} width={W - 8} height={5} rx={2} fill={C.yellow} stroke="none" />
      <rect x={X} y={Y} width={W} height={H} rx={8} fill="none" />
    </g>
  )
  return (
    <>
      <defs>
        <clipPath id={clip}>
          <rect x={X} y={Y} width={W} height={H} rx={8} />
        </clipPath>
      </defs>
      {wing}
      <g transform={`translate(0 ${VB_H}) scale(1 -1)`}>{wing}</g>
    </>
  )
}

function NuclearBoom() {
  const zig: string[] = []
  for (let x = 50; x < 236; x += 16) zig.push(`M${x},246 L${x + 8},234 L${x + 16},246`)
  const fin = (s: 1 | -1) => `M112,${CY - s * 9} L112,${CY - s * 50} L50,${CY - s * 62} L50,${CY - s * 9} Z`
  return (
    <>
      {/* truss boom keeps the reactor far from the crew */}
      <path d="M44,234 H238 M44,246 H238" fill="none" strokeWidth={4} />
      <path className="sh-nog" d={zig.join(' ')} fill="none" strokeWidth={2.5} />
      {/* radiator fins */}
      {([1, -1] as const).map((s) => (
        <g key={s}>
          <path d={fin(s)} fill="#B5483A" />
          <path className="sh-rad-glow sh-nog" d={fin(s)} fill="#FFB347" stroke="none" />
          <g className="sh-nog" fill="none" stroke="#7C2A26" strokeWidth={2.2}>
            <path d={`M66,${CY - s * 12} V${CY - s * 57} M82,${CY - s * 12} V${CY - s * 54} M98,${CY - s * 12} V${CY - s * 51}`} />
          </g>
          <path d={fin(s)} fill="none" />
        </g>
      ))}
      {/* shadow shield + reactor */}
      <rect x={38} y={212} width={11} height={56} rx={4} fill={C.metal} />
      <Hull x={6} y={218} w={32} h={44} rx={9} fill={C.metalDark} shade="#465070" />
      <Trefoil x={22} y={240} r={10} />
    </>
  )
}

function Engines({ combined, ionLit }: { combined: boolean; ionLit: boolean }) {
  const bell = (cy: number) =>
    `M242,${cy - 8} L236,${cy - 8} C222,${cy - 10} 204,${cy - 17} 192,${cy - 21} L192,${cy + 21} C204,${cy + 17} 222,${cy + 10} 236,${cy + 8} L242,${cy + 8} Z`
  return (
    <>
      {combined &&
        ([-1, 1] as const).map((s) => (
          <g key={s}>
            <path d={`M286,${CY + s * 34} L240,${CY + s * 66}`} fill="none" strokeWidth={7} />
            <path className="sh-nog" d={`M286,${CY + s * 34} L240,${CY + s * 66}`} fill="none" stroke={C.metal} strokeWidth={3} />
            <rect x={208} y={CY + s * 70 - 12} width={44} height={24} rx={9} fill={C.teal} />
            <rect className="sh-nog" x={210} y={CY + s * 70 + 2} width={40} height={8} rx={4} fill={C.tealDark} stroke="none" />
            <path className="sh-nog" d={`M224,${CY + s * 70 - 12} v24 M236,${CY + s * 70 - 12} v24`} fill="none" strokeWidth={2.5} />
            <rect x={208} y={CY + s * 70 - 12} width={44} height={24} rx={9} fill="none" />
            <ellipse className={cx('sh-nog', ionLit && 'sh-ion-ring')} cx={208} cy={CY + s * 70} rx={4.5} ry={10} fill={ionLit ? '#BFF6FF' : '#3D7BFF'} strokeWidth={3} />
          </g>
        ))}
      {[216, 264].map((cy) => (
        <g key={cy}>
          <path d={bell(cy)} fill={C.metalDark} />
          <path className="sh-nog" d={`M236,${cy + 8} C222,${cy + 10} 204,${cy + 17} 192,${cy + 21} L192,${cy + 6} C206,${cy + 6} 222,${cy + 4} 236,${cy + 3} Z`} fill="#465070" stroke="none" />
          <path className="sh-nog" d={`M222,${cy - 11} V${cy + 11} M207,${cy - 16} V${cy + 16}`} fill="none" strokeWidth={2.5} />
          <path d={bell(cy)} fill="none" />
          <ellipse className="sh-nog" cx={192} cy={cy} rx={4.5} ry={21} fill="#2B3350" strokeWidth={3} />
        </g>
      ))}
      <Hull x={240} y={204} w={76} h={72} rx={12} fill={C.metalLight} shade={C.metal} />
      <rect className="sh-nog" x={262} y={204} width={13} height={72} fill={C.orange} strokeWidth={3} />
      <circle className="sh-nog" cx={296} cy={226} r={7} fill={C.white} strokeWidth={3} />
      <path className="sh-nog" d="M288,250 h16 M288,258 h16" fill="none" strokeWidth={2.5} />
    </>
  )
}

function Consumables() {
  const tank = (x: number, y: number, fill: string, i: number) => (
    <g key={i}>
      <rect x={x} y={y} width={27} height={41} rx={12} fill={fill} />
      <path className="sh-nog" d={`M${x + 17},${y + 3} q8,3 8,10 v15 q0,8 -8,10 Z`} fill={fill === C.white ? C.shade : C.orangeDark} stroke="none" />
      <path className="sh-nog" d={`M${x},${y + 14} h27 M${x},${y + 27} h27`} fill="none" strokeWidth={2.2} />
      <rect x={x} y={y} width={27} height={41} rx={12} fill="none" />
    </g>
  )
  return (
    <>
      <rect x={318} y={232} width={90} height={16} rx={4} fill={C.metal} />
      {tank(321, 193, C.white, 0)}
      {tank(350, 189, C.orange, 1)}
      {tank(379, 193, C.white, 2)}
      {tank(321, 246, C.orange, 3)}
      {tank(350, 250, C.white, 4)}
      {tank(379, 246, C.orange, 5)}
      {/* cargo straps */}
      <path className="sh-nog" d="M318,236 h90 M318,244 h90" fill="none" stroke={C.yellow} strokeWidth={2.5} />
    </>
  )
}

function Regenerative({ lightsOn }: { lightsOn: boolean }) {
  const sprout = (x: number, h: number) => (
    <g key={x} transform={`translate(${x} 256)`}>
      <g className="sh-sprout">
        <path d={`M0,0 V${-h}`} fill="none" stroke="#1E7A45" strokeWidth={2.5} />
        <path d={`M0,${-h} q-9,-2 -10,-10 q9,0 10,10 Z M0,${-h * 0.55} q9,-2 10,-10 q-9,0 -10,10 Z`} fill="#B6F2C6" stroke="#1E7A45" strokeWidth={1.8} />
      </g>
    </g>
  )
  return (
    <>
      {/* water / air loop pipes */}
      <path d="M328,200 V186 H398 V200 M334,280 V293 H376 V280" fill="none" strokeWidth={10} />
      <path className="sh-nog" d="M328,200 V186 H398 V200 M334,280 V293 H376 V280" fill="none" stroke={C.teal} strokeWidth={5} />
      <path className="sh-flow sh-nog" d="M328,200 V186 H398 V200 M334,280 V293 H376 V280" fill="none" stroke="#FFFFFF" strokeWidth={2.2} strokeDasharray="5 13" />
      <Hull x={318} y={198} w={90} h={84} rx={14} />
      <rect x={390} y={284} width={14} height={11} rx={3} fill={C.metal} strokeWidth={3} />
      {/* greenhouse window */}
      <rect x={332} y={213} width={62} height={46} rx={12} fill={lightsOn ? C.green : '#1F4A39'} />
      <g className="sh-nog">
        <rect x={337} y={218} width={52} height={10} rx={5} fill="#D9FFE4" stroke="none" opacity={lightsOn ? 0.65 : 0.15} />
        {sprout(347, 16)}
        {sprout(363, 22)}
        {sprout(379, 14)}
        <rect className={cx(lightsOn && 'sh-grow')} x={332} y={213} width={62} height={46} rx={12} fill="#EFFFF3" stroke="none" opacity="0" />
      </g>
      <rect x={332} y={213} width={62} height={46} rx={12} fill="none" />
      <path className="sh-nog" d="M340,268 h20 M366,268 h8" fill="none" stroke={C.green} strokeWidth={3.5} />
    </>
  )
}

function Habitat({ reinforced, lightsOn }: { reinforced: boolean; lightsOn: boolean }) {
  const R = reinforced ? 48 : 36
  const y = CY - R
  const win = lightsOn ? C.teal : '#1B2547'
  return (
    <>
      {reinforced &&
        ([1, -1] as const).map((s) => (
          <g key={s}>
            {/* Whipple bumper: thin plates on stand-offs break up micrometeoroids */}
            {[0, 1, 2, 3].map((i) => {
              const px = 464 + i * 40
              const py = CY - s * (R + 12)
              return (
                <g key={i}>
                  <path d={`M${px + 8},${py} V${CY - s * (R - 2)} M${px + 28},${py} V${CY - s * (R - 2)}`} fill="none" strokeWidth={3} />
                  <rect x={px} y={py - 5} width={36} height={10} rx={3.5} fill={C.metalLight} />
                  <circle className="sh-nog" cx={px + 7} cy={py} r={1.6} fill={C.ink} stroke="none" />
                  <circle className="sh-nog" cx={px + 29} cy={py} r={1.6} fill={C.ink} stroke="none" />
                </g>
              )
            })}
          </g>
        ))}
      <Hull x={456} y={y} w={170} h={R * 2} rx={reinforced ? 30 : 26} />
      <rect className="sh-nog" x={486} y={y} width={13} height={R * 2} fill={C.orange} strokeWidth={3} />
      {reinforced && (
        <g className="sh-nog">
          <rect x={508} y={CY + 18} width={104} height={20} rx={5} fill={C.metalLight} strokeWidth={3} />
          <path d={`M542,${CY + 18} v20 M577,${CY + 18} v20`} fill="none" strokeWidth={2.5} />
          {[516, 534, 551, 569, 586, 604].map((rx) => <circle key={rx} cx={rx} cy={CY + 28} r={1.7} fill={C.ink} stroke="none" />)}
          <rect x={508} y={CY - 42} width={104} height={12} rx={5} fill={C.metalLight} strokeWidth={3} />
          <path d={`M542,${CY - 42} v12 M577,${CY - 42} v12`} fill="none" strokeWidth={2.5} />
        </g>
      )}
      {[524, 556, 588].map((wx) => (
        <g key={wx}>
          <circle className="sh-win" cx={wx} cy={CY - 6} r={11} fill={win} strokeWidth={3.5} />
          <path className="sh-nog" d={`M${wx - 6},${CY - 9} q2,-6 8,-7`} fill="none" stroke="#FFFFFF" strokeWidth={2.5} opacity={lightsOn ? 0.9 : 0.2} />
        </g>
      ))}
      {!reinforced && <path className="sh-nog" d={`M510,${CY + 20} h92`} fill="none" stroke={C.teal} strokeWidth={4} />}
    </>
  )
}

/* ---------- the ship ---------- */

export function Spaceship({
  config,
  assembling = false,
  thrust = 'off',
  damage = 0,
  alarm = false,
  antenna = 'ok',
  lightsOn = true,
  facing = 'right',
  width = '100%',
  animate = true,
  className,
  title = 'Spaceship',
}: SpaceshipProps) {
  const clip = `shc${useId().replace(/:/g, '')}`
  const dmg = Math.max(0, Math.min(1, damage))

  // Detect which part changed last (derived-state-from-props pattern).
  const [prev, setPrev] = useState<Partial<ShipConfig>>(config)
  const [snap, setSnap] = useState<{ part: ShipPart | null; n: number }>({ part: null, n: 0 })
  if (SHIP_PARTS.some((k) => prev[k] !== config[k])) {
    const changed = SHIP_PARTS.filter((k) => prev[k] !== config[k] && config[k] !== undefined)
    setPrev(config)
    if (assembling && changed.length) setSnap({ part: changed[changed.length - 1], n: snap.n + 1 })
  }

  const part = (k: ShipPart, children: ReactNode) => {
    const snapping = assembling && snap.part === k && config[k] !== undefined
    return (
      <g key={`${k}${snapping ? snap.n : ''}`} className={cx('sh-part', config[k] === undefined && 'sh-ghost', snapping && 'sh-snap')}>
        {children}
      </g>
    )
  }

  const reinforced = config.structure === 'reinforced'
  const hullTop = reinforced ? CY - 48 - 17 : CY - 36
  const hasEngines = config.propulsion !== undefined
  const chemOn = hasEngines && (thrust === 'chemical' || thrust === 'both')
  const ionOn = config.propulsion === 'combined' && (thrust === 'ion' || thrust === 'both')
  const mainFailed = antenna !== 'ok'
  const backupFailed = antenna === 'all-failed'

  return (
    <svg
      className={cx('sh-root sh-ship', className, !animate && 'sh-still', alarm && 'sh-alarm-on', !lightsOn && 'sh-dark')}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      width={width}
      style={{ display: 'block', height: 'auto', overflow: 'visible' }}
      role="img"
      aria-label={title}
    >
      <g transform={facing === 'left' ? `translate(${VB_W} 0) scale(-1 1)` : undefined}>
        <g className="sh-float">
          <g className={cx(chemOn && 'sh-rumble')} stroke={C.ink} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round">
            {/* power (behind the hull) */}
            {part('power', config.power === 'nuclear' ? <NuclearBoom /> : <SolarWings clip={clip} />)}

            {/* exhaust */}
            {chemOn && [216, 264].map((cy) => <ExhaustPlume key={cy} as="g" x={196} y={cy} length={config.power === 'nuclear' ? 70 : 88} size={38} />)}
            {ionOn && [170, 310].map((cy) => <ExhaustPlume key={cy} as="g" kind="ion" x={205} y={cy} length={150} size={20} />)}

            {/* spine truss — common architecture */}
            <rect x={236} y={231} width={400} height={18} rx={4} fill={C.metalDark} />

            {part('propulsion', <Engines combined={config.propulsion === 'combined'} ionLit={ionOn} />)}
            {part('lifeSupport', config.lifeSupport === 'regenerative' ? <Regenerative lightsOn={lightsOn} /> : <Consumables />)}

            {/* radiation shelter core — always present */}
            <g>
              <Hull x={411} y={194} w={46} h={92} rx={9} fill={C.metalLight} shade={C.metal} />
              <path d="M417,206 h34 M417,274 h34" fill="none" stroke={C.yellow} strokeWidth={4} />
              <Trefoil x={434} y={240} r={11} />
            </g>

            {part('structure', <Habitat reinforced={reinforced} lightsOn={lightsOn} />)}

            {/* docking collar + Earth return capsule at the nose */}
            <rect x={624} y={221} width={17} height={38} rx={4} fill={C.metal} />
            <g transform="translate(678 240) rotate(-90)">
              <CapsuleShape lightsOn={lightsOn} />
            </g>

            {/* attitude thrusters */}
            <Rcs x={300} y={204} delay={0} lit={animate} />
            <Rcs x={300} y={276} flip delay={2.3} lit={animate} />
            <Rcs x={632} y={221} delay={4.1} lit={animate} />
            <Rcs x={632} y={259} flip delay={1.2} lit={animate} />

            {/* comms */}
            {part(
              'comms',
              <>
                <Dish x={540} y={hullTop} failed={mainFailed} />
                {config.comms === 'redundant' && <Dish x={604} y={reinforced ? hullTop : hullTop + 4} scale={0.5} tilt={38} failed={backupFailed} />}
              </>,
            )}

            {/* alarm beacon */}
            <g transform="translate(434 194)">
              {alarm && (
                <g className="sh-nog" stroke="none">
                  <circle className="sh-beacon-halo" cy={-10} r={34} fill={C.red} />
                  <g transform="translate(0 -10)">
                    <path className="sh-beacon-beam" d="M0,0 L70,-16 L70,16 Z M0,0 L-70,-16 L-70,16 Z" fill={C.red} opacity="0.4" />
                  </g>
                </g>
              )}
              <rect x={-10} y={-5} width={20} height={7} rx={2.5} fill={C.metalDark} strokeWidth={3} />
              <path className={cx(alarm && 'sh-beacon')} d="M-8,-5 V-12 Q-8,-21 0,-21 Q8,-21 8,-12 V-5 Z" fill={alarm ? C.red : '#7A2B3A'} strokeWidth={3} />
              <path className="sh-nog" d="M-4,-12 q0,-5 4,-5" fill="none" stroke="#FFFFFF" strokeWidth={2} opacity="0.8" />
            </g>

            {/* nav lights */}
            {[
              { x: 250, y: 204, c: C.red, d: 0 },
              { x: 250, y: 276, c: C.green, d: 0.6 },
              { x: 640, y: 212, c: C.yellow, d: 1.1 },
            ].map((l) => (
              <circle key={l.d} className={cx(lightsOn && 'sh-blink')} style={{ animationDelay: `${l.d}s` }} cx={l.x} cy={l.y} r={4.5} fill={lightsOn ? l.c : '#2B3350'} strokeWidth={2.5} />
            ))}

            {/* damage */}
            {dmg > 0.08 && <Dent x={546} y={262} />}
            {dmg > 0.22 && <Dent x={372} y={270} s={0.9} />}
            {dmg > 0.38 && <Dent x={598} y={218} s={0.8} />}
            {dmg > 0.52 && <Dent x={284} y={262} s={0.9} />}
            {dmg > 0.68 && <Dent x={505} y={222} s={1.15} />}
            {dmg > 0.84 && <Dent x={436} y={272} s={0.8} />}
            {dmg > 0.3 && <Sparks as="g" x={372} y={212} size={20} />}
            {dmg > 0.62 && <Sparks as="g" x={598} y={262} size={24} count={7} />}
            {dmg > 0.45 && <SmokePuff as="g" x={284} y={206} size={30} dx={-70} dy={-46} />}
            {dmg > 0.78 && <SmokePuff as="g" x={505} y={208} size={34} dx={-90} dy={-60} tone="dark" count={4} />}

            {/* assembly sparkle */}
            {assembling && snap.part && config[snap.part] !== undefined && (
              <Sparkle key={snap.n} as="g" x={snap.part === 'power' && config.power === 'nuclear' ? 80 : SNAP_ANCHOR[snap.part][0]} y={snap.part === 'power' && config.power === 'nuclear' ? 240 : SNAP_ANCHOR[snap.part][1]} size={54} />
            )}
          </g>
        </g>
      </g>
    </svg>
  )
}
