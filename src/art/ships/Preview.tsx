import { useState, type ReactNode } from 'react'
import './ships.css'
import { ExhaustPlume, SmokePuff, Sparks } from './bits'
import { LaunchRocket } from './LaunchRocket'
import { ReentryCapsule } from './ReentryCapsule'
import { Spaceship } from './Spaceship'
import type { AntennaState, Facing, LaunchPhase, ReentryCorridor, ReentryPhase, ShipConfig, ShipPart, ThrustMode } from './types'

const CHOICES: { [K in ShipPart]: readonly ShipConfig[K][] } = {
  structure: ['light', 'reinforced'],
  propulsion: ['chemical', 'combined'],
  power: ['solar', 'nuclear'],
  lifeSupport: ['consumables', 'regenerative'],
  comms: ['standard', 'redundant'],
}
const FULL: ShipConfig = { structure: 'light', propulsion: 'chemical', power: 'solar', lifeSupport: 'consumables', comms: 'standard' }
const LAUNCH: LaunchPhase[] = ['pad', 'ignition', 'liftoff', 'ascent']
const REENTRY: ReentryPhase[] = ['separation', 'entry', 'drogue', 'main', 'splashdown']
const CORRIDORS: ReentryCorridor[] = ['shallow', 'nominal', 'steep']

function Chips<T extends string>({ label, options, value, onChange }: { label: string; options: readonly T[]; value: T | undefined; onChange: (v: T) => void }) {
  return (
    <div className="sh-pv-row" role="group" aria-label={label}>
      <span className="sh-pv-label">{label}</span>
      {options.map((o) => (
        <button key={o} type="button" className="sh-pv-chip" aria-pressed={value === o} onClick={() => onChange(o)}>
          {o}
        </button>
      ))}
    </div>
  )
}

function Toggle({ on, onChange, children }: { on: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <button type="button" className="sh-pv-chip" aria-pressed={on} onClick={() => onChange(!on)}>
      {children}
    </button>
  )
}

export default function Preview() {
  const [config, setConfig] = useState<Partial<ShipConfig>>(FULL)
  const [thrust, setThrust] = useState<ThrustMode>('off')
  const [damage, setDamage] = useState(0)
  const [alarm, setAlarm] = useState(false)
  const [antenna, setAntenna] = useState<AntennaState>('ok')
  const [lightsOn, setLightsOn] = useState(true)
  const [facing, setFacing] = useState<Facing>('right')
  const [animate, setAnimate] = useState(true)

  const [launch, setLaunch] = useState<LaunchPhase>('pad')
  const [auto, setAuto] = useState(false)
  const [launchDone, setLaunchDone] = useState(0)

  const [reentry, setReentry] = useState<ReentryPhase>('separation')
  const [corridor, setCorridor] = useState<ReentryCorridor>('nominal')

  const setPart = <K extends ShipPart>(k: K, v: ShipConfig[K] | undefined) => setConfig((c) => ({ ...c, [k]: v }))

  return (
    <div className="sh-pv">
      <h1>Ships — vehicle gallery</h1>
      <p>Spaceship, LaunchRocket, ReentryCapsule and FX bits. Clear a choice to see its holographic placeholder.</p>

      <h2>Spaceship</h2>
      <div className="sh-pv-stage">
        <div className="sh-pv-ship">
          <Spaceship config={config} assembling thrust={thrust} damage={damage} alarm={alarm} antenna={antenna} lightsOn={lightsOn} facing={facing} animate={animate} />
        </div>
      </div>
      <div className="sh-pv-grid">
        {(Object.keys(CHOICES) as ShipPart[]).map((k) => (
          <div key={k} className="sh-pv-row" role="group" aria-label={k}>
            <span className="sh-pv-label">{k}</span>
            <button type="button" className="sh-pv-chip" aria-pressed={config[k] === undefined} onClick={() => setPart(k, undefined)}>—</button>
            {CHOICES[k].map((o) => (
              <button key={o} type="button" className="sh-pv-chip" aria-pressed={config[k] === o} onClick={() => setPart(k, o)}>{o}</button>
            ))}
          </div>
        ))}
        <div className="sh-pv-row">
          <span className="sh-pv-label">build</span>
          <button type="button" className="sh-pv-chip" onClick={() => setConfig({})}>empty</button>
          <button type="button" className="sh-pv-chip" onClick={() => setConfig(FULL)}>basic</button>
          <button type="button" className="sh-pv-chip" onClick={() => setConfig({ structure: 'reinforced', propulsion: 'combined', power: 'nuclear', lifeSupport: 'regenerative', comms: 'redundant' })}>deluxe</button>
        </div>
        <Chips label="thrust" options={['off', 'chemical', 'ion', 'both'] as const} value={thrust} onChange={setThrust} />
        <Chips label="antenna" options={['ok', 'main-failed', 'all-failed'] as const} value={antenna} onChange={setAntenna} />
        <div className="sh-pv-row">
          <span className="sh-pv-label">damage {damage.toFixed(2)}</span>
          <input className="sh-pv-range" type="range" min={0} max={1} step={0.01} value={damage} onChange={(e) => setDamage(Number(e.target.value))} aria-label="damage" />
        </div>
        <div className="sh-pv-row">
          <span className="sh-pv-label">state</span>
          <Toggle on={alarm} onChange={setAlarm}>alarm</Toggle>
          <Toggle on={lightsOn} onChange={setLightsOn}>lights</Toggle>
          <Toggle on={facing === 'left'} onChange={(v) => setFacing(v ? 'left' : 'right')}>facing left</Toggle>
          <Toggle on={animate} onChange={setAnimate}>animate</Toggle>
        </div>
      </div>

      <div className="sh-pv-cols">
        <section>
          <h2>LaunchRocket</h2>
          <div className="sh-pv-stage sh-pv-stage--tight sh-pv-scene">
            <LaunchRocket phase={launch} autoPlay={auto} onPhaseChange={(p) => auto && setLaunch(p)} onComplete={() => { setLaunchDone((n) => n + 1); setAuto(false) }} />
          </div>
          <div className="sh-pv-grid">
            <Chips label="phase" options={LAUNCH} value={launch} onChange={(p) => { setAuto(false); setLaunch(p) }} />
            <div className="sh-pv-row">
              <span className="sh-pv-label">cinematic · onComplete ×{launchDone}</span>
              <button type="button" className="sh-pv-chip" onClick={() => { setLaunch('pad'); setAuto(false); window.setTimeout(() => setAuto(true), 30) }}>▶ play launch</button>
            </div>
          </div>
        </section>

        <section>
          <h2>ReentryCapsule</h2>
          <div className="sh-pv-stage sh-pv-stage--tight sh-pv-scene">
            <ReentryCapsule key={`${reentry}-${corridor}`} phase={reentry} corridor={corridor} />
          </div>
          <div className="sh-pv-grid">
            <Chips label="phase" options={REENTRY} value={reentry} onChange={setReentry} />
            <Chips label="corridor (entry)" options={CORRIDORS} value={corridor} onChange={(c) => { setCorridor(c); setReentry('entry') }} />
          </div>
        </section>
      </div>

      <h2>Bits</h2>
      <div className="sh-pv-stage sh-pv-bits">
        <figure><ExhaustPlume width={150} /><figcaption>ExhaustPlume chemical</figcaption></figure>
        <figure><ExhaustPlume kind="ion" width={150} /><figcaption>ExhaustPlume ion</figcaption></figure>
        <figure><Sparks width={90} /><figcaption>Sparks</figcaption></figure>
        <figure><SmokePuff width={100} /><figcaption>SmokePuff</figcaption></figure>
        <figure><SmokePuff width={100} tone="dark" /><figcaption>SmokePuff dark</figcaption></figure>
      </div>
    </div>
  )
}
