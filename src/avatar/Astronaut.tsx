// Full-body cartoon astronaut, drawn entirely in SVG. Original character design.
// Coordinate space: x -20..260, y 0..400. Head centre (120, 90); helmet centre (120, 88) r 76.
import { useId, type CSSProperties, type ReactNode } from 'react'
import './avatar.css'
import {
  GLOVE_COLORS, HAIR_COLORS, SKIN_TONES, SUIT_COLORS,
  type AstronautExpression, type AstronautPose, type AvatarConfig, type EarStyle, type EyeStyle, type EyebrowStyle, type FaceShape,
} from './types'

export interface AstronautProps {
  config: AvatarConfig
  pose?: AstronautPose
  expression?: AstronautExpression
  /** Rendered height (full body) or width/height (bust). Number = px, string = any CSS length. Default: fills parent height. */
  size?: number | string
  /** Head-and-shoulders crop for HUD portraits (square). Arms stay at rest. */
  bust?: boolean
  /** Idle bob/breathing, blinking and pose animations. Default true. */
  animate?: boolean
  /** Accessible name. Without it the SVG is decorative (aria-hidden). */
  title?: string
  /** Custom viewBox [x, y, w, h] — used for option thumbnails. */
  crop?: [number, number, number, number]
  className?: string
  style?: CSSProperties
}

const INK = '#111326'
const SUIT = '#F5F7FF'
const SUIT_SHADE = '#D3DBEE'
const METAL = '#C3CCE2'
const METAL_DARK = '#8896B3'
const TEAL = '#38D9D0'
const ORANGE = '#FF8C32'
const MOUTH_DARK = '#7A1F3D'

function mix(a: string, b: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
  const [x, y] = [p(a), p(b)]
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')
}

/* ---------- face geometry ---------- */
const CRANIUM = 'M 76,90 C 76,60 96,46 120,46 C 144,46 164,60 164,90 '
const FACES: Record<FaceShape, { d: string; mouthY: number; noseY: number }> = {
  round: { d: CRANIUM + 'C 164,122 146,142 120,142 C 94,142 76,122 76,90 Z', mouthY: 123, noseY: 108 },
  oval: { d: CRANIUM + 'C 164,124 144,147 120,147 C 96,147 76,124 76,90 Z', mouthY: 126, noseY: 109 },
  square: { d: CRANIUM + 'C 164,108 167,140 146,141 L 94,141 C 73,140 76,108 76,90 Z', mouthY: 123, noseY: 108 },
  long: { d: CRANIUM + 'C 164,130 148,151 120,151 C 92,151 76,130 76,90 Z', mouthY: 130, noseY: 111 },
  'soft-triangle': { d: CRANIUM + 'C 164,112 140,148 120,148 C 100,148 76,112 76,90 Z', mouthY: 125, noseY: 108 },
}
const EYE_Y = 90
const EYE_DX = 18
const EYES: Record<EyeStyle, { rx: number; ry: number; pr: number; lid?: number; lash?: boolean }> = {
  'big-round': { rx: 13, ry: 13, pr: 5 },
  almond: { rx: 13, ry: 9, pr: 4.6, lash: true },
  small: { rx: 8.5, ry: 8.5, pr: 3.8 },
  droopy: { rx: 12, ry: 12, pr: 4.6, lid: -0.12 },
  'wide-open': { rx: 12, ry: 15, pr: 3.8 },
}
const EARS: Record<EarStyle, { rx: number; ry: number; pointed?: boolean }> = {
  small: { rx: 6, ry: 8 },
  medium: { rx: 8, ry: 11 },
  large: { rx: 12, ry: 14 },
  rounded: { rx: 10.5, ry: 10.5 },
  long: { rx: 7.5, ry: 15, pointed: true },
}
const BROWS: Record<EyebrowStyle, { d: string; w: number }> = {
  straight: { d: 'M -10,0 L 10,0', w: 4.5 },
  arched: { d: 'M -10,3 Q 0,-6 10,2', w: 4 },
  thick: { d: 'M -10,1 Q 0,-3 10,1', w: 7.5 },
  thin: { d: 'M -11,1 Q 0,-4 10,0', w: 2.6 },
  slanted: { d: 'M -10,-3 L 10,3', w: 4.5 },
}

/* ---------- poses ---------- */
type Hand = 'rest' | 'open' | 'point' | 'thumb'
type ArmPose = [shoulder: number, elbow: number, hand: Hand]
const REST: ArmPose = [9, -14, 'rest']
// Angles in degrees. 0 = arm hanging down, positive = swinging outward/up. `l` is the viewer's left.
const POSES: Record<AstronautPose, { l: ArmPose; r: ArmPose; legL: number; legR: number }> = {
  idle: { l: REST, r: REST, legL: 0, legR: 0 },
  wave: { l: REST, r: [118, 40, 'open'], legL: 0, legR: 0 },
  point: { l: REST, r: [97, 4, 'point'], legL: 0, legR: 0 },
  cheer: { l: [150, 12, 'open'], r: [150, 12, 'open'], legL: 5, legR: 5 },
  worried: { l: [138, 62, 'rest'], r: [138, 62, 'rest'], legL: 0, legR: 0 },
  'thumbs-up': { l: REST, r: [25, 95, 'thumb'], legL: 0, legR: 0 },
  float: { l: [70, 25, 'open'], r: [115, 20, 'open'], legL: 16, legR: -7 },
}

/* ---------- body parts ---------- */
function Glove({ kind, color, counter }: { kind: Hand; color: string; counter: number }) {
  const thin = { strokeWidth: 2, fill: 'none' as const }
  if (kind === 'open') return (
    <g transform="translate(0,44)" fill={color}>
      <rect x={6} y={-2} width={8} height={17} rx={4} transform="rotate(-40 10 4)" />
      {[-11.5, -5.3, 0.9, 7.1].map((x, i) => (
        <rect key={x} x={x} y={8} width={6.4} height={i === 0 || i === 3 ? 16 : 20} rx={3.2} />
      ))}
      <rect x={-12.5} y={-3} width={25} height={20} rx={9} />
    </g>
  )
  if (kind === 'point') return (
    <g transform="translate(0,44)" fill={color}>
      <rect x={-11} y={6} width={8.5} height={26} rx={4.2} />
      <ellipse cx={9} cy={9} rx={5} ry={7} />
      <rect x={-12} y={-3} width={23} height={21} rx={9} />
      <path d="M 0,14 v4 M 5,13 v4" {...thin} />
    </g>
  )
  if (kind === 'thumb') return (
    <g transform={`translate(0,52) rotate(${counter})`} fill={color}>
      <rect x={-10} y={-27} width={10.5} height={22} rx={5.2} />
      <rect x={-13} y={-12} width={26} height={23} rx={9} />
      <path d="M -2,-4 h10 M -2,2 h10" {...thin} />
    </g>
  )
  return (
    <g transform="translate(0,44)" fill={color}>
      <ellipse cx={9.5} cy={11} rx={5} ry={8} />
      <rect x={-11.5} y={-3} width={23} height={27} rx={10} />
      <path d="M -3,17 v4" {...thin} />
    </g>
  )
}

function Arm({ x, mirror, pose, accent, accent2, glove, wave }: {
  x: number; mirror?: boolean; pose: ArmPose; accent: string; accent2: string; glove: string; wave: boolean
}) {
  const [a, b, hand] = pose
  return (
    <g transform={`translate(${x},172)${mirror ? ' scale(-1,1)' : ''} rotate(${a})`}>
      <rect x={-13.5} y={-12} width={27} height={60} rx={13.5} fill={SUIT} />
      <rect x={-13.5} y={12} width={27} height={8} fill={accent} strokeWidth={2.5} />
      <g transform={`translate(0,40) rotate(${b})`}>
        <g className={wave ? 'av-wave' : undefined}>
          <rect x={-12.5} y={-11} width={25} height={52} rx={12.5} fill={SUIT} />
          <rect x={-12.5} y={18} width={25} height={5} fill={accent2} strokeWidth={2.5} />
          <Glove kind={hand} color={glove} counter={-(a + b)} />
          <rect x={-14} y={33} width={28} height={10} rx={4.5} fill={METAL} />
        </g>
      </g>
    </g>
  )
}

function Leg({ x, mirror, angle, accent, accent2 }: { x: number; mirror?: boolean; angle: number; accent: string; accent2: string }) {
  return (
    <g transform={`translate(${x},262)${mirror ? ' scale(-1,1)' : ''} rotate(${angle})`}>
      <rect x={-17} y={-10} width={34} height={98} rx={14} fill={SUIT} />
      <rect x={-13} y={34} width={26} height={17} rx={6} fill={METAL} />
      <rect x={-17} y={60} width={34} height={8} fill={accent} strokeWidth={2.5} />
      {/* boot — toe points outward */}
      <path d="M -18,80 H 18 V 104 Q 18,115 7,115 H -21 Q -30,115 -28,104 Q -26,95 -18,92 Z" fill={SUIT} />
      <path d="M -28.5,106 H 18 Q 17,115 7,115 H -21 Q -29,115 -28.5,106 Z" fill={METAL_DARK} />
      <rect x={-18.5} y={78} width={37} height={9} rx={4} fill={accent2} />
    </g>
  )
}

function Eye({ x, side, style, expression, skin, blink }: {
  x: number; side: 1 | -1; style: EyeStyle; expression: AstronautExpression; skin: string; blink: boolean
}) {
  const e = EYES[style]
  let { rx, ry, pr } = e
  let lid = e.lid
  let lidRot = e.lid != null ? -12 : 0 // droopy: outer corner down
  let dy = 0.5
  if (expression === 'surprised') { rx *= 1.12; ry *= 1.14; pr *= 0.62; lid = undefined; dy = 0 }
  if (expression === 'worried') { pr *= 0.72; dy = 1.5; rx *= 1.04; ry *= 1.06 }
  if (expression === 'determined') { lid = -0.34; lidRot = e.lid != null ? 4 : 13; dy = 1.5 }
  if (expression === 'happy') { pr *= 1.1 }
  const ly = lid != null ? ry * lid : 0
  const xe = rx * Math.sqrt(1 - (ly / ry) ** 2)
  return (
    <g transform={`translate(${x},${EYE_Y})`}>
      <g className={blink ? 'av-blink' : undefined}>
        <ellipse rx={rx} ry={ry} fill="#fff" />
        <circle cx={side * 2.2} cy={dy} r={pr} fill={INK} stroke="none" />
        <circle cx={side * 2.2 - pr * 0.35} cy={dy - pr * 0.4} r={pr * 0.32} fill="#fff" stroke="none" />
        {lid != null && (
          <path
            d={`M ${-xe - 0.6},${ly} A ${rx + 0.4} ${ry + 0.4} 0 0 1 ${xe + 0.6},${ly} Z`}
            fill={skin}
            transform={`rotate(${side * lidRot})`}
          />
        )}
        {e.lash && lid == null && (
          <path d={`M ${-side * (rx + 1)},-1 q ${-side * 4},-1 ${-side * 6},-5`} fill="none" strokeWidth={3} />
        )}
      </g>
    </g>
  )
}

function Mouth({ config, expression, y }: { config: AvatarConfig; expression: AstronautExpression; y: number }) {
  const m = config.mouth
  const line = { fill: 'none' as const, strokeWidth: 3.4 }
  const bigSmile = (
    <>
      <path d="M -15,-3 Q 0,3 15,-3 Q 14,11 0,11 Q -14,11 -15,-3 Z" fill={MOUTH_DARK} />
      <path d="M -11.5,-0.2 Q 0,4.6 11.5,-0.2 L 10.6,2.6 Q 0,6.6 -10.6,2.6 Z" fill="#fff" stroke="none" />
      <ellipse cx={0} cy={8.2} rx={5.5} ry={2} fill="#F46AA7" stroke="none" />
    </>
  )
  let body: ReactNode
  let tf = ''
  if (expression === 'happy') {
    body = bigSmile
    if (m === 'small' || m === 'serious') tf = ' scale(0.8)'
    if (m === 'smirk') tf = ' rotate(-6)'
  } else if (expression === 'worried') {
    body = <path d="M -12,3 Q -8,-3 -4,2 Q 0,7 4,2 Q 8,-3 12,3" {...line} />
    if (m === 'small') tf = ' scale(0.8)'
  } else if (expression === 'surprised') {
    body = <ellipse cx={0} cy={3} rx={m === 'small' ? 5 : 6.5} ry={m === 'small' ? 7 : 8.5} fill={MOUTH_DARK} />
  } else if (expression === 'determined') {
    body = <path d="M -11,2 L 7,2 Q 12,1 13,-4 M -13,-1 l 2,4" {...line} />
    if (m === 'small') tf = ' scale(0.8)'
  } else if (m === 'big-smile') {
    body = bigSmile
  } else if (m === 'soft-smile') {
    body = <path d="M -12,0 Q 0,9 12,0 M -14,-3 q -2,2 0,4 M 14,-3 q 2,2 0,4" {...line} />
  } else if (m === 'small') {
    body = <path d="M -6,1 Q 0,6 6,1" {...line} />
  } else if (m === 'serious') {
    body = <path d="M -9,2 H 9" {...line} />
  } else {
    body = <path d="M -10,3 Q 3,6 12,-3 M 12,-7 q 3,3 0,6" {...line} />
  }
  return <g transform={`translate(120,${y})${tf}`}>{body}</g>
}

function Nose({ config, y, shade }: { config: AvatarConfig; y: number; shade: string }) {
  const line = { fill: 'none' as const, strokeWidth: 3 }
  let body: ReactNode
  switch (config.nose) {
    case 'small': body = <path d="M -3,0 q 3,4 6,0" {...line} />; break
    case 'rounded': body = <path d="M -5.5,-5 a 6.5,6.5 0 1 0 11,0" fill={shade} strokeWidth={3} />; break
    case 'straight': body = <path d="M 1,-9 L -3,3 L 4,3" {...line} />; break
    case 'wide': body = <path d="M -9,1 q 0,-6 5,-2 q 4,5 8,0 q 5,-4 5,2" {...line} />; break
    default: body = (
      <>
        <path d="M -6,1 q 6,-9 12,0" {...line} />
        <circle cx={-2.6} cy={2.6} r={1.2} fill={INK} stroke="none" />
        <circle cx={2.6} cy={2.6} r={1.2} fill={INK} stroke="none" />
      </>
    )
  }
  return <g transform={`translate(120,${y})`}>{body}</g>
}

const CURLS = Array.from({ length: 9 }, (_, i) => {
  const a = (Math.PI * i) / 8
  return [120 - 42 * Math.cos(a), 82 - 42 * Math.sin(a)] as const
})

function HairBack({ config, color }: { config: AvatarConfig; color: string }) {
  if (config.hair === 'long') {
    return <path d="M 68,82 C 60,30 180,30 172,82 L 177,150 Q 178,167 162,167 H 78 Q 62,167 63,150 Z" fill={color} />
  }
  if (config.hair === 'bun') return <circle cx={120} cy={37} r={13} fill={color} />
  return null
}

function HairFront({ config, color }: { config: AvatarConfig; color: string }) {
  const hi = { fill: 'none' as const, stroke: mix(color, '#ffffff', 0.38), strokeWidth: 3.2 }
  switch (config.hair) {
    case 'short': return (
      <>
        <path d="M 72,90 C 63,52 90,33 123,36 C 153,33 177,54 168,90 C 166,78 160,70 152,64 C 138,70 116,69 100,57 C 88,64 78,76 72,90 Z" fill={color} />
        <path d="M 98,45 Q 112,39 128,41" {...hi} />
      </>
    )
    case 'long': return (
      <>
        <path d="M 71,102 C 61,52 92,34 120,34 C 150,34 179,52 169,102 C 167,84 161,70 150,62 C 132,68 106,66 94,56 C 82,66 76,84 71,102 Z" fill={color} />
        <path d="M 100,44 Q 114,38 132,41" {...hi} />
      </>
    )
    case 'curly': return (
      <>
        <g fill={INK} strokeWidth={7}>{CURLS.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={13} />)}</g>
        <g fill={color} stroke="none">{CURLS.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={13} />)}</g>
        <path d="M 92,48 q 6,-6 12,-1 M 124,40 q 7,-5 12,1 M 150,58 q 6,-2 8,5 M 82,66 q 3,-6 9,-5" {...hi} />
      </>
    )
    case 'buzz': return (
      <path d="M 74,88 C 69,55 94,41 120,41 C 146,41 171,55 166,88 C 160,70 144,59 120,59 C 96,59 80,70 74,88 Z" fill={color} />
    )
    default: return (
      <>
        <path d="M 73,90 C 65,54 92,38 120,38 C 148,38 175,54 167,90 C 162,72 146,60 120,51 C 94,60 78,72 73,90 Z" fill={color} />
        <path d="M 96,50 Q 106,44 116,43" {...hi} />
      </>
    )
  }
}

/* ---------- the astronaut ---------- */
export function Astronaut({
  config, pose = 'idle', expression = 'neutral', size, bust = false, animate = true, title, crop, className, style,
}: AstronautProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const skin = SKIN_TONES[config.skin] ?? SKIN_TONES.tan
  const skinShade = mix(skin, '#7A2E4E', 0.2)
  const hair = HAIR_COLORS[config.hairColor] ?? HAIR_COLORS.brown
  const accent = SUIT_COLORS[config.suitColor] ?? ORANGE
  const accent2 = config.suitColor === 'teal' ? ORANGE : TEAL
  const glove = GLOVE_COLORS[config.gloves] ?? GLOVE_COLORS.white
  const face = FACES[config.faceShape] ?? FACES.round
  const ear = EARS[config.ears] ?? EARS.medium
  const brow = BROWS[config.eyebrows] ?? BROWS.arched
  const eye = EYES[config.eyes] ?? EYES['big-round']
  const helmet = config.helmet !== 'no-helmet'
  const p = bust ? POSES.idle : (POSES[pose] ?? POSES.idle)

  // eyebrows react to the expression: lift, drop and tilt
  const browMove = { happy: [-2, -4], worried: [-3, -20], surprised: [-8, -6], determined: [4, 20], neutral: [0, 0] }[expression]
  const browY = EYE_Y - eye.ry - 6.5 + browMove[0]
  const browColor = mix(hair, INK, 0.5)

  const vb = crop ?? (bust ? [20, 0, 200, 200] : [-20, 0, 280, 400])
  const dims: CSSProperties = bust || crop
    ? { width: size ?? '100%', height: size ?? '100%' }
    : { height: size ?? '100%', width: 'auto', aspectRatio: '280 / 400' }
  const poseClass = !animate || bust ? '' : pose === 'cheer' ? ' av-jump' : pose === 'worried' ? ' av-shake' : pose === 'float' ? ' av-float' : ' av-bob'
  const earY = 98
  const earX = (s: 1 | -1) => 120 + s * (44 + ear.rx * 0.35)

  const hairClip = helmet ? `url(#${uid}-helm)` : undefined

  return (
    <svg
      viewBox={vb.join(' ')}
      className={`av-astro${className ? ' ' + className : ''}`}
      style={{ ...dims, ...style }}
      stroke={INK}
      strokeWidth={3.5}
      strokeLinejoin="round"
      strokeLinecap="round"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <defs>
        <clipPath id={`${uid}-helm`}><circle cx={120} cy={88} r={64.5} /></clipPath>
        <clipPath id={`${uid}-face`}><path d={face.d} /></clipPath>
      </defs>
      <g className={poseClass.trim() || undefined}>
        {/* legs stay planted while the upper body breathes */}
        <Leg x={101} angle={p.legL} accent={accent} accent2={accent2} />
        <Leg x={139} mirror angle={p.legR} accent={accent} accent2={accent2} />

        <g className={animate && !bust ? 'av-breathe' : undefined}>
          {/* life-support backpack */}
          <rect x={70} y={160} width={100} height={76} rx={16} fill={METAL} />

          {helmet && (
            <>
              <rect x={35} y={74} width={16} height={28} rx={7} fill={accent} />
              <rect x={189} y={74} width={16} height={28} rx={7} fill={accent} />
              <circle cx={120} cy={88} r={76} fill={SUIT} />
              <path d="M 172,143 A 76 76 0 0 0 190,58 A 82 82 0 0 1 172,143 Z" fill={SUIT_SHADE} stroke="none" />
              <circle cx={120} cy={88} r={66} fill="#2A3F7E" />
              <circle cx={120} cy={96} r={56} fill="#22346B" stroke="none" />
            </>
          )}

          <g clipPath={hairClip}><HairBack config={config} color={hair} /></g>

          {/* torso */}
          <path d="M 82,168 Q 82,154 98,154 H 142 Q 158,154 158,168 L 160,262 Q 160,275 148,275 H 92 Q 80,275 80,262 Z" fill={SUIT} />
          <path d="M 147,158 Q 156,158 156,168 L 158,262 Q 158,273 148,273 H 136 Q 148,226 147,158 Z" fill={SUIT_SHADE} stroke="none" />
          <path d="M 84,165 Q 84,154 98,154 H 142 Q 156,154 156,165 Q 138,176 120,176 Q 102,176 84,165 Z" fill={accent} />
          {/* chest console */}
          <rect x={95} y={186} width={31} height={25} rx={5} fill={METAL} />
          <rect x={99} y={190.5} width={14} height={9} rx={2} fill={accent2} strokeWidth={2} />
          <circle cx={119.5} cy={193} r={2.6} fill="#F04452" strokeWidth={1.8} />
          <circle cx={119.5} cy={203} r={2.6} fill="#65D68A" strokeWidth={1.8} />
          <path d="M 100,204.5 h 11" strokeWidth={2} />
          {/* mission patch: original ringed-planet emblem */}
          <circle cx={139} cy={197} r={10} fill="#101B3D" strokeWidth={2.6} />
          <circle cx={139} cy={197} r={4.6} fill="#FFD447" stroke="none" />
          <ellipse cx={139} cy={197} rx={8.2} ry={2.4} fill="none" stroke={ORANGE} strokeWidth={1.7} transform="rotate(-22 139 197)" />
          <circle cx={133.5} cy={191.5} r={0.9} fill="#F5F7FF" stroke="none" />
          {/* belt */}
          <rect x={80.5} y={240} width={79} height={12} fill={METAL} strokeWidth={2.8} />
          <rect x={112} y={237.5} width={16} height={17} rx={3.5} fill={accent} strokeWidth={2.8} />

          {/* collar ring (back half) */}
          <ellipse cx={120} cy={154} rx={35} ry={10} fill={METAL} />
          <ellipse cx={120} cy={153} rx={27} ry={6} fill="#22346B" strokeWidth={2.5} />

          {/* head */}
          <rect x={107} y={126} width={26} height={32} fill={skinShade} />
          {([-1, 1] as const).map(s => (
            <g key={s} transform={`translate(${earX(s)},${earY})`}>
              {ear.pointed
                ? <path d={`M 0,${ear.ry} C ${s * ear.rx * 1.2},${ear.ry * 0.7} ${s * ear.rx * 1.3},${-ear.ry * 0.4} ${s * ear.rx * 1.1},${-ear.ry * 1.15} C ${s * ear.rx * 0.2},${-ear.ry} ${-s * ear.rx},${-ear.ry * 0.6} ${-s * ear.rx},0 Z`} fill={skin} />
                : <ellipse rx={ear.rx} ry={ear.ry} fill={skin} />}
              <path d={`M ${s * ear.rx * 0.35},${-ear.ry * 0.4} q ${-s * ear.rx * 0.5},${ear.ry * 0.4} 0,${ear.ry * 0.8}`} fill="none" stroke={skinShade} strokeWidth={2.4} />
            </g>
          ))}
          <path d={face.d} fill={skinShade} stroke="none" />
          <g clipPath={`url(#${uid}-face)`}>
            <path d={face.d} fill={skin} stroke="none" transform="translate(-6,-5)" />
            {expression === 'happy' && (
              <g fill="#F46AA7" stroke="none" opacity={0.55}>
                <ellipse cx={88} cy={111} rx={8} ry={5} />
                <ellipse cx={152} cy={111} rx={8} ry={5} />
              </g>
            )}
            {config.accessory === 'freckles' && (
              <g fill={mix(skin, '#5A2A1A', 0.45)} stroke="none">
                {[[88, 107], [94, 111], [84, 112], [152, 107], [146, 111], [156, 112]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r={1.6} />)}
              </g>
            )}
          </g>
          <path d={face.d} fill="none" />

          <Eye x={120 - EYE_DX} side={1} style={config.eyes} expression={expression} skin={skin} blink={animate} />
          <Eye x={120 + EYE_DX} side={-1} style={config.eyes} expression={expression} skin={skin} blink={animate} />
          <Nose config={config} y={face.noseY} shade={mix(skin, skinShade, 0.6)} />
          <Mouth config={config} expression={expression} y={face.mouthY} />

          <g clipPath={hairClip}><HairFront config={config} color={hair} /></g>

          {([-1, 1] as const).map(s => (
            <g key={s} transform={`translate(${120 + s * EYE_DX},${browY}) scale(${-s},1) rotate(${browMove[1]})`}>
              <path d={brow.d} fill="none" stroke={browColor} strokeWidth={brow.w} />
            </g>
          ))}

          {expression === 'worried' && (
            <path d="M 160,58 q 6,9 0,12 q -6,-3 0,-12 Z" fill={TEAL} strokeWidth={2.4} />
          )}

          {config.accessory === 'glasses' && (
            <g fill="#ffffff" fillOpacity={0.18} strokeWidth={3.6}>
              <rect x={86} y={76} width={31} height={27} rx={9} />
              <rect x={123} y={76} width={31} height={27} rx={9} />
              <path d="M 117,87 q 3,-3 6,0 M 86,86 L 77,83 M 154,86 L 163,83" fill="none" />
            </g>
          )}
          {config.accessory === 'earring' && (
            <>
              <circle cx={earX(1) + 1} cy={earY + ear.ry + 2} r={4} fill="none" strokeWidth={6} />
              <circle cx={earX(1) + 1} cy={earY + ear.ry + 2} r={4} fill="none" stroke="#FFD447" strokeWidth={2.6} />
            </>
          )}
          {config.accessory === 'headset' && (
            <g>
              <path d="M 70,96 C 64,26 176,26 170,96" fill="none" strokeWidth={8.5} />
              <path d="M 70,96 C 64,26 176,26 170,96" fill="none" stroke={METAL_DARK} strokeWidth={4} />
              <rect x={62} y={86} width={14} height={25} rx={6} fill={accent2} />
              <rect x={164} y={86} width={14} height={25} rx={6} fill={accent2} />
              <path d={`M 69,111 Q 70,${face.mouthY + 6} 92,${face.mouthY + 4}`} fill="none" strokeWidth={3} />
              <circle cx={94} cy={face.mouthY + 4} r={4} fill={INK} stroke="none" />
            </g>
          )}

          {config.helmet === 'closed-visor' && (
            <>
              <circle cx={120} cy={88} r={66} fill={TEAL} fillOpacity={0.2} />
              <path d="M 70,70 Q 78,46 100,35" fill="none" stroke="#fff" strokeOpacity={0.8} strokeWidth={7} />
              <path d="M 66,84 v 1" fill="none" stroke="#fff" strokeOpacity={0.8} strokeWidth={7} />
              <path d="M 160,132 Q 172,120 176,104" fill="none" stroke="#fff" strokeOpacity={0.35} strokeWidth={5} />
            </>
          )}
          {config.helmet === 'open-visor' && (
            <>
              <path d="M 54.2,50 A 76 76 0 0 1 185.8,50 A 70 70 0 0 0 54.2,50 Z" fill="#FFD447" />
              <path d="M 84,20 Q 100,10 118,8.5" fill="none" stroke="#fff" strokeOpacity={0.75} strokeWidth={3} />
            </>
          )}

          {/* collar ring (front half) hides the neck base */}
          <path d="M 85,154 A 35 10 0 0 0 155,154 L 147,153.5 A 27 6 0 0 1 93,153.5 Z" fill={METAL} />

          <Arm x={80} pose={p.l} accent={accent} accent2={accent2} glove={glove} wave={false} />
          <Arm x={160} mirror pose={p.r} accent={accent} accent2={accent2} glove={glove} wave={animate && !bust && pose === 'wave'} />
        </g>
      </g>
    </svg>
  )
}

export default Astronaut
