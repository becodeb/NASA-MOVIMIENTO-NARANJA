import { useMemo, type CSSProperties } from 'react'
import './worlds.css'
import { INK, clamp, cx, r1, rng, useMotion, useSvgId, type Size } from './util'

export type RouteId = 'fast' | 'balanced' | 'slow'
export type MapDestination = 'saturn' | 'mars'

export interface MapRoute {
  id: RouteId
  color?: string
  /** Emphasise this route (thicker, inked, full opacity). Others dim when any route is highlighted. */
  highlighted?: boolean
  /** Draw as a flowing dotted line instead of a solid arc. */
  dashed?: boolean
  /** Optional short label drawn at the middle of the arc. */
  label?: string
}

export interface SolarSystemMapProps {
  routes?: MapRoute[]
  /** Route the ship marker follows. Defaults to the first highlighted route, else the first route. */
  activeRoute?: RouteId
  /** 0..1 position of the ship along the active route. Omit (or null) to hide the ship. */
  progress?: number | null
  /** Show Titan next to Saturn with a fly-by swing arc. Ignored when destination is 'mars'. */
  showTitanFlyby?: boolean
  /**
   * Where the routes lead. 'saturn' (default) is the original map. 'mars' zooms into the inner solar system:
   * Mars sits on an orbit just outside Earth's (true 1 : 1.52 ratio), routes go Earth ↔ Mars, no Titan.
   * In 'mars' mode the planet name is still read from `labels.saturn`.
   */
  destination?: MapDestination
  /** Return leg: the ship travels destination → Earth (progress 0 = at the destination, 1 = back at Earth). */
  returning?: boolean
  /** Small caption in the corner, e.g. "No está a escala". */
  note?: string
  labels?: Partial<Record<'sun' | 'earth' | 'saturn' | 'titan', string>>
  /** CSS width (height follows the 8:5 aspect ratio). */
  width?: Size
  animate?: boolean
  className?: string
  style?: CSSProperties
  title?: string
}

const W = 800
const H = 500
const CX = 392
const CY = 262
const SQUASH = 0.6
const R_EARTH = 92
const R_SATURN = 330
const TH_EARTH = 250
const TH_SATURN = 380 // = 20°, 130° ahead of Earth (prograde, counter-clockwise seen from the north)
const DEG = Math.PI / 180

const DEFAULT_COLORS: Record<RouteId, string> = { fast: '#F46AA7', balanced: '#38D9D0', slow: '#FFD447' }
const DEFAULT_ROUTES: MapRoute[] = [{ id: 'fast' }, { id: 'balanced', highlighted: true }, { id: 'slow', dashed: true }]

type Pt = [number, number]

const polar = (r: number, thDeg: number): Pt => [CX + r * Math.cos(thDeg * DEG), CY - r * SQUASH * Math.sin(thDeg * DEG)]

const EARTH = polar(R_EARTH, TH_EARTH)
const SATURN = polar(R_SATURN, TH_SATURN)

/** Orbit geometry for one destination. */
interface Geo {
  rEarth: number
  rDest: number
  thEarth: number
  thDest: number
  earth: Pt
  dest: Pt
  /** How far the 'fast' chord bows away from the Sun. */
  bow: number
  /** Asteroid belt: inner radius and width. */
  belt: [number, number]
}

const GEO_SATURN: Geo = {
  rEarth: R_EARTH,
  rDest: R_SATURN,
  thEarth: TH_EARTH,
  thDest: TH_SATURN,
  earth: EARTH,
  dest: SATURN,
  bow: 20,
  belt: [168, 30],
}

// Inner solar system, zoomed in: Earth 1 AU = 165 units, Mars 1.52 AU = 250 units, main belt just beyond.
const R_EARTH_M = 165
const R_MARS = 250
const TH_MARS = 385 // = 25°, 135° ahead of Earth's departure point
const GEO_MARS: Geo = {
  rEarth: R_EARTH_M,
  rDest: R_MARS,
  thEarth: TH_EARTH,
  thDest: TH_MARS,
  earth: polar(R_EARTH_M, TH_EARTH),
  dest: polar(R_MARS, TH_MARS),
  bow: 40,
  belt: [326, 30],
}

function routePoints(id: RouteId, g: Geo): Pt[] {
  const { earth: EARTH, dest: SATURN, rEarth: R_EARTH, rDest: R_SATURN, thEarth: TH_EARTH, thDest: TH_SATURN } = g
  const n = id === 'slow' ? 160 : 64
  const pts: Pt[] = []
  if (id === 'fast') {
    // near-direct, high-energy arc: a gently bowed chord
    const mx = (EARTH[0] + SATURN[0]) / 2
    const my = (EARTH[1] + SATURN[1]) / 2
    const dx = SATURN[0] - EARTH[0]
    const dy = SATURN[1] - EARTH[1]
    const len = Math.hypot(dx, dy)
    const c: Pt = [mx + (-dy / len) * g.bow, my + (dx / len) * g.bow]
    for (let i = 0; i <= n; i++) {
      const t = i / n
      const u = 1 - t
      pts.push([u * u * EARTH[0] + 2 * u * t * c[0] + t * t * SATURN[0], u * u * EARTH[1] + 2 * u * t * c[1] + t * t * SATURN[1]])
    }
    return pts
  }
  // transfer spirals around the Sun: 'balanced' sweeps 130°, 'slow' adds a full extra lap (gravity-assist style tour)
  const sweep = TH_SATURN - TH_EARTH + (id === 'slow' ? 360 : 0)
  const pow = id === 'slow' ? 1.25 : 1.05
  for (let i = 0; i <= n; i++) {
    const t = i / n
    pts.push(polar(R_EARTH + (R_SATURN - R_EARTH) * Math.pow(t, pow), TH_EARTH + sweep * t))
  }
  return pts
}

interface Built {
  d: string
  pts: Pt[]
  cum: number[]
  total: number
}

function build(id: RouteId, g: Geo): Built {
  const pts = routePoints(id, g)
  const cum = [0]
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
  return {
    d: pts.map(([x, y], i) => `${i ? 'L' : 'M'}${r1(x)},${r1(y)}`).join(' '),
    pts,
    cum,
    total: cum[cum.length - 1],
  }
}

function pointAt(b: Built, t: number): { x: number; y: number; angle: number } {
  const target = clamp(t, 0, 1) * b.total
  let i = 1
  while (i < b.cum.length - 1 && b.cum[i] < target) i++
  const seg = b.cum[i] - b.cum[i - 1] || 1
  const f = (target - b.cum[i - 1]) / seg
  const [x0, y0] = b.pts[i - 1]
  const [x1, y1] = b.pts[i]
  // average the heading over a few samples so the ship turns smoothly
  const a = b.pts[Math.max(0, i - 2)]
  const c = b.pts[Math.min(b.pts.length - 1, i + 1)]
  return { x: x0 + (x1 - x0) * f, y: y0 + (y1 - y0) * f, angle: Math.atan2(c[1] - a[1], c[0] - a[0]) / DEG }
}

const BUILT: Record<RouteId, Built> = { fast: build('fast', GEO_SATURN), balanced: build('balanced', GEO_SATURN), slow: build('slow', GEO_SATURN) }
const BUILT_MARS: Record<RouteId, Built> = { fast: build('fast', GEO_MARS), balanced: build('balanced', GEO_MARS), slow: build('slow', GEO_MARS) }

function starPath(n: number, rOut: number, rIn: number): string {
  let d = ''
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? rIn : rOut
    const a = (Math.PI * i) / n
    d += `${i ? 'L' : 'M'}${r1(Math.cos(a) * r)},${r1(Math.sin(a) * r)} `
  }
  return `${d}Z`
}

export function SolarSystemMap({
  routes = DEFAULT_ROUTES,
  activeRoute,
  progress = null,
  showTitanFlyby = false,
  destination = 'saturn',
  returning = false,
  note,
  labels,
  width = '100%',
  animate = true,
  className,
  style,
  title = 'Solar system route map',
}: SolarSystemMapProps) {
  const motion = useMotion(animate)
  const id = useSvgId('sw-map')
  const mars = destination === 'mars'
  const geo = mars ? GEO_MARS : GEO_SATURN
  const built = mars ? BUILT_MARS : BUILT
  const L = { sun: 'Sol', earth: 'Tierra', saturn: mars ? 'Marte' : 'Saturno', titan: 'Titán', ...labels }
  const anyHi = routes.some((r) => r.highlighted)
  const activeId = activeRoute ?? routes.find((r) => r.highlighted)?.id ?? routes[0]?.id
  const active = routes.find((r) => r.id === activeId)
  const p = progress == null ? null : clamp(progress, 0, 1)
  const shipFwd = p != null && activeId ? pointAt(built[activeId], returning ? 1 - p : p) : null
  const ship = shipFwd && returning ? { ...shipFwd, angle: shipFwd.angle + 180 } : shipFwd

  const belt = useMemo(() => {
    const rand = rng(8)
    return Array.from({ length: 70 }, () => {
      const [x, y] = polar(geo.belt[0] + rand() * geo.belt[1], rand() * 360)
      return { x: r1(x), y: r1(y), r: 0.8 + rand() * 1.5, o: 0.12 + rand() * 0.22 }
    })
  }, [geo])

  // draw order: dim routes first, highlighted last
  const ordered = [...routes].sort((a, b) => Number(!!a.highlighted) - Number(!!b.highlighted))

  return (
    <svg
      className={cx('sw-world sw-map', motion && 'sw-anim', className)}
      style={{ width, aspectRatio: `${W} / ${H}`, ...style }}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={title}
    >
      <defs>
        <radialGradient id={`${id}-sun`}>
          <stop offset="0.25" stopColor="#FFD447" stopOpacity="0.55" />
          <stop offset="1" stopColor="#FF8C32" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${id}-front`}>
          <rect x={-60} y={0} width={120} height={40} />
        </clipPath>
      </defs>

      {/* orbits */}
      <g fill="none" strokeLinecap="round">
        <ellipse cx={CX} cy={CY} rx={geo.rDest} ry={geo.rDest * SQUASH} stroke={mars ? '#F0603F' : '#FF8C32'} strokeOpacity={mars ? 0.65 : 0.5} strokeWidth={2.5} strokeDasharray="2 10" />
        <ellipse cx={CX} cy={CY} rx={geo.rEarth} ry={geo.rEarth * SQUASH} stroke="#38D9D0" strokeOpacity={0.6} strokeWidth={2.5} strokeDasharray="2 8" />
      </g>
      {/* asteroid belt (decorative) */}
      <g fill="#8896B3">
        {belt.map((b, i) => (
          <circle key={i} cx={b.x} cy={b.y} r={b.r} fillOpacity={b.o} />
        ))}
      </g>

      {/* Sun */}
      <g transform={`translate(${CX} ${CY})`}>
        <circle className="sw-sun-pulse" r={62} fill={`url(#${id}-sun)`} />
        <path className="sw-spin" d={starPath(10, 34, 24)} fill="#FF8C32" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        <circle r={21} fill="#FFD447" stroke={INK} strokeWidth={3.5} />
        <path d="M-12,-6 a13,13 0 0 1 12,-9" fill="none" stroke="#FFF6C9" strokeWidth={3.5} strokeLinecap="round" />
      </g>

      {/* routes */}
      {ordered.map((r) => {
        const b = built[r.id]
        const color = r.color ?? DEFAULT_COLORS[r.id]
        const hi = !!r.highlighted
        const wd = hi ? 6 : 4
        const isActive = r.id === activeId
        const mid = pointAt(b, r.id === 'slow' ? 0.62 : 0.5)
        return (
          <g key={r.id} opacity={anyHi && !hi ? 0.5 : 1} className="sw-map-route">
            {hi && <path d={b.d} fill="none" stroke={INK} strokeWidth={wd + 6} strokeLinecap="round" strokeLinejoin="round" />}
            {r.dashed ? (
              <path className="sw-map-flow" d={b.d} fill="none" stroke={color} strokeWidth={wd} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 13" />
            ) : (
              <>
                <path d={b.d} fill="none" stroke={color} strokeWidth={wd} strokeLinecap="round" strokeLinejoin="round" strokeOpacity={isActive && p != null ? 0.45 : 1} />
                <path className="sw-map-flow" d={b.d} fill="none" stroke="#FFFFFF" strokeOpacity={0.75} strokeWidth={wd * 0.34} strokeLinecap="round" strokeDasharray="1 27" />
              </>
            )}
            {isActive && p != null && p > 0 && (
              <path d={b.d} pathLength={1} fill="none" stroke={color} strokeWidth={wd} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={returning ? `0 ${1 - p} ${p} 1.2` : `${p} 1.2`} />
            )}
            {r.label && (
              <text className="sw-map-label sw-map-label--route" x={r1(mid.x)} y={r1(mid.y - 14)} textAnchor="middle" fill={color}>
                {r.label}
              </text>
            )}
          </g>
        )
      })}

      {/* Earth */}
      <g transform={`translate(${r1(geo.earth[0])} ${r1(geo.earth[1])})`}>
        <circle r={21} fill="#38D9D0" fillOpacity={0.22} />
        <circle r={14} fill="#2F7FE6" stroke={INK} strokeWidth={3.5} />
        <path d="M-9,-6 q4,-5 9,-3 q-1,5 -5,6 q1,4 -2,8 q-5,-4 -2,-11z M4,2 q5,-2 7,2 q-2,5 -6,5 z" fill="#58C46B" stroke={INK} strokeWidth={1.2} strokeLinejoin="round" />
        <text className="sw-map-label" x={-24} y={6} textAnchor="end">
          {L.earth}
        </text>
      </g>

      {/* Mars (destination = 'mars') */}
      {mars && (
        <g transform={`translate(${r1(geo.dest[0])} ${r1(geo.dest[1])})`}>
          <circle className="sw-map-ping" r={22} fill="none" stroke="#FFD447" strokeWidth={3} />
          <circle r={20} fill="#F04452" fillOpacity={0.22} />
          <circle r={13} fill="#D9573B" stroke={INK} strokeWidth={3.5} />
          <path d="M-2,-3 q5,-5 8,1 q3,4 -1,6 q-4,-1 -5,-4 q-5,1 -8,4 q1,-5 6,-7z" fill="#8A3327" />
          <path d="M-7.6,-8 A11.2,11.2 0 0 1 7.6,-8 Q4,-5.6 0,-6.6 Q-4,-5.6 -7.6,-8 Z" fill="#FFFFFF" />
          <path d="M-8,5 a11,11 0 0 0 4,5" fill="none" stroke="#F6A57C" strokeWidth={2} strokeLinecap="round" />
          <text className="sw-map-label" x={0} y={-28} textAnchor="middle">
            {L.saturn}
          </text>
        </g>
      )}

      {/* Saturn (+ Titan fly-by) */}
      {!mars && (
      <g transform={`translate(${r1(SATURN[0])} ${r1(SATURN[1])})`}>
        <circle className="sw-map-ping" r={26} fill="none" stroke="#FFD447" strokeWidth={3} />
        {showTitanFlyby && (
          <g>
            <ellipse rx={58} ry={20} transform="rotate(-14)" fill="none" stroke="#FF8C32" strokeOpacity={0.7} strokeWidth={2} strokeDasharray="2 6" strokeLinecap="round" />
            <path className="sw-map-flow" d="M-96,58 Q-78,22 -52,10 Q-36,2 -40,-18" fill="none" stroke="#F5F7FF" strokeWidth={3} strokeLinecap="round" strokeDasharray="1 6" />
            <path d="M-46,-12 L-40,-22 L-33,-13" fill="none" stroke="#F5F7FF" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            <g transform="translate(-56 14)">
              <circle r={10} fill="#8E7BE0" fillOpacity={0.45} />
              <circle r={7} fill="#EFA63A" stroke={INK} strokeWidth={2.5} />
              <text className="sw-map-label sw-map-label--small" x={-2} y={30} textAnchor="middle">
                {L.titan}
              </text>
            </g>
          </g>
        )}
        <g transform="rotate(-14)">
          <ellipse rx={36} ry={10} fill="none" stroke={INK} strokeWidth={8} />
          <ellipse rx={36} ry={10} fill="none" stroke="#F1DFB4" strokeWidth={4.5} />
          <circle r={18} fill="#F0CE84" stroke={INK} strokeWidth={3.5} />
          <path d="M-17,-5 h34 M-17.5,3 h35" stroke="#DCA95A" strokeWidth={3.5} />
          <g clipPath={`url(#${id}-front)`}>
            <ellipse rx={36} ry={10} fill="none" stroke={INK} strokeWidth={8} />
            <ellipse rx={36} ry={10} fill="none" stroke="#F1DFB4" strokeWidth={4.5} />
          </g>
        </g>
        <text className="sw-map-label" x={0} y={-36} textAnchor="middle">
          {L.saturn}
        </text>
      </g>
      )}

      <text className="sw-map-label" x={CX} y={CY - 44} textAnchor="middle">
        {L.sun}
      </text>

      {/* ship marker */}
      {ship && (
        <g transform={`translate(${r1(ship.x)} ${r1(ship.y)}) rotate(${r1(ship.angle)})`}>
          <g className="sw-map-ship">
            <path className="sw-map-flame" d="M-13,-5 Q-30,0 -13,5 Z" fill="#FF8C32" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
            <path d="M-14,-8 L-20,-14 L-6,-9 Z M-14,8 L-20,14 L-6,9 Z" fill={active?.color ?? '#38D9D0'} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
            <path d="M-14,-8 H4 Q18,-6 22,0 Q18,6 4,8 H-14 Z" fill="#F5F7FF" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
            <path d="M9,-7.2 Q18,-5 22,0 Q18,5 9,7.2 Z" fill="#F04452" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
            <circle cx={0} cy={0} r={3.6} fill="#38D9D0" stroke={INK} strokeWidth={2} />
          </g>
        </g>
      )}

      {note && (
        <text className="sw-map-note" x={16} y={H - 16}>
          {note}
        </text>
      )}
    </svg>
  )
}

export default SolarSystemMap
