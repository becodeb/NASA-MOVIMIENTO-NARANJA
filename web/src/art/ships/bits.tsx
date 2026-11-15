import { useId, type CSSProperties, type ReactNode } from 'react'
import './ships.css'
import { C, cx } from './types'

/**
 * Small reusable FX. Each one renders a standalone <svg> by default, or a <g>
 * (as="g") so it can be dropped inside another SVG at x/y in user units.
 */
type BitBase = {
  as?: 'svg' | 'g'
  x?: number
  y?: number
  /** Rotation in degrees (only meaningful with as="g"). */
  rotate?: number
  /** CSS width when standalone. */
  width?: number | string
  animate?: boolean
  className?: string
}

function Shell({
  as = 'svg', x = 0, y = 0, rotate = 0, width = 120, animate = true, className, viewBox, origin, children,
}: BitBase & { viewBox: [number, number, number, number]; origin: [number, number]; children: ReactNode }) {
  if (as === 'g') {
    return (
      <g className={cx(className, !animate && 'sh-still')} transform={`translate(${x} ${y}) rotate(${rotate})`}>
        {children}
      </g>
    )
  }
  return (
    <svg
      className={cx('sh-root', className, !animate && 'sh-still')}
      viewBox={viewBox.join(' ')}
      width={width}
      style={{ display: 'block', height: 'auto', overflow: 'visible' }}
      aria-hidden="true"
    >
      <g transform={`translate(${origin[0]} ${origin[1]})`}>{children}</g>
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* ExhaustPlume — nozzle at the origin, plume pointing towards −x      */
/* ------------------------------------------------------------------ */
export type ExhaustPlumeProps = BitBase & {
  kind?: 'chemical' | 'ion'
  length?: number
  /** Nozzle exit diameter in user units. */
  size?: number
  /** 0..1 throttle. */
  power?: number
}

export function ExhaustPlume({ kind = 'chemical', length = 100, size = 36, power = 1, ...rest }: ExhaustPlumeProps) {
  const id = useId().replace(/:/g, '')
  const p = Math.max(0, Math.min(1, power))
  const L = length * (0.35 + 0.65 * p)
  const W = (size / 2) * (0.7 + 0.3 * p)
  const flame = (l: number, w: number) =>
    `M0,${-w} C${-l * 0.3},${-w * 1.35} ${-l * 0.7},${-w * 0.5} ${-l},0 C${-l * 0.7},${w * 0.5} ${-l * 0.3},${w * 1.35} 0,${w} Z`
  const shellProps = {
    ...rest,
    viewBox: [0, 0, length + 20, size * 2] as [number, number, number, number],
    origin: [length + 10, size] as [number, number],
  }
  if (p === 0) return <Shell {...shellProps}>{null}</Shell>

  if (kind === 'ion') {
    return (
      <Shell {...shellProps} className={cx('sh-ion', rest.className)}>
        <defs>
          <linearGradient id={`${id}b`} x1="1" x2="0" y1="0" y2="0">
            <stop offset="0" stopColor="#BFF6FF" stopOpacity="0.95" />
            <stop offset="0.25" stopColor="#4FB8FF" stopOpacity="0.75" />
            <stop offset="1" stopColor="#3D7BFF" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g className="sh-ion-beam" stroke="none">
          <path d={`M0,${-W * 0.9} L${-L},${-W * 0.35} L${-L},${W * 0.35} L0,${W * 0.9} Z`} fill={`url(#${id}b)`} opacity="0.55" />
          <path d={`M0,${-W * 0.45} L${-L * 0.9},${-W * 0.1} L${-L * 0.9},${W * 0.1} L0,${W * 0.45} Z`} fill={`url(#${id}b)`} />
        </g>
        <line className="sh-ion-dash" x1={0} y1={0} x2={-L * 0.85} y2={0} stroke="#E9FCFF" strokeWidth={W * 0.16} strokeLinecap="round" strokeDasharray="10 16" />
        <ellipse className="sh-ion-glow" cx={-2} cy={0} rx={W * 0.55} ry={W * 1.05} fill="#BFF6FF" stroke="none" />
      </Shell>
    )
  }

  return (
    <Shell {...shellProps} className={cx('sh-flame', rest.className)}>
      <g className="sh-flame-a">
        <path d={flame(L, W)} fill={C.orange} stroke={C.ink} strokeWidth={3} strokeLinejoin="round" />
      </g>
      <g className="sh-flame-b" stroke="none">
        <path d={flame(L * 0.72, W * 0.66)} fill={C.yellow} />
      </g>
      <g className="sh-flame-c" stroke="none">
        <path d={flame(L * 0.4, W * 0.36)} fill="#FFF8DC" />
        {/* shock diamonds */}
        <path d={`M${-L * 0.46},0 l${-L * 0.05},${-W * 0.16} l${-L * 0.05},${W * 0.16} l${L * 0.05},${W * 0.16} Z`} fill="#FFF8DC" opacity="0.9" />
        <path d={`M${-L * 0.6},0 l${-L * 0.035},${-W * 0.1} l${-L * 0.035},${W * 0.1} l${L * 0.035},${W * 0.1} Z`} fill="#FFF8DC" opacity="0.7" />
      </g>
    </Shell>
  )
}

/* ------------------------------------------------------------------ */
/* Sparks — electrical sparks bursting from the origin                 */
/* ------------------------------------------------------------------ */
export type SparksProps = BitBase & { size?: number; count?: number; color?: string }

export function Sparks({ size = 30, count = 6, color = C.yellow, ...rest }: SparksProps) {
  const rays = Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2 + (i % 2 ? 0.35 : -0.2)
    const r = size * (0.7 + ((i * 37) % 10) / 22)
    return { dx: Math.cos(a) * r, dy: Math.sin(a) * r, d: ((i * 0.23) % 0.9).toFixed(2) }
  })
  const s = size * 0.42
  return (
    <Shell {...rest} viewBox={[0, 0, size * 3, size * 3]} origin={[size * 1.5, size * 1.5]} className={cx('sh-sparks', rest.className)}>
      {rays.map((r, i) => (
        <g key={i} className="sh-spark" style={{ '--dx': `${r.dx}px`, '--dy': `${r.dy}px`, animationDelay: `-${r.d}s` } as CSSProperties}>
          <path
            d={`M${-r.dx * 0.22},${-r.dy * 0.22} L${r.dx * 0.22},${r.dy * 0.22}`}
            stroke={i % 3 === 0 ? '#FFFFFF' : color}
            strokeWidth={Math.max(2, size * 0.1)}
            strokeLinecap="round"
            fill="none"
          />
        </g>
      ))}
      <path
        className="sh-spark-flash"
        d={`M0,${-s} L${s * 0.25},${-s * 0.25} L${s},0 L${s * 0.25},${s * 0.25} L0,${s} L${-s * 0.25},${s * 0.25} L${-s},0 L${-s * 0.25},${-s * 0.25} Z`}
        fill="#FFFFFF"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </Shell>
  )
}

/* ------------------------------------------------------------------ */
/* SmokePuff — chunky cartoon puffs drifting away from the origin      */
/* ------------------------------------------------------------------ */
export type SmokePuffProps = BitBase & {
  size?: number
  tone?: 'gray' | 'white' | 'dark'
  /** Drift vector in user units. */
  dx?: number
  dy?: number
  count?: number
}

const SMOKE_TONES = {
  gray: ['#9AA3BC', '#C3CADD'],
  white: ['#DCE2F2', '#FFFFFF'],
  dark: ['#4A4F68', '#73799A'],
} as const

export function SmokePuff({ size = 26, tone = 'gray', dx = -30, dy = -50, count = 3, ...rest }: SmokePuffProps) {
  const [base, hi] = SMOKE_TONES[tone]
  const r = size / 2
  return (
    <Shell {...rest} viewBox={[0, 0, size * 4, size * 4]} origin={[size * 2.6, size * 3.2]} className={cx('sh-smoke', rest.className)}>
      {Array.from({ length: count }, (_, i) => (
        <g
          key={i}
          className="sh-smoke-puff"
          style={{ '--dx': `${dx + (i - 1) * size * 0.3}px`, '--dy': `${dy}px`, animationDelay: `-${(i * 2.4) / count}s` } as CSSProperties}
        >
          {/* ink pass then fill pass = one merged cartoon outline */}
          <g fill={C.ink} stroke={C.ink} strokeWidth={5} strokeLinejoin="round">
            <circle cx={-r * 0.55} cy={r * 0.15} r={r * 0.62} />
            <circle cx={r * 0.5} cy={r * 0.2} r={r * 0.55} />
            <circle cx={0} cy={-r * 0.3} r={r * 0.72} />
          </g>
          <g fill={base} stroke="none">
            <circle cx={-r * 0.55} cy={r * 0.15} r={r * 0.62} />
            <circle cx={r * 0.5} cy={r * 0.2} r={r * 0.55} />
            <circle cx={0} cy={-r * 0.3} r={r * 0.72} />
            <circle cx={-r * 0.15} cy={-r * 0.5} r={r * 0.36} fill={hi} />
          </g>
        </g>
      ))}
    </Shell>
  )
}

/* ------------------------------------------------------------------ */
/* Sparkle — one-shot burst of 4-point stars (assembly "snap" feedback) */
/* ------------------------------------------------------------------ */
export type SparkleProps = BitBase & { size?: number }

export function Sparkle({ size = 60, ...rest }: SparkleProps) {
  const star = (s: number) =>
    `M0,${-s} Q${s * 0.12},${-s * 0.12} ${s},0 Q${s * 0.12},${s * 0.12} 0,${s} Q${-s * 0.12},${s * 0.12} ${-s},0 Q${-s * 0.12},${-s * 0.12} 0,${-s} Z`
  const pts = [
    [-1, -0.7, 0.34], [0.9, -0.85, 0.42], [1.05, 0.5, 0.3], [-0.8, 0.75, 0.38], [0.1, -1.2, 0.26], [0, 0, 0.6],
  ]
  return (
    <Shell {...rest} viewBox={[0, 0, size * 3, size * 3]} origin={[size * 1.5, size * 1.5]} className={cx('sh-sparkle', rest.className)}>
      <circle className="sh-sparkle-ring" r={size * 0.9} fill="none" stroke={C.teal} strokeWidth={4} />
      {pts.map(([px, py, s], i) => (
        <g key={i} transform={`translate(${px * size} ${py * size})`}>
          <path
            className="sh-sparkle-star"
            style={{ animationDelay: `${i * 0.05}s` }}
            d={star(s * size)}
            fill={i % 2 ? '#FFFFFF' : C.yellow}
            stroke={C.ink}
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
        </g>
      ))}
    </Shell>
  )
}
