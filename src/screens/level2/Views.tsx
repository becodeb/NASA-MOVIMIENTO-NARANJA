// End-of-level views: Operations Report (can proceed) and the educational failure screen.
import { Explain, Hud, Icon, ScreenFrame, Squiggle, stringify, type IconName } from '../../game/ui'
import { game } from '../../game/store'
import { SpaceBackdrop } from '../../art/worlds'
import { Astronaut } from '../../avatar'
import type { AvatarConfig } from '../../avatar'
import { EMERGENCY_ORDER } from '../../engine/data'
import { finishChecks } from '../../engine/engine'
import type { EmergencyId, MissionState, Params } from '../../engine/types'
import { useT } from '../../i18n'

type Tr = (k: string, p?: Record<string, string | number>) => string

export const EM_ICON: Record<EmergencyId, IconName> = { comms: 'em-comms', impact: 'em-impact', co2: 'em-co2', power: 'em-power', thermal: 'em-thermal', radiation: 'em-radiation' }

/** Engine params -> display strings (nested i18n keys and comma lists of problem ids are translated). */
export function P(params: Params, t: Tr): Record<string, string | number> {
  const o = stringify(params, (k) => t(k))
  for (const k of ['problems', 'failed']) {
    const v = params[k]
    if (typeof v === 'string') o[k] = v.split(',').filter(Boolean).map((x) => t(`l2.prob.${x}`)).join(', ')
  }
  return o
}

function Row({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <div className="l2-rep__row">
      <Icon name={icon} size={26} />
      <span className="l2-rep__label">{label}</span>
      <b className="tnum">{value}</b>
    </div>
  )
}

function Decisions({ mission }: { mission: MissionState }) {
  const t = useT()
  return (
    <ol className="l2-log surface-rows">
      {EMERGENCY_ORDER.map((id, i) => {
        const e = mission.emergencies[id]
        if (e.status === 'pending') return null
        return (
          <li key={id} className={`l2-log__row is-${e.status}`}>
            <Icon name={EM_ICON[id]} size={36} />
            <div>
              <b>{t('l2.fail.decision', { n: i + 1, event: t(`engine.em.${id}.title`), option: e.choice ? t(`engine.opt.${id}.${e.choice}`) : '?' })}</b>
              <p>{e.choice ? t(`engine.expl.${id}.${e.choice}`) : ''}</p>
              <span className={`stamp stamp--${e.status === 'resolved' ? 'green' : e.status === 'partial' ? 'yellow' : 'red'}`}>{t(`l2.status.${e.status}`)}</span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export function Report({ mission, avatar }: { mission: MissionState; avatar: AvatarConfig }) {
  const t = useT()
  const r = finishChecks(mission).report
  const regen = mission.config.lifeSupport === 'regenerative'
  const go = () => {
    game.checkpoint('level3-start')
    game.go('departure')
  }
  return (
    <ScreenFrame title={t('l2.report.title')} subtitle={t('l2.report.sub')} actions={<span className="stamp stamp--flat">{t('l2.stamp.level')}</span>}>
      <SpaceBackdrop fixed />
      <div className="l2-wrap">
        <Hud mission={mission} compact />
        <div className="l2-rep surface-paper surface-paper--tape">
          <div className="l2-rep__hero">
            <div className="l2-rep__astro"><Astronaut config={avatar} pose="cheer" expression="happy" /></div>
            <p className="l2-bubble l2-bubble--static">{t('l2.crew.done')}</p>
          </div>
          <div className="l2-rep__grid">
            <Row icon="hull" label={t('l2.report.structure')} value={`${r.structure}/100`} />
            <Row icon="maneuver" label={t('l2.report.propulsion')} value={t(`l2.sys.${r.propulsion}`)} />
            <Row icon="route" label={t('l2.report.maneuver')} value={String(r.maneuver)} />
            <Row icon="power" label={t('l2.report.power')} value={String(r.generation)} />
            <Row icon="battery" label={t('l2.report.battery')} value={String(r.battery)} />
            <Row icon="life-support" label={t('l2.report.vital')} value={t('l2.report.vitalValue', { vital: Number(r.vital), rate: Number(r.vitalRate) })} />
            <Row icon="recycle" label={t('l2.report.regen')} value={regen ? `${t(`l2.sys.${r.lifeSupport}`)}` : t('l2.report.regenNone')} />
            <Row
              icon="antenna"
              label={t('l2.report.antennas')}
              value={t('l2.report.antennaValue', { main: t(`l2.sys.${r.antennaMain}`), backup: t(`l2.antenna.${r.antennaBackup}`) })}
            />
            <Row icon="spare-kit" label={t('l2.report.spares')} value={t('l2.report.sparesValue', { a: Number(r.sparesStructural), b: Number(r.sparesLifeSupport), c: Number(r.sparesElectronic) })} />
            <Row icon="radiation" label={t('l2.report.radiation')} value={String(r.radiation)} />
            <Row icon="science" label={t('l2.report.science')} value={t('l2.report.scienceValue', { collected: Number(r.collected), transmitted: Number(r.transmitted) })} />
            <Row
              icon="siren"
              label={t('l2.report.emergencies')}
              value={t('l2.report.emergenciesValue', { resolved: Number(r.resolved), partial: Number(r.partial), unresolved: Number(r.unresolved) })}
            />
          </div>
          <h3 className="paper-title squiggled l2-rep__h">{t('l2.report.log')}<Squiggle /></h3>
          <Decisions mission={mission} />
          <Explain titleKey="l2.rep.note" textKey="engine.finish.proceedWhy" tilt={0} />
          <p className="l2-note fine">{t('l2.report.note')}</p>
          <button className="btn btn--yellow l2-rep__go" onClick={go}>{t('l2.report.go')} <Icon name="go" size={26} /></button>
        </div>
      </div>
    </ScreenFrame>
  )
}

export function Failure({ mission, avatar }: { mission: MissionState; avatar: AvatarConfig }) {
  const t = useT()
  const fin = finishChecks(mission)
  const bad = fin.checks.filter((c) => !c.ok)
  const any = EMERGENCY_ORDER.some((id) => mission.emergencies[id].status === 'partial' || mission.emergencies[id].status === 'unresolved')
  const canUndo = game.canRestore()
  return (
    <ScreenFrame title={t('l2.fail.title')} subtitle={t('l2.fail.sub')} alarm actions={<span className="stamp stamp--red stamp--flat">{t('l2.stamp.level')}</span>}>
      <SpaceBackdrop fixed tint="alarm" />
      <div className="l2-wrap">
        <div className="l2-rep surface-paper surface-paper--tape">
          <div className="l2-rep__hero">
            <div className="l2-rep__astro"><Astronaut config={avatar} pose="worried" expression="worried" /></div>
            <p className="l2-bubble l2-bubble--static is-alarm">{t('engine.finish.blockedWhy')}</p>
          </div>
          <h3 className="paper-title squiggled l2-rep__h">{t('l2.fail.checks')}<Squiggle /></h3>
          <ul className="l2-checks surface-rows">
            {fin.checks.map((c) => (
              <li key={c.id} className={c.ok ? 'is-ok' : 'is-bad'}>
                <Icon name={c.ok ? 'ok' : 'fail'} size={22} /> <span>{t(c.msgKey, P(c.params, t))}</span>
              </li>
            ))}
          </ul>
          <h3 className="paper-title squiggled l2-rep__h">{t('l2.fail.decisions')}<Squiggle /></h3>
          {any || bad.length ? <Decisions mission={mission} /> : <p>{t('l2.fail.nothing')}</p>}
          <Explain titleKey="l2.fail.note" textKey="engine.finish.blockedWhy" tilt={0} />
          <p className="l2-note fine">{t('l2.fail.tip')}</p>
          <div className="l2-actions">
            <button className="btn btn--red" onClick={() => game.restart()}>{t('common.retry')}</button>
            {canUndo && <button className="btn btn--yellow" onClick={() => game.restore()}>{t('common.restore')}</button>}
          </div>
        </div>
      </div>
    </ScreenFrame>
  )
}
