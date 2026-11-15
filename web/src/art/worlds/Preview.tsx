import { useState } from 'react'
import {
  Earth,
  Enceladus,
  MicrometeoroidStreak,
  RingParticles,
  Saturn,
  SolarSystemMap,
  SpaceBackdrop,
  Sun,
  Titan,
  type MapRoute,
  type RouteId,
} from './index'

const ROUTE_NAMES: Record<RouteId, string> = { fast: 'Rápida', balanced: 'Equilibrada', slow: 'Lenta' }

export default function Preview() {
  const [warp, setWarp] = useState(0)
  const [alarm, setAlarm] = useState(false)
  const [animate, setAnimate] = useState(true)
  const [tilt, setTilt] = useState(18)
  const [roll, setRoll] = useState(-16)
  const [hexagon, setHexagon] = useState(true)
  const [route, setRoute] = useState<RouteId>('balanced')
  const [progress, setProgress] = useState(0.35)
  const [flyby, setFlyby] = useState(true)
  const [impact, setImpact] = useState(0)
  const [plumes, setPlumes] = useState(true)

  const routes: MapRoute[] = (['fast', 'balanced', 'slow'] as RouteId[]).map((id) => ({
    id,
    highlighted: id === route,
    dashed: id !== route,
    label: ROUTE_NAMES[id],
  }))

  return (
    <div className="sw-pv">
      <SpaceBackdrop fixed warp={warp} tint={alarm ? 'alarm' : 'calm'} animate={animate} />
      <div className="sw-pv__inner">
        <h1>Worlds gallery</h1>
        <p>
          <code>src/art/worlds</code> — every component, live. Backdrop controls stay pinned below.
        </p>

        <div className="sw-pv__bar sw-pv__controls">
          <label>
            warp
            <input type="range" min={0} max={1} step={0.01} value={warp} onChange={(e) => setWarp(+e.target.value)} />
            {warp.toFixed(2)}
          </label>
          <button type="button" className="sw-pv__btn sw-pv__btn--alarm" aria-pressed={alarm} onClick={() => setAlarm((a) => !a)}>
            tint: {alarm ? 'alarm' : 'calm'}
          </button>
          <button type="button" className="sw-pv__btn" aria-pressed={animate} onClick={() => setAnimate((a) => !a)}>
            animate: {animate ? 'on' : 'off'}
          </button>
        </div>

        {/* hero composition */}
        <div className="sw-pv__hero">
          <Saturn size="min(92vw, 560px)" tilt={tilt} roll={roll} showHexagon={hexagon} animate={animate} />
          <div className="sw-pv__hero-moon" style={{ left: '4%', bottom: '4%' }}>
            <Titan size="clamp(56px, 11vw, 110px)" animate={animate} />
          </div>
          <div className="sw-pv__hero-moon" style={{ right: '5%', top: '4%' }}>
            <Enceladus size="clamp(40px, 7vw, 74px)" animate={animate} />
          </div>
        </div>

        <div className="sw-pv__grid">
          <section className="sw-pv__card sw-pv__card--wide">
            <h2>Saturn</h2>
            <p>
              Butterscotch bands with drifting streaks, C / B / A rings, Cassini Division, Encke Gap, planet shadow on the rings, ice sparkle.
              Raise <code>tilt</code> past ~40° to look down on the north-polar hexagon.
            </p>
            <div className="sw-pv__controls">
              <label>
                tilt
                <input type="range" min={0} max={70} step={1} value={tilt} onChange={(e) => setTilt(+e.target.value)} />
                {tilt}°
              </label>
              <label>
                roll
                <input type="range" min={-45} max={45} step={1} value={roll} onChange={(e) => setRoll(+e.target.value)} />
                {roll}°
              </label>
              <label>
                <input type="checkbox" checked={hexagon} onChange={(e) => setHexagon(e.target.checked)} />
                showHexagon
              </label>
            </div>
            <div className="sw-pv__stage" style={{ gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              <Saturn size={200} tilt={4} roll={0} animate={animate} glow={false} />
              <Saturn size={200} tilt={27} roll={-20} animate={animate} glow={false} />
              <Saturn size={200} tilt={58} roll={8} animate={animate} glow={false} />
              <Saturn size={72} animate={animate} glow={false} />
            </div>
          </section>

          <section className="sw-pv__card">
            <h2>Earth</h2>
            <p>Scrolling continents, cloud belts, 23.4° axial tilt, teal atmosphere.</p>
            <div className="sw-pv__stage">
              <Earth size={210} animate={animate} />
            </div>
          </section>

          <section className="sw-pv__card">
            <h2>Titan</h2>
            <p>Orange N₂ / methane smog ball with a detached violet haze layer.</p>
            <div className="sw-pv__stage">
              <Titan size={190} animate={animate} />
            </div>
          </section>

          <section className="sw-pv__card">
            <h2>Enceladus</h2>
            <p>Bright water ice, tiger stripes and south-polar plumes.</p>
            <div className="sw-pv__stage">
              <Enceladus size={170} plumes={plumes} animate={animate} />
            </div>
            <div className="sw-pv__controls">
              <label>
                <input type="checkbox" checked={plumes} onChange={(e) => setPlumes(e.target.checked)} />
                plumes
              </label>
            </div>
          </section>

          <section className="sw-pv__card">
            <h2>Sun</h2>
            <p>Small cartoon star with counter-rotating corona and sunspots.</p>
            <div className="sw-pv__stage">
              <Sun size={170} animate={animate} />
            </div>
          </section>

          <section className="sw-pv__card sw-pv__card--wide">
            <h2>SolarSystemMap</h2>
            <p>Route selection and transit. Pick a route, then scrub the ship along it.</p>
            <div className="sw-pv__controls" style={{ marginBottom: 8 }}>
              {(['fast', 'balanced', 'slow'] as RouteId[]).map((id) => (
                <button key={id} type="button" className="sw-pv__btn" aria-pressed={route === id} onClick={() => setRoute(id)}>
                  {id}
                </button>
              ))}
              <label>
                progress
                <input type="range" min={0} max={1} step={0.005} value={progress} onChange={(e) => setProgress(+e.target.value)} />
                {Math.round(progress * 100)}%
              </label>
              <label>
                <input type="checkbox" checked={flyby} onChange={(e) => setFlyby(e.target.checked)} />
                showTitanFlyby
              </label>
            </div>
            <SolarSystemMap
              routes={routes}
              progress={progress}
              showTitanFlyby={flyby}
              note="Órbitas y distancias no están a escala"
              animate={animate}
            />
          </section>

          <section className="sw-pv__card sw-pv__card--wide">
            <h2>RingParticles + MicrometeoroidStreak</h2>
            <p>
              Ice-particle field for ring crossings, and a one-shot impact (<code>trigger</code> number replays it).
            </p>
            <div className="sw-pv__fxbox">
              <RingParticles animate={animate} />
              <MicrometeoroidStreak trigger={impact} x={62} y={48} animate={animate} />
            </div>
            <div className="sw-pv__controls">
              <button type="button" className="sw-pv__btn" onClick={() => setImpact((n) => n + 1)}>
                Trigger impact ({impact})
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
