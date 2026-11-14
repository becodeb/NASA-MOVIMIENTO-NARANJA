// 30-second demo trailer. A fixed 1920×1080 stage driven by ONE clock; every scene is a pure function of time.
//   /?preview=trailer             → black frame until window.__startTrailer() or a click
//   /?preview=trailer&autoplay=1  → starts by itself
//   /?preview=trailer&t=12.5      → frozen on that second (click / __startTrailer plays from there)
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import './trailer.css'
import { MBackdrop } from './art'
import { CAPTIONS, TRAILER_SECONDS, type Caption } from './captions'
import { backOut, clamp01, easeIn, easeInOut, easeOut, lerp, prog, shake } from './lib'
import { BuildScene, OpenScene, TitleScene } from './scenesA'
import { CruiseScene, LaunchScene, OpsScene } from './scenesB'
import { EndScene, ReentryScene, ReturnScene } from './scenesC'

declare global {
  interface Window {
    __startTrailer?: () => void
    __seekTrailer?: (seconds: number) => void
    __trailerDone?: boolean
    __trailerCaptions?: Caption[]
  }
}

export interface SceneProps {
  /** Seconds since this scene's own start (can be slightly negative while pre-mounted). */
  t: number
}

const W = 1920
const H = 1080
const PREMOUNT = 0.35
const WHIP = 0.13

type Whip = 'x' | 'y' | undefined
interface SceneDef { id: string; a: number; b: number; C: ComponentType<SceneProps>; whipIn?: Whip; whipOut?: Whip }

const SCENES: SceneDef[] = [
  { id: 'open', a: 0, b: 3, C: OpenScene },
  { id: 'title', a: 3, b: 4.5, C: TitleScene, whipOut: 'x' },
  { id: 'build', a: 4.5, b: 9, C: BuildScene, whipIn: 'x' },
  { id: 'launch', a: 9, b: 11.5, C: LaunchScene, whipOut: 'y' },
  { id: 'cruise', a: 11.5, b: 14, C: CruiseScene, whipIn: 'y' },
  { id: 'ops', a: 14, b: 20, C: OpsScene, whipOut: 'x' },
  { id: 'return', a: 20, b: 23.5, C: ReturnScene, whipIn: 'x' },
  { id: 'reentry', a: 23.5, b: 27, C: ReentryScene },
  { id: 'end', a: 27, b: TRAILER_SECONDS + 1, C: EndScene },
]

/** Flash frames on the music hits and hard cuts. */
const FLASHES: Array<{ at: number; dur: number; color: string; peak: number }> = [
  { at: 3, dur: 0.4, color: '#FFFFFF', peak: 1 },
  { at: 9, dur: 0.35, color: '#FFE9B0', peak: 0.9 },
  { at: 14, dur: 0.45, color: '#FFFFFF', peak: 1 },
  { at: 15.2, dur: 0.25, color: '#F04452', peak: 0.55 },
  { at: 15.9, dur: 0.22, color: '#FFFFFF', peak: 0.8 },
  { at: 19.5, dur: 0.4, color: '#65D68A', peak: 0.6 },
  { at: 21.45, dur: 0.3, color: '#FFFFFF', peak: 0.85 },
  { at: 23.5, dur: 0.4, color: '#FFB25E', peak: 1 },
  { at: 27, dur: 0.45, color: '#FFFFFF', peak: 1 },
]

/** Iris wipes: [close start, shut, open end, centre x, centre y]. */
const IRISES: Array<[number, number, number, number, number]> = [
  [8.78, 9, 9.22, 960, 520],
  [26.8, 27, 27.02, 960, 600],
]

function warpAt(t: number): number {
  if (t < 3) return t < 2 ? easeInOut(prog(t, 0.35, 1.1)) : lerp(1, 0.06, prog(t, 2, 2.7))
  if (t < 11.4) return 0.04
  if (t < 14.4) return t < 13.6 ? 0.2 : t < 14 ? 1 : lerp(1, 0, prog(t, 14, 14.35))
  if (t >= 21.45 && t < 23.5) return 0.45
  return 0.03
}

function shakeAt(t: number): [number, number] {
  let x = 0
  let y = 0
  const add = (s: [number, number]) => { x += s[0]; y += s[1] }
  add(shake(t, 3, 26, 0.45))
  for (const at of [5.17, 5.72, 6.27, 6.82]) add(shake(t, at, 6, 0.16))
  add(shake(t, 7.37, 16, 0.35))
  add(shake(t, 8.0, 10, 0.25))
  if (t >= 9 && t < 11.5) {
    const k = (t < 9.4 ? 5 : 11) * (1 - prog(t, 10.6, 11.5))
    x += Math.sin(t * 83) * k
    y += Math.cos(t * 117) * k
  }
  add(shake(t, 14, 14, 0.35))
  add(shake(t, 15.2, 14, 0.3))
  add(shake(t, 15.9, 34, 0.55))
  add(shake(t, 16.6, 12, 0.3))
  add(shake(t, 17.3, 12, 0.3))
  add(shake(t, 19.5, 14, 0.3))
  if (t >= 23.5 && t < 24.7) { x += Math.sin(t * 91) * 5; y += Math.cos(t * 123) * 5 }
  add(shake(t, 26.25, 16, 0.4))
  add(shake(t, 27, 22, 0.4))
  return [x, y]
}

function whipTransform(def: SceneDef, t: number): string | undefined {
  if (def.whipIn) {
    const p = prog(t, def.a - WHIP, def.a + WHIP)
    if (p < 1) {
      const d = 1 - easeInOut(p)
      return def.whipIn === 'x' ? `translateX(${d * W}px) skewX(${-d * 6}deg)` : `translateY(${-d * H}px)`
    }
  }
  if (def.whipOut) {
    const p = prog(t, def.b - WHIP, def.b + WHIP)
    if (p > 0) {
      const d = easeInOut(p)
      return def.whipOut === 'x' ? `translateX(${-d * W}px) skewX(${-d * 6}deg)` : `translateY(${d * H}px)`
    }
  }
  return undefined
}

function Captions({ t }: { t: number }) {
  const c = CAPTIONS.find((k) => t >= k.start && t < k.end) ?? (t >= TRAILER_SECONDS ? CAPTIONS[CAPTIONS.length - 1] : undefined)
  if (!c) return null
  const s = 0.72 + 0.28 * backOut(prog(t, c.start, c.start + 0.2))
  const o = clamp01((t - c.start) / 0.08)
  return (
    <div className="tr-caption" style={{ transform: `scale(${s})`, opacity: o }}>
      <span>
        {c.text.split(' ').map((w, i) => (
          <span key={i} className={c.hi?.includes(w) ? 'tr-caption__hi' : undefined}>{w} </span>
        ))}
      </span>
    </div>
  )
}

export function Trailer() {
  const params = useMemo(() => new URLSearchParams(location.search), [])
  const seek0 = useMemo(() => Math.min(TRAILER_SECONDS, Math.max(0, Number(params.get('t')) || 0)), [params])
  const [t, setT] = useState(seek0)
  const [shown, setShown] = useState(params.has('t'))
  const [playing, setPlaying] = useState(false)
  const [scale, setScale] = useState(1)
  const raf = useRef(0)
  const tRef = useRef(seek0)

  const start = useCallback(() => {
    if (raf.current) return
    const from = tRef.current >= TRAILER_SECONDS ? 0 : tRef.current
    window.__trailerDone = false
    setShown(true)
    setPlaying(true)
    let t0 = 0
    const tick = (now: number) => {
      if (!t0) t0 = now - from * 1000
      const s = (now - t0) / 1000
      if (s >= TRAILER_SECONDS) {
        tRef.current = TRAILER_SECONDS
        setT(TRAILER_SECONDS)
        setPlaying(false)
        raf.current = 0
        window.__trailerDone = true // the last frame stays on screen
        return
      }
      tRef.current = s
      setT(s)
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
  }, [])

  useEffect(() => {
    window.__trailerDone = false
    window.__trailerCaptions = CAPTIONS
    window.__startTrailer = start
    window.__seekTrailer = (s: number) => {
      cancelAnimationFrame(raf.current)
      raf.current = 0
      tRef.current = Math.min(TRAILER_SECONDS, Math.max(0, s))
      setPlaying(false)
      setShown(true)
      setT(tRef.current)
    }
    let alive = true
    if (params.get('autoplay') === '1') {
      // wait for the title font so the very first frames are already correct
      const go = () => { if (alive) start() }
      const fonts = document.fonts?.ready
      if (fonts) Promise.race([fonts, new Promise((r) => setTimeout(r, 1500))]).then(go)
      else go()
    }
    return () => {
      alive = false
      cancelAnimationFrame(raf.current)
      raf.current = 0
      delete window.__startTrailer
      delete window.__seekTrailer
    }
  }, [params, start])

  useLayoutEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / W, window.innerHeight / H))
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  const [sx, sy] = shakeAt(t)
  const alarm = t >= 15.2 && t < 19.5
  const fadeIn = 1 - easeOut(prog(t, 0, 0.45))

  return (
    <div className={playing ? 'tr-root tr-root--playing' : 'tr-root'} onClick={start}>
      <div className="tr-stage" style={{ transform: `translate(-50%, -50%) scale(${scale})` }}>
        {shown && (
          <>
            <MBackdrop warp={warpAt(t)} tint={alarm ? 'alarm' : 'calm'} />
            <div className="tr-world" style={{ transform: `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px)` }}>
              {SCENES.map((def) => {
                if (t < def.a - PREMOUNT || t >= def.b + (def.whipOut ? WHIP : 0)) return null
                const visible = t >= def.a - (def.whipIn ? WHIP : 0)
                return (
                  <div key={def.id} className={`tr-scene tr-scene--${def.id}`} style={{ visibility: visible ? 'visible' : 'hidden', transform: whipTransform(def, t) }}>
                    <def.C t={t - def.a} />
                  </div>
                )
              })}
            </div>

            {IRISES.map(([a, m, b, cx, cy], i) => {
              if (t < a || t >= b) return null
              const r = t < m ? lerp(1300, 0, easeIn(prog(t, a, m))) : lerp(0, 1300, easeOut(prog(t, m, b)))
              return <div key={i} className="tr-iris" style={{ left: cx - r, top: cy - r, width: r * 2, height: r * 2 }} />
            })}
            {FLASHES.map((f, i) => {
              if (t < f.at || t >= f.at + f.dur) return null
              return <div key={i} className="tr-flash" style={{ background: f.color, opacity: f.peak * Math.pow(1 - (t - f.at) / f.dur, 2) }} />
            })}
            {fadeIn > 0 && <div className="tr-flash" style={{ background: '#000', opacity: fadeIn }} />}
            <Captions t={t} />
          </>
        )}
      </div>
    </div>
  )
}

export default Trailer
