// "Mission board" side panel (docs/VISUAL.md §12): science, power loads, transmit, repairs and spares.
import { useT } from '../../i18n'
import { Icon, Squiggle, type IconName } from '../../game/ui'
import { commsMode, loadTotal, powerMargin } from '../../engine/engine'
import { COMPONENTS, INVESTIGATION_ORDER, LOADS } from '../../engine/data'
import type { InvestigationId, LoadId, MissionState, SpareId, SystemId } from '../../engine/types'

const SCI_ICON: Record<InvestigationId, IconName> = { atmosphere: 'atmosphere', rings: 'rings', magnetosphere: 'magnetosphere', moons: 'moons' }
const LOAD_ORDER: LoadId[] = ['science', 'commsRedundant', 'electricPropulsion', 'emergencyHeating']
const LOAD_ICON: Record<LoadId, IconName> = { science: 'science', commsRedundant: 'antenna-twin', electricPropulsion: 'ion-thruster', emergencyHeating: 'heater' }
const REPAIRS: { system: SystemId; spare: SpareId; icon: IconName }[] = [
  { system: 'structure', spare: 'structural', icon: 'hull' },
  { system: 'lifeSupport', spare: 'lifeSupport', icon: 'life-support' },
  { system: 'antennaMain', spare: 'electronic', icon: 'antenna' },
  { system: 'instruments', spare: 'electronic', icon: 'science' },
  { system: 'power', spare: 'electronic', icon: 'power' },
]

export interface BoardProps {
  mission: MissionState
  locked: boolean
  hints: boolean
  onRun: (id: InvestigationId) => void
  onTransmit: () => void
  onLoad: (load: LoadId, on: boolean) => void
  onRepair: (system: SystemId, spare: SpareId) => void
}

export function Board({ mission: m, locked, hints, onRun, onTransmit, onLoad, onRepair }: BoardProps) {
  const t = useT()
  const margin = powerMargin(m)
  const mode = commsMode(m)
  const pendingTx = INVESTIGATION_ORDER.some((i) => m.science.collected[i] && !m.science.transmitted[i])
  const installed = (l: LoadId) =>
    l === 'commsRedundant' ? m.config.comms === 'redundant' : l === 'electricPropulsion' ? COMPONENTS.propulsion[m.config.propulsion].electric : true

  return (
    <aside className="l2-board panel" aria-label={t('l2.board.title')}>
      <h2 className="l2-board__title title">{t('l2.board.title')}</h2>
      {locked && <p className="l2-board__locked"><Icon name="warning" size={20} /> {t('l2.board.locked')}</p>}

      <section>
        <h3 className="squiggled">{t('l2.board.science')}<Squiggle tone="yellow" /></h3>
        {hints && <p className="l2-note fine">{t('l2.board.scienceNote')}</p>}
        <ul className="l2-sci surface-rows">
          {INVESTIGATION_ORDER.map((id) => {
            const got = m.science.collected[id]
            const sent = m.science.transmitted[id]
            return (
              <li key={id} className={`l2-sci__row ${got ? 'is-done' : ''}`}>
                <span className="l2-sci__icon" aria-hidden><Icon name={SCI_ICON[id]} size={30} /></span>
                <div className="l2-sci__text">
                  <b>{t(`l2.sci.${id}`)}</b>
                  <small className="fine">{t(`l2.sci.${id}.instr`)}</small>
                  <small className="fine">{t('l2.sci.need', { n: LOADS.science })}</small>
                </div>
                {got ? (
                  <span className={`chip ${sent ? 'chip--green' : 'chip--yellow'}`}><Icon name={sent ? 'antenna' : 'data-stored'} size={18} />{sent ? t('l2.sci.transmitted') : t('l2.sci.collected')}</span>
                ) : (
                  <button className="btn btn--metal l2-small" disabled={locked} onClick={() => onRun(id)} aria-label={`${t('l2.sci.run')}: ${t(`l2.sci.${id}`)}`}>
                    {t('l2.sci.run')}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
        <button className={`btn l2-transmit ${pendingTx ? 'l2-transmit--live' : 'l2-transmit--idle'}`} disabled={locked || !pendingTx} onClick={onTransmit}>
          <Icon name="antenna" size={22} /> {t('l2.board.transmit')}
        </button>
        <p className="l2-note fine">{t('l2.board.link', { mode: t(`l2.link.${mode}`) })}</p>
      </section>

      <section>
        <h3 className="squiggled">{t('l2.board.loads')}<Squiggle tone="yellow" /></h3>
        <div className={`l2-margin ${margin < 0 ? 'is-neg' : ''}`} role="status">
          <Icon name="power" size={20} /> {t('l2.board.margin', { margin, gen: m.powerGeneration, used: loadTotal(m) })}
        </div>
        {margin < 0 && <p className="l2-note l2-note--warn fine">{t('l2.board.deficit')}</p>}
        <ul className="l2-loads">
          {LOAD_ORDER.map((l) => {
            const on = m.activeLoads[l]
            const ok = installed(l)
            return (
              <li key={l}>
                <button
                  className={`l2-toggle ${on ? 'is-on' : ''}`}
                  role="switch"
                  aria-checked={on}
                  disabled={!ok}
                  onClick={() => onLoad(l, !on)}
                >
                  <Icon name={LOAD_ICON[l]} size={24} />
                  <span className="l2-toggle__name">{t(`l2.load.${l}`)} <small className="tnum">+{LOADS[l]}</small></span>
                  <span className="l2-toggle__state">{ok ? (on ? t('l2.load.on') : t('l2.load.off')) : t('l2.load.notInstalled')}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <section>
        <h3 className="squiggled">{t('l2.board.repairs')}<Squiggle tone="yellow" /></h3>
        <div className="l2-spares">
          {(['structural', 'lifeSupport', 'electronic'] as SpareId[]).map((s) => (
            <span key={s} className={`chip ${m.spares[s] > 0 ? 'l2-chip--have' : 'l2-chip--dim'}`}><Icon name="spare-kit" size={18} />{t(`l2.spares.${s}`)}: <span className="tnum">{m.spares[s]}</span></span>
          ))}
        </div>
        <ul className="l2-repairs surface-rows">
          {REPAIRS.map((r) => {
            const st = r.system === 'power' && m.faults.powerFault === 'persistent' ? 'degraded' : m.systems[r.system]
            const bad = st === 'failed' || st === 'degraded' || (r.system === 'structure' && (m.structure < 100 || m.faults.leak === 'open' || m.faults.leak === 'contained'))
            return (
              <li key={r.system} className={`l2-repairs__row ${bad ? 'is-bad' : ''}`}>
                <Icon name={r.icon} size={26} />
                <span className="l2-repairs__name">
                  {t(`l2.repair.${r.system}`)}
                  <small className="fine"> {r.system === 'structure' ? `${m.structure}/100` : t(`l2.sys.${st}`)}</small>
                </span>
                <button className="btn btn--metal l2-small" disabled={locked} onClick={() => onRepair(r.system, r.spare)}>
                  {t('l2.repair.btn')}
                </button>
              </li>
            )
          })}
        </ul>
      </section>
    </aside>
  )
}
