import { C } from './types'

/**
 * Earth-return capsule, drawn apex-up around the origin (about 80 x 78 units).
 * Shared by Spaceship (docked at the nose) and ReentryCapsule. Renders a <g>.
 */
export function CapsuleShape({ charred = false, lightsOn = true, hot = false }: { charred?: boolean; lightsOn?: boolean; hot?: boolean }) {
  const body = 'M-14,-34 Q0,-39 14,-34 L38,15 Q41,24 32,24 L-32,24 Q-41,24 -38,15 Z'
  return (
    <g stroke={C.ink} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round">
      {/* heat shield */}
      <path d="M-41,21 L41,21 Q41,35 0,38 Q-41,35 -41,21 Z" fill={charred ? '#3A2622' : '#9A5B34'} />
      <path className="sh-nog" d="M-30,31 Q0,36 30,31" fill="none" stroke={charred ? '#1E1413' : '#6E3D22'} strokeWidth={3} />
      {/* body */}
      <path d={body} fill={C.white} />
      <path className="sh-nog" d="M8,-35 Q11,-35 14,-34 L38,15 Q41,24 32,24 L18,24 Z" fill={C.shade} stroke="none" />
      {charred && <path className="sh-nog" d="M-36,10 Q-20,2 -8,12 Q6,4 20,12 Q30,6 37,12 L38,15 Q41,24 32,24 L-32,24 Q-41,24 -38,15 Z" fill="#6B5A55" stroke="none" opacity="0.75" />}
      <path className="sh-nog" d="M-33.6,6 L33.6,6 L37.5,14 L-37.5,14 Z" fill={C.orange} strokeWidth={3} />
      <path d={body} fill="none" />
      {/* docking ring */}
      <rect x={-11} y={-42} width={22} height={8} rx={3} fill={C.metal} />
      {/* hatch window + side window */}
      <ellipse className="sh-win" cx={-3} cy={-12} rx={9} ry={8} fill={lightsOn ? C.teal : '#1B2547'} strokeWidth={3.5} />
      <path className="sh-nog" d="M-9,-14 Q-6,-18 -1,-18" fill="none" stroke="#FFFFFF" strokeWidth={2.5} opacity={lightsOn ? 0.9 : 0.25} />
      <circle className="sh-win" cx={17} cy={-3} r={4.5} fill={lightsOn ? C.teal : '#1B2547'} strokeWidth={3} />
      {/* RCS ports */}
      <circle className="sh-nog" cx={-24} cy={-2} r={2.2} fill={C.ink} stroke="none" />
      <circle className="sh-nog" cx={-19} cy={-13} r={2.2} fill={C.ink} stroke="none" />
      {hot && <path className="sh-hot sh-nog" d={body} fill={C.red} stroke="none" />}
    </g>
  )
}
