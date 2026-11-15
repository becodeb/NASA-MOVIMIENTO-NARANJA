import { useMemo, type CSSProperties } from 'react'
import './worlds.css'
import { INK, clamp, cx, r1, rng, sparklePath, useMotion, useSvgId, type Size } from './util'

export interface SaturnProps {
  /** Rendered width/height (square). Number = px, or any CSS length. */
  size?: Size
  /** Ring opening angle in degrees: how far "above" the ring plane we look (0 = edge-on, ~27 = max seen from Earth, 50+ = top view showing the pole). */
  tilt?: number
  /** In-picture roll of the whole planet in degrees. */
  roll?: number
  /** Draw the north-polar hexagon (only visible when tilt is high enough to see the pole). */
  showHexagon?: boolean
  /** Soft glow behind the planet. */
  glow?: boolean
  animate?: boolean
  className?: string
  style?: CSSProperties
  title?: string
}

const R = 70
const DEG = Math.PI / 180

// Ring radii in Saturn radii (C, B, Cassini Division, A with Encke Gap) — real proportions, gap slightly widened to read at small sizes.
const C_IN = 1.24
const C_OUT = 1.52
const B_IN = 1.53
const B_OUT = 1.93
const A_IN = 2.04
const A_OUT = 2.27
const ENCKE = 2.2

// [south edge latitude, colour] painted south → north
const BANDS: [number, string][] = [
  [-64, '#D9AE66'],
  [-48, '#EFCB82'],
  [-34, '#E2B463'],
  [-21, '#F5DA98'],
  [-8, '#FBE8B4'],
  [7, '#F3D48B'],
  [16, '#DCA95A'],
  [25, '#F4D892'],
  [36, '#E5BA6C'],
  [46, '#F1D08A'],
  [56, '#DDB572'],
  [66, '#CDA96E'],
]

// drifting cloud streaks: [latitude, colour, width, dash pattern (sums to 100), seconds per lap]
const STREAKS: [number, string, number, string, number][] = [
  [-41, '#F7DFA2', 2.2, '9 31 5 20 12 23', 46],
  [-27, '#CF9F52', 2, '14 26 6 30 8 16', 40],
  [-14, '#FFF3CC', 2.4, '18 22 7 28 10 15', 30],
  [-1, '#FFF6D8', 3, '22 18 9 21 14 16', 24],
  [11, '#FDE9B0', 2.2, '10 30 16 14 6 24', 28],
  [20.5, '#C68F45', 2.6, '16 24 5 25 11 19', 36],
  [31, '#FBE6AE', 2, '8 32 13 17 9 21', 42],
  [41, '#CFA158', 1.8, '12 28 7 23 10 20', 50],
  [51, '#F7DC9C', 1.6, '9 31 12 18 6 24', 56],
]

/** Projected points of a latitude circle (only the part facing the viewer). */
function latArc(latDeg: number, B: number, n = 40): { pts: [number, number][]; full: boolean } {
  const lat = latDeg * DEG
  const c = -Math.tan(lat) * Math.tan(B)
  if (c >= 1) return { pts: [], full: false }
  const full = c <= -1
  const lonMax = full ? Math.PI : Math.acos(c)
  const sl = Math.sin(lat)
  const cl = Math.cos(lat)
  const pts: [number, number][] = []
  for (let i = 0; i <= n; i++) {
    const lon = -lonMax + (2 * lonMax * i) / n
    pts.push([R * cl * Math.sin(lon), -R * sl * Math.cos(B) + R * cl * Math.cos(lon) * Math.sin(B)])
  }
  return { pts, full }
}

const poly = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${r1(x)},${r1(y)}`).join(' ')

/** Everything on the disc north of the given latitude. */
function capPath(latDeg: number, B: number): string | null {
  const { pts, full } = latArc(latDeg, B)
  if (!pts.length) return null
  if (full) return `${poly(pts)} Z`
  const y0 = r1(pts[0][1])
  const y1 = r1(pts[pts.length - 1][1])
  return `${poly(pts)} L${2 * R},${y1} L${2 * R},${-2 * R} L${-2 * R},${-2 * R} L${-2 * R},${y0} Z`
}

function ellipsePath(r: number, k: number): string {
  const a = r1(r)
  const b = r1(r * k)
  return `M${-a},0 A${a},${b} 0 1 0 ${a},0 A${a},${b} 0 1 0 ${-a},0 Z`
}

const annulus = (rIn: number, rOut: number, k: number) => `${ellipsePath(rOut * R, k)} ${ellipsePath(rIn * R, k)}`

export function Saturn({
  size = 320,
  tilt = 18,
  roll = -16,
  showHexagon = true,
  glow = true,
  animate = true,
  className,
  style,
  title = 'Saturn',
}: SaturnProps) {
  const motion = useMotion(animate)
  const id = useSvgId('sw-sat')
  const B = clamp(tilt, 0, 70) * DEG
  const k = Math.max(0.025, Math.sin(B))

  const geo = useMemo(() => {
    const caps = BANDS.map(([lat, color]) => ({ d: capPath(lat, B), color })).filter((c) => c.d) as {
      d: string
      color: string
    }[]
    const streaks = STREAKS.map(([lat, color, width, dash, dur]) => {
      const { pts } = latArc(lat, B)
      return { d: pts.length ? poly(pts) : '', color, width, dash, dur }
    }).filter((s) => s.d)

    // North-polar hexagon (jet stream at ~78°N) + polar vortex
    let hexagon: { outer: string; inner: string; eye: string } | null = null
    if (tilt >= 13) {
      const ring = (lat: number, n: number, phase: number) => {
        const out: [number, number][] = []
        for (let i = 0; i < n; i++) {
          const lon = (phase + (360 / n) * i) * DEG
          const l = lat * DEG
          out.push([
            R * Math.cos(l) * Math.sin(lon),
            -R * Math.sin(l) * Math.cos(B) + R * Math.cos(l) * Math.cos(lon) * Math.sin(B),
          ])
        }
        return `${poly(out)} Z`
      }
      hexagon = { outer: ring(75.5, 6, 30), inner: ring(79.5, 6, 30), eye: ring(87, 16, 0) }
    }

    // sparkles sitting on the rings (ice catching sunlight)
    const rand = rng(77)
    const sparkles = Array.from({ length: 16 }, (_, i) => {
      const inB = rand() < 0.6
      const rr = (inB ? B_IN + rand() * (B_OUT - B_IN) : A_IN + rand() * (A_OUT - A_IN)) * R
      const a = rand() * Math.PI * 2
      return {
        x: r1(rr * Math.cos(a)),
        y: r1(rr * k * Math.sin(a)),
        s: 2.2 + rand() * 2.6,
        delay: -(i * 0.37 + rand() * 2),
        dur: 2.2 + rand() * 2.4,
      }
    })

    // planet's shadow falling across the rings (sun to the upper-left front)
    const d: [number, number] = [0.83, -0.56]
    const p: [number, number] = [0.56, 0.83]
    const L = 3.2 * R
    const sh: [number, number][] = [
      [p[0] * R, p[1] * R],
      [p[0] * R + d[0] * L, p[1] * R + d[1] * L],
      [-p[0] * R + d[0] * L, -p[1] * R + d[1] * L],
      [-p[0] * R, -p[1] * R],
    ]
    const shadow = `${poly(sh.map(([x, z]) => [x, z * k]))} Z`
    return { caps, streaks, hexagon, sparkles, shadow }
  }, [B, k, tilt])

  const ringArea = `${annulus(C_IN, C_OUT, k)} ${annulus(B_IN, B_OUT, k)} ${annulus(A_IN, A_OUT, k)}`
  const lw = clamp(0.6 + k * 2.2, 0.7, 1.6) // thin inner ink lines scale with opening so they never clog

  const rings = (front: boolean) => (
    <g clipPath={front ? `url(#${id}-front)` : undefined}>
      <path d={annulus(C_IN, C_OUT, k)} fill="#A9997F" fillOpacity={0.62} fillRule="evenodd" />
      <path d={annulus(B_IN, B_OUT, k)} fill="#F4E4BC" fillRule="evenodd" />
      <path d={annulus(B_IN, 1.66, k)} fill="#E3CC9A" fillRule="evenodd" />
      <path d={annulus(1.79, 1.84, k)} fill="#FFF6DC" fillRule="evenodd" />
      <path d={annulus(A_IN, A_OUT, k)} fill="#DEC99C" fillRule="evenodd" />
      <path d={annulus(A_IN, 2.1, k)} fill="#EBD9B0" fillRule="evenodd" />
      {/* ringlets */}
      <g fill="none" stroke="#C9AE7B" strokeWidth={lw * 0.7}>
        <path d={ellipsePath(1.6 * R, k)} />
        <path d={ellipsePath(1.72 * R, k)} />
        <path d={ellipsePath(1.88 * R, k)} />
        <path d={ellipsePath(1.38 * R, k)} strokeOpacity={0.6} />
        <path d={ellipsePath(2.14 * R, k)} strokeOpacity={0.7} />
      </g>
      {/* planet shadow */}
      <g clipPath={`url(#${id}-rings)`}>
        <path d={geo.shadow} fill={INK} fillOpacity={0.5} />
      </g>
      {/* icy particles orbiting — inner lanes move faster (Kepler) */}
      <g className="sw-sat-lanes" fill="none" strokeLinecap="round">
        <path className="sw-sat-lane" d={ellipsePath(1.44 * R, k)} stroke="#F5F7FF" strokeOpacity={0.55} strokeWidth={1.3} strokeDasharray="0.1 9" style={{ '--sw-dur': '26s', '--sw-len': '91px' } as CSSProperties} />
        <path className="sw-sat-lane" d={ellipsePath(1.75 * R, k)} stroke="#FFFFFF" strokeOpacity={0.9} strokeWidth={1.5} strokeDasharray="0.1 13" style={{ '--sw-dur': '44s', '--sw-len': '131px' } as CSSProperties} />
        <path className="sw-sat-lane" d={ellipsePath(2.17 * R, k)} stroke="#FFFFFF" strokeOpacity={0.8} strokeWidth={1.4} strokeDasharray="0.1 11" style={{ '--sw-dur': '62s', '--sw-len': '111px' } as CSSProperties} />
      </g>
      {/* ink: Encke gap, Cassini Division edges, inner & outer rims */}
      <g fill="none" stroke={INK}>
        <path d={ellipsePath(ENCKE * R, k)} strokeWidth={lw * 0.8} strokeOpacity={0.75} />
        <path d={ellipsePath(B_OUT * R, k)} strokeWidth={lw} />
        <path d={ellipsePath(A_IN * R, k)} strokeWidth={lw} />
        <path d={ellipsePath(C_IN * R, k)} strokeWidth={lw} strokeOpacity={0.8} />
        <path d={ellipsePath(A_OUT * R, k)} strokeWidth={3.2} />
      </g>
      <g fill="#FFFFFF">
        {geo.sparkles.map((s, i) => (
          <g key={i} transform={`translate(${s.x} ${s.y})`}>
            <path
              className="sw-twinkle"
              d={sparklePath(s.s)}
              style={{ animationDelay: `${s.delay}s`, animationDuration: `${s.dur}s` }}
            />
          </g>
        ))}
      </g>
    </g>
  )

  return (
    <svg
      className={cx('sw-world sw-saturn', motion && 'sw-anim', className)}
      style={{ width: size, height: size, ...style }}
      viewBox="-172 -172 344 344"
      role="img"
      aria-label={title}
    >
      <defs>
        <clipPath id={`${id}-disc`}>
          <circle r={R} />
        </clipPath>
        <clipPath id={`${id}-front`}>
          <rect x={-200} y={0} width={400} height={200} />
        </clipPath>
        <clipPath id={`${id}-rings`}>
          <path d={ringArea} clipRule="evenodd" />
        </clipPath>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0.35" stopColor="#FF8C32" stopOpacity="0.4" />
          <stop offset="0.7" stopColor="#F46AA7" stopOpacity="0.12" />
          <stop offset="1" stopColor="#6637B8" stopOpacity="0" />
        </radialGradient>
      </defs>
      {glow && <circle className="sw-glow" r={165} fill={`url(#${id}-glow)`} />}
      <g transform={`rotate(${roll})`}>
        {rings(false)}
        {/* Saturn is visibly oblate: polar radius ~10% smaller */}
        <g transform="scale(1 0.93)">
          <g clipPath={`url(#${id}-disc)`}>
            <circle r={R} fill="#C9A066" />
            {geo.caps.map((c, i) => (
              <path key={i} d={c.d} fill={c.color} />
            ))}
            <g fill="none" strokeLinecap="round">
              {geo.streaks.map((s, i) => (
                <path
                  key={i}
                  className="sw-sat-streak"
                  d={s.d}
                  pathLength={100}
                  stroke={s.color}
                  strokeWidth={s.width}
                  strokeOpacity={0.75}
                  strokeDasharray={s.dash}
                  style={{ animationDuration: `${s.dur}s` }}
                />
              ))}
            </g>
            {showHexagon && geo.hexagon && (
              <g strokeLinejoin="round">
                <path d={geo.hexagon.outer} fill="#B4905A" stroke={INK} strokeWidth={1.3} />
                <path d={geo.hexagon.inner} fill="#C9A66C" stroke="#8C6C3E" strokeWidth={0.8} />
                <path d={geo.hexagon.eye} fill="#7A5A34" />
              </g>
            )}
            {/* cel shade + highlight */}
            <path
              d={`M${-R - 4},0 a${R + 4},${R + 4} 0 1 0 ${2 * R + 8},0 a${R + 4},${R + 4} 0 1 0 ${-2 * R - 8},0 Z M${-R - 20},-10 a${R + 3},${R + 3} 0 1 0 ${2 * R + 6},0 a${R + 3},${R + 3} 0 1 0 ${-2 * R - 6},0 Z`}
              fill="#6B2E1A"
              fillOpacity={0.24}
              fillRule="evenodd"
            />
            <ellipse cx={-30} cy={-34} rx={20} ry={11} fill="#FFFFFF" fillOpacity={0.2} transform="rotate(-38 -30 -34)" />
          </g>
          <circle r={R} fill="none" stroke={INK} strokeWidth={4} />
        </g>
        {rings(true)}
      </g>
    </svg>
  )
}

export default Saturn
