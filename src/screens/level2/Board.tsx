// "Mission board" side panel (docs/VISUAL.md §12): science, power loads, transmit, repairs and spares.
import { useT } from '../../i18n'
import { commsMode, loadTotal, powerMargin } from '../../engine/engine'
import { COMPONENTS, INVESTIGATION_ORDER, LOADS } from '../../engine/data'
import type { InvestigationId, LoadId, MissionState, SpareId, SystemId } from '../../engine/types'

const SCI_ICON: Record<InvestigationId, string> = { atmosphere: '🌪️', rings: '💍', magnetosphere: '🧲', moons: '🌕' }
const LOAD_ORDER: LoadId[] = ['science', 'commsRedundant', 'electricPropulsion', 'emergencyHeating']
const LOAD_ICON: Record<LoadId, string> = { science: '🔬', commsRedundant: '📡', electricPropulsion: '✨', emergencyHeating: '🔥' }
const REPAIRS: { system: SystemId; spare: SpareId; icon: string }[] = [
  { system: 'structure', spare: 'structural', icon: '🛡️' },
  { system: 'lifeSupport', spare: 'lifeSupport', icon: '🫁' },
  { system: 'antennaMain', spare: 'electronic', icon: '📡' },
  { system: 'instruments', spare: 'electronic', icon: '🔬' },
  { system: 'power', spare: 'electronic', icon: '⚡' },
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
      {locked && <p className="l2-board__locked">⚠ {t('l2.board.locked')}</p>}

      <section>
        <h3>{t('l2.board.science')}</h3>
        {hints && <p className="l2-note">{t('l2.board.scienceNote')}</p>}
        <ul className="l2-sci">
          {INVESTIGATION_ORDER.map((id) => {
            const got = m.science.collected[id]
            const sent = m.science.transmitted[id]
            return (
              <li key={id} className={`l2-sci__row ${got ? 'is-done' : ''}`}>
                <span className="l2-sci__icon" aria-hidden>{SCI_ICON[id]}</span>
                <div className="l2-sci__text">
                  <b>{t(`l2.sci.${id}`)}</b>
                  <small>{t(`l2.sci.${id}.instr`)} · {t('l2.sci.need', { n: LOADS.science })}</small>
                </div>
                {got ? (
                  <span className={`l2-chip ${sent ? 'l2-chip--green' : 'l2-chip--yellow'}`}>{sent ? `📡 ${t('l2.sci.transmitted')}` : `💾 ${t('l2.sci.collected')}`}</span>
                ) : (
                  <button className="btn btn--metal l2-small" disabled={locked} onClick={() => onRun(id)} aria-label={`${t('l2.sci.run')}: ${t(`l2.sci.${id}`)}`}>
                    {t('l2.sci.run')}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
        <button className="btn btn--yellow l2-transmit" disabled={locked || !pendingTx} onClick={onTransmit}>
          📡 {t('l2.board.transmit')}
        </button>
        <p className="l2-note">{t('l2.board.link', { mode: t(`l2.link.${mode}`) })}</p>
      </section>

      <section>
        <h3>{t('l2.board.loads')}</h3>
        <div className={`l2-margin ${margin < 0 ? 'is-neg' : ''}`} role="status">
          ⚡ {t('l2.board.margin', { margin, gen: m.powerGeneration, used: loadTotal(m) })}
        </div>
        {margin < 0 && <p className="l2-note l2-note--warn">{t('l2.board.deficit')}</p>}
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
                  <span aria-hidden>{LOAD_ICON[l]}</span>
                  <span className="l2-toggle__name">{t(`l2.load.${l}`)} <small>+{LOADS[l]}</small></span>
                  <span className="l2-toggle__state">{ok ? (on ? t('l2.load.on') : t('l2.load.off')) : t('l2.load.notInstalled')}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <section>
        <h3>{t('l2.board.repairs')}</h3>
        <div className="l2-spares">
          {(['structural', 'lifeSupport', 'electronic'] as SpareId[]).map((s) => (
            <span key={s} className={`l2-chip ${m.spares[s] > 0 ? 'l2-chip--teal' : 'l2-chip--dim'}`}>🧰 {t(`l2.spares.${s}`)}: {m.spares[s]}</span>
          ))}
        </div>
        <ul className="l2-repairs">
          {REPAIRS.map((r) => {
            const st = r.system === 'power' && m.faults.powerFault === 'persistent' ? 'degraded' : m.systems[r.system]
            const bad = st === 'failed' || st === 'degraded' || (r.system === 'structure' && (m.structure < 100 || m.faults.leak === 'open' || m.faults.leak === 'contained'))
            return (
              <li key={r.system} className={`l2-repairs__row ${bad ? 'is-bad' : ''}`}>
                <span aria-hidden>{r.icon}</span>
                <span className="l2-repairs__name">
                  {t(`l2.repair.${r.system}`)}
                  <small> {r.system === 'structure' ? `${m.structure}/100` : t(`l2.sys.${st}`)}</small>
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
