// Saved-corrections list with status stamps.
import { useEffect, useState } from 'react'
import { useT } from '../i18n'
import { devApi, type TicketSummary } from './api'

const STAMP: Record<TicketSummary['status'], string> = { open: 'stamp--yellow', in_progress: 'stamp--orange', done: 'stamp--green', wontfix: 'stamp--ghost' }

export function StatusStamp({ status }: { status: TicketSummary['status'] }) {
  const t = useT()
  return <span className={`stamp stamp--flat ${STAMP[status] ?? ''}`}>{t(`dv.status.${status}`)}</span>
}

export function TicketList({ refreshKey }: { refreshKey: number }) {
  const t = useT()
  const [items, setItems] = useState<TicketSummary[] | null>(null)
  useEffect(() => {
    let alive = true
    devApi.tickets().then(r => { if (alive) setItems(r) }).catch(() => { if (alive) setItems([]) })
    return () => { alive = false }
  }, [refreshKey])
  if (items === null) return null
  if (!items.length) return <p className="fine">{t('dv.tickets.empty')}</p>
  return (
    <ul className="dv-tickets">
      {items.map(x => (
        <li key={x.id} className="surface-paper">
          <div className="dv-tickets__top"><span className="label">{x.id} · {x.type} · {x.screen}</span><StatusStamp status={x.status} /></div>
          <strong>{x.title}</strong>
          <span className="fine dv-tickets__meta">{x.author} · {x.priority}</span>
        </li>
      ))}
    </ul>
  )
}
