// Dev preview: /?preview=game — the icon sticker sheet (20 / 32 / 48 px) and every shared UI piece.
// /?preview=game&only=icons shows just the sheet.
import { useMemo, type CSSProperties } from 'react'
import { createMission } from '../engine/engine'
import { game } from './store'
import { Controls, Explain, Hud, Meter, RadioLog, Squiggle } from './ui'
import { Icon, ICON_NAMES } from './icons'

const wrap: CSSProperties = { minHeight: '100%', background: '#0a1128', padding: '16px clamp(10px, 3vw, 32px) 32px' }
const grid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }
const cell: CSSProperties = { display: 'grid', gap: 6, justifyItems: 'center', padding: '10px 6px 8px', border: '2px dashed var(--divider)', borderRadius: 10 }
const sizes: CSSProperties = { display: 'flex', alignItems: 'flex-end', gap: 10, minHeight: 50 }
const h2: CSSProperties = { fontFamily: 'var(--font-title)', fontWeight: 400, fontSize: 22, margin: '26px 0 12px' }

function IconSheet({ paper = false }: { paper?: boolean }) {
  return (
    <div style={grid}>
      {ICON_NAMES.map(n => (
        <div key={n} style={{ ...cell, ...(paper ? { background: 'var(--paper)', color: 'var(--ink)', borderColor: 'var(--paper-line)' } : null) }}>
          <div style={sizes}><Icon name={n} size={20} /><Icon name={n} size={32} /><Icon name={n} size={48} /></div>
          <code style={{ fontSize: 11, fontWeight: 800 }}>{n}</code>
        </div>
      ))}
    </div>
  )
}

export default function Preview() {
  const q = new URLSearchParams(location.search)
  const only = q.get('only')
  const mission = useMemo(() => {
    const m = createMission({ structure: 'reinforced', propulsion: 'combined', power: 'nuclear', lifeSupport: 'regenerative', comms: 'redundant' }, 'easy')
    return { ...m, monthsElapsed: 54, maneuver: 31, battery: 5, radiation: 12, structure: 82 }
  }, [])
  return (
    <>
      <div style={wrap}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 className="title" style={{ fontSize: 30, flex: 1 }}>Sticker sheet: {ICON_NAMES.length} icons</h1>
          <Controls />
        </div>
        <p className="fine">20 / 32 / 48 px. Ink 2.5, flat palette fills. `go`, `undo`, `skip`, `close`, `expand` follow the text colour.</p>
        <IconSheet />
        {only !== 'icons' && (
          <>
            <h2 style={h2}>On paper, and at 16 px (detail lines hidden)</h2>
            <div className="surface-paper" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {ICON_NAMES.map(n => <Icon key={n} name={n} size={16} title={n} />)}
            </div>

            <h2 style={h2}>HUD and meters</h2>
            <Hud mission={mission} compact />
            <div className="panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, padding: 14, marginTop: 14 }}>
              <Meter icon="maneuver" tone="orange" label="ok" value={80} max={115} />
              <Meter icon="power" tone="yellow" label="warn" value={8} max={75} warnBelow={10} dangerBelow={0} />
              <Meter icon="battery" tone="green" label="danger" value={4} max={30} dangerBelow={6} />
              <Meter icon="radiation" tone="pink" label="dose" value={18} max={40} zoneFrom={15} dangerAbove={15} />
            </div>

            <h2 style={h2}>Surfaces</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 22, alignItems: 'start' }}>
              <div className="surface-console" style={{ padding: 16 }}>
                <span className="label">.surface-console / .panel</span>
                <p className="fine">Live instruments only: HUD, ship bay, mission board.</p>
                <span className="chip"><Icon name="battery" size={16} />-4</span> <span className="chip chip--yellow"><Icon name="turn" size={16} />1 turn</span>
              </div>
              <div className="surface-paper surface-paper--tape surface-paper--tilt-l">
                <h3 className="paper-title squiggled">Launch checks<Squiggle /></h3>
                <div className="surface-rows">
                  <div><Icon name="ok" size={20} /> Budget within limit</div>
                  <div><Icon name="ok" size={20} /> Mass within limit</div>
                  <div><Icon name="fail" size={20} /> Power margin is negative</div>
                </div>
                <span className="fine">.surface-paper --tape --tilt-l, with .surface-rows inside</span>
              </div>
              <div>
                <span className="label">.surface-rows (bare, on dark)</span>
                <div className="surface-rows">
                  <div><b>Gravity assist</b> <span className="fine">Use a planet to bend your path.</span></div>
                  <div><b>Light delay</b> <span className="fine">76 minutes each way at Saturn.</span></div>
                  <div><b>Redundancy</b> <span className="fine">Two of anything you cannot live without.</span></div>
                </div>
              </div>
            </div>

            <h2 style={h2}>Stamps, buttons</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
              <span className="stamp">Level 2</span>
              <span className="stamp stamp--yellow">Hint</span>
              <span className="stamp stamp--green"><Icon name="ok" size={16} />Installed</span>
              <span className="stamp stamp--red">Hard</span>
              <span className="stamp stamp--ghost">Pending</span>
              <button className="btn">Continue <Icon name="go" size={20} /></button>
              <button className="btn btn--yellow">Launch <Icon name="go" size={20} /></button>
              <button className="btn btn--orange"><Icon name="undo" size={20} /> Back</button>
              <button className="btn btn--green">OK</button>
              <button className="btn btn--red">Abort</button>
              <button className="btn btn--metal">Skip <Icon name="skip" size={20} /></button>
            </div>

            <h2 style={h2}>Field note</h2>
            <div style={{ maxWidth: 640 }}>
              <Explain title="How a Whipple shield works" textKey="hud.maneuver.hint" defaultOpen />
              <Explain textKey="hud.battery.hint" defaultOpen={false} />
            </div>

            <h2 style={h2}>Radio log</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <button className="btn btn--green" onClick={() => game.toast('ok', 'hud.structure.hint', {}, 'hud.maneuver.hint')}>ok + explanation</button>
              <button className="btn btn--red" onClick={() => game.toast('bad', 'hud.power.hint')}>bad</button>
              <button className="btn" onClick={() => game.toast('info', 'common.comingSoon')}>info</button>
            </div>
          </>
        )}
      </div>
      <RadioLog />
    </>
  )
}
