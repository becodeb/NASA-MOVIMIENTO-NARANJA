// Ship interior with a panoramic window onto Saturn. Purely presentational: everything comes in as props.
import { useEffect, useState } from 'react'
import { Enceladus, MicrometeoroidStreak, Saturn, SpaceBackdrop, Titan } from '../../art/worlds'
import { Sparkle, Spaceship } from '../../art/ships'
import { Astronaut, type AstronautExpression, type AstronautPose } from '../../avatar'
import type { AvatarConfig } from '../../avatar'
import type { EmergencyId, MissionState } from '../../engine/types'
import { Icon } from '../../game/icons'
import { useT } from '../../i18n'

export interface StageProps {
  mission: MissionState
  avatar: AvatarConfig
  alarmId: EmergencyId | null
  pose: AstronautPose
  expression: AstronautExpression
  bubble: string
  screenText: string
  /** Counters: change to replay an effect. */
  shake: number
  streak: number
  scan: number
  tx: number
  fix: number
  bad: number
}

/** Turn a counter into a short-lived boolean (for restartable one-shot CSS animations). */
function useFlash(counter: number, ms: number): boolean {
  const [on, setOn] = useState(false)
  useEffect(() => {
    if (!counter) return
    setOn(true)
    const h = setTimeout(() => setOn(false), ms)
    return () => clearTimeout(h)
  }, [counter, ms])
  return on
}

export function Stage(p: StageProps) {
  const t = useT()
  const m = p.mission
  const alarm = p.alarmId !== null
  const shaking = useFlash(p.shake, 750)
  const scanning = useFlash(p.scan, 1800)
  const sending = useFlash(p.tx, 2400)
  const fixing = useFlash(p.fix, 1800)
  const badding = useFlash(p.bad, 900)

  const antennaDown = m.systems.antennaMain === 'failed'
  const antenna = !antennaDown ? 'ok' : m.config.comms === 'redundant' ? 'main-failed' : 'all-failed'
  const damage = Math.min(1, Math.max(0, (100 - m.structure) / 55) + (m.faults.leak === 'open' ? 0.25 : 0))

  return (
    <div className={`l2-stage ${alarm ? 'is-alarm' : ''} ${shaking ? 'l2-shake' : ''}`}>
      <div className="l2-wall" aria-hidden />
      <div className="l2-window">
        <SpaceBackdrop tint={alarm ? 'alarm' : 'calm'} density={0.8} />
        <div className="l2-saturn" aria-hidden>
          <Saturn size="100%" tilt={22} roll={-14} />
          {scanning && <div className="l2-scan" />}
        </div>
        <div className="l2-titan" aria-hidden><Titan size="100%" /></div>
        {m.science.collected.moons && <div className="l2-ench" aria-hidden><Enceladus size="100%" /></div>}
        <div className="l2-ship">
          <Spaceship config={m.config} damage={damage} alarm={alarm} antenna={antenna} width="100%" title="Your ship" />
          {sending && (
            <div className="l2-tx" aria-hidden>
              <i /><i /><i />
            </div>
          )}
        </div>
        <MicrometeoroidStreak trigger={p.streak} x={58} y={44} angle={32} count={4} scale={1.2} />
        <div className="l2-glass" aria-hidden />
      </div>

      <div className="l2-beacon l2-beacon--l" aria-hidden />
      <div className="l2-beacon l2-beacon--r" aria-hidden />

      <div className="l2-desk" aria-hidden>
        <div className={`l2-screen ${alarm ? 'is-alarm' : ''} ${antennaDown ? 'is-noise' : ''}`}>
          <span>{alarm && p.alarmId ? <><Icon name="warning" size={18} /> {t(`engine.em.${p.alarmId}.title`)}</> : p.screenText}</span>
        </div>
        <div className="l2-lights">{Array.from({ length: 8 }, (_, i) => <i key={i} style={{ animationDelay: `${i * 0.23}s` }} />)}</div>
      </div>

      <div className="l2-astro">
        <Astronaut config={p.avatar} pose={p.pose} expression={p.expression} title={p.avatar.commanderName || 'Commander'} />
      </div>
      <p className={`l2-bubble ${alarm ? 'is-alarm' : ''}`} key={p.bubble} role="status">{p.bubble}</p>

      {fixing && (
        <div className="l2-fix" aria-hidden>
          <div className="l2-fix__flash" />
          <Sparkle className="l2-fix__s1" width="30%" />
          <Sparkle className="l2-fix__s2" width="22%" />
          <Sparkle className="l2-fix__s3" width="26%" />
        </div>
      )}
      {badding && <div className="l2-bad" aria-hidden />}
    </div>
  )
}
