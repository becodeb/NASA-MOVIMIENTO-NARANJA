// In-game "Report a fix" button + slide-over chat. Renders nothing unless GET /api/dev/me says authed.
import { lazy, Suspense, useEffect, useState } from 'react'
import { useT, getLang } from '../i18n'
import { Icon } from '../game/icons'
import { getGame } from '../game/store'
import { loadAuth, useDevAuth, type ChatContext } from './api'
import './dev.css'

const Chat = lazy(() => import('./Chat').then(m => ({ default: m.Chat })))

function gameContext(): ChatContext {
  const g = getGame()
  const m = g.mission
  let mission: string | undefined
  if (m) {
    mission = [
      `nivel ${m.level}`, `fase ${m.phase}`, `mes ${m.monthsElapsed}`,
      `maniobra ${Math.round(m.maneuver)}`, `vital ${Math.round(m.vital)}`, `estructura ${Math.round(m.structure)}`,
      m.activeEmergency ? `emergencia ${m.activeEmergency}` : '',
    ].filter(Boolean).join(', ')
  }
  return {
    screen: g.screen, lang: getLang(), difficulty: g.difficulty, mission,
    url: location.pathname + location.search, viewport: `${window.innerWidth}x${window.innerHeight}`,
  }
}

export function DevFab() {
  const t = useT()
  const auth = useDevAuth()
  const [open, setOpen] = useState(false)
  useEffect(() => { loadAuth() }, [])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
  if (auth.status !== 'in') return null
  return (
    <>
      {!open && (
        <button type="button" className="dv-fab" onClick={() => setOpen(true)} title={t('dv.fab.title')} aria-label={t('dv.fab.title')}>
          <Icon name="field-note" size={20} /><span>{t('dv.fab')}</span>
        </button>
      )}
      {open && (
        <div className="dv-slide" role="dialog" aria-label={t('dv.fab.title')}>
          <div className="dv-slide__panel surface-console">
            <Suspense fallback={null}>
              <Chat getContext={gameContext}
                header={<button type="button" className="dv-link dv-slide__x" onClick={() => setOpen(false)} aria-label={t('dv.close')}><Icon name="close" size={20} /> {t('dv.close')}</button>} />
            </Suspense>
          </div>
        </div>
      )}
    </>
  )
}
