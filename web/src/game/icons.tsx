// "Sticker Sheet" icon set (docs/DESLOP.md, section b). Replaces every emoji in the game.
// Rules: 24x24 viewBox, 20x20 live area, 2.5px ink stroke, round joins, flat palette fills, no gradients.
// Decorative by default (aria-hidden); pass `title` to expose the icon to assistive tech.
import type { CSSProperties, ReactNode } from 'react'

const INK = '#111326'
const PALETTE = {
  orange: '#FF8C32', yellow: '#FFD447', teal: '#38D9D0', pink: '#F46AA7', green: '#65D68A',
  red: '#F04452', metal: '#8896B3', white: '#F5F7FF', ink: INK, current: 'currentColor',
} as const
export type IconTone = keyof typeof PALETTE

/** Free lines (rays, masts, arrows) follow the text colour: white on consoles, ink on paper. */
const L = 'currentColor'

const { orange: O, yellow: Y, teal: T, green: G, red: R, metal: M, white: W } = PALETTE

/** A coloured line with an ink outline (coils, slashes, handles). */
function tube(d: string, color: string, cap: 'round' | 'butt' = 'round', inner = 2.4) {
  return (
    <>
      <path d={d} strokeWidth={inner + 4} strokeLinecap={cap} />
      <path d={d} stroke={color} strokeWidth={inner} strokeLinecap={cap} />
    </>
  )
}

/** Radiation trefoil blades (ink, no stroke), centred on 12,12. */
const BLADE = 'M13.4 14.4 15.6 18.2A7.2 7.2 0 0 1 8.4 18.2L10.6 14.4A2.8 2.8 0 0 0 13.4 14.4z'
const blades = (
  <g fill={INK} stroke="none">
    <path d={BLADE} />
    <path d={BLADE} transform="rotate(120 12 12)" />
    <path d={BLADE} transform="rotate(240 12 12)" />
    <circle cx="12" cy="12" r="1.7" />
  </g>
)

/** Tilted dish on a mast, shared by antenna / em-comms. */
const dish = (c: string) => (
  <>
    <path d="M10.5 15.5V20.5M7 21h7" stroke={L} />
    <g transform="rotate(30 12 13)">
      <path d="M5.5 9.5a6.5 6.5 0 0 0 13 0z" fill={c} />
      <path d="M12 9.5V6" stroke={L} />
    </g>
  </>
)

const BURST = 'M12 2 14.3 6.5 19.1 4.9 17.5 9.7 22 12 17.5 14.3 19.1 19.1 14.3 17.5 12 22 9.7 17.5 4.9 19.1 6.5 14.3 2 12 6.5 9.7 4.9 4.9 9.7 6.5z'
const BUBBLE = 'M4 4.5h16a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5h-8L7.5 21v-4.5H4A1.5 1.5 0 0 1 2.5 15V6A1.5 1.5 0 0 1 4 4.5z'

type Def = [tone: IconTone, draw: (c: string) => ReactNode]

const ICONS = {
  // ---------- resources and HUD ----------
  maneuver: ['orange', c => (
    <g transform="rotate(35 12 12)">
      <path d="M8 12.5c0 3 1 4.5 1.5 6.5l1.5-2.5 1 4.5 1-4.5 1.5 2.5c.5-2 1.5-3.5 1.5-6.5z" fill={Y} />
      <path d="M9 5h6l3 7.5H6z" fill={c} />
      <rect x="9.5" y="2.5" width="5" height="2.5" rx="1" fill={c} />
    </g>
  )],
  power: ['yellow', c => <path d="M13.5 2.5 5 13.5h5.5L9.5 21.5 19 10h-5.5z" fill={c} />],
  battery: ['green', c => (
    <>
      <rect x="10" y="2.5" width="4" height="3" rx="1" fill={M} />
      <rect x="6.5" y="5" width="11" height="16.5" rx="2.5" fill={W} />
      <rect x="9" y="14.8" width="6" height="3.7" rx=".6" fill={c} stroke="none" />
      <rect x="9" y="9" width="6" height="3.7" rx=".6" fill={c} stroke="none" />
    </>
  )],
  'life-support': ['teal', c => (
    <>
      <path d="M9.5 7V4.5M7.3 4h4.4" stroke={L} />
      <rect x="5" y="7" width="9" height="14.5" rx="4.5" fill={c} />
      <path className="d" d="M8 11.5v5" stroke={W} strokeWidth="2" />
      <circle cx="18.5" cy="8.5" r="2.6" fill={W} />
      <circle cx="18.8" cy="15.5" r="1.5" fill={W} strokeWidth="2" />
    </>
  )],
  hull: ['green', c => (
    <>
      <path d="M12 2.5l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10v-6z" fill={c} />
      <path className="d" d="M7.5 10.5h9" strokeWidth="2" />
    </>
  )],
  radiation: ['pink', c => <><circle cx="12" cy="12" r="9.5" fill={c} />{blades}</>],
  antenna: ['metal', c => (
    <>
      {dish(c)}
      <path d="M16 4a3 3 0 0 1 2.4 2.4" stroke={L} strokeWidth="2" />
      <path className="d" d="M17.8 1.9a5.5 5.5 0 0 1 3 3.5" stroke={L} strokeWidth="2" />
    </>
  )],
  'antenna-twin': ['metal', c => (
    <>
      <path d="M17 10V21M4 21.5h16M8.5 16.5V21" stroke={L} />
      <g transform="rotate(25 17.5 6.5)">
        <path d="M13 5.5a4.5 4.5 0 0 0 9 0z" fill={c} />
        <path d="M17.5 5.5V3" stroke={L} strokeWidth="2" />
      </g>
      <g transform="rotate(25 9 12)">
        <path d="M3 10.5a6 6 0 0 0 12 0z" fill={c} />
        <path d="M9 10.5V7" stroke={L} />
      </g>
    </>
  )],
  sunlight: ['yellow', c => (
    <>
      <circle cx="12" cy="12" r="4.6" fill={c} />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M17.3 6.7l1.4-1.4M5.3 18.7l1.4-1.4M6.7 6.7 5.3 5.3M18.7 18.7l-1.4-1.4" stroke={L} />
    </>
  )],
  budget: ['yellow', c => (
    <>
      <path d="M13 3c4.5 0 7.5 4 7.5 9s-3 9-7.5 9h-2V3z" fill={c} />
      <ellipse cx="10.5" cy="12" rx="7.5" ry="9" fill={c} />
      <path d="M12.6 9.2a3.4 3.4 0 1 0 0 5.6" strokeWidth="2" />
    </>
  )],
  mass: ['metal', c => (
    <>
      <circle cx="12" cy="6" r="3" stroke={L} />
      <path d="M7.5 9h9L20 20.5H4z" fill={c} />
      <path className="d" d="M9.5 15.5h5" strokeWidth="2" />
    </>
  )],
  calendar: ['pink', c => (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" fill={W} />
      <path d="M3.5 10h17V7.5A2.5 2.5 0 0 0 18 5H6a2.5 2.5 0 0 0-2.5 2.5z" fill={c} />
      <path d="M8 3v3.5M16 3v3.5" stroke={L} />
      <path className="d" d="M9 13.5h.01M15 13.5h.01M9 17h.01M15 17h.01" strokeWidth="2.2" />
    </>
  )],
  turn: ['orange', c => (
    <>
      <path d="M18.3 6.8l1.4-1.4" stroke={L} />
      <rect x="10" y="2.5" width="4" height="3" rx="1" fill={M} />
      <circle cx="12" cy="13.5" r="8" fill={c} />
      <path d="M12 13.5l3.2-3.6" />
    </>
  )],
  'spare-kit': ['red', c => (
    <>
      <path d="M8.5 9V6.5A1.5 1.5 0 0 1 10 5h4a1.5 1.5 0 0 1 1.5 1.5V9" stroke={L} />
      <rect x="3" y="9" width="18" height="11.5" rx="2" fill={c} />
      <path className="d" d="M3 13.5h18" strokeWidth="2" />
      <rect x="10.3" y="11.8" width="3.4" height="3.6" rx=".8" fill={Y} strokeWidth="2" />
    </>
  )],
  route: ['teal', c => (
    <>
      <circle cx="12" cy="12" r="9.5" fill={c} />
      <path d="M16.5 7.5 13.6 13.6 10.4 10.4z" fill={R} strokeWidth="1.8" />
      <path d="M7.5 16.5 13.6 13.6 10.4 10.4z" fill={W} strokeWidth="1.8" />
    </>
  )],
  science: ['pink', c => (
    <>
      <path d="M6.5 18v3M13 18v3M9.5 8V5" stroke={L} />
      <rect x="16" y="10.3" width="5" height="5.4" rx="1" fill={M} />
      <rect x="3" y="8" width="13" height="10" rx="2" fill={c} />
      <rect x="5.5" y="10.5" width="5.5" height="3.6" rx=".8" fill={W} strokeWidth="1.8" />
    </>
  )],
  'data-stored': ['teal', c => (
    <>
      <path d="M2.5 8.5H6M2.5 12H6M2.5 15.5H6M18 8.5h3.5M18 12h3.5M18 15.5h3.5" stroke={L} />
      <rect x="6" y="5" width="12" height="14" rx="2" fill={c} />
      <rect className="d" x="9.5" y="9.5" width="5" height="5" rx=".8" strokeWidth="2" />
    </>
  )],
  recycle: ['green', c => (
    <>
      <circle cx="12" cy="12" r="9.5" fill={c} />
      <path d="M7.4 11a4.8 4.8 0 0 1 8.4-2.2M16.4 5.6v3.3h-3.3M16.6 13a4.8 4.8 0 0 1-8.4 2.2M7.6 18.4v-3.3h3.3" strokeWidth="2" />
    </>
  )],

  // ---------- ship parts ----------
  'frame-light': ['metal', c => (
    <>
      <rect x="3" y="7.5" width="18" height="9" fill={c} stroke="none" />
      <path d="M3 16.5l4.5-9 4.5 9 4.5-9 4.5 9" strokeWidth="2" />
      <path d="M2.5 7.5h19M2.5 16.5h19" />
    </>
  )],
  'frame-whipple': ['metal', c => (
    <>
      <rect x="14" y="2.5" width="6.5" height="19" rx="1.5" fill={c} />
      <rect x="8" y="2.5" width="3" height="19" rx="1" fill={O} />
      <path d="M2.5 12h3" stroke={L} />
      <path className="d" d="M2.5 8h1.5M2.5 16h1.5" stroke={L} strokeWidth="2" />
      <path d="M12.5 12h.01" stroke={L} strokeWidth="2.2" />
    </>
  )],
  'engine-chemical': ['orange', c => (
    <>
      <path d="M7 10c0 5 2.5 8 5 11.5 2.5-3.5 5-6.5 5-11.5z" fill={c} />
      <path className="d" d="M10.2 11c0 2.6.8 4.2 1.8 5.8 1-1.6 1.8-3.2 1.8-5.8z" fill={Y} stroke="none" />
      <path d="M8.5 2.5h7L19 10H5z" fill={M} />
    </>
  )],
  'engine-combined': ['orange', c => (
    <>
      <path d="M4.5 9c0 4.5 2 7 4 10 2-3 4-5.5 4-10z" fill={c} />
      <path d="M5.5 2.5h6L14 9H3z" fill={M} />
      <circle cx="17.5" cy="16.5" r="4.8" fill={T} />
      <path d="M18.4 13.3l-2.9 3.7h1.9l-.8 2.8 3-3.9h-2z" fill={INK} stroke="none" />
    </>
  )],
  'ion-thruster': ['teal', c => (
    <>
      <circle cx="8.5" cy="12" r="6" fill={c} />
      <circle cx="8.5" cy="12" r="2.3" fill={W} strokeWidth="2" />
      <path d="M17 8l4.5-1.8M17.5 12H22M17 16l4.5 1.8" stroke={L} strokeDasharray="0.1 3.1" />
    </>
  )],
  'solar-array': ['orange', c => (
    <>
      <path d="M8 15.5l-3.5 4M2.5 21h5" stroke={L} />
      <rect x="7.5" y="3" width="14" height="12.5" rx="1.5" fill={c} />
      <path className="d" d="M12.2 3v12.5M16.8 3v12.5M7.5 9.2h14" strokeWidth="1.8" />
    </>
  )],
  reactor: ['yellow', c => (
    <>
      <path d="M8 8H4M8 12H3M8 16H4M16 8h4M16 12h5M16 16h4" stroke={L} />
      <rect x="8" y="3.5" width="8" height="17" rx="3" fill={c} />
      <circle className="d" cx="12" cy="12" r="2.5" strokeWidth="1.6" />
      <path d="M12 12h.01" strokeWidth="2.2" />
    </>
  )],
  tank: ['teal', c => (
    <>
      <path d="M12 7.5V4.5M10.3 4.5h3.4" stroke={L} />
      <rect x="2.5" y="7.5" width="19" height="10.5" rx="5.2" fill={c} />
      <path d="M8.5 7.5V18M15.5 7.5V18" strokeWidth="2" />
    </>
  )],
  heater: ['red', c => (
    <>
      {tube('M5.5 17V8.5a2.2 2.2 0 0 1 4.4 0V13a2.1 2.1 0 0 0 4.2 0V8.5a2.2 2.2 0 0 1 4.4 0V17', c)}
      <rect x="3" y="17" width="18" height="4" rx="1.5" fill={M} />
    </>
  )],

  // ---------- places and science targets ----------
  saturn: ['yellow', c => (
    <g transform="rotate(-20 12 12)">
      <ellipse cx="12" cy="12" rx="10" ry="3.4" stroke={O} strokeWidth="2.2" />
      <circle cx="12" cy="12" r="6" fill={c} />
      <path className="d" d="M6.8 10c3.2.9 7.2.9 10.4 0" strokeWidth="1.6" />
      <path d="M2 12a10 3.4 0 0 0 20 0" strokeWidth="4.4" strokeLinecap="butt" />
      <path d="M2 12a10 3.4 0 0 0 20 0" stroke={O} strokeWidth="2.2" />
    </g>
  )],
  rings: ['yellow', c => (
    <>
      {tube('M2.5 7.5c6-3.5 13-3.5 19-1', c, 'butt', 1.8)}
      {tube('M2.5 12.5c6-3.5 13-3.5 19-1', O, 'butt', 3.4)}
      {tube('M2.5 20c6-3.5 13-3.5 19-1', c, 'butt', 1.8)}
      <path className="d" d="M8.5 15.8h.01M15 14.9h.01" stroke={L} strokeWidth="1.8" />
    </>
  )],
  atmosphere: ['orange', c => (
    <>
      <circle cx="12" cy="12" r="9.5" fill={c} />
      <path d="M15 7.5 13.5 10.1h-3L9 7.5l1.5-2.6h3z" fill={Y} strokeWidth="1.8" />
      <path className="d" d="M3.5 14c3 1.5 5.5-1.5 8.5 0s5.5 1.5 8.5 0M6 18c2.3 1 3.7-1 6 0s3.7 1 6 0" strokeWidth="1.8" />
    </>
  )],
  magnetosphere: ['pink', c => (
    <>
      <path d="M12 8.5c4.5-5.5 9.5-2 9.5 3.5s-5 9-9.5 3.5M12 8.5c-4.5-5.5-9.5-2-9.5 3.5s5 9 9.5 3.5" stroke={L} strokeWidth="1.8" />
      <path className="d" d="M13 10c2.3-2 4.5-.6 4.5 2s-2.2 4-4.5 2M11 10c-2.3-2-4.5-.6-4.5 2s2.2 4 4.5 2" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="3.4" fill={c} />
    </>
  )],
  moons: ['orange', c => (
    <>
      <circle cx="9" cy="9.5" r="6.5" fill={c} />
      <path className="d" d="M5.5 8.5c2 1 5 1 7 0" strokeWidth="1.6" />
      <path d="M15.3 19.2l-.6 2M17.3 19.7v2M19.2 19.2l.7 2" stroke={L} strokeWidth="1.6" />
      <circle cx="17.2" cy="15.8" r="3.6" fill={T} />
    </>
  )],
  titan: ['orange', c => (
    <>
      <circle cx="12" cy="12" r="9.5" fill={c} fillOpacity=".4" strokeWidth="2" strokeDasharray="3.5 3" />
      <circle cx="12" cy="12" r="6" fill={c} />
      <path className="d" d="M8 11c2.5 1.2 5.5 1.2 8 0" strokeWidth="1.6" />
    </>
  )],
  enceladus: ['teal', c => (
    <>
      <path d="M8.5 17.5l-1.2 4M12 18v4M15.5 17.5l1.2 4" stroke={L} strokeWidth="2" />
      <circle cx="12" cy="10" r="7.5" fill={c} />
      <path className="d" d="M8 6.5l3 3-1 3 3.5 2" stroke={W} strokeWidth="1.8" />
    </>
  )],
  earth: ['teal', c => (
    <>
      <circle cx="12" cy="12" r="9.5" fill={c} />
      <path d="M5.2 8.2C6.5 5.5 10.5 5 11.5 7c.8 1.6-1.3 2.6-1.5 4.6s-2.8 2.2-4.4 1S4.2 9.8 5.2 8.2z" fill={G} strokeWidth="1.8" />
      <path d="M14 13.5c1.8-1 4.2-.4 4.6 1.3s-1 3.6-2.8 3.8-2-1.2-2.6-2.4c-.5-1 .1-2.1.8-2.7z" fill={G} strokeWidth="1.8" />
    </>
  )],
  mars: ['red', c => (
    <>
      <circle cx="12" cy="12" r="9.5" fill={c} />
      <path d="M7.4 5.2c2.6-1.4 6.6-1.4 9.2 0-2.8 1.3-6.4 1.3-9.2 0z" fill={W} strokeWidth="1.6" />
      <path d="M5 12.5c2.2-.8 4.4.4 6.8-.2s3.8-1.6 6.6-.6" fill="none" strokeWidth="1.8" />
      <circle cx="15.2" cy="16" r="1.6" fill={O} strokeWidth="1.5" />
    </>
  )],
  'gravity-assist': ['teal', c => (
    <>
      <path d="M3 20.5C6 16 5.5 6 13 6c4.8 0 7 3.5 7 7.5" stroke={L} strokeWidth="2" strokeDasharray="2.4 3" />
      <path d="M17.2 11.8l2.8 2.7 2-3.2" stroke={L} strokeWidth="2" />
      <circle cx="13" cy="12.5" r="3.6" fill={c} />
    </>
  )],
  corridor: ['orange', c => (
    <>
      <path d="M2 21.5c2.5-4 6-6 10-6s7.5 2 10 6z" fill={c} />
      <path d="M2.5 3 16.5 12M2.5 9.5l9 5.5" stroke={L} strokeWidth="2" />
      <path d="M3 6.3l10.5 6.7" stroke={L} strokeWidth="2" strokeDasharray="0.1 3.4" />
    </>
  )],
  'au-ruler': ['yellow', c => (
    <>
      <circle cx="5" cy="6" r="2.5" fill={O} strokeWidth="2" />
      <circle cx="19.5" cy="6" r="1.7" fill={T} strokeWidth="2" />
      <rect x="2.5" y="11.5" width="19" height="7" rx="1.2" fill={c} />
      <path d="M6 11.5v3.3M9 11.5v2M12 11.5v3.3M15 11.5v2M18 11.5v3.3" strokeWidth="1.8" />
    </>
  )],
  'light-delay': ['teal', c => (
    <>
      <path d="M3.5 12h.01" stroke={L} strokeWidth="3.6" />
      <path d="M6.5 8.5a5 5 0 0 1 0 7M9.5 6a8.5 8.5 0 0 1 0 12" stroke={L} strokeWidth="2" />
      <circle cx="17.5" cy="12" r="4.3" fill={c} />
      <path d="M17.5 9.8V12l1.5 1" strokeWidth="1.7" />
    </>
  )],
  shelter: ['metal', c => (
    <>
      <path d="M2.5 4.5l1.8 1.6M6 1.8l1.2 2M21.5 4.5l-1.8 1.6M18 1.8l-1.2 2" stroke={L} strokeWidth="2" />
      <path d="M3.5 21.5V13a8.5 8.5 0 0 1 17 0v8.5h-5.7V13a2.8 2.8 0 0 0-5.6 0v8.5z" fill={c} />
      <circle cx="12" cy="18" r="1.7" fill={O} strokeWidth="1.8" />
    </>
  )],
  redundancy: ['teal', c => (
    <>
      <rect x="9.5" y="3.5" width="11" height="11" rx="2" stroke={L} strokeWidth="2" strokeDasharray="3 2.7" />
      <rect x="3.5" y="9.5" width="11" height="11" rx="2" fill={c} />
    </>
  )],
  probe: ['metal', c => (
    <>
      <path d="M16.5 14h5M21.5 12.2v3.6M8.5 14h-5M10.5 18.5l-1 3h6l-1-3" stroke={L} />
      <rect x="8.5" y="9.5" width="8" height="9" rx="1.5" fill={c} />
      <path d="M6.5 4.5a6 6 0 0 0 12 0z" fill={W} />
      <path d="M12.5 4.5V2.5" stroke={L} strokeWidth="2" />
    </>
  )],
  simplified: ['yellow', c => (
    <>
      <path d="M3 6.5h18M3 12h18M3 17.5h18" stroke={L} strokeWidth="2" />
      <circle cx="8" cy="6.5" r="2.6" fill={c} strokeWidth="2" />
      <circle cx="15.5" cy="12" r="2.6" fill={c} strokeWidth="2" />
      <circle cx="10.5" cy="17.5" r="2.6" fill={c} strokeWidth="2" />
    </>
  )],
  'return-home': ['green', c => (
    <>
      <circle cx="14" cy="14.5" r="7" fill={c} />
      <path className="d" d="M10.5 13c1.8-1.2 4 .2 3.6 2.2" strokeWidth="1.7" />
      <path d="M2.5 4.5c4.5-2 8 0 9.5 3.5M8.5 8.2l3.7.3.5-3.7" stroke={L} />
    </>
  )],

  // ---------- emergencies and status ----------
  'em-comms': ['red', c => (
    <>
      {dish(c)}
      <path d="M16.5 1.8l2.5 2.2-2.2 1.5 3 2.5" stroke={L} strokeWidth="2" />
    </>
  )],
  'em-impact': ['orange', c => (
    <>
      <rect x="16.5" y="2.5" width="5" height="19" rx="1.2" fill={M} />
      <path className="d" d="M16.5 9.5l2 1.5-1.5 2 2 1.5" strokeWidth="1.6" />
      <path d="M2.5 8.5h4M2.5 12h2.5M2.5 15.5h4" stroke={L} />
      <path d="M8.5 10.5 11 9l3 1 1 2.5-1.5 2.5-3 .5-2-2z" fill={c} />
    </>
  )],
  'em-co2': ['metal', c => (
    <>
      <path d="M19.5 7.5V2.5M17.5 4.5l2-2 2 2" stroke={L} />
      <path d="M6.5 20.5a4 4 0 0 1-.6-7.96 5.5 5.5 0 0 1 10.6-1.5A4.75 4.75 0 0 1 16 20.5z" fill={c} />
      <path d="M9.8 14.3a2 2 0 1 0 0 2.9" strokeWidth="1.7" />
      <circle cx="13.8" cy="15.75" r="1.9" strokeWidth="1.7" />
    </>
  )],
  'em-power': ['yellow', c => (
    <>
      <path d="M13.5 2 6.5 9.5h7z" fill={c} strokeWidth="2" />
      <path d="M8.5 13h10.5L10 22l1-5.5H5.5z" fill={c} strokeWidth="2" />
    </>
  )],
  'em-thermal': ['teal', c => (
    <>
      <path d="M6 5a2.5 2.5 0 0 1 5 0v8.3a4.5 4.5 0 1 1-5 0z" fill={W} strokeWidth="2" />
      <circle cx="8.5" cy="17" r="2.2" fill={c} strokeWidth="1.6" />
      <path d="M17.5 4.5v7M14.5 6.25l6 3.5M14.5 9.75l6-3.5" stroke={L} strokeWidth="2" />
    </>
  )],
  'em-radiation': ['pink', c => (
    <>
      <path d="M2 9.5A7.5 7.5 0 0 0 9.5 2H2z" fill={Y} />
      <path d="M11 5.5c1.5 0 1 1.8 2.5 1.8M5.5 11c0 1.5 1.8 1 1.8 2.5M9 9c1.3.3.9 1.5 2 2" stroke={L} strokeWidth="1.8" />
      <circle cx="16" cy="16" r="5.5" fill={c} />
      <g transform="translate(16 16) scale(.56) translate(-12 -12)">{blades}</g>
    </>
  )],
  siren: ['red', c => (
    <>
      <path d="M12 2v2.5M4.5 5l1.8 1.8M19.5 5l-1.8 1.8" stroke={L} />
      <path d="M6.5 17v-4a5.5 5.5 0 0 1 11 0v4z" fill={c} />
      <path className="d" d="M9.5 13a2.5 2.5 0 0 1 2.5-2.5" stroke={W} strokeWidth="1.8" />
      <rect x="4" y="17" width="16" height="4" rx="1.2" fill={M} />
    </>
  )],
  warning: ['yellow', c => (
    <>
      <path d="M12 3.5 21 19.5H3z" fill={c} />
      <path d="M12 9.5v4.5M12 17.2h.01" />
    </>
  )],
  ok: ['green', c => (
    <>
      <circle cx="11.5" cy="12.5" r="8.5" fill={c} />
      {tube('M7 12.5l3.5 3.5L20 5', W, 'round', 2.2)}
    </>
  )],
  fail: ['red', c => (
    <>
      <circle cx="12" cy="12" r="9.5" fill={c} />
      {tube('M8.3 8.3l7.4 7.4M15.7 8.3l-7.4 7.4', W, 'round', 2)}
    </>
  )],
  burst: ['red', c => (
    <>
      <path d={BURST} fill={c} strokeWidth="2.2" />
      <path d={BURST} fill={Y} stroke="none" transform="translate(12 12) scale(.46) translate(-12 -12)" />
    </>
  )],
  stop: ['red', c => (
    <>
      <path d="M21.2 15.8 15.8 21.2H8.2L2.8 15.8V8.2L8.2 2.8h7.6l5.4 5.4z" fill={c} />
      <rect x="7" y="10.2" width="10" height="3.6" rx=".8" fill={W} strokeWidth="1.8" />
    </>
  )],
  blackout: ['metal', c => (
    <>
      <path d="M3.5 12h-2M10.5 9.8h3M10.5 14.2h3" stroke={L} />
      <rect x="3.5" y="7" width="7" height="10" rx="1.8" fill={c} />
      <rect x="16" y="4.5" width="5.5" height="15" rx="1.5" fill={c} />
      <path d="M18.7 9.8h.01M18.7 14.2h.01" strokeWidth="2.2" />
    </>
  )],
  waiting: ['metal', c => (
    <>
      <path d="M7.5 3c0 5 4.5 6 4.5 9s-4.5 4-4.5 9h9c0-5-4.5-6-4.5-9s4.5-4 4.5-9z" fill={W} />
      <path d="M9.3 6h5.4c-.5 1.8-1.7 2.8-2.7 3.8-1-1-2.2-2-2.7-3.8z" fill={c} stroke="none" />
      <path d="M12 16.5v2" strokeWidth="1.6" stroke={c} />
      <path d="M5.5 3h13M5.5 21h13" stroke={L} />
    </>
  )],
  lock: ['metal', c => (
    <>
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke={L} />
      <rect x="5" y="10.5" width="14" height="10.5" rx="2.5" fill={c} />
      <path d="M12 14.5v2.5" strokeWidth="2.2" />
    </>
  )],
  unlock: ['yellow', c => (
    <>
      <path d="M8 10.5v-4a4 4 0 0 1 7.7-1.5" stroke={L} />
      <rect x="5" y="10.5" width="14" height="10.5" rx="2.5" fill={c} />
      <path d="M12 14.5v2.5" strokeWidth="2.2" />
    </>
  )],
  'key-decision': ['yellow', c => (
    <path d="M12 2.5 14.6 8.9 21.5 9.4 16.2 13.9 17.9 20.6 12 16.9 6.1 20.6 7.8 13.9 2.5 9.4 9.4 8.9z" fill={c} />
  )],
  'no-undo': ['red', c => (
    <>
      <path d="M9 4.5 4.5 9 9 13.5M4.5 9H14a5.5 5.5 0 0 1 0 11h-3" stroke="currentColor" />
      {tube('M4.5 20.5 19.5 3.5', c, 'round', 2.2)}
    </>
  )],

  // ---------- interface ----------
  home: ['metal', c => (
    <>
      <path d="M4.5 8H3M4.5 16H3" stroke={L} />
      <rect x="4.5" y="2.5" width="15" height="19" rx="6" fill={c} />
      <circle cx="12" cy="12" r="3.7" fill={W} strokeWidth="2" />
      <path className="d" d="M12 8.3v7.4M8.3 12h7.4" strokeWidth="1.6" />
    </>
  )],
  'sound-on': ['metal', c => (
    <>
      <path d="M3 9.5h3.5l5-4.5v14l-5-4.5H3z" fill={c} />
      <path d="M15 9.5a3.5 3.5 0 0 1 0 5M17.5 6.5a7.5 7.5 0 0 1 0 11" stroke="currentColor" />
    </>
  )],
  'sound-off': ['metal', c => (
    <>
      <path d="M3 9.5h3.5l5-4.5v14l-5-4.5H3z" fill={c} />
      <path d="M15.5 9.5l5 5M20.5 9.5l-5 5" stroke="currentColor" />
    </>
  )],
  'field-note': ['yellow', c => (
    <>
      <path d="M5 3h9.5L19 7.5V21H5z" fill={c} />
      <path d="M14.5 3v4.5H19" fill={W} strokeWidth="2" />
      <path className="d" d="M8 12.5h8M8 16.5h5.5" strokeWidth="2" />
    </>
  )],
  hint: ['white', c => (
    <>
      <path d={BUBBLE} fill={c} />
      <path d="M8 10.5h.01M12 10.5h.01M16 10.5h.01" />
    </>
  )],
  clipboard: ['yellow', c => (
    <>
      <rect x="4.5" y="4.5" width="15" height="17" rx="2" fill={c} />
      <rect x="9" y="2.5" width="6" height="4" rx="1.2" fill={M} strokeWidth="2" />
      <path className="d" d="M8 11h8M8 14.5h8M8 18h5" strokeWidth="2" />
    </>
  )],
  go: ['current', c => <path d="M7 4.5 18.5 12 7 19.5z" fill={c} />],
  undo: ['current', c => <path d="M9 5 4.5 9.5 9 14M4.5 9.5H14a5.5 5.5 0 0 1 0 11h-3.5" stroke={c} strokeWidth="3" />],
  skip: ['current', c => (
    <>
      <path d="M3.5 5.5 11 12l-7.5 6.5z" fill={c} />
      <path d="M12.5 5.5 20 12l-7.5 6.5z" fill={c} />
    </>
  )],
  pointer: ['yellow', c => <path d="M6 4h5l7 8-7 8H6l7-8z" fill={c} />],
  clapper: ['metal', c => (
    <>
      <rect x="3" y="10.5" width="18" height="10.5" rx="1.5" fill={c} />
      <path d="M3 5.5l17-3 1 4.5L3.8 10z" fill={W} strokeWidth="2" />
      <path d="M8 4.7l1.6 4M13.5 3.7l1.6 4" strokeWidth="1.8" />
    </>
  )],
  manual: ['teal', c => (
    <>
      <path d="M12 6.5C10 5 6.5 4.5 3 5v13.5c3.5-.5 7 0 9 1.5z" fill={c} />
      <path d="M12 6.5c2-1.5 5.5-2 9-1.5v13.5c-3.5-.5-7 0-9 1.5z" fill={c} />
      <path d="M15.3 4.9v6l1.6-1.4 1.6 1.4v-6" fill={R} strokeWidth="1.6" />
    </>
  )],
  helmet: ['orange', c => (
    <>
      <rect x="6.5" y="17.5" width="11" height="4.5" rx="1.2" fill={c} strokeWidth="2" />
      <rect x="1.5" y="8" width="5" height="6" rx="1.2" fill={c} strokeWidth="2" />
      <rect x="17.5" y="8" width="5" height="6" rx="1.2" fill={c} strokeWidth="2" />
      <circle cx="12" cy="11" r="7.8" fill={W} />
      <path d="M7.5 9.3a2.5 2.5 0 0 1 2.5-2.5h4a2.5 2.5 0 0 1 2.5 2.5v2a3.5 3.5 0 0 1-3.5 3.5h-2a3.5 3.5 0 0 1-3.5-3.5z" fill={INK} strokeWidth="1.5" />
      <path className="d" d="M9.8 10.3a1.6 1.6 0 0 1 1.6-1.6" stroke={W} strokeWidth="1.6" />
    </>
  )],
  easy: ['green', c => (
    <>
      <path d="M12 21.5V12M8.5 21.5h7" stroke={L} strokeWidth="2" />
      <path d="M12 15.5C7 16 3.5 13 3 7.5c5-.5 8.5 2.5 9 8z" fill={c} strokeWidth="2" />
      <path d="M12 11.5c.5-5.5 4-8.5 9-8 .5 5.5-3 8.5-9 8z" fill={c} strokeWidth="2" />
    </>
  )],
  hard: ['red', c => (
    <>
      <path d="M12.5 2.5c.5 4.5 5.5 6.5 5.5 12a6 6 0 0 1-12 0c0-2.5 1-4.5 2.5-6 .3 2 1.2 3 2.3 3.2C10.3 8.5 10.5 5.5 12.5 2.5z" fill={c} />
      <path className="d" d="M12 18.7c-1.4 0-2.4-1-2.4-2.4 0-1.5 1.2-2.1 2.4-3.8 1.2 1.7 2.4 2.3 2.4 3.8 0 1.4-1 2.4-2.4 2.4z" fill={Y} stroke="none" />
    </>
  )],
  pack: ['pink', c => (
    <>
      <path d="M8 9c0-3 1.5-4.5 4-4.5S16 6 16 9" stroke={L} />
      <rect x="2.5" y="9" width="19" height="11" rx="5.5" fill={c} />
      <path className="d" d="M7 9.2v10.6M17 9.2v10.6M10 13h4" strokeWidth="2" />
    </>
  )],
  buoy: ['orange', c => (
    <>
      <path d="M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 0 0 0-19zm0 5.7a3.8 3.8 0 1 1 0 7.6 3.8 3.8 0 0 1 0-7.6z" fill={c} fillRule="evenodd" stroke="none" />
      <path d="M14.8 14.8l3.8 3.8M9.2 9.2 5.4 5.4M14.8 9.2l3.8-3.8M9.2 14.8l-3.8 3.8" stroke={W} strokeWidth="4" strokeLinecap="butt" />
      <circle cx="12" cy="12" r="9.5" />
      <circle cx="12" cy="12" r="3.8" strokeWidth="2.2" />
    </>
  )],
  splash: ['teal', c => (
    <>
      <path d="M12 2.5c1.5 2 2.5 3.3 2.5 4.6a2.5 2.5 0 0 1-5 0c0-1.3 1-2.6 2.5-4.6z" fill={c} strokeWidth="2" />
      <path d="M2.5 16c2.5-3.5 4.5-3.5 6.5-.5 2-3 4-3 6.5 0 2-3 4-2.5 6 0v5.5h-19z" fill={c} />
    </>
  )],
  magnifier: ['metal', c => (
    <>
      {tube('M15.5 15.5l4.5 4.5', c, 'round', 2.4)}
      <circle cx="10" cy="10" r="7" fill={W} />
      <path className="d" d="M6.8 9.5a3.3 3.3 0 0 1 3-3" strokeWidth="1.8" />
    </>
  )],
  score: ['teal', c => (
    <>
      <rect x="2.5" y="13" width="5.6" height="8.5" rx="1" fill={c} strokeWidth="2" />
      <rect x="9.2" y="8.5" width="5.6" height="13" rx="1" fill={c} strokeWidth="2" />
      <rect x="15.9" y="3" width="5.6" height="18.5" rx="1" fill={c} strokeWidth="2" />
    </>
  )],
  timeline: ['pink', c => (
    <>
      <path d="M5 12h14" stroke={L} />
      <circle cx="4.8" cy="12" r="2.5" fill={W} strokeWidth="2" />
      <circle cx="19.2" cy="12" r="2.5" fill={W} strokeWidth="2" />
      <circle cx="12" cy="12" r="3.8" fill={c} />
    </>
  )],
  target: ['red', c => (
    <>
      <circle cx="12" cy="12" r="9.5" fill={c} />
      <circle cx="12" cy="12" r="5.6" fill={W} strokeWidth="2" />
      <circle cx="12" cy="12" r="1.8" fill={c} strokeWidth="2" />
    </>
  )],
  wrench: ['metal', c => (
    <path transform="rotate(45 12 12)" d="M10 1.9v6h4v-6a6.5 6.5 0 0 1 0 12.2V20a2 2 0 0 1-4 0v-5.9a6.5 6.5 0 0 1 0-12.2z" fill={c} strokeWidth="2.2" />
  )],
  language: ['teal', c => (
    <>
      <path d={BUBBLE} fill={c} />
      <path d="M9 14l3-7 3 7M10.2 11.5h3.6" strokeWidth="2" />
    </>
  )],
  attach: ['current', c => (
    <path d="M16.5 7.5 8.8 15.2a2.2 2.2 0 0 0 3.1 3.1l8-8a4.4 4.4 0 0 0-6.2-6.2l-8.3 8.3a6.6 6.6 0 0 0 9.3 9.3l6.3-6.3" fill="none" stroke={c} strokeWidth="2.4" />
  )],
  close: ['current', c => <path d="M6 6l12 12M18 6 6 18" stroke={c} strokeWidth="3" />],
  expand: ['current', c => <path d="M5.5 9l6.5 6.5L18.5 9" stroke={c} strokeWidth="3" />],
} satisfies Record<string, Def>

export type IconName = keyof typeof ICONS
export const ICON_NAMES = Object.keys(ICONS) as IconName[]
export function isIconName(x: unknown): x is IconName {
  return typeof x === 'string' && Object.prototype.hasOwnProperty.call(ICONS, x)
}

/**
 * One icon from the sticker sheet.
 * - `size`: rendered px (20 in HUD and chips, 24 in buttons, 32 to 56 in cards).
 * - `tone`: overrides the icon's main fill for state (for example a red `antenna` when the link is down).
 * - `title`: makes the icon meaningful to screen readers; without it the icon is decorative.
 */
export function Icon({ name, size = 24, title, tone, className, style }: {
  name: IconName; size?: number; title?: string; tone?: IconTone; className?: string; style?: CSSProperties
}) {
  const [base, draw] = ICONS[name] as Def
  const cls = `icon icon--${name}${size <= 16 ? ' icon--sm' : ''}${className ? ` ${className}` : ''}`
  return (
    <svg className={cls} width={size} height={size} viewBox="0 0 24 24" style={style} focusable="false"
      {...(title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true })}>
      {title && <title>{title}</title>}
      <g fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {draw(PALETTE[tone ?? base])}
      </g>
    </svg>
  )
}
