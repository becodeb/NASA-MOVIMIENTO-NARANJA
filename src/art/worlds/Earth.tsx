import { useMemo, type CSSProperties } from 'react'
import './worlds.css'
import { INK, cx, r1, rng, useMotion, useSvgId, type Size } from './util'

export interface EarthProps {
  /** Rendered width/height (square). Number = px, or any CSS length. */
  size?: Size
  /** Axial tilt in degrees (real value: 23.4). */
  tilt?: number
  /** Longitude facing the viewer at the start of the spin (default −60: the Americas). */
  longitude?: number
  /** Seconds per full rotation. */
  period?: number
  clouds?: boolean
  glow?: boolean
  animate?: boolean
  className?: string
  style?: CSSProperties
  title?: string
}

const R = 100
const STRIP = 4 * R // 360° of longitude

const px = (lon: number) => (lon / 90) * R
const py = (lat: number) => -R * (0.55 * Math.sin((lat * Math.PI) / 180) + 0.45 * (lat / 90))

type LL = [number, number][]

const LAND: Record<string, LL> = {
  northAmerica: [
    [-168, 66], [-156, 71], [-128, 70], [-110, 68], [-95, 72], [-82, 70], [-78, 62], [-64, 60], [-56, 52],
    [-66, 45], [-75, 38], [-81, 31], [-80, 26], [-84, 30], [-90, 29], [-97, 27], [-97, 21], [-91, 19],
    [-87, 21], [-88, 16], [-83, 10], [-78, 8], [-82, 8], [-86, 12], [-95, 16], [-105, 20], [-110, 24],
    [-114, 30], [-117, 33], [-124, 40], [-124, 48], [-134, 57], [-150, 60], [-160, 56], [-165, 61],
  ],
  southAmerica: [
    [-78, 8], [-72, 12], [-62, 10], [-52, 5], [-50, 0], [-36, -6], [-39, -14], [-42, -23], [-49, -28],
    [-57, -37], [-66, -45], [-70, -53], [-74, -50], [-73, -38], [-71, -28], [-71, -18], [-77, -12], [-81, -5], [-80, 1],
  ],
  africa: [
    [-17, 15], [-16, 22], [-10, 29], [-6, 35], [10, 37], [20, 32], [32, 31], [36, 22], [43, 12], [51, 11],
    [48, 4], [40, -4], [40, -15], [35, -24], [28, -33], [19, -34], [14, -23], [12, -13], [9, -1], [9, 4], [-4, 5], [-13, 8],
  ],
  eurasia: [
    [-9, 37], [-9, 43], [-2, 44], [-4, 48], [2, 51], [8, 54], [5, 60], [12, 65], [25, 71], [40, 67], [60, 69],
    [72, 73], [100, 77], [113, 74], [140, 73], [170, 70], [180, 66], [178, 62], [163, 58], [160, 52], [156, 57],
    [142, 54], [135, 45], [130, 42], [127, 36], [122, 31], [120, 24], [110, 21], [108, 14], [105, 9], [101, 12],
    [102, 3], [98, 9], [97, 17], [92, 22], [88, 22], [80, 15], [78, 8], [73, 18], [67, 25], [57, 26], [52, 17],
    [44, 13], [35, 28], [36, 36], [28, 37], [27, 41], [22, 38], [18, 41], [12, 44], [15, 38], [10, 43], [4, 43], [0, 39], [-5, 36],
  ],
  australia: [
    [114, -22], [122, -17], [130, -12], [137, -13], [142, -11], [146, -19], [153, -26], [150, -37], [144, -38],
    [138, -34], [131, -32], [124, -33], [115, -34],
  ],
  greenland: [[-52, 82], [-22, 82], [-20, 72], [-38, 65], [-44, 60], [-52, 66], [-56, 74], [-68, 78]],
}

// [lon, lat, rx°, ry°, rotation]
const ISLANDS: [number, number, number, number, number][] = [
  [-3, 54, 3, 5, 10], // Great Britain
  [-19, 65, 4, 2, 0], // Iceland
  [138, 37, 3, 7, 35], // Japan
  [47, -19, 3, 7, 12], // Madagascar
  [173, -41, 3, 6, 35], // New Zealand
  [114, 0, 6, 4, 0], // Borneo
  [102, -1, 3, 7, -40], // Sumatra
  [140, -5, 8, 3, 12], // New Guinea
  [-78, 21.5, 5, 1.6, 12], // Cuba
  [122, 13, 2.5, 5, 0], // Philippines
]

const toPath = (pts: LL) => pts.map(([lon, lat], i) => `${i ? 'L' : 'M'}${r1(px(lon))},${r1(py(lat))}`).join(' ') + ' Z'

function iceEdge(lat: number, amp: number, seed: number, poleLat: number): string {
  const rand = rng(seed)
  const n = 24
  const offs = Array.from({ length: n }, () => (rand() - 0.5) * 2 * amp)
  let d = `M${-STRIP / 2},${r1(py(poleLat))}`
  for (let i = 0; i <= n; i++) {
    const lon = -180 + (360 * i) / n
    d += ` L${r1(px(lon))},${r1(py(lat + offs[i % n]))}`
  }
  return `${d} L${STRIP / 2},${r1(py(poleLat))} Z`
}

function buildClouds(): { d: string }[] {
  const rand = rng(404)
  const out: { d: string }[] = []
  // cloud belts: ITCZ near the equator, storm tracks at mid-latitudes
  const belts: [number, number, number][] = [
    [6, 6, 5],
    [42, 9, 6],
    [-44, 9, 6],
    [22, 6, 2],
    [-20, 6, 2],
    [66, 5, 3],
    [-62, 4, 4],
  ]
  for (const [lat0, spread, count] of belts) {
    for (let i = 0; i < count; i++) {
      const x = -STRIP / 2 + ((i + rand() * 0.8) / count) * STRIP
      const y = py(lat0 + (rand() - 0.5) * 2 * spread)
      const len = 22 + rand() * 46
      const h = 5 + rand() * 5
      const slant = (lat0 > 0 ? -1 : 1) * (2 + rand() * 6) * (Math.abs(lat0) > 15 ? 1 : 0.2)
      // puffy cartoon cloud bank: a pill with bumps along the top
      const bumps = Math.max(2, Math.round(len / 13))
      let d = `M${r1(x)},${r1(y + h / 2)}`
      d += ` a${r1(h / 2)},${r1(h / 2)} 0 0 1 0,${r1(-h)}`
      for (let b = 0; b < bumps; b++) {
        const bw = len / bumps
        const bh = h * (0.5 + rand() * 0.7)
        d += ` q${r1(bw / 2)},${r1(-bh + slant / bumps)} ${r1(bw)},${r1(slant / bumps)}`
      }
      d += ` a${r1(h / 2)},${r1(h / 2)} 0 0 1 0,${r1(h)} Z`
      out.push({ d })
    }
  }
  return out
}

export function Earth({
  size = 220,
  tilt = 23.4,
  longitude = -60,
  period = 60,
  clouds = true,
  glow = true,
  animate = true,
  className,
  style,
  title = 'Earth',
}: EarthProps) {
  const motion = useMotion(animate)
  const id = useSvgId('sw-earth')
  const art = useMemo(
    () => ({
      land: Object.values(LAND).map(toPath),
      antarctica: iceEdge(-71, 3, 9, -90),
      arctic: iceEdge(81, 2.5, 5, 90),
      clouds: buildClouds(),
    }),
    [],
  )
  const lonNorm = ((((longitude + 180) % 360) + 360) % 360) - 180
  const copies = [-STRIP, 0, STRIP, 2 * STRIP]

  return (
    <svg
      className={cx('sw-world sw-earth', motion && 'sw-anim', className)}
      style={{ width: size, height: size, ...style }}
      viewBox="-128 -128 256 256"
      role="img"
      aria-label={title}
    >
      <defs>
        <clipPath id={`${id}-disc`}>
          <circle r={R} />
        </clipPath>
        <clipPath id={`${id}-landclip`}>
          {art.land.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </clipPath>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0.72" stopColor="#38D9D0" stopOpacity="0.55" />
          <stop offset="0.86" stopColor="#4C8DFF" stopOpacity="0.2" />
          <stop offset="1" stopColor="#4C8DFF" stopOpacity="0" />
        </radialGradient>
        <g id={`${id}-land`}>
          <g fill="#58C46B" stroke={INK} strokeWidth={2.2} strokeLinejoin="round">
            {art.land.map((d, i) => (
              <path key={i} d={d} />
            ))}
            {ISLANDS.map(([lon, lat, rx, ry, rot], i) => (
              <ellipse
                key={i}
                cx={r1(px(lon))}
                cy={r1(py(lat))}
                rx={r1(px(rx))}
                ry={r1(Math.abs(py(lat + ry) - py(lat)))}
                transform={`rotate(${rot} ${r1(px(lon))} ${r1(py(lat))})`}
                strokeWidth={1.6}
              />
            ))}
          </g>
          {/* biomes, clipped to the continents: deserts, rainforest, tundra */}
          <g clipPath={`url(#${id}-landclip)`}>
            <ellipse cx={px(12)} cy={py(23)} rx={px(30)} ry={9} fill="#EBCB78" />
            <ellipse cx={px(48)} cy={py(24)} rx={px(12)} ry={9} fill="#EBCB78" />
            <ellipse cx={px(85)} cy={py(42)} rx={px(22)} ry={6} fill="#D9C27A" />
            <ellipse cx={px(133)} cy={py(-25)} rx={px(13)} ry={8} fill="#E9B872" />
            <ellipse cx={px(-110)} cy={py(33)} rx={px(8)} ry={7} fill="#E3CC80" />
            <ellipse cx={px(-69)} cy={py(-24)} rx={px(2.5)} ry={10} fill="#E3CC80" />
            <ellipse cx={px(-61)} cy={py(-5)} rx={px(13)} ry={11} fill="#3BA657" />
            <ellipse cx={px(22)} cy={py(0)} rx={px(10)} ry={8} fill="#3BA657" />
            <ellipse cx={px(104)} cy={py(22)} rx={px(8)} ry={7} fill="#3BA657" />
            <rect x={-STRIP / 2} y={py(90)} width={STRIP} height={py(69) - py(90)} fill="#BFE3C6" />
            <path d={toPath(LAND.greenland)} fill="#F5F7FF" />
          </g>
          <path d={art.antarctica} fill="#F5F7FF" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
          <path d={art.arctic} fill="#F5F7FF" stroke={INK} strokeWidth={1.4} strokeLinejoin="round" />
        </g>
        <g id={`${id}-clouds`} fill="#FFFFFF">
          {art.clouds.map((c, i) => (
            <path key={i} d={c.d} />
          ))}
        </g>
      </defs>

      {glow && <circle className="sw-glow" r={126} fill={`url(#${id}-glow)`} />}
      <g clipPath={`url(#${id}-disc)`}>
        <circle r={R} fill="#2F7FE6" />
        {/* lighter shallow-water band near the equator keeps the ocean from looking flat */}
        <ellipse cx={-18} cy={-22} rx={74} ry={62} fill="#4C9BF5" />
        <g transform={`rotate(${tilt})`}>
          <g transform={`translate(${r1(-px(lonNorm))} 0)`}>
            <g className="sw-earth-spin" style={{ animationDuration: `${period}s` }}>
              {copies.map((x) => (
                <use key={x} href={`#${id}-land`} x={x} />
              ))}
            </g>
            {clouds && (
              <g className="sw-earth-spin" style={{ animationDuration: `${period * 0.78}s` }} opacity={0.93}>
                {copies.map((x) => (
                  <use key={x} href={`#${id}-clouds`} x={x} />
                ))}
              </g>
            )}
          </g>
        </g>
        {/* thin blue atmosphere rim, cel shade, highlight */}
        <circle r={R - 3} fill="none" stroke="#A9ECFF" strokeOpacity={0.55} strokeWidth={6} />
        <path
          d={`M${-R - 4},0 a${R + 4},${R + 4} 0 1 0 ${2 * R + 8},0 a${R + 4},${R + 4} 0 1 0 ${-2 * R - 8},0 Z M${-R - 26},-14 a${R + 2},${R + 2} 0 1 0 ${2 * R + 4},0 a${R + 2},${R + 2} 0 1 0 ${-2 * R - 4},0 Z`}
          fill="#0A1128"
          fillOpacity={0.3}
          fillRule="evenodd"
        />
        <ellipse cx={-44} cy={-50} rx={26} ry={13} fill="#FFFFFF" fillOpacity={0.22} transform="rotate(-40 -44 -50)" />
      </g>
      <circle r={R} fill="none" stroke={INK} strokeWidth={5} />
    </svg>
  )
}

export default Earth
