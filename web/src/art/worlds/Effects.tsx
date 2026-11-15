import { useEffect, useMemo, useRef, type CSSProperties } from 'react'
import './worlds.css'
import { INK, clamp, cx, rng, sparklePath, useMotion } from './util'

/* ─────────────────────── RingParticles ─────────────────────── */

export interface RingParticlesProps {
  /** Particle density multiplier (1 = default). */
  density?: number
  /** Drift speed multiplier. */
  speed?: number
  /** Drift direction in degrees (0 = left→right, 90 = downward). */
  direction?: number
  animate?: boolean
  className?: string
  style?: CSSProperties
}

interface Chunk {
  x: number
  y: number
  z: number
  r: number
  rot: number
  spin: number
  shape: number[]
  color: string
}

const ICE = ['#F5F7FF', '#DDF3FF', '#BFEFFF', '#F1E4C4', '#FFFFFF']

/** Drifting field of chunky water-ice ring particles (Canvas2D overlay; fills its positioned parent). */
export function RingParticles({ density = 1, speed = 1, direction = 8, animate = true, className, style }: RingParticlesProps) {
  const motion = useMotion(animate)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const speedRef = useRef(speed)
  const dirRef = useRef(direction)
  speedRef.current = speed
  dirRef.current = direction

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rand = rng(1610)
    let W = 0
    let H = 0
    let dpr = 1
    let chunks: Chunk[] = []

    const draw = (dt: number) => {
      const a = (dirRef.current * Math.PI) / 180
      const vx = Math.cos(a) * 60 * speedRef.current
      const vy = Math.sin(a) * 60 * speedRef.current
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      ctx.lineJoin = 'round'
      for (const c of chunks) {
        c.x += vx * c.z * dt
        c.y += vy * c.z * dt
        c.rot += c.spin * dt
        const m = c.r + 4
        if (c.x > W + m) c.x = -m
        else if (c.x < -m) c.x = W + m
        if (c.y > H + m) c.y = -m
        else if (c.y < -m) c.y = H + m
        ctx.save()
        ctx.translate(c.x, c.y)
        ctx.rotate(c.rot)
        ctx.globalAlpha = 0.35 + 0.65 * c.z
        ctx.beginPath()
        const n = c.shape.length
        for (let i = 0; i < n; i++) {
          const ang = (Math.PI * 2 * i) / n
          const rr = c.r * c.shape[i]
          if (i) ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr)
          else ctx.moveTo(Math.cos(ang) * rr, Math.sin(ang) * rr)
        }
        ctx.closePath()
        ctx.fillStyle = c.color
        ctx.fill()
        if (c.r > 4) {
          ctx.lineWidth = Math.min(3, c.r * 0.28)
          ctx.strokeStyle = INK
          ctx.stroke()
          // facet highlight
          ctx.globalAlpha *= 0.8
          ctx.fillStyle = '#FFFFFF'
          ctx.beginPath()
          ctx.arc(-c.r * 0.25, -c.r * 0.25, c.r * 0.22, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      }
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      W = Math.max(1, rect.width)
      H = Math.max(1, rect.height)
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
      const count = Math.round(clamp(((W * H) / 4200) * density, 14, 260))
      chunks = Array.from({ length: count }, () => {
        const z = 0.2 + Math.pow(rand(), 2.2) * 0.8
        const sides = 5 + Math.floor(rand() * 3)
        return {
          x: rand() * W,
          y: rand() * H,
          z,
          r: 1.2 + z * z * 11,
          rot: rand() * Math.PI * 2,
          spin: (rand() - 0.5) * 1.6,
          shape: Array.from({ length: sides }, () => 0.72 + rand() * 0.4),
          color: ICE[Math.floor(rand() * ICE.length)],
        }
      })
      draw(0)
    }

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()
    let raf = 0
    if (motion) {
      let last = performance.now()
      const tick = (now: number) => {
        const dt = Math.min(0.05, (now - last) / 1000)
        last = now
        draw(dt)
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [motion, density])

  return <canvas ref={canvasRef} className={cx('sw-ringparticles', className)} style={style} aria-hidden />
}

/* ─────────────────── MicrometeoroidStreak ─────────────────── */

export interface MicrometeoroidStreakProps {
  /** Change this number to (re)play the impact. 0 / undefined = idle. */
  trigger?: number
  /** Impact point as % of the container (0..100). */
  x?: number
  y?: number
  /** Direction the micrometeoroid travels, in degrees (0 = left→right, 90 = downward). */
  angle?: number
  /** Extra smaller streaks around the main one. */
  count?: number
  color?: string
  /** Size multiplier for the flash. */
  scale?: number
  /** Called when the effect finishes (~0.9s after trigger). */
  onDone?: () => void
  animate?: boolean
  className?: string
  style?: CSSProperties
}

/** One-shot impact: a fast streak, a white flash, a shock ring and flying shards. Overlay; fills its positioned parent. */
export function MicrometeoroidStreak({
  trigger = 0,
  x = 50,
  y = 50,
  angle = 28,
  count = 3,
  color = '#FFD447',
  scale = 1,
  onDone,
  animate = true,
  className,
  style,
}: MicrometeoroidStreakProps) {
  const motion = useMotion(animate)
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    if (!trigger) return
    const t = window.setTimeout(() => doneRef.current?.(), 900)
    return () => window.clearTimeout(t)
  }, [trigger])

  const extras = useMemo(() => {
    const rand = rng(trigger * 7919 + 13)
    return Array.from({ length: Math.max(0, count - 1) }, () => ({
      dx: (rand() - 0.5) * 60,
      dy: (rand() - 0.5) * 50,
      da: (rand() - 0.5) * 10,
      delay: 0.05 + rand() * 0.3,
      s: 0.35 + rand() * 0.3,
    }))
  }, [trigger, count])

  const shards = useMemo(() => {
    const rand = rng(trigger * 31 + 5)
    return Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * Math.PI * 2 + rand() * 0.5
      const dist = 46 + rand() * 60
      return { dx: Math.cos(a) * dist, dy: Math.sin(a) * dist, rot: (a * 180) / Math.PI, len: 8 + rand() * 10 }
    })
  }, [trigger])

  if (!trigger) return null

  const impact = (px: number, py: number, ang: number, s: number, delay: number, main: boolean, key: string) => (
    <div
      key={key}
      className="sw-impact"
      style={{ left: `${px}%`, top: `${py}%`, '--sw-delay': `${delay}s`, '--sw-scale': s, '--sw-color': color } as CSSProperties}
    >
      <div className="sw-impact__rot" style={{ transform: `rotate(${ang}deg)` }}>
        <div className="sw-impact__streak" />
      </div>
      <svg className="sw-impact__burst" viewBox="-60 -60 120 120" aria-hidden>
        <circle className="sw-impact__ring" r={30} fill="none" stroke="#F5F7FF" strokeWidth={5} />
        <g className="sw-impact__star">
          <path d={sparklePath(54)} fill={color} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
          <path d={sparklePath(34)} fill="#FFFFFF" transform="rotate(45)" />
          <circle r={11} fill="#FFFFFF" />
        </g>
        {main &&
          shards.map((sh, i) => (
            <g key={i} className="sw-impact__shard" style={{ '--sw-dx': `${sh.dx}px`, '--sw-dy': `${sh.dy}px` } as CSSProperties}>
              <rect x={-sh.len / 2} y={-2} width={sh.len} height={4} rx={2} fill={i % 2 ? '#F5F7FF' : color} stroke={INK} strokeWidth={1.5} transform={`rotate(${sh.rot})`} />
            </g>
          ))}
      </svg>
    </div>
  )

  return (
    <div key={trigger} className={cx('sw-impact-layer', motion ? 'sw-anim' : 'sw-still', className)} style={style} aria-hidden>
      <div className="sw-impact-layer__flash" />
      {extras.map((e, i) => impact(x + e.dx, y + e.dy, angle + e.da, e.s * scale, e.delay, false, `e${i}`))}
      {impact(x, y, angle, scale, 0, true, 'main')}
    </div>
  )
}
