// Space Odyssey server: static SPA (same rules as the old nginx.conf) + dev-mode feedback API.
// Secrets (ANTHROPIC_API_KEY, DEV_PASSWORD) are read from process.env only. Never logged.
import http from 'node:http'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'
import Anthropic from '@anthropic-ai/sdk'
import { SYSTEM_PROMPT, SAVE_TICKET_TOOL } from './prompt.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT || 80)
const DIST = path.resolve(process.env.DIST_DIR || path.join(here, '..', 'dist'))
const DATA = path.resolve(process.env.DATA_DIR || '/data')
const FB = path.join(DATA, 'feedback')
const DIRS = { images: path.join(FB, 'images'), convs: path.join(FB, 'conversations') }
const TICKETS_FILE = path.join(FB, 'tickets.json')
const SESSIONS_FILE = path.join(FB, 'sessions.json')
const MODEL = 'claude-haiku-5-5'
const BODY_LIMIT = 27 * 1024 * 1024
const MAX_IMAGES = 4
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const SESSION_MS = 14 * 24 * 3600 * 1000
const STATUSES = ['open', 'in_progress', 'done', 'wontfix']
const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' }
const MIME_BY_EXT = Object.fromEntries(Object.entries(EXT).map(([m, e]) => [e, m]))

for (const d of Object.values(DIRS)) fs.mkdirSync(d, { recursive: true })

// ---------------------------------------------------------------- small utils
const sha = s => crypto.createHash('sha256').update(s).digest()
const shaHex = s => sha(s).toString('hex')
const safeEq = (a, b) => crypto.timingSafeEqual(sha(String(a)), sha(String(b)))
const rid = n => crypto.randomBytes(n).toString('hex')
const now = () => new Date().toISOString()
const str = (v, max) => (typeof v === 'string' ? v : '').slice(0, max)

async function readJson(file, fallback) {
  try { return JSON.parse(await fsp.readFile(file, 'utf8')) } catch { return fallback }
}
async function writeJsonAtomic(file, data) {
  const tmp = `${file}.${process.pid}.${rid(4)}.tmp`
  await fsp.writeFile(tmp, JSON.stringify(data, null, 2))
  await fsp.rename(tmp, file)
}
/** Serialises async work per key (file) so read-modify-write never interleaves. */
const queues = new Map()
function locked(key, fn) {
  const prev = queues.get(key) || Promise.resolve()
  const next = prev.then(fn, fn)
  queues.set(key, next.catch(() => {}))
  return next
}

function send(res, status, body, headers = {}) {
  const isObj = body !== null && typeof body === 'object' && !Buffer.isBuffer(body)
  const payload = isObj ? JSON.stringify(body) : body ?? ''
  res.writeHead(status, {
    'Content-Type': isObj ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  })
  res.end(payload)
}

function clientIp(req) {
  const cf = req.headers['cf-connecting-ip']
  if (cf) return String(cf).trim()
  const xff = req.headers['x-forwarded-for']
  if (xff) return String(xff).split(',')[0].trim()
  return req.socket.remoteAddress || 'unknown'
}
const isHttps = req => req.socket.encrypted || String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https'
function baseUrl(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost'
  return `${isHttps(req) ? 'https' : 'http'}://${String(host).split(',')[0].trim()}`
}
function parseCookies(req) {
  const out = {}
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=')
    if (i > 0) {
      try { out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()) } catch { /* skip bad cookie */ }
    }
  }
  return out
}

class HttpError extends Error {
  constructor(status, message, extra = {}) { super(message); this.status = status; this.extra = extra }
}
async function readBody(req) {
  const declared = Number(req.headers['content-length'] || 0)
  if (declared > BODY_LIMIT) throw new HttpError(413, 'Body too large')
  const chunks = []
  let size = 0
  for await (const c of req) {
    size += c.length
    if (size > BODY_LIMIT) throw new HttpError(413, 'Body too large')
    chunks.push(c)
  }
  if (!size) return {}
  try {
    const v = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    if (v === null || typeof v !== 'object' || Array.isArray(v)) throw new Error('shape')
    return v
  } catch { throw new HttpError(400, 'Invalid JSON') }
}

// ---------------------------------------------------------------- sessions
const sessions = await readJson(SESSIONS_FILE, {}) // sha256(token) -> { name, exp }
for (const [k, v] of Object.entries(sessions)) if (!v || v.exp < Date.now()) delete sessions[k]
const saveSessions = () => locked(SESSIONS_FILE, () => writeJsonAtomic(SESSIONS_FILE, sessions))

function sessionFrom(req) {
  const tok = parseCookies(req).so_dev
  if (!tok || tok.length !== 64) return null
  const key = shaHex(tok)
  const s = sessions[key]
  if (!s) return null
  if (s.exp < Date.now()) { delete sessions[key]; saveSessions().catch(() => {}); return null }
  return { key, name: s.name }
}
function devPasswordOk(req) {
  const pw = process.env.DEV_PASSWORD
  const h = req.headers['x-dev-password']
  return Boolean(pw && typeof h === 'string' && h && safeEq(h, pw))
}
/** Tester session (cookie) or developer header. */
function authAny(req) {
  const s = sessionFrom(req)
  if (s) return { kind: 'session', ...s }
  if (devPasswordOk(req)) return { kind: 'dev', name: 'developer', key: 'dev' }
  return null
}

// ---------------------------------------------------------------- rate limits (in memory)
const loginFails = new Map() // ip -> [timestamps]
const LOGIN_WINDOW = 15 * 60 * 1000
function loginState(ip) {
  const t = Date.now()
  const arr = (loginFails.get(ip) || []).filter(x => t - x < LOGIN_WINDOW)
  loginFails.set(ip, arr)
  return arr
}
const chatHits = new Map() // session key -> [timestamps]
let dayBucket = { day: '', n: 0 }
function chatLimit(sessionKey) {
  const t = Date.now()
  const arr = (chatHits.get(sessionKey) || []).filter(x => t - x < 3600_000)
  const day = new Date().toISOString().slice(0, 10)
  if (dayBucket.day !== day) dayBucket = { day, n: 0 }
  if (arr.length >= 40) return { ok: false, retry: Math.ceil((3600_000 - (t - arr[0])) / 1000), msg: 'Mandaste muchos mensajes seguidos. Esperá un rato y seguimos. / Too many messages, please wait a bit.' }
  if (dayBucket.n >= 600) return { ok: false, retry: 3600, msg: 'Se alcanzó el límite diario del asistente. Probá mañana. / Daily limit reached, try tomorrow.' }
  arr.push(t); chatHits.set(sessionKey, arr); dayBucket.n++
  return { ok: true }
}
setInterval(() => {
  const t = Date.now()
  for (const [k, v] of loginFails) if (!v.some(x => t - x < LOGIN_WINDOW)) loginFails.delete(k)
  for (const [k, v] of chatHits) if (!v.some(x => t - x < 3600_000)) chatHits.delete(k)
}, 600_000).unref()

// ---------------------------------------------------------------- images
function parseImage(img) {
  const m = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=\s]+)$/.exec(typeof img?.dataUrl === 'string' ? img.dataUrl : '')
  if (!m) throw new HttpError(400, 'Formato de imagen no permitido (png, jpeg, webp o gif).')
  const buf = Buffer.from(m[2], 'base64')
  if (buf.length > MAX_IMAGE_BYTES) throw new HttpError(413, 'Cada imagen puede pesar hasta 5 MB.')
  const ok = m[1] === 'image/png' ? buf.subarray(1, 4).toString() === 'PNG'
    : m[1] === 'image/jpeg' ? buf[0] === 0xff && buf[1] === 0xd8
    : m[1] === 'image/gif' ? buf.subarray(0, 3).toString() === 'GIF'
    : buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP'
  if (!buf.length || !ok) throw new HttpError(400, 'La imagen está dañada o no coincide con su formato.')
  return { mime: m[1], buf }
}
async function findImage(id) {
  if (!/^[a-f0-9]{16}$/.test(id)) return null
  for (const ext of Object.values(EXT)) {
    const f = path.join(DIRS.images, `${id}.${ext}`)
    try { return { file: f, mime: MIME_BY_EXT[ext], buf: await fsp.readFile(f) } } catch { /* next */ }
  }
  return null
}

// ---------------------------------------------------------------- tickets
const TYPES = ['bug', 'design', 'text', 'idea', 'science']
const PRIOS = ['alta', 'media', 'baja']
const strList = (v, n, m) => (Array.isArray(v) ? v : []).filter(x => typeof x === 'string').slice(0, n).map(x => x.slice(0, m))

async function saveTicket(input, conv) {
  const imgIds = new Set(conv.messages.flatMap(m => m.images || []))
  return locked(TICKETS_FILE, async () => {
    const list = await readJson(TICKETS_FILE, [])
    const n = list.reduce((mx, t) => Math.max(mx, Number(String(t.id).slice(2)) || 0), 0) + 1
    const ticket = {
      id: `T-${String(n).padStart(3, '0')}`,
      title: str(input.title, 160) || 'Sin título',
      type: TYPES.includes(input.type) ? input.type : 'bug',
      priority: PRIOS.includes(input.priority) ? input.priority : 'media',
      screen: str(input.screen, 60) || 'global',
      element: str(input.element, 200),
      description: str(input.description, 4000),
      expected: str(input.expected, 2000),
      steps_to_reproduce: str(input.steps_to_reproduce, 2000),
      language: str(input.language, 40),
      device: str(input.device, 120),
      image_ids: strList(input.image_ids, 8, 40).filter(i => imgIds.has(i)),
      acceptance_criteria: strList(input.acceptance_criteria, 8, 400),
      status: 'open',
      notes: [],
      author: conv.author,
      conversationId: conv.id,
      context: conv.context || null,
      createdAt: now(),
      updatedAt: now(),
    }
    list.push(ticket)
    await writeJsonAtomic(TICKETS_FILE, list)
    return ticket
  })
}
const ticketSummary = t => ({
  id: t.id, title: t.title, type: t.type, priority: t.priority, screen: t.screen,
  status: t.status, author: t.author, createdAt: t.createdAt, imageCount: t.image_ids.length,
})

// ---------------------------------------------------------------- conversations + Haiku
let client = null
const getClient = () => (client ??= new Anthropic()) // reads ANTHROPIC_API_KEY from env

const convFile = id => path.join(DIRS.convs, `${id}.json`)
const loadConv = id => (/^[a-f0-9]{16}$/.test(id) ? readJson(convFile(id), null) : Promise.resolve(null))

function ctxLine(ctx) {
  if (!ctx) return ''
  const bits = []
  if (ctx.screen) bits.push(`pantalla=${ctx.screen}`)
  if (ctx.lang) bits.push(`idioma=${ctx.lang}`)
  if (ctx.difficulty) bits.push(`dificultad=${ctx.difficulty}`)
  if (ctx.viewport) bits.push(`viewport=${ctx.viewport}`)
  if (ctx.url) bits.push(`url=${ctx.url}`)
  if (ctx.mission) bits.push(`misión: ${ctx.mission}`)
  return bits.length ? `[Contexto automático: ${bits.join('; ')}]` : ''
}
function cleanContext(c) {
  if (!c || typeof c !== 'object') return null
  return {
    screen: str(c.screen, 40), lang: str(c.lang, 12), difficulty: str(c.difficulty, 12),
    url: str(c.url, 300), viewport: str(c.viewport, 40), mission: str(c.mission, 300),
  }
}

async function buildMessages(conv) {
  const out = []
  const withImages = conv.messages.filter(m => m.role === 'user' && m.images?.length).slice(-6)
  for (const m of conv.messages) {
    if (m.role === 'assistant') {
      let text = m.text || '(sin texto)'
      if (m.tickets?.length) text += `\n[Tickets guardados: ${m.tickets.map(t => `${t.id} "${t.title}"`).join(', ')}]`
      out.push({ role: 'assistant', content: text })
      continue
    }
    const content = []
    const ids = m.images || []
    for (const id of ids) {
      if (!withImages.includes(m)) continue
      const img = await findImage(id)
      if (img) content.push({ type: 'image', source: { type: 'base64', media_type: img.mime, data: img.buf.toString('base64') } })
    }
    const head = [ctxLine(m.context), ids.length ? `[Imágenes adjuntas: ${ids.join(', ')}]` : ''].filter(Boolean).join('\n')
    content.push({ type: 'text', text: `${head ? head + '\n' : ''}${m.text || '(sin texto)'}` })
    out.push({ role: 'user', content })
  }
  return out
}

async function askHaiku(conv) {
  const messages = await buildMessages(conv)
  const savedTickets = []
  let reply = ''
  for (let i = 0; i < 4; i++) {
    let resp
    try {
      resp = await getClient().messages.create({
        model: MODEL,
        max_tokens: 1500,
        output_config: { effort: 'low' },
        system: SYSTEM_PROMPT,
        tools: [SAVE_TICKET_TOOL],
        tool_choice: { type: 'auto' },
        messages,
      })
    } catch (err) {
      if (i === 0) throw err
      console.error('haiku follow-up failed:', err?.status || err?.name)
      break
    }
    for (const b of resp.content) if (b.type === 'text') reply += (reply ? '\n' : '') + b.text
    if (resp.stop_reason === 'refusal') {
      return { reply: reply || 'No puedo ayudar con ese pedido. Contame otra corrección del juego y la anotamos.', tickets: savedTickets }
    }
    const uses = resp.content.filter(b => b.type === 'tool_use')
    if (!uses.length || resp.stop_reason !== 'tool_use') {
      if (resp.stop_reason === 'max_tokens' && !reply) reply = 'Me quedé corto de espacio, ¿me lo repetís más breve?'
      break
    }
    messages.push({ role: 'assistant', content: resp.content })
    const results = []
    for (const u of uses) {
      if (u.name !== 'save_ticket' || !u.input || typeof u.input !== 'object') {
        results.push({ type: 'tool_result', tool_use_id: u.id, is_error: true, content: 'Herramienta o parámetros inválidos.' })
        continue
      }
      try {
        const t = await saveTicket(u.input, conv)
        savedTickets.push(t)
        results.push({ type: 'tool_result', tool_use_id: u.id, content: `Ticket ${t.id} guardado.` })
      } catch (e) {
        console.error('save ticket failed:', e?.message)
        results.push({ type: 'tool_result', tool_use_id: u.id, is_error: true, content: 'No se pudo guardar el ticket.' })
      }
    }
    messages.push({ role: 'user', content: results })
    reply = '' // the text after the tool result is the one the tester should see
  }
  if (!reply.trim()) {
    reply = savedTickets.length
      ? `Listo, guardé: ${savedTickets.map(t => `${t.id} ${t.title}`).join('; ')}. ¿Seguimos con la próxima corrección?`
      : 'No pude armar una respuesta. ¿Me lo contás de nuevo?'
  }
  return { reply: reply.trim(), tickets: savedTickets }
}

async function handleChat(req, res, auth) {
  const body = await readBody(req)
  const text = str(body.text, 6000).trim()
  const rawImages = Array.isArray(body.images) ? body.images : []
  if (rawImages.length > MAX_IMAGES) throw new HttpError(400, 'Máximo 4 imágenes por mensaje.')
  if (!text && !rawImages.length) throw new HttpError(400, 'Mensaje vacío.')
  const parsed = rawImages.map(parseImage)

  const lim = chatLimit(auth.key)
  if (!lim.ok) throw new HttpError(429, lim.msg, { retryAfter: lim.retry })

  let conv
  if (body.conversationId) {
    conv = await loadConv(String(body.conversationId))
    if (!conv) throw new HttpError(404, 'Conversación no encontrada.')
    if (conv.author !== auth.name) throw new HttpError(403, 'Esa conversación es de otra persona.')
  } else {
    conv = { id: rid(8), author: auth.name, createdAt: now(), updatedAt: now(), context: null, messages: [] }
  }
  const context = cleanContext(body.context)
  if (context) conv.context = context

  const imageIds = []
  for (const p of parsed) {
    const id = rid(8)
    await fsp.writeFile(path.join(DIRS.images, `${id}.${EXT[p.mime]}`), p.buf)
    imageIds.push(id)
  }
  conv.messages.push({ role: 'user', text, images: imageIds, context, at: now() })

  let result
  try {
    result = await locked(convFile(conv.id), () => askHaiku(conv))
  } catch (err) {
    for (const id of imageIds) { const im = await findImage(id); if (im) fsp.unlink(im.file).catch(() => {}) }
    console.error('haiku error:', err?.status || err?.name || 'unknown')
    if (err?.status === 429) throw new HttpError(503, 'El asistente está saturado, probá de nuevo en un minuto.')
    throw new HttpError(502, 'No pude hablar con el asistente. Probá de nuevo en un momento.')
  }
  conv.messages.push({
    role: 'assistant', text: result.reply, at: now(),
    tickets: result.tickets.map(t => ({ id: t.id, title: t.title })),
  })
  conv.updatedAt = now()
  await locked(convFile(conv.id), () => writeJsonAtomic(convFile(conv.id), conv))
  const ticket = result.tickets.length ? ticketSummary(result.tickets.at(-1)) : undefined
  send(res, 200, {
    conversationId: conv.id, reply: result.reply, imageIds,
    ticket, tickets: result.tickets.map(ticketSummary),
  })
}

// ---------------------------------------------------------------- dev API router
async function handleApi(req, res, url) {
  const p = url.pathname
  const m = req.method

  if (p === '/api/dev/login' && m === 'POST') {
    const ip = clientIp(req)
    const fails = loginState(ip)
    if (fails.length >= 5) {
      const retry = Math.ceil((LOGIN_WINDOW - (Date.now() - fails[0])) / 1000)
      return send(res, 429, { error: 'Demasiados intentos. Esperá unos minutos.', retryAfter: retry }, { 'Retry-After': String(retry) })
    }
    const body = await readBody(req)
    const name = str(body.name, 40).trim()
    const pw = process.env.DEV_PASSWORD
    if (!pw || !name || typeof body.password !== 'string' || !safeEq(body.password, pw)) {
      fails.push(Date.now())
      return send(res, 401, { error: 'Contraseña o nombre incorrectos.' })
    }
    const token = rid(32)
    sessions[shaHex(token)] = { name, exp: Date.now() + SESSION_MS }
    await saveSessions()
    const cookie = [`so_dev=${token}`, 'Path=/', 'HttpOnly', 'SameSite=Strict', `Max-Age=${SESSION_MS / 1000}`]
    if (isHttps(req)) cookie.push('Secure')
    return send(res, 200, { authed: true, name }, { 'Set-Cookie': cookie.join('; ') })
  }
  if (p === '/api/dev/me' && m === 'GET') {
    const s = sessionFrom(req)
    return send(res, 200, { authed: Boolean(s), name: s?.name ?? null })
  }
  if (p === '/api/dev/logout' && m === 'POST') {
    const s = sessionFrom(req)
    if (s) { delete sessions[s.key]; await saveSessions() }
    return send(res, 200, { authed: false }, { 'Set-Cookie': `so_dev=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${isHttps(req) ? '; Secure' : ''}` })
  }

  if (p === '/api/dev/chat' && m === 'POST') {
    const s = sessionFrom(req)
    if (!s) throw new HttpError(401, 'Necesitás iniciar sesión.')
    return handleChat(req, res, s)
  }
  const convM = /^\/api\/dev\/conversation\/([a-f0-9]{16})$/.exec(p)
  if (convM && m === 'GET') {
    const s = sessionFrom(req)
    if (!s) throw new HttpError(401, 'Necesitás iniciar sesión.')
    const c = await loadConv(convM[1])
    if (!c || c.author !== s.name) throw new HttpError(404, 'No encontrada.')
    return send(res, 200, { id: c.id, messages: c.messages.map(({ context: _c, ...x }) => x) })
  }
  if (p === '/api/dev/tickets' && m === 'GET') {
    if (!authAny(req)) throw new HttpError(401, 'Necesitás iniciar sesión.')
    const list = await readJson(TICKETS_FILE, [])
    return send(res, 200, { tickets: list.map(ticketSummary).reverse() })
  }
  const imgM = /^\/api\/dev\/image\/([a-f0-9]{16})$/.exec(p)
  if (imgM && m === 'GET') {
    if (!authAny(req)) throw new HttpError(401, 'Necesitás iniciar sesión.')
    const img = await findImage(imgM[1])
    if (!img) throw new HttpError(404, 'No encontrada.')
    return send(res, 200, img.buf, { 'Content-Type': img.mime, 'Cache-Control': 'private, max-age=86400', 'X-Content-Type-Options': 'nosniff' })
  }
  if (p === '/api/dev/export' && m === 'GET') {
    if (!authAny(req)) throw new HttpError(401, 'Necesitás iniciar sesión.')
    const list = await readJson(TICKETS_FILE, [])
    const base = baseUrl(req)
    const convCache = new Map()
    const out = []
    for (const t of [...list].reverse()) {
      if (!convCache.has(t.conversationId)) convCache.set(t.conversationId, await loadConv(t.conversationId))
      const c = convCache.get(t.conversationId)
      out.push({
        ...t,
        image_urls: t.image_ids.map(id => `${base}/api/dev/image/${id}`),
        conversation: c ? {
          id: c.id, author: c.author, createdAt: c.createdAt,
          messages: c.messages.map(x => ({
            role: x.role, at: x.at, text: x.text,
            images: (x.images || []).map(id => `${base}/api/dev/image/${id}`),
            ...(x.tickets?.length ? { tickets: x.tickets } : {}),
          })),
        } : null,
      })
    }
    return send(res, 200, { exportedAt: now(), count: out.length, tickets: out })
  }
  const stM = /^\/api\/dev\/tickets\/(T-\d+)\/status$/.exec(p)
  if (stM && m === 'POST') {
    if (!authAny(req)) throw new HttpError(401, 'Necesitás iniciar sesión.')
    const body = await readBody(req)
    if (!STATUSES.includes(body.status)) throw new HttpError(400, `status debe ser uno de: ${STATUSES.join(', ')}`)
    const updated = await locked(TICKETS_FILE, async () => {
      const list = await readJson(TICKETS_FILE, [])
      const t = list.find(x => x.id === stM[1])
      if (!t) return null
      t.status = body.status
      t.updatedAt = now()
      const note = str(body.note, 1000)
      t.notes = [...(t.notes || []), { at: now(), status: body.status, ...(note ? { note } : {}) }]
      await writeJsonAtomic(TICKETS_FILE, list)
      return t
    })
    if (!updated) throw new HttpError(404, 'Ticket no encontrado.')
    return send(res, 200, ticketSummary(updated))
  }
  throw new HttpError(404, 'Not found')
}

// ---------------------------------------------------------------- static files (mirrors nginx.conf)
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.webm': 'video/webm', '.srt': 'text/plain; charset=utf-8',
  '.vtt': 'text/vtt; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.map': 'application/json', '.webmanifest': 'application/manifest+json',
}
const GZIP = new Set(['.html', '.js', '.mjs', '.css', '.json', '.svg', '.srt', '.vtt', '.txt', '.map'])

async function statFile(p) { try { return await fsp.stat(p) } catch { return null } }
/** try_files $uri $uri/ <fallback> */
async function resolveFile(rel, fallback) {
  const abs = path.join(DIST, rel)
  if (abs !== DIST && !abs.startsWith(DIST + path.sep)) return null
  const st = await statFile(abs)
  if (st?.isFile()) return { file: abs, st }
  if (st?.isDirectory()) {
    const idx = path.join(abs, 'index.html')
    const si = await statFile(idx)
    if (si?.isFile()) return { file: idx, st: si }
  }
  if (fallback) {
    const f = path.join(DIST, fallback)
    const sf = await statFile(f)
    if (sf?.isFile()) return { file: f, st: sf }
  }
  return null
}

async function serveStatic(req, res, url) {
  let pathname
  try { pathname = decodeURIComponent(url.pathname) } catch { return send(res, 400, 'Bad request') }
  if (pathname.includes('\0')) return send(res, 400, 'Bad request')
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed', { Allow: 'GET, HEAD' })

  if (pathname === '/healthz') return send(res, 200, 'ok')
  if (pathname === '/admin') return send(res, 301, '', { Location: '/admin/' + url.search })

  let cache, hit
  if (pathname.startsWith('/assets/')) {
    cache = 'public, max-age=31536000, immutable'
    hit = await resolveFile(pathname)
    if (!hit) return send(res, 404, 'Not found')
  } else if (pathname.startsWith('/admin/')) {
    cache = 'no-store'
    hit = await resolveFile(pathname, '/admin/index.html')
  } else {
    cache = 'no-cache'
    hit = await resolveFile(pathname, '/index.html')
  }
  if (!hit) return send(res, 404, 'Not found')

  const { file, st } = hit
  const ext = path.extname(file).toLowerCase()
  const etag = `W/"${st.size.toString(16)}-${Math.floor(st.mtimeMs).toString(16)}"`
  const headers = {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': cache, ETag: etag, 'Last-Modified': st.mtime.toUTCString(),
    'Accept-Ranges': 'bytes', 'X-Content-Type-Options': 'nosniff',
  }
  if (req.headers['if-none-match'] === etag) { res.writeHead(304, headers); return res.end() }

  const range = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range || ''))
  if (range && (range[1] || range[2])) {
    let start = range[1] ? Number(range[1]) : st.size - Number(range[2])
    let end = range[1] && range[2] ? Number(range[2]) : st.size - 1
    start = Math.max(0, start); end = Math.min(end, st.size - 1)
    if (start > end || start >= st.size) {
      res.writeHead(416, { 'Content-Range': `bytes */${st.size}` }); return res.end()
    }
    res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Content-Length': end - start + 1 })
    if (req.method === 'HEAD') return res.end()
    return fs.createReadStream(file, { start, end }).on('error', () => res.destroy()).pipe(res)
  }

  const gz = GZIP.has(ext) && st.size > 512 && /\bgzip\b/.test(String(req.headers['accept-encoding'] || ''))
  if (gz) { headers['Content-Encoding'] = 'gzip'; headers.Vary = 'Accept-Encoding' } else headers['Content-Length'] = st.size
  res.writeHead(200, headers)
  if (req.method === 'HEAD') return res.end()
  const rs = fs.createReadStream(file).on('error', () => res.destroy())
  if (gz) rs.pipe(zlib.createGzip()).pipe(res); else rs.pipe(res)
}

// ---------------------------------------------------------------- server
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://localhost')
    if (url.pathname.startsWith('/api/')) {
      if (!url.pathname.startsWith('/api/dev/')) return send(res, 404, { error: 'Not found' })
      return await handleApi(req, res, url)
    }
    await serveStatic(req, res, url)
  } catch (err) {
    if (res.headersSent) return res.destroy()
    if (err instanceof HttpError) {
      const h = err.extra.retryAfter ? { 'Retry-After': String(err.extra.retryAfter) } : {}
      return send(res, err.status, { error: err.message, ...(err.extra.retryAfter ? { retryAfter: err.extra.retryAfter } : {}) }, h)
    }
    console.error('unhandled:', err?.message)
    send(res, 500, { error: 'Internal error' })
  }
})
server.requestTimeout = 120_000
server.listen(PORT, () => {
  console.log(`space-odyssey server on :${PORT} (dist=${DIST}, data=${DATA}, dev-mode=${process.env.DEV_PASSWORD && process.env.ANTHROPIC_API_KEY ? 'on' : 'OFF: missing env'})`)
})
