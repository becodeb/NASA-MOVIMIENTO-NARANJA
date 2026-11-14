import { useMemo, type CSSProperties } from 'react'
import './worlds.css'
import { INK, cx, r1, rng, useMotion, useSvgId, type Size } from './util'

interface BodyProps {
  /** Rendered width. Number = px, or any CSS length. */
  size?: Size
  glow?: boolean
  animate?: boolean
  className?: string
  style?: CSSProperties
  title?: string
}

const shade = (R: number, dx: number, dy: number) =>
  `M${-R - 4},0 a${R + 4},${R + 4} 0 1 0 ${2 * R + 8},0 a${R + 4},${R + 4} 0 1 0 ${-2 * R - 8},0 Z M${-R + dx},${dy} a${R},${R} 0 1 0 ${2 * R},0 a${R},${R} 0 1 0 ${-2 * R},0 Z`

/* ───────────────────────── Titan ───────────────────────── */

export type TitanProps = BodyProps

// haze streaks: [y, colour, width, dash (sums to 100), seconds]
const TITAN_STREAKS: [number, string, number, string, number][] = [
  [-52, '#D98E2E', 7, '30 20 18 32', 70],
  [-30, '#F7BC55', 6, '22 28 26 24', 58],
  [-8, '#E39A33', 8, '34 16 20 30', 64],
  [14, '#F9C562', 6, '18 32 28 22', 52],
  [36, '#DE9230', 7, '26 24 22 28', 66],
  [58, '#F2B24C', 5, '20 30 24 26', 74],
]

/** Titan: a featureless orange smog ball — thick N₂/CH₄ atmosphere with a detached blue-violet haze layer. */
export function Titan({ size = 150, glow = true, animate = true, className, style, title = 'Titan' }: TitanProps) {
  const motion = useMotion(animate)
  const id = useSvgId('sw-titan')
  const R = 86
  return (
    <svg
      className={cx('sw-world sw-titan', motion && 'sw-anim', className)}
      style={{ width: size, height: size, ...style }}
      viewBox="-125 -125 250 250"
      role="img"
      aria-label={title}
    >
      <defs>
        <clipPath id={`${id}-disc`}>
          <circle r={R} />
        </clipPath>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0.6" stopColor="#FF8C32" stopOpacity="0.5" />
          <stop offset="1" stopColor="#FF8C32" stopOpacity="0" />
        </radialGradient>
      </defs>
      {glow && <circle className="sw-glow" r={124} fill={`url(#${id}-glow)`} />}
      {/* detached high-altitude haze layers */}
      <circle className="sw-titan-haze" r={R + 15} fill="none" stroke="#8E7BE0" strokeOpacity={0.55} strokeWidth={3} />
      <circle r={R + 9} fill="#7C6BD6" fillOpacity={0.38} />
      <circle r={R + 5} fill="#C97F27" stroke={INK} strokeWidth={4.5} />
      <g clipPath={`url(#${id}-disc)`}>
        <circle r={R} fill="#EFA63A" />
        <g fill="none" strokeLinecap="round" strokeOpacity={0.6}>
          {TITAN_STREAKS.map(([y, color, w, dash, dur], i) => (
            <path
              key={i}
              className="sw-sat-streak"
              d={`M${-R},${y} Q0,${y + 10} ${R},${y}`}
              pathLength={100}
              stroke={color}
              strokeWidth={w}
              strokeDasharray={dash}
              style={{ animationDuration: `${dur}s` }}
            />
          ))}
        </g>
        {/* darker north-polar hood */}
        <ellipse cx={0} cy={-R + 4} rx={62} ry={20} fill="#C9792A" fillOpacity={0.75} />
        <path d={shade(R, -24, -12)} fill="#7A2E12" fillOpacity={0.28} fillRule="evenodd" />
        <ellipse cx={-36} cy={-42} rx={22} ry={11} fill="#FFFFFF" fillOpacity={0.2} transform="rotate(-40 -36 -42)" />
      </g>
    </svg>
  )
}

/* ─────────────────────── Enceladus ─────────────────────── */

export interface EnceladusProps extends BodyProps {
  /** Show the south-polar water-ice plumes. */
  plumes?: boolean
}

/** Enceladus: brilliant white ice, cratered north, smooth south with blue "tiger stripes" venting water-ice jets. */
export function Enceladus({
  size = 150,
  plumes = true,
  glow = true,
  animate = true,
  className,
  style,
  title = 'Enceladus',
}: EnceladusProps) {
  const motion = useMotion(animate)
  const id = useSvgId('sw-enc')
  const R = 78
  const fx = useMemo(() => {
    const rand = rng(31)
    const jets = [-40, -29, -19, -10, -2, 6, 14, 23, 33, 42].map((deg, i) => {
      const a = ((90 + deg) * Math.PI) / 180 // screen angle (y down): 90° = straight down
      const dir: [number, number] = [Math.cos(a), Math.sin(a)]
      const perp: [number, number] = [-dir[1], dir[0]]
      const len = 70 + rand() * 42 - Math.abs(deg) * 0.7
      const w = 2.6 + rand() * 3.4
      const sx = dir[0] * (R - 6)
      const sy = dir[1] * (R - 6)
      const ex = sx + dir[0] * len
      const ey = sy + dir[1] * len
      const d = `M${r1(sx - perp[0] * 1.6)},${r1(sy - perp[1] * 1.6)} L${r1(ex - perp[0] * w)},${r1(ey - perp[1] * w)} Q${r1(ex + dir[0] * w * 1.3)},${r1(ey + dir[1] * w * 1.3)} ${r1(ex + perp[0] * w)},${r1(ey + perp[1] * w)} L${r1(sx + perp[0] * 1.6)},${r1(sy + perp[1] * 1.6)} Z`
      return { d, ox: r1(sx), oy: r1(sy), delay: -(i * 0.43), dur: 2.2 + rand() * 1.4 }
    })
    const bits = Array.from({ length: 18 }, (_, i) => {
      const deg = -38 + rand() * 76
      const a = ((90 + deg) * Math.PI) / 180
      const dist = 60 + rand() * 70
      return {
        x: r1(Math.cos(a) * (R - 2)),
        y: r1(Math.sin(a) * (R - 2)),
        dx: r1(Math.cos(a) * dist),
        dy: r1(Math.sin(a) * dist),
        r: 1.4 + rand() * 2,
        delay: -(i * 0.31 + rand()),
        dur: 1.8 + rand() * 1.8,
      }
    })
    return { jets, bits }
  }, [])

  return (
    <svg
      className={cx('sw-world sw-enceladus', motion && 'sw-anim', className)}
      style={{ width: size, aspectRatio: '250 / 300', ...style }}
      viewBox="-125 -110 250 300"
      role="img"
      aria-label={title}
    >
      <defs>
        <clipPath id={`${id}-disc`}>
          <circle r={R} />
        </clipPath>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0.6" stopColor="#BFEFFF" stopOpacity="0.5" />
          <stop offset="1" stopColor="#BFEFFF" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-plume`} gradientUnits="userSpaceOnUse" cx={0} cy={0} r={R + 105}>
          <stop offset="0.42" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="0.7" stopColor="#BFEFFF" stopOpacity="0.6" />
          <stop offset="1" stopColor="#8FD8FF" stopOpacity="0" />
        </radialGradient>
      </defs>
      {glow && <circle className="sw-glow" r={108} fill={`url(#${id}-glow)`} />}
      {plumes && (
        <g>
          {/* soft mist fan behind the individual jets */}
          <path className="sw-plume-mist" d={`M-46,${R - 22} L-92,${R + 86} Q0,${R + 122} 92,${R + 86} L46,${R - 22} Z`} fill={`url(#${id}-plume)`} fillOpacity={0.3} />
          <g fill={`url(#${id}-plume)`}>
            {fx.jets.map((j, i) => (
              <path
                key={i}
                className="sw-plume-jet"
                d={j.d}
                style={{
                  transformOrigin: `${j.ox}px ${j.oy}px`,
                  animationDelay: `${j.delay}s`,
                  animationDuration: `${j.dur}s`,
                }}
              />
            ))}
          </g>
          <g fill="#FFFFFF">
            {fx.bits.map((b, i) => (
              <circle
                key={i}
                className="sw-plume-bit"
                cx={b.x}
                cy={b.y}
                r={b.r}
                style={
                  {
                    '--sw-dx': `${b.dx}px`,
                    '--sw-dy': `${b.dy}px`,
                    animationDelay: `${b.delay}s`,
                    animationDuration: `${b.dur}s`,
                  } as CSSProperties
                }
              />
            ))}
          </g>
        </g>
      )}
      <circle r={R} fill="#F7FBFF" />
      <g clipPath={`url(#${id}-disc)`}>
        {/* cratered northern terrain */}
        <g fill="#DCE9F7" stroke="#9DB9D8" strokeWidth={1.6}>
          <circle cx={-26} cy={-44} r={9} />
          <circle cx={8} cy={-54} r={6} />
          <circle cx={30} cy={-34} r={10} />
          <circle cx={-6} cy={-26} r={5} />
          <circle cx={-48} cy={-18} r={6} />
          <circle cx={50} cy={-8} r={4.5} />
          <circle cx={14} cy={-12} r={3.5} />
        </g>
        {/* tectonic ridges and grooves at mid latitudes */}
        <g fill="none" stroke="#A9C6E4" strokeWidth={1.8} strokeLinecap="round">
          <path d="M-74,6 Q-40,-4 -8,8 T62,2" />
          <path d="M-66,24 Q-30,14 4,24 T72,18" />
          <path d="M-30,6 Q-22,16 -28,26" />
          <path d="M24,6 Q34,14 28,22" />
        </g>
        {/* tiger stripes (sulci) near the south pole */}
        <g fill="none" strokeLinecap="round">
          <g stroke="#1F86C9" strokeWidth={4.2}>
            <path d="M-44,44 Q-20,36 0,44 T44,42" />
            <path d="M-38,54 Q-14,47 6,54 T40,53" />
            <path d="M-30,64 Q-8,58 8,64 T32,63" />
            <path d="M-20,72 Q-4,68 6,72 T22,71" />
          </g>
          <g stroke="#38D9D0" strokeWidth={1.6}>
            <path d="M-44,44 Q-20,36 0,44 T44,42" />
            <path d="M-38,54 Q-14,47 6,54 T40,53" />
            <path d="M-30,64 Q-8,58 8,64 T32,63" />
            <path d="M-20,72 Q-4,68 6,72 T22,71" />
          </g>
        </g>
        <path d={shade(R, -22, -12)} fill="#5B8FD0" fillOpacity={0.3} fillRule="evenodd" />
        <ellipse cx={-34} cy={-40} rx={18} ry={9} fill="#FFFFFF" fillOpacity={0.9} transform="rotate(-40 -34 -40)" />
      </g>
      <circle r={R} fill="none" stroke={INK} strokeWidth={4.5} />
    </svg>
  )
}

/* ───────────────────────── Sun ───────────────────────── */

export type SunProps = BodyProps

function star(n: number, rOut: number, rIn: number, phase = 0): string {
  let d = ''
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? rIn : rOut
    const a = phase + (Math.PI * i) / n
    d += `${i ? 'L' : 'M'}${r1(Math.cos(a) * r)},${r1(Math.sin(a) * r)} `
  }
  return `${d}Z`
}

/** A small cartoon Sun with a slowly turning corona. */
export function Sun({ size = 110, glow = true, animate = true, className, style, title = 'Sun' }: SunProps) {
  const motion = useMotion(animate)
  const id = useSvgId('sw-sun')
  const R = 60
  return (
    <svg
      className={cx('sw-world sw-sun', motion && 'sw-anim', className)}
      style={{ width: size, height: size, ...style }}
      viewBox="-125 -125 250 250"
      role="img"
      aria-label={title}
    >
      <defs>
        <clipPath id={`${id}-disc`}>
          <circle r={R} />
        </clipPath>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0.4" stopColor="#FFD447" stopOpacity="0.6" />
          <stop offset="0.75" stopColor="#FF8C32" stopOpacity="0.18" />
          <stop offset="1" stopColor="#FF8C32" stopOpacity="0" />
        </radialGradient>
      </defs>
      {glow && <circle className="sw-glow sw-sun-pulse" r={124} fill={`url(#${id}-glow)`} />}
      <path className="sw-spin-rev" d={star(12, 100, 74, 0.13)} fill="#FF8C32" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
      <path className="sw-spin" d={star(12, 88, 70)} fill="#FFB52E" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
      <circle r={R} fill="#FFD447" />
      <g clipPath={`url(#${id}-disc)`}>
        <path d={shade(R, -14, -9)} fill="#FF8C32" fillOpacity={0.75} fillRule="evenodd" />
        {/* sunspots */}
        <ellipse cx={14} cy={-12} rx={7} ry={5} fill="#E8701A" />
        <ellipse cx={24} cy={-4} rx={3.5} ry={2.5} fill="#E8701A" />
        <ellipse cx={-22} cy={20} rx={5} ry={3.5} fill="#E8701A" />
        <ellipse cx={-24} cy={-26} rx={15} ry={8} fill="#FFFFFF" fillOpacity={0.55} transform="rotate(-40 -24 -26)" />
      </g>
      <circle r={R} fill="none" stroke={INK} strokeWidth={4.5} />
    </svg>
  )
}
