import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import './worlds.css'
import { clamp, cx, rng, useMotion } from './util'

export interface SpaceBackdropProps {
  /** 0..1 — stretches stars into speed lines radiating from the centre (travel scenes). */
  warp?: number
  /** 'alarm' adds a pulsing red wash for emergencies. */
  tint?: 'calm' | 'alarm'
  animate?: boolean
  /** Star density multiplier (1 = default). */
  density?: number
  /** Use position: fixed (covers the viewport) instead of absolute (covers the positioned parent). */
  fixed?: boolean
  /** Hide the nebula clouds (e.g. behind dense UI). */
  nebula?: boolean
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

interface Star {
  x: number
  y: number
  z: number // depth 0.25..1 (1 = near)
  size: number
  phase: number
  speed: number
  color: string
  sparkle: boolean
}

interface Shooter {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
}

const STAR_COLORS = ['#F5F7FF', '#F5F7FF', '#F5F7FF', '#F5F7FF', '#BFEFFF', '#FFD447', '#F9B8D6', '#38D9D0']

export function SpaceBackdrop({
  warp = 0,
  tint = 'calm',
  animate = true,
  density = 1,
  fixed = false,
  nebula = true,
  className,
  style,
  children,
}: SpaceBackdropProps) {
  const motion = useMotion(animate)
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const warpRef = useRef(clamp(warp, 0, 1))
  const drawRef = useRef<((dt: number) => void) | null>(null)
  warpRef.current = clamp(warp, 0, 1)

  useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    if (!root || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rand = rng(20261114)
    let W = 0
    let H = 0
    let dpr = 1
    let stars: Star[] = []
    let shooter: Shooter | null = null
    let nextShooter = 2.5 + rand() * 3
    let time = 0
    let smoothWarp = warpRef.current

    const makeStar = (nearCentre: boolean): Star => {
      const z = 0.25 + rand() * rand() * 0.75
      let x = rand() * W
      let y = rand() * H
      if (nearCentre) {
        const a = rand() * Math.PI * 2
        const d = (0.02 + rand() * 0.22) * Math.min(W, H)
        x = W / 2 + Math.cos(a) * d
        y = H / 2 + Math.sin(a) * d
      }
      return {
        x,
        y,
        z,
        size: 0.6 + z * 1.7,
        phase: rand() * Math.PI * 2,
        speed: 0.6 + rand() * 2.2,
        color: STAR_COLORS[Math.floor(rand() * STAR_COLORS.length)],
        sparkle: z > 0.62 && rand() < 0.35,
      }
    }

    const drawSparkle = (x: number, y: number, s: number) => {
      const k = s * 0.24
      ctx.beginPath()
      ctx.moveTo(x, y - s)
      ctx.lineTo(x + k, y - k)
      ctx.lineTo(x + s, y)
      ctx.lineTo(x + k, y + k)
      ctx.lineTo(x, y + s)
      ctx.lineTo(x - k, y + k)
      ctx.lineTo(x - s, y)
      ctx.lineTo(x - k, y - k)
      ctx.closePath()
      ctx.fill()
    }

    const draw = (dt: number) => {
      time += dt
      // ease the warp so speed lines ramp in/out smoothly
      const target = warpRef.current
      smoothWarp = dt === 0 ? target : smoothWarp + (target - smoothWarp) * Math.min(1, dt * 5)
      const w = smoothWarp
      const cxp = W / 2
      const cyp = H / 2

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      ctx.lineCap = 'round'

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i]
        let dx = s.x - cxp
        let dy = s.y - cyp
        let d = Math.hypot(dx, dy) || 1
        const radial = w * w * (140 + d * 2.6) * s.z
        if (dt > 0) {
          s.x += (-7 * s.z * (1 - w) + (dx / d) * radial) * dt
          s.y += (dy / d) * radial * dt
          if (s.x < -20 || s.x > W + 20 || s.y < -20 || s.y > H + 20) {
            if (w > 0.04) {
              Object.assign(s, makeStar(true))
            } else {
              s.x = s.x < -20 ? W + 20 : s.x > W + 20 ? -20 : s.x
              s.y = s.y < -20 ? H + 20 : s.y > H + 20 ? -20 : s.y
            }
          }
          dx = s.x - cxp
          dy = s.y - cyp
          d = Math.hypot(dx, dy) || 1
        }
        const tw = 0.62 + 0.38 * Math.sin(time * s.speed + s.phase)
        ctx.fillStyle = s.color
        ctx.strokeStyle = s.color
        if (w > 0.02) {
          const len = w * (6 + d * 0.32) * (0.4 + s.z)
          // fade in near the centre so new streaks don't pop
          ctx.globalAlpha = Math.min(1, d / (Math.min(W, H) * 0.14)) * (0.45 + 0.55 * s.z)
          ctx.lineWidth = s.size * (1 + w * 0.6)
          ctx.beginPath()
          ctx.moveTo(s.x, s.y)
          ctx.lineTo(s.x - (dx / d) * len, s.y - (dy / d) * len)
          ctx.stroke()
        } else if (s.sparkle) {
          ctx.globalAlpha = 0.35 + 0.65 * tw
          drawSparkle(s.x, s.y, s.size * (1.6 + 1.5 * tw))
        } else {
          ctx.globalAlpha = (0.3 + 0.7 * s.z) * tw
          ctx.beginPath()
          ctx.arc(s.x, s.y, s.size * 0.55, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // occasional shooting star (calm cruising only)
      if (dt > 0) {
        nextShooter -= dt
        if (!shooter && nextShooter <= 0 && w < 0.25) {
          const ang = Math.PI * (0.78 + rand() * 0.12)
          const sp = 520 + rand() * 380
          shooter = {
            x: W * (0.35 + rand() * 0.65),
            y: H * rand() * 0.4,
            vx: Math.cos(ang) * sp,
            vy: Math.sin(ang) * sp,
            life: 0,
            max: 0.75 + rand() * 0.4,
          }
          nextShooter = 4 + rand() * 7
        }
        if (shooter) {
          const sh = shooter
          sh.life += dt
          sh.x += sh.vx * dt
          sh.y += sh.vy * dt
          const p = sh.life / sh.max
          if (p >= 1) {
            shooter = null
          } else {
            const fade = Math.sin(Math.PI * p)
            const tail = 0.16
            const tx = sh.x - sh.vx * tail
            const ty = sh.y - sh.vy * tail
            const g = ctx.createLinearGradient(sh.x, sh.y, tx, ty)
            g.addColorStop(0, 'rgba(245,247,255,1)')
            g.addColorStop(0.3, 'rgba(255,212,71,0.75)')
            g.addColorStop(1, 'rgba(244,106,167,0)')
            ctx.globalAlpha = fade
            ctx.strokeStyle = g
            ctx.lineWidth = 3
            ctx.beginPath()
            ctx.moveTo(sh.x, sh.y)
            ctx.lineTo(tx, ty)
            ctx.stroke()
            ctx.fillStyle = '#F5F7FF'
            drawSparkle(sh.x, sh.y, 6)
          }
        }
      }
      ctx.globalAlpha = 1
    }


    const resize = () => {
      const rect = root.getBoundingClientRect()
      W = Math.max(1, rect.width)
      H = Math.max(1, rect.height)
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
      const count = Math.round(clamp(((W * H) / 3200) * density, 40, 520))
      stars = Array.from({ length: count }, () => makeStar(false))
      draw(0)
    }

    drawRef.current = draw
    const ro = new ResizeObserver(resize)
    ro.observe(root)
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
      drawRef.current = null
    }
  }, [motion, density])

  // static mode: repaint when warp changes
  useEffect(() => {
    if (!motion) drawRef.current?.(0)
  }, [motion, warp])

  return (
    <div
      ref={rootRef}
      className={cx('sw-backdrop', fixed && 'sw-backdrop--fixed', motion && 'sw-anim', className)}
      style={style}
      aria-hidden={children ? undefined : true}
    >
      {nebula && (
        <div className="sw-nebula" style={{ opacity: 1 - clamp(warp, 0, 1) * 0.45 }}>
          <span className="sw-neb sw-neb--a" />
          <span className="sw-neb sw-neb--b" />
          <span className="sw-neb sw-neb--c" />
          <span className="sw-neb sw-neb--d" />
          <span className="sw-neb sw-neb--e" />
        </div>
      )}
      <canvas ref={canvasRef} className="sw-backdrop__stars" />
      <div className={cx('sw-backdrop__alarm', tint === 'alarm' && 'is-on')} />
      {children}
    </div>
  )
}

export default SpaceBackdrop
