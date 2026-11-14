import { useEffect, useRef, useState, type CSSProperties } from 'react'
import './ships.css'
import { ExhaustPlume } from './bits'
import { C, cx, type LaunchPhase } from './types'

export type LaunchRocketProps = {
  /** Controlled phase. Ignored while `autoPlay` is true. */
  phase?: LaunchPhase
  /** Plays pad → ignition → liftoff → ascent on its own (~5.5 s). */
  autoPlay?: boolean
  /** Fired once the ascent animation has finished. */
  onComplete?: () => void
  onPhaseChange?: (phase: LaunchPhase) => void
  /** Draw sky / ground. Turn off to composite over a world background. */
  backdrop?: boolean
  width?: number | string
  animate?: boolean
  className?: string
  title?: string
}

const ASCENT_MS = 2300
const AUTO: Array<[LaunchPhase, number]> = [['ignition', 700], ['liftoff', 1900], ['ascent', 3300]]

// deterministic smoke layout: [x, y, r, delay]
const SMOKE: Array<[number, number, number, number]> = [
  [200, 512, 30, 0], [160, 516, 34, 0.3], [240, 516, 34, 0.5], [118, 520, 38, 0.1], [282, 520, 38, 0.7],
  [72, 524, 40, 0.4], [328, 524, 40, 0.2], [30, 530, 36, 0.8], [370, 530, 36, 0.6], [140, 494, 24, 0.9],
  [260, 494, 24, 0.35], [96, 498, 22, 0.55], [304, 498, 22, 0.15],
]
const STARS: Array<[number, number, number]> = [
  [40, 60, 2], [110, 130, 1.5], [330, 80, 2.2], [280, 190, 1.4], [60, 260, 1.8], [360, 300, 1.6], [150, 40, 1.3],
  [220, 250, 1.2], [90, 400, 1.7], [310, 430, 1.5], [200, 120, 1.1], [20, 180, 1.3],
]

export function LaunchRocket({
  phase = 'pad',
  autoPlay = false,
  onComplete,
  onPhaseChange,
  backdrop = true,
  width = '100%',
  animate = true,
  className,
  title = 'Launch rocket',
}: LaunchRocketProps) {
  const [auto, setAuto] = useState<LaunchPhase>('pad')
  const [wasAuto, setWasAuto] = useState(autoPlay)
  if (wasAuto !== autoPlay) {
    setWasAuto(autoPlay)
    if (autoPlay) setAuto('pad') // restart the cinematic from the pad
  }
  const current = autoPlay ? auto : phase
  const done = useRef(onComplete)
  const changed = useRef(onPhaseChange)
  useEffect(() => {
    done.current = onComplete
    changed.current = onPhaseChange
  })

  useEffect(() => {
    if (!autoPlay) return
    const timers = AUTO.map(([p, t]) => window.setTimeout(() => setAuto(p), t))
    return () => timers.forEach(clearTimeout)
  }, [autoPlay])

  useEffect(() => {
    changed.current?.(current)
    if (current !== 'ascent') return
    const t = window.setTimeout(() => done.current?.(), ASCENT_MS)
    return () => clearTimeout(t)
  }, [current])

  const burning = current !== 'pad'
  const full = current === 'liftoff' || current === 'ascent'
  const puffs = (ink: boolean) =>
    SMOKE.map(([x, y, r, d], i) => (
      <g key={i} transform={`translate(${x} ${y})`}>
        <circle className="sh-lr-puff" style={{ animationDelay: `-${d * 2}s` }} r={r} fill={ink ? C.ink : i % 3 === 0 ? '#FFFFFF' : '#E6EAF6'} stroke={ink ? C.ink : 'none'} strokeWidth={ink ? 8 : 0} />
      </g>
    ))

  return (
    <svg
      className={cx('sh-root sh-lr', `sh-lr--${current}`, className, !animate && 'sh-still')}
      viewBox="0 0 400 600"
      width={width}
      style={{ display: 'block', height: 'auto', overflow: 'hidden' }}
      role="img"
      aria-label={title}
    >
      {backdrop && (
        <g stroke="none">
          <defs>
            <linearGradient id="sh-lr-sky" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#2A6FD6" />
              <stop offset="0.6" stopColor="#6EC3F2" />
              <stop offset="1" stopColor="#FFD9A0" />
            </linearGradient>
            <linearGradient id="sh-lr-space" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={C.deep} />
              <stop offset="1" stopColor="#2B1F6B" />
            </linearGradient>
          </defs>
          <rect width={400} height={600} fill="url(#sh-lr-sky)" />
          <g className="sh-lr-space">
            <rect width={400} height={600} fill="url(#sh-lr-space)" />
            {STARS.map(([x, y, r], i) => <circle key={i} className="sh-twinkle" style={{ animationDelay: `${i * 0.21}s` }} cx={x} cy={y} r={r} fill="#FFFFFF" />)}
          </g>
          {/* clouds that rush past during ascent */}
          <g className="sh-lr-clouds" fill="#FFFFFF" opacity="0.9">
            <path d="M20,-260 q20,-30 50,-10 q30,-22 52,6 q30,4 22,26 h-130 q-16,-10 6,-22 Z" />
            <path d="M250,-420 q20,-30 50,-10 q30,-22 52,6 q30,4 22,26 h-130 q-16,-10 6,-22 Z" />
            <path d="M120,-640 q20,-30 50,-10 q30,-22 52,6 q30,4 22,26 h-130 q-16,-10 6,-22 Z" />
          </g>
        </g>
      )}

      <g className="sh-lr-ground" stroke={C.ink} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round">
        {backdrop && (
          <>
            <path d="M-10,470 q60,-34 130,-10 q70,-30 150,-4 q70,-22 140,6 V610 H-10 Z" fill="#3F9E6B" stroke="none" opacity="0.75" />
            <rect x={-10} y={522} width={420} height={90} fill="#6B728F" />
            <rect x={-10} y={522} width={420} height={12} fill="#8E96B4" stroke="none" />
          </>
        )}
        {/* gantry tower */}
        <g>
          <rect x={84} y={150} width={40} height={372} fill="none" strokeWidth={5} />
          <path
            className="sh-lr-lattice"
            d={Array.from({ length: 9 }, (_, i) => `M84,${150 + i * 41.3} L124,${191.3 + i * 41.3} M124,${150 + i * 41.3} L84,${191.3 + i * 41.3} M84,${191.3 + i * 41.3} H124`).join(' ')}
            fill="none"
            stroke={C.red}
            strokeWidth={3.5}
          />
          <rect x={84} y={150} width={40} height={372} fill="none" stroke={C.ink} strokeWidth={5} />
          <path d="M104,150 V112" fill="none" strokeWidth={5} />
          <circle className="sh-blink" cx={104} cy={108} r={6} fill={C.red} strokeWidth={3} />
          {/* swing arms retract at ignition */}
          <g className="sh-lr-arm">
            <rect x={124} y={252} width={50} height={12} rx={3} fill={C.metal} />
            <rect x={124} y={392} width={34} height={12} rx={3} fill={C.metal} />
          </g>
        </g>
        {/* pad + flame trench */}
        <path d="M112,522 L128,500 H272 L288,522 Z" fill={C.metalDark} />
        <rect x={140} y={498} width={120} height={8} rx={3} fill={C.metalLight} />
        <rect x={96} y={520} width={208} height={12} rx={4} fill={C.metal} />
      </g>

      {/* smoke behind the rocket */}
      <g className="sh-lr-smoke sh-lr-smoke--back">
        {puffs(true)}
        {puffs(false)}
      </g>

      <g className="sh-lr-rocket">
        <g className="sh-lr-shake" stroke={C.ink} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round">
          {/* flames */}
          {burning && (
            <g className="sh-lr-flames" style={{ '--s': full ? 1 : 0.45 } as CSSProperties}>
              <ExhaustPlume as="g" x={164} y={498} rotate={-90} length={current === 'ascent' ? 190 : 150} size={26} />
              <ExhaustPlume as="g" x={236} y={498} rotate={-90} length={current === 'ascent' ? 190 : 150} size={26} />
              <ExhaustPlume as="g" x={200} y={500} rotate={-90} length={current === 'ascent' ? 230 : 180} size={40} />
            </g>
          )}
          {/* nozzles */}
          {[164, 200, 236].map((x) => <path key={x} d={`M${x - 7},482 L${x - 12},500 H${x + 12} L${x + 7},482 Z`} fill={C.metalDark} strokeWidth={3.5} />)}
          {/* side boosters */}
          {[152, 224].map((x) => (
            <g key={x}>
              <path d={`M${x},484 V318 Q${x},292 ${x + 12},280 Q${x + 24},292 ${x + 24},318 V484 Z`} fill={C.white} />
              <path className="sh-nog" d={`M${x + 15},284 Q${x + 24},294 ${x + 24},318 V484 H${x + 15} Z`} fill={C.shade} stroke="none" />
              <rect x={x} y={440} width={24} height={14} fill={C.orange} strokeWidth={3} />
              <path d={`M${x},484 V318 Q${x},292 ${x + 12},280 Q${x + 24},292 ${x + 24},318 V484 Z`} fill="none" />
            </g>
          ))}
          {/* core stage */}
          <rect x={178} y={226} width={44} height={258} fill={C.orange} />
          <rect className="sh-nog" x={206} y={226} width={16} height={258} fill={C.orangeDark} stroke="none" />
          <rect x={178} y={226} width={44} height={258} fill="none" />
          <rect x={178} y={300} width={44} height={16} fill={C.white} strokeWidth={3} />
          <rect x={178} y={226} width={44} height={22} fill={C.white} strokeWidth={3} />
          <path d="M186,340 h12 M186,352 h12 M186,364 h12" fill="none" stroke={C.ink} strokeWidth={3} />
          {/* payload fairing with the stowed ship */}
          <path d="M170,228 V140 Q170,96 200,70 Q230,96 230,140 V228 Z" fill={C.white} />
          <path className="sh-nog" d="M212,82 Q230,104 230,140 V228 H212 Z" fill={C.shade} stroke="none" />
          <path d="M170,228 V140 Q170,96 200,70 Q230,96 230,140 V228 Z" fill="none" />
          <path d="M170,206 H230" fill="none" stroke={C.teal} strokeWidth={5} />
          <path d="M170,206 H230 M200,70 V84" fill="none" strokeWidth={2.5} />
          <g className="sh-lr-stowed" fill="rgba(56,217,208,0.14)" stroke={C.teal} strokeWidth={2.2} strokeDasharray="4 3">
            {/* x-ray of the ship folded inside: capsule, habitat, folded arrays */}
            <path d="M200,98 q12,2 13,16 h-26 q1,-14 13,-16 Z" />
            <rect x={188} y={116} width={24} height={50} rx={8} />
            <rect x={180} y={124} width={6} height={56} rx={2} />
            <rect x={214} y={124} width={6} height={56} rx={2} />
            <rect x={191} y={168} width={18} height={24} rx={3} />
            <circle cx={200} cy={132} r={4} />
          </g>
          {/* pad vapour */}
          <g className="sh-lr-vapor sh-nog" stroke="none" fill="#FFFFFF">
            <ellipse className="sh-lr-wisp" cx={228} cy={330} rx={12} ry={7} />
            <ellipse className="sh-lr-wisp" style={{ animationDelay: '-1.2s' }} cx={226} cy={410} rx={10} ry={6} />
            <ellipse className="sh-lr-wisp" style={{ animationDelay: '-2s' }} cx={174} cy={270} rx={9} ry={5} />
          </g>
        </g>
      </g>

      {/* smoke in front */}
      <g className="sh-lr-smoke sh-lr-smoke--front">
        <g transform="translate(0 26)">
          {puffs(true)}
          {puffs(false)}
        </g>
      </g>
    </svg>
  )
}
