// Feedback chat: message list + composer (attach / paste / drop images). Used by /dev and by the in-game slide-over.
import { useCallback, useEffect, useRef, useState, type ClipboardEvent, type DragEvent, type KeyboardEvent } from 'react'
import { useT } from '../i18n'
import { Icon } from '../game/icons'
import { ApiError, devApi, type ChatContext, type TicketSummary } from './api'
import { prepareImage } from './images'
import { StatusStamp } from './Tickets'
import './dev.css'

interface Msg { id: number; role: 'user' | 'assistant'; text: string; images: string[]; tickets: { id: string; title: string; status?: TicketSummary['status'] }[]; error?: boolean }

const CONV_KEY = 'so.dev.conv'
const MAX_IMAGES = 4
function readConv(): string | undefined { try { return localStorage.getItem(CONV_KEY) || undefined } catch { return undefined } }
function writeConv(id: string | null) { try { if (id) localStorage.setItem(CONV_KEY, id); else localStorage.removeItem(CONV_KEY) } catch { /* ignore */ } }

export function Chat({ getContext, onTicketSaved, header }: { getContext: () => ChatContext; onTicketSaved?: () => void; header?: React.ReactNode }) {
  const t = useT()
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [convId, setConvId] = useState<string | undefined>(readConv)
  const [text, setText] = useState('')
  const [pending, setPending] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [dragging, setDragging] = useState(false)
  const seq = useRef(1)
  const listRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)

  // Restore a previous conversation (same tester, same browser).
  useEffect(() => {
    const id = readConv()
    if (!id) return
    let alive = true
    devApi.conversation(id).then(c => {
      if (!alive) return
      setMsgs(c.messages.map(m => ({
        id: seq.current++, role: m.role, text: m.text,
        images: (m.images ?? []).map(devApi.imageUrl), tickets: m.tickets ?? [],
      })))
    }).catch(() => { writeConv(null); setConvId(undefined) })
    return () => { alive = false }
  }, [])

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }) }, [msgs, busy])

  const addFiles = useCallback(async (files: File[]) => {
    const imgs = files.filter(f => f.type.startsWith('image/'))
    if (!imgs.length) return
    setNotice('')
    const room = MAX_IMAGES - pending.length
    if (imgs.length > room) setNotice(t('dv.maxImages'))
    const out: string[] = []
    for (const f of imgs.slice(0, Math.max(0, room))) {
      try { out.push(await prepareImage(f)) } catch { setNotice(t('dv.badImage')) }
    }
    if (out.length) setPending(p => [...p, ...out].slice(0, MAX_IMAGES))
  }, [pending.length, t])

  const onPaste = (e: ClipboardEvent) => {
    const files = Array.from(e.clipboardData?.files ?? [])
    if (files.some(f => f.type.startsWith('image/'))) { e.preventDefault(); void addFiles(files) }
  }
  const onDrop = (e: DragEvent) => {
    e.preventDefault(); setDragging(false)
    void addFiles(Array.from(e.dataTransfer.files))
  }

  const send = async () => {
    const body = text.trim()
    if (busy || (!body && !pending.length)) return
    const images = pending
    setMsgs(m => [...m, { id: seq.current++, role: 'user', text: body, images, tickets: [] }])
    setText(''); setPending([]); setBusy(true); setNotice('')
    try {
      const r = await devApi.chat({ conversationId: convId, text: body, images: images.map(dataUrl => ({ dataUrl })), context: getContext() })
      setConvId(r.conversationId); writeConv(r.conversationId)
      setMsgs(m => [...m, {
        id: seq.current++, role: 'assistant', text: r.reply, images: [],
        tickets: (r.tickets ?? (r.ticket ? [r.ticket] : [])).map(x => ({ id: x.id, title: x.title, status: x.status })),
      }])
      if (r.ticket || r.tickets?.length) onTicketSaved?.()
    } catch (e) {
      const msg = e instanceof ApiError && e.status !== 0 && e.status !== 401 ? e.message : t('dv.error')
      setMsgs(m => [...m, { id: seq.current++, role: 'assistant', text: msg, images: [], tickets: [], error: true }])
    } finally {
      setBusy(false)
      taRef.current?.focus()
    }
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send() }
  }
  const newConv = () => { setMsgs([]); setConvId(undefined); writeConv(null); setPending([]); setText(''); setNotice('') }

  return (
    <div className={`dv-chat ${dragging ? 'is-drag' : ''}`}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={e => { if (e.currentTarget === e.target) setDragging(false) }}
      onDrop={onDrop}>
      <div className="dv-chat__bar">
        {header ?? <span />}
        <button type="button" className="dv-link" onClick={newConv} disabled={busy}>{t('dv.newConv')}</button>
      </div>
      <div className="dv-list" ref={listRef} role="log" aria-live="polite">
        {msgs.length === 0 && <div className="dv-bubble dv-bubble--bot"><span className="dv-who">{t('dv.assistant')}</span>{t('dv.welcome')}</div>}
        {msgs.map(m => (
          <div key={m.id} className={`dv-bubble ${m.role === 'user' ? 'dv-bubble--me' : 'dv-bubble--bot'} ${m.error ? 'is-error' : ''}`}>
            <span className="dv-who">{m.role === 'user' ? t('dv.you') : t('dv.assistant')}</span>
            {m.text && <div className="dv-text">{m.text}</div>}
            {m.images.length > 0 && (
              <div className="dv-thumbs">
                {m.images.map((src, i) => <a key={i} href={src} target="_blank" rel="noreferrer"><img src={src} alt={t('dv.imageAlt')} /></a>)}
              </div>
            )}
            {m.tickets.map(tk => (
              <div key={tk.id} className="dv-ticket surface-paper">
                <Icon name="clipboard" size={22} />
                <div className="dv-ticket__body"><span className="label">{t('dv.ticketSaved')} · {tk.id}</span><strong>{tk.title}</strong></div>
                <StatusStamp status={tk.status ?? 'open'} />
              </div>
            ))}
          </div>
        ))}
        {busy && <div className="dv-bubble dv-bubble--bot dv-typing" aria-label={t('dv.sending')}><span /><span /><span /></div>}
      </div>

      <div className="dv-composer">
        {pending.length > 0 && (
          <div className="dv-chips">
            {pending.map((src, i) => (
              <span key={i} className="dv-chip">
                <img src={src} alt={t('dv.imageAlt')} />
                <button type="button" aria-label={t('dv.removeImage')} onClick={() => setPending(p => p.filter((_, j) => j !== i))}><Icon name="close" size={16} /></button>
              </span>
            ))}
          </div>
        )}
        {notice && <div className="dv-notice" role="status">{notice}</div>}
        <div className="dv-row">
          <button type="button" className="btn btn--metal dv-attach" title={t('dv.attach')} aria-label={t('dv.attach')} onClick={() => fileRef.current?.click()} disabled={busy}>
            <Icon name="magnifier" size={22} />
          </button>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden
            onChange={e => { void addFiles(Array.from(e.target.files ?? [])); e.target.value = '' }} />
          <textarea ref={taRef} className="dv-input" rows={2} value={text} placeholder={t('dv.placeholder')} aria-label={t('dv.placeholder')}
            onChange={e => setText(e.target.value)} onKeyDown={onKey} onPaste={onPaste} />
          <button type="button" className="btn btn--yellow dv-send" onClick={() => void send()} disabled={busy || (!text.trim() && !pending.length)}>
            {busy ? t('dv.sending') : <>{t('dv.send')} <Icon name="go" size={20} /></>}
          </button>
        </div>
      </div>
    </div>
  )
}
