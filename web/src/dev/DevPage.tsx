// /dev: login card, then full-height chat + corrections drawer.
import { useEffect, useState, type FormEvent } from 'react'
import { useT } from '../i18n'
import { Icon } from '../game/icons'
import { ApiError, devApi, loadAuth, useDevAuth, type ChatContext } from './api'
import { Chat } from './Chat'
import { TicketList } from './Tickets'
import { getLang } from '../i18n'
import './dev.css'

function Login() {
  const t = useT()
  const [name, setName] = useState(() => { try { return localStorage.getItem('so.dev.name') ?? '' } catch { return '' } })
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true); setErr('')
    try {
      await devApi.login(name.trim(), pw)
      try { localStorage.setItem('so.dev.name', name.trim()) } catch { /* ignore */ }
    } catch (x) {
      if (x instanceof ApiError && x.status === 429) setErr(t('dv.login.locked', { min: Math.max(1, Math.ceil((x.retryAfter ?? 900) / 60)) }))
      else if (x instanceof ApiError && x.status === 401) setErr(t('dv.login.bad'))
      else setErr(t('dv.login.error'))
    } finally { setBusy(false) }
  }
  return (
    <div className="dv-login">
      <form className="surface-paper surface-paper--tape dv-login__card" onSubmit={submit}>
        <h1 className="paper-title">{t('dv.title')}</h1>
        <p className="fine">{t('dv.subtitle')}</p>
        <label className="dv-field"><span className="label">{t('dv.login.name')}</span>
          <input className="dv-input dv-input--line" value={name} onChange={e => setName(e.target.value)} maxLength={40} autoComplete="nickname" required /></label>
        <label className="dv-field"><span className="label">{t('dv.login.password')}</span>
          <input className="dv-input dv-input--line" type="password" value={pw} onChange={e => setPw(e.target.value)} autoComplete="current-password" required /></label>
        {err && <p className="dv-error" role="alert">{err}</p>}
        <div className="dv-login__actions">
          <button className="btn btn--yellow" type="submit" disabled={busy || !name.trim() || !pw}>{busy ? t('dv.login.busy') : t('dv.login.go')}</button>
          <a className="dv-link" href="/">{t('dv.backToGame')}</a>
        </div>
      </form>
    </div>
  )
}

const pageContext = (): ChatContext => ({
  screen: 'dev-page', lang: getLang(), url: location.pathname, viewport: `${window.innerWidth}x${window.innerHeight}`,
})

export default function DevPage() {
  const t = useT()
  const auth = useDevAuth()
  const [drawer, setDrawer] = useState(false)
  const [refresh, setRefresh] = useState(0)
  useEffect(() => { loadAuth() }, [])
  useEffect(() => { document.title = `${t('dv.title')} · Space Odyssey` }, [t])

  if (auth.status === 'loading') return <div className="dv-page" />
  if (auth.status === 'out') return <div className="dv-page"><Login /></div>
  return (
    <div className="dv-page">
      <header className="dv-top">
        <a className="dv-link" href="/"><Icon name="home" size={20} /> {t('dv.backToGame')}</a>
        <h1 className="dv-top__title">{t('dv.title')}</h1>
        <span className="fine dv-top__who">{auth.name}</span>
        <button type="button" className="btn btn--metal dv-top__tickets" onClick={() => setDrawer(d => !d)} aria-expanded={drawer}>
          <Icon name="clipboard" size={20} /> {t('dv.openTickets')}
        </button>
        <button type="button" className="dv-link" onClick={() => void devApi.logout()}>{t('dv.logout')}</button>
      </header>
      <div className="dv-main">
        <Chat getContext={pageContext} onTicketSaved={() => setRefresh(n => n + 1)} />
        <aside className={`dv-side surface-console ${drawer ? 'is-open' : ''}`} aria-label={t('dv.tickets')}>
          <div className="dv-side__head">
            <h2 className="paper-title" style={{ color: 'var(--white)', margin: 0 }}>{t('dv.tickets')}</h2>
            <button type="button" className="dv-link dv-side__close" onClick={() => setDrawer(false)} aria-label={t('dv.close')}><Icon name="close" size={20} /></button>
          </div>
          <TicketList refreshKey={refresh} />
        </aside>
      </div>
    </div>
  )
}
