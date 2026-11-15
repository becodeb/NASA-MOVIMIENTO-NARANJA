import { useMemo, type CSSProperties } from 'react'
import './worlds.css'
import { INK, clamp, cx, r1, useMotion, useSvgId, type Size } from './util'

export interface MarsProps {
  /** Rendered width/height (square). Number = px, or any CSS length. */
  size?: Size
  /** How far the north pole leans towards the viewer, in degrees (0 = equator-on, 50+ = looking down on the polar cap). Same prop as Saturn's ring opening. */
  tilt?: number
  /** In-picture roll of the whole planet in degrees. */
  roll?: number
  /** Soft glow behind the planet. */
  glow?: boolean
  animate?: boolean
  /**
   * 'saturn' (default): same viewBox as <Saturn>, so the globe is exactly the size Saturn's globe would be (drop-in swap).
   * 'tight': the globe fills the box — use for small icons (~60px) where there are no rings to leave room for.
   */
  fit?: 'saturn' | 'tight'
  /** Accepted for prop-compatibility with Saturn; ignored. */
  showHexagon?: boolean
  className?: string
  style?: CSSProperties
  title?: string
}

const R = 70
const DEG = Math.PI / 180
/** Width of the scrolling surface strip (one full rotation), in viewBox units. Must match `sw-mars-spin` in worlds.css. */
const PERIOD = 300

const poly = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${r1(x)},${r1(y)}`).join(' ')

/** Everything on the disc north of a (wavy) latitude line — the polar ice cap. */
function capPath(latDeg: number, amp: number, B: number, n = 96): string | null {
  const all: { p: [number, number]; vis: boolean }[] = []
  for (let i = 0; i <= n; i++) {
    const lon = -Math.PI + (2 * Math.PI * i) / n
    const lat = (latDeg + amp * Math.sin(5 * lon + 1)) * DEG
    const sl = Math.sin(lat)
    const cl = Math.cos(lat)
    all.push({
      p: [R * cl * Math.sin(lon), -R * sl * Math.cos(B) + R * cl * Math.cos(lon) * Math.sin(B)],
      vis: cl * Math.cos(lon) * Math.cos(B) + sl * Math.sin(B) > 0,
    })
  }
  const pts = all.filter((a) => a.vis).map((a) => a.p)
  if (!pts.length) return null
  if (pts.length === all.length) return `${poly(pts)} Z`
  const y0 = r1(pts[0][1])
  const y1 = r1(pts[pts.length - 1][1])
  return `${poly(pts)} L${2 * R},${y1} L${2 * R},${-2 * R} L${-2 * R},${-2 * R} L${-2 * R},${y0} Z`
}

function Crater({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse rx={r} ry={r * 0.86} fill="#B4432E" stroke="#6E2420" strokeWidth={1.6} />
      <path
        d={`M${r1(r * 0.62)},${r1(-r * 0.3)} A${r1(r * 0.7)},${r1(r * 0.6)} 0 0 1 ${r1(-r * 0.3)},${r1(r * 0.52)}`}
        fill="none"
        stroke="#F6A57C"
        strokeWidth={r1(Math.max(1, r * 0.26))}
        strokeLinecap="round"
      />
    </g>
  )
}

function Volcano({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={r} fill="#F39A6B" stroke="#8A2F25" strokeWidth={1.5} />
      <circle r={r * 0.36} fill="#A63A2A" stroke="#6E2420" strokeWidth={1} />
    </g>
  )
}

/** One full turn of Mars' surface, x ∈ [-150, 150], equator at y = 0. Nothing may cross the ±150 seam. */
function Surface() {
  return (
    <g>
      {/* bright dusty regions: Tharsis bulge, Arabia, Elysium, Amazonis */}
      <g fill="#F08A5D" fillOpacity={0.8}>
        <ellipse cx={-80} cy={-4} rx={34} ry={24} />
        <ellipse cx={-2} cy={-30} rx={30} ry={12} />
        <ellipse cx={106} cy={-12} rx={24} ry={15} />
        <ellipse cx={-128} cy={-28} rx={16} ry={9} />
      </g>
      {/* darker southern highlands */}
      <g fill="#C24A32" fillOpacity={0.7}>
        <path d="M-150,40 Q-110,30 -70,40 T10,38 T90,42 T150,40 V90 H-150 Z" />
      </g>

      {/* dark albedo markings */}
      <g fill="#8A3327" stroke={INK} strokeOpacity={0.7} strokeWidth={1.3} strokeLinejoin="round">
        {/* Syrtis Major (shark fin) flowing into Sinus Sabaeus */}
        <path d="M44,-38 Q54,-26 56,-10 Q60,0 74,6 Q66,16 50,13 Q36,18 22,14 Q30,8 34,-4 Q36,-24 44,-38 Z" />
        {/* Mare Acidalium */}
        <path d="M-34,-50 Q-20,-58 -8,-48 Q-12,-38 -26,-40 Q-36,-42 -34,-50 Z" />
        {/* Mare Cimmerium */}
        <path d="M92,22 Q110,14 128,20 Q140,24 146,32 Q128,35 112,30 Q100,33 92,22 Z" />
        {/* Mare Sirenum */}
        <path d="M-146,26 Q-130,18 -112,24 Q-100,28 -96,36 Q-116,39 -130,34 Q-140,34 -146,26 Z" />
        {/* Mare Erythraeum, south of the canyon */}
        <path d="M-40,26 Q-24,20 -8,25 Q2,29 4,36 Q-12,39 -26,35 Q-36,34 -40,26 Z" />
      </g>

      {/* Hellas basin: pale, frosty floor */}
      <ellipse cx={52} cy={37} rx={15} ry={9} fill="#F6A57C" stroke="#A63A2A" strokeWidth={1.5} />

      {/* Valles Marineris + Noctis Labyrinthus */}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M-52,10 Q-40,5 -28,9 T-4,13 Q4,15 10,12 M-52,10 l-7,-5 M-52,10 l-8,4 M-22,10 q6,6 14,5" stroke="#5E1F1E" strokeWidth={5} />
        <path d="M-50,10 Q-40,6.5 -28,10 T-4,13.5 Q3,15 8,12.5" stroke={INK} strokeWidth={1.5} />
      </g>

      {/* Tharsis Montes + Olympus Mons, Elysium Mons */}
      <Volcano x={-84} y={-12} r={4.6} />
      <Volcano x={-77} y={-3} r={4.6} />
      <Volcano x={-70} y={6} r={4.6} />
      <Volcano x={-106} y={-22} r={9} />
      <Volcano x={104} y={-14} r={5.5} />

      {/* craters */}
      <Crater x={-18} y={-18} r={6.5} />
      <Crater x={10} y={-6} r={4} />
      <Crater x={18} y={34} r={5} />
      <Crater x={78} y={-30} r={5} />
      <Crater x={128} y={-2} r={5.5} />
      <Crater x={-126} y={-4} r={5} />
      <Crater x={-58} y={34} r={4.5} />
    </g>
  )
}

/** Mars: rusty globe with a north polar cap, Syrtis Major, Valles Marineris, Tharsis volcanoes and a thin dusty atmosphere. */
export function Mars({
  size = 320,
  tilt = 18,
  roll = -16,
  glow = true,
  animate = true,
  fit = 'saturn',
  className,
  style,
  title = 'Mars',
}: MarsProps) {
  const motion = useMotion(animate)
  const id = useSvgId('sw-mars')
  const B = clamp(tilt, 0, 70) * DEG
  const tight = fit === 'tight'

  const caps = useMemo(() => ({ outer: capPath(65, 2.4, B), inner: capPath(73, 1.6, B) }), [B])
  const shift = r1(R * Math.sin(B) * 0.9)

  return (
    <svg
      className={cx('sw-world sw-mars', motion && 'sw-anim', className)}
      style={{ width: size, height: size, ...style }}
      viewBox={tight ? '-92 -92 184 184' : '-172 -172 344 344'}
      role="img"
      aria-label={title}
    >
      <defs>
        <clipPath id={`${id}-disc`}>
          <circle r={R} />
        </clipPath>
        <radialGradient id={`${id}-glow`}>
          <stop offset={tight ? 0.7 : 0.42} stopColor="#FF8C32" stopOpacity="0.45" />
          <stop offset={tight ? 0.88 : 0.72} stopColor="#F46AA7" stopOpacity="0.12" />
          <stop offset="1" stopColor="#6637B8" stopOpacity="0" />
        </radialGradient>
      </defs>
      {glow && <circle className="sw-glow" r={tight ? 91 : 150} fill={`url(#${id}-glow)`} />}
      {/* thin dusty atmosphere */}
      <circle className="sw-mars-air" r={R + 9} fill="none" stroke="#FFD2B5" strokeOpacity={0.5} strokeWidth={2} />
      <circle r={R + 5.5} fill="#F7A27C" fillOpacity={0.4} />
      <circle r={R + 2} fill="#A63A2A" stroke={INK} strokeWidth={4} />
      <g clipPath={`url(#${id}-disc)`}>
        <circle r={R} fill="#D9573B" />
        <g transform={`rotate(${roll})`}>
          <g transform={`translate(0 ${shift})`}>
            <g className="sw-mars-spin">
              <Surface />
              <g transform={`translate(${PERIOD} 0)`}>
                <Surface />
              </g>
            </g>
          </g>
          {caps.outer && <path d={caps.outer} fill="#F6DDD0" stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />}
          {caps.inner && <path d={caps.inner} fill="#FFFFFF" />}
        </g>
        {/* cel shade + highlight (light from the upper-left, independent of roll) */}
        <path
          d={`M${-R - 4},0 a${R + 4},${R + 4} 0 1 0 ${2 * R + 8},0 a${R + 4},${R + 4} 0 1 0 ${-2 * R - 8},0 Z M${-R - 20},-10 a${R + 3},${R + 3} 0 1 0 ${2 * R + 6},0 a${R + 3},${R + 3} 0 1 0 ${-2 * R - 6},0 Z`}
          fill="#4A1020"
          fillOpacity={0.3}
          fillRule="evenodd"
        />
        <ellipse cx={-30} cy={-34} rx={20} ry={11} fill="#FFFFFF" fillOpacity={0.22} transform="rotate(-38 -30 -34)" />
      </g>
      <circle r={R} fill="none" stroke={INK} strokeWidth={4} />
    </svg>
  )
}

export default Mars
