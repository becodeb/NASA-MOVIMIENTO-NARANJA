import type { CSSProperties } from 'react'
import './ships.css'
import { Sparks } from './bits'
import { CapsuleShape } from './CapsuleShape'
import { C, cx, type ReentryCorridor, type ReentryPhase } from './types'

export type ReentryCapsuleProps = {
  phase?: ReentryPhase
  /** Entry corridor — only changes the look of the 'entry' phase. */
  corridor?: ReentryCorridor
  /** Draw space / sky / ocean. Turn off to composite over a world background. */
  backdrop?: boolean
  width?: number | string
  animate?: boolean
  className?: string
  title?: string
}

const CANOPY = 'M-55,0 Q-55,-56 0,-56 Q55,-56 55,0 Q41,-11 27.5,0 Q14,-11 0,0 Q-14,-11 -27.5,0 Q-41,-11 -55,0 Z'

function Chute({ angle, len, scale, delay = 0, color = C.orange }: { angle: number; len: number; scale: number; delay?: number; color?: string }) {
  const w = 55 * scale
  return (
    <g transform={`translate(0 -42) rotate(${angle})`}>
      <g className="sh-chute" style={{ animationDelay: `${delay}s` }}>
        <path d={`M0,0 L${-w},${-len} M0,0 L${-w / 2},${-len} M0,0 L0,${-len} M0,0 L${w / 2},${-len} M0,0 L${w},${-len}`} fill="none" stroke={C.ink} strokeWidth={1.8} />
        <g transform={`translate(0 ${-len}) scale(${scale})`}>
          <g className="sh-chute-breathe">
            <path d={CANOPY} fill={C.white} strokeWidth={4 / scale} />
            <g stroke="none" fill={color}>
              <path d="M0,-56 Q-55,-56 -55,0 Q-41,-11 -27.5,0 Q-31,-40 0,-56 Z" />
              <path d="M0,-56 Q55,-56 55,0 Q41,-11 27.5,0 Q31,-40 0,-56 Z" />
              <path d="M0,-56 Q-9,-30 -6,-4 Q0,-1 6,-4 Q9,-30 0,-56 Z" />
            </g>
            <path d="M0,-56 Q-31,-40 -27.5,0 M0,-56 Q31,-40 27.5,0 M0,-56 Q-9,-30 -6,-4 M0,-56 Q9,-30 6,-4" fill="none" strokeWidth={2.4 / scale} />
            <path d={CANOPY} fill="none" strokeWidth={4 / scale} />
          </g>
        </g>
      </g>
    </g>
  )
}

function Cloud({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return <path transform={`translate(${x} ${y}) scale(${s})`} d="M0,0 q14,-26 42,-10 q24,-22 46,4 q28,2 22,24 h-118 q-14,-10 8,-18 Z" />
}

export function ReentryCapsule({
  phase = 'separation',
  corridor = 'nominal',
  backdrop = true,
  width = '100%',
  animate = true,
  className,
  title = 'Reentry capsule',
}: ReentryCapsuleProps) {
  const entry = phase === 'entry'
  const steep = entry && corridor === 'steep'
  const charred = phase !== 'separation'
  const plasmaOuter = corridor === 'steep' ? '#FFE98A' : C.orange
  const plasmaInner = corridor === 'steep' ? '#FFFFFF' : C.yellow

  return (
    <svg
      className={cx('sh-root sh-re', `sh-re--${phase}`, `sh-re--${corridor}`, className, !animate && 'sh-still')}
      viewBox="0 0 400 500"
      width={width}
      style={{ display: 'block', height: 'auto', overflow: 'hidden' }}
      role="img"
      aria-label={title}
    >
      {backdrop && (
        <g stroke="none">
          <defs>
            <linearGradient id="sh-re-g-space" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={C.deep} />
              <stop offset="1" stopColor="#1B2A6B" />
            </linearGradient>
            <linearGradient id="sh-re-g-entry" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#140F3D" />
              <stop offset="0.6" stopColor="#4A2A8C" />
              <stop offset="1" stopColor="#C2568F" />
            </linearGradient>
            <linearGradient id="sh-re-g-sky" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#2E7FE0" />
              <stop offset="1" stopColor="#A9E4FF" />
            </linearGradient>
          </defs>

          {/* space + Earth limb */}
          <g className="sh-re-bg sh-re-bg--space">
            <rect width={400} height={500} fill="url(#sh-re-g-space)" />
            {[[40, 50], [120, 110], [330, 60], [280, 170], [70, 220], [360, 250], [180, 40], [230, 300]].map(([x, y], i) => (
              <circle key={i} className="sh-twinkle" style={{ animationDelay: `${i * 0.3}s` }} cx={x} cy={y} r={1.2 + (i % 3) * 0.5} fill="#FFFFFF" />
            ))}
            <circle cx={200} cy={900} r={520} fill="#7FD8FF" opacity="0.35" />
            <circle cx={200} cy={906} r={512} fill="#2E7FE0" stroke={C.ink} strokeWidth={4} />
            <path d="M40,440 q40,-30 90,-14 q30,18 10,44 q-40,22 -90,10 Z M250,420 q50,-22 100,6 q20,30 -20,50 q-60,10 -90,-20 Z" fill={C.green} stroke={C.ink} strokeWidth={3} />
            <g fill="#FFFFFF" opacity="0.85">
              <Cloud x={130} y={420} s={0.5} />
              <Cloud x={300} y={470} s={0.6} />
            </g>
          </g>

          {/* upper atmosphere */}
          <g className="sh-re-bg sh-re-bg--entry">
            <rect width={400} height={500} fill="url(#sh-re-g-entry)" />
            <g transform="rotate(-40 200 250)">
              {[60, 120, 170, 240, 300, 350, 20, 390].map((x, i) => (
                <rect key={x} className="sh-re-streak" style={{ animationDelay: `-${i * 0.13}s`, animationDuration: `${0.55 + (i % 3) * 0.15}s` }} x={x} y={0} width={3} height={70 + (i % 4) * 30} rx={1.5} fill="#FFFFFF" opacity="0.45" />
              ))}
            </g>
          </g>

          {/* lower atmosphere */}
          <g className="sh-re-bg sh-re-bg--sky">
            <rect width={400} height={500} fill="url(#sh-re-g-sky)" />
            <g className="sh-re-cloudrise" fill="#FFFFFF" opacity="0.92">
              <Cloud x={20} y={120} />
              <Cloud x={250} y={300} s={0.8} />
              <Cloud x={90} y={470} s={1.1} />
              <Cloud x={20} y={720} />
              <Cloud x={250} y={900} s={0.8} />
              <Cloud x={90} y={1070} s={1.1} />
            </g>
          </g>

          {/* ocean (back) */}
          <g className="sh-re-bg sh-re-bg--sea">
            <rect width={400} height={500} fill="url(#sh-re-g-sky)" />
            <circle cx={320} cy={90} r={34} fill={C.yellow} stroke={C.ink} strokeWidth={4} />
            <g fill="#FFFFFF" opacity="0.92">
              <Cloud x={30} y={110} s={0.9} />
              <Cloud x={210} y={200} s={0.6} />
            </g>
            <rect y={368} width={400} height={140} fill="#1F8FD6" />
            <path className="sh-re-wave" d="M-80,372 q20,-10 40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 V392 H-80 Z" fill="#1F8FD6" stroke={C.ink} strokeWidth={3} />
            {/* recovery boat on the horizon */}
            <g className="sh-re-boat" stroke={C.ink} strokeWidth={3} strokeLinejoin="round">
              <path d="M308,372 h64 l-10,16 h-46 Z" fill={C.white} />
              <rect x={326} y={356} width={24} height={16} rx={2} fill={C.orange} />
              <path d="M338,356 V338 M338,338 l14,5 l-14,5" fill={C.teal} />
            </g>
          </g>
        </g>
      )}

      {entry && corridor === 'shallow' && (
        <path className="sh-re-skipline" d="M70,120 Q230,400 470,30" fill="none" stroke={C.yellow} strokeWidth={3} strokeLinecap="round" opacity="0.6" />
      )}

      <g className="sh-re-cap">
        <g className="sh-re-motion" stroke={C.ink} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round">
          {/* service module drifting away */}
          {phase === 'separation' && (
            <g className="sh-re-stub">
              <rect x={-36} y={-150} width={72} height={92} rx={22} fill={C.white} />
              <path className="sh-nog" d="M10,-150 h4 q22,0 22,22 v48 q0,22 -22,22 h-4 Z" fill={C.shade} stroke="none" />
              <rect x={-36} y={-150} width={72} height={92} rx={22} fill="none" />
              <rect x={-36} y={-104} width={72} height={12} fill={C.orange} strokeWidth={3} />
              <circle cx={-8} cy={-124} r={9} fill={C.teal} strokeWidth={3.5} />
              <rect x={-17} y={-60} width={34} height={12} rx={4} fill={C.metal} />
              <g className="sh-nog" stroke="none" fill="#FFFFFF">
                <ellipse className="sh-re-seppuff" cx={-34} cy={-44} rx={12} ry={6} />
                <ellipse className="sh-re-seppuff" cx={34} cy={-44} rx={12} ry={6} />
              </g>
            </g>
          )}

          {/* plasma sheath: the airflow comes from the heat-shield side, the trail streams behind */}
          {entry && (
            <g className="sh-re-plasma">
              <g className="sh-re-plasma-a">
                <path d="M-54,30 Q-60,56 0,60 Q60,56 54,30 Q52,-40 22,-120 Q9,-170 0,-230 Q-9,-170 -22,-120 Q-52,-40 -54,30 Z" fill={plasmaOuter} strokeWidth={3.5} />
              </g>
              <g className="sh-re-plasma-b" stroke="none">
                <path d="M-47,30 Q-50,50 0,53 Q50,50 47,30 Q44,-30 16,-90 Q6,-120 0,-160 Q-6,-120 -16,-90 Q-44,-30 -47,30 Z" fill={plasmaInner} />
              </g>
              {steep && <Sparks as="g" x={0} y={-70} size={46} count={9} color={C.orange} />}
            </g>
          )}

          {phase === 'drogue' && (
            <>
              <Chute angle={-13} len={120} scale={0.36} color={C.red} />
              <Chute angle={13} len={120} scale={0.36} delay={0.12} color={C.red} />
            </>
          )}
          {phase === 'main' && (
            <>
              <Chute angle={-31} len={150} scale={1} delay={0.1} />
              <Chute angle={31} len={150} scale={1} delay={0.2} />
              <Chute angle={0} len={162} scale={1} />
            </>
          )}

          {phase === 'splashdown' && (
            <g className="sh-nog">
              {/* uprighting bags */}
              {[[-13, -46, 0], [13, -46, 0.12], [0, -56, 0.24]].map(([x, y, d], i) => (
                <g key={i} transform={`translate(${x} ${y})`}>
                  <circle className="sh-re-bag" style={{ animationDelay: `${1.3 + d}s` }} r={12} fill={C.orange} strokeWidth={3.5} />
                </g>
              ))}
            </g>
          )}

          <CapsuleShape charred={charred} hot={steep} />

          {entry && (
            <g className="sh-re-bow sh-nog" stroke="none">
              <path d="M-48,31 Q0,62 48,31 Q0,48 -48,31 Z" fill="#FFFFFF" />
            </g>
          )}
          {phase === 'splashdown' && <circle className="sh-blink" cx={0} cy={-36} r={4} fill={C.green} strokeWidth={2.5} />}
        </g>
      </g>

      {/* ocean (front) + splash */}
      {phase === 'splashdown' && (
        <g stroke={C.ink} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round">
          <g className="sh-re-splash">
            <path d="M150,412 q-34,-30 -40,-78 q26,34 52,52 Z M250,412 q34,-30 40,-78 q-26,34 -52,52 Z" fill="#DFF6FF" />
            <path d="M176,412 q-16,-50 -8,-96 q14,48 30,84 Z M224,412 q16,-50 8,-96 q-14,48 -30,84 Z" fill="#FFFFFF" />
            {[[-70, -92], [-38, -128], [44, -120], [76, -84], [0, -140]].map(([dx, dy], i) => (
              <circle key={i} className="sh-re-drop" style={{ '--dx': `${dx}px`, '--dy': `${dy}px` } as CSSProperties} cx={200} cy={404} r={5 + (i % 2) * 2} fill="#DFF6FF" strokeWidth={2.5} />
            ))}
          </g>
          {backdrop ? (
            <>
              <path className="sh-re-wave sh-re-wave--front" d="M-80,410 q20,-12 40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 V510 H-80 Z" fill="#2FB3F0" />
              <path className="sh-re-wave" d="M-80,452 q20,-10 40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0" fill="none" stroke="#DFF6FF" strokeWidth={3} opacity="0.7" />
            </>
          ) : null}
          <ellipse className="sh-re-ring" cx={200} cy={412} rx={64} ry={9} fill="none" stroke="#FFFFFF" strokeWidth={3} />
          <ellipse className="sh-re-ring" style={{ animationDelay: '1.5s' }} cx={200} cy={412} rx={64} ry={9} fill="none" stroke="#FFFFFF" strokeWidth={3} />
          {/* a jettisoned main chute floating nearby */}
          <g className="sh-re-flotsam">
            <path d="M34,424 q22,-22 52,-6 q10,8 -4,10 h-44 Z" fill={C.white} />
            <path d="M52,412 q10,-4 20,0 l2,16 h-22 Z" fill={C.orange} stroke="none" />
            <path d="M34,424 q22,-22 52,-6 q10,8 -4,10 h-44 Z" fill="none" />
          </g>
        </g>
      )}

      {steep && <rect className="sh-re-overheat" width={400} height={500} fill={C.red} stroke="none" />}
    </svg>
  )
}
