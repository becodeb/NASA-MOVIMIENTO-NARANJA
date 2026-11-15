import type { CSSProperties } from 'react'
import './worlds.css'
import { INK, cx, useMotion, useSvgId, type Size } from './util'

/** Same API as the bodies in Moons.tsx (Titan, Sun…). */
interface BodyProps {
  /** Rendered width/height (square). Number = px, or any CSS length. */
  size?: Size
  glow?: boolean
  animate?: boolean
  className?: string
  style?: CSSProperties
  title?: string
}

export type PhobosProps = BodyProps
export type DeimosProps = BodyProps

const PHOBOS_SHAPE =
  'M-80,-8 Q-82,-40 -52,-55 Q-26,-67 6,-59 Q26,-64 48,-51 Q78,-35 84,-4 Q88,22 68,41 Q50,59 20,59 Q0,67 -28,59 Q-58,53 -73,29 Q-81,12 -80,-8 Z'

const DEIMOS_SHAPE =
  'M-58,-10 Q-56,-38 -30,-47 Q-4,-55 22,-47 Q51,-38 59,-10 Q63,16 45,34 Q24,50 -4,47 Q-34,47 -49,27 Q-59,10 -58,-10 Z'

function Pit({ x, y, r, fill, rim, lip }: { x: number; y: number; r: number; fill: string; rim: string; lip: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse rx={r} ry={r * 0.84} fill={fill} stroke={rim} strokeWidth={1.8} />
      <path
        d={`M${r * 0.62},${-r * 0.28} A${r * 0.7},${r * 0.6} 0 0 1 ${-r * 0.3},${r * 0.5}`}
        fill="none"
        stroke={lip}
        strokeWidth={Math.max(1.2, r * 0.26)}
        strokeLinecap="round"
      />
    </g>
  )
}

/** Phobos: lumpy grey-brown potato with the huge Stickney crater and the faint grooves that radiate from it. */
export function Phobos({ size = 150, glow = true, animate = true, className, style, title = 'Phobos' }: PhobosProps) {
  const motion = useMotion(animate)
  const id = useSvgId('sw-phobos')
  return (
    <svg
      className={cx('sw-world sw-phobos', motion && 'sw-anim', className)}
      style={{ width: size, height: size, ...style }}
      viewBox="-125 -125 250 250"
      role="img"
      aria-label={title}
    >
      <defs>
        <clipPath id={`${id}-body`}>
          <path d={PHOBOS_SHAPE} />
        </clipPath>
        <mask id={`${id}-shade`} maskUnits="userSpaceOnUse" x={-125} y={-125} width={250} height={250}>
          <rect x={-125} y={-125} width={250} height={250} fill="#FFFFFF" />
          <path d={PHOBOS_SHAPE} fill="#000000" transform="translate(-20 -15)" />
        </mask>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0.55" stopColor="#D9C3B0" stopOpacity="0.4" />
          <stop offset="1" stopColor="#D9C3B0" stopOpacity="0" />
        </radialGradient>
      </defs>
      {glow && <circle className="sw-glow" r={124} fill={`url(#${id}-glow)`} />}
      <g className="sw-moon-wobble">
        <path d={PHOBOS_SHAPE} fill="#8F7D71" />
        <g clipPath={`url(#${id}-body)`}>
          {/* lighter dusty patch */}
          <ellipse cx={30} cy={-34} rx={40} ry={16} fill="#A8968A" fillOpacity={0.7} transform="rotate(12 30 -34)" />
          {/* grooves fanning out from Stickney */}
          <g fill="none" stroke="#6A5A52" strokeOpacity={0.75} strokeWidth={2.2} strokeLinecap="round">
            <path d="M-8,-46 Q22,-40 60,-40" />
            <path d="M-4,-28 Q30,-22 78,-21" />
            <path d="M-4,-9 Q32,-3 84,-2" />
            <path d="M-6,10 Q28,17 78,18" />
            <path d="M-12,28 Q18,36 62,38" />
            <path d="M-24,44 Q4,51 36,52" />
          </g>
          {/* small craters */}
          <Pit x={32} y={-38} r={6} fill="#7A695F" rim="#4F423C" lip="#B9A79A" />
          <Pit x={54} y={6} r={8.5} fill="#7A695F" rim="#4F423C" lip="#B9A79A" />
          <Pit x={14} y={30} r={5} fill="#7A695F" rim="#4F423C" lip="#B9A79A" />
          <Pit x={-30} y={44} r={4.5} fill="#7A695F" rim="#4F423C" lip="#B9A79A" />
          <Pit x={6} y={-10} r={3.5} fill="#7A695F" rim="#4F423C" lip="#B9A79A" />
          {/* Stickney */}
          <g transform="translate(-42 -8) rotate(-12)">
            <ellipse rx={29} ry={25} fill="#B5A396" stroke={INK} strokeWidth={2.5} />
            <ellipse cx={1.5} cy={1.5} rx={23} ry={19.5} fill="#6B5B53" />
            <path d="M-21.5,1.5 A23,19.5 0 0 1 24.5,1.5 A26,24 0 0 0 -21.5,1.5 Z" fill="#4B3E38" transform="translate(0 -1)" />
            <ellipse cx={9} cy={7} rx={6} ry={5} fill="#57493F" stroke="#3E332E" strokeWidth={1.6} />
          </g>
          <rect x={-125} y={-125} width={250} height={250} fill="#2A1830" fillOpacity={0.34} mask={`url(#${id}-shade)`} />
          <ellipse cx={-10} cy={-47} rx={22} ry={6} fill="#FFFFFF" fillOpacity={0.22} transform="rotate(-8 -10 -47)" />
        </g>
        <path d={PHOBOS_SHAPE} fill="none" stroke={INK} strokeWidth={4.5} strokeLinejoin="round" />
      </g>
    </svg>
  )
}

/** Deimos: the smaller, smoother outer moon — pale dust blanket, only a couple of soft craters. Drawn ~3/4 the size of Phobos in the same box. */
export function Deimos({ size = 150, glow = true, animate = true, className, style, title = 'Deimos' }: DeimosProps) {
  const motion = useMotion(animate)
  const id = useSvgId('sw-deimos')
  return (
    <svg
      className={cx('sw-world sw-deimos', motion && 'sw-anim', className)}
      style={{ width: size, height: size, ...style }}
      viewBox="-125 -125 250 250"
      role="img"
      aria-label={title}
    >
      <defs>
        <clipPath id={`${id}-body`}>
          <path d={DEIMOS_SHAPE} />
        </clipPath>
        <mask id={`${id}-shade`} maskUnits="userSpaceOnUse" x={-125} y={-125} width={250} height={250}>
          <rect x={-125} y={-125} width={250} height={250} fill="#FFFFFF" />
          <path d={DEIMOS_SHAPE} fill="#000000" transform="translate(-15 -11)" />
        </mask>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0.42" stopColor="#E6D6C6" stopOpacity="0.4" />
          <stop offset="0.85" stopColor="#E6D6C6" stopOpacity="0" />
        </radialGradient>
      </defs>
      {glow && <circle className="sw-glow" r={124} fill={`url(#${id}-glow)`} />}
      <g className="sw-moon-wobble sw-moon-wobble--slow">
        <path d={DEIMOS_SHAPE} fill="#BFAE9E" />
        <g clipPath={`url(#${id}-body)`}>
          {/* smooth dust drifts */}
          <g fill="none" stroke="#D3C4B5" strokeWidth={5} strokeLinecap="round" strokeOpacity={0.8}>
            <path d="M-40,-22 Q-10,-32 26,-26" />
            <path d="M-30,18 Q0,10 40,16" />
          </g>
          <Pit x={-14} y={-6} r={9} fill="#A8978A" rim="#7C6C61" lip="#DDCFC1" />
          <Pit x={24} y={4} r={6} fill="#A8978A" rim="#7C6C61" lip="#DDCFC1" />
          <Pit x={2} y={28} r={4} fill="#A8978A" rim="#7C6C61" lip="#DDCFC1" />
          <rect x={-125} y={-125} width={250} height={250} fill="#2A1830" fillOpacity={0.3} mask={`url(#${id}-shade)`} />
          <ellipse cx={-12} cy={-38} rx={18} ry={5} fill="#FFFFFF" fillOpacity={0.3} transform="rotate(-8 -12 -38)" />
        </g>
        <path d={DEIMOS_SHAPE} fill="none" stroke={INK} strokeWidth={4.5} strokeLinejoin="round" />
      </g>
    </svg>
  )
}
