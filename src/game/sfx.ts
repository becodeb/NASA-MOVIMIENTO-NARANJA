// Tiny WebAudio sound kit — everything synthesized, no audio files. Starts after the first user gesture.
type Sfx = 'click' | 'ok' | 'bad' | 'alarm' | 'launch' | 'whoosh' | 'fanfare'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let ambient: { stop: () => void } | null = null
let muted = (() => { try { return localStorage.getItem('so.mute') === '1' } catch { return false } })()
const listeners = new Set<() => void>()

function ac(): AudioContext | null {
  if (ctx) return ctx
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = muted ? 0 : 0.6
    master.connect(ctx.destination)
  } catch { ctx = null }
  return ctx
}

export function isMuted() { return muted }
export function onMuteChange(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb) } }
export function setMuted(m: boolean) {
  muted = m
  try { localStorage.setItem('so.mute', m ? '1' : '0') } catch { /* ignore */ }
  if (master && ctx) master.gain.setTargetAtTime(m ? 0 : 0.6, ctx.currentTime, 0.05)
  if (!m) startAmbient()
  listeners.forEach(l => l())
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'square', gain = 0.12, slideTo?: number) {
  const c = ac(); if (!c || !master) return
  const o = c.createOscillator(), g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, c.currentTime + start)
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + start + dur)
  g.gain.setValueAtTime(0.0001, c.currentTime + start)
  g.gain.exponentialRampToValueAtTime(gain, c.currentTime + start + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur)
  o.connect(g); g.connect(master)
  o.start(c.currentTime + start); o.stop(c.currentTime + start + dur + 0.05)
}

function noise(start: number, dur: number, gain = 0.2, lowpass = 800) {
  const c = ac(); if (!c || !master) return
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length)
  const src = c.createBufferSource(); src.buffer = buf
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lowpass
  const g = c.createGain(); g.gain.value = gain
  src.connect(f); f.connect(g); g.connect(master)
  src.start(c.currentTime + start)
}

let lastPlay = 0
export function play(s: Sfx) {
  if (muted) return
  const c = ac(); if (!c) return
  if (c.state === 'suspended') void c.resume()
  const now = performance.now()
  if (s === 'click' && now - lastPlay < 40) return
  lastPlay = now
  switch (s) {
    case 'click': tone(660, 0, 0.06, 'square', 0.05, 880); break
    case 'ok': tone(784, 0, 0.12, 'triangle', 0.14); tone(1047, 0.09, 0.2, 'triangle', 0.14); break
    case 'bad': tone(330, 0, 0.18, 'sawtooth', 0.08, 220); tone(220, 0.14, 0.28, 'sawtooth', 0.08, 140); break
    case 'alarm': for (let i = 0; i < 3; i++) { tone(880, i * 0.36, 0.16, 'square', 0.07); tone(660, i * 0.36 + 0.18, 0.16, 'square', 0.07) } break
    case 'launch': noise(0, 2.2, 0.35, 500); tone(80, 0, 2.0, 'sawtooth', 0.05, 320); break
    case 'whoosh': noise(0, 0.5, 0.18, 2400); break
    case 'fanfare': [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.35, 'square', 0.07)); tone(1047, 0.5, 0.6, 'triangle', 0.1); break
  }
}

/** Soft evolving space pad. Very quiet; follows the mute switch. */
export function startAmbient() {
  if (ambient || muted) return
  const c = ac(); if (!c || !master) return
  const g = c.createGain(); g.gain.value = 0.0001
  g.gain.exponentialRampToValueAtTime(0.035, c.currentTime + 4)
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900
  const lfo = c.createOscillator(); lfo.frequency.value = 0.07
  const lfoGain = c.createGain(); lfoGain.gain.value = 400
  lfo.connect(lfoGain); lfoGain.connect(f.frequency); lfo.start()
  const oscs = [110, 164.81, 220.5, 329.6].map((hz, i) => {
    const o = c.createOscillator(); o.type = i % 2 ? 'triangle' : 'sine'; o.frequency.value = hz
    o.detune.value = (i - 1.5) * 6
    o.connect(f); o.start(); return o
  })
  f.connect(g); g.connect(master)
  ambient = { stop: () => { oscs.forEach(o => o.stop()); lfo.stop(); ambient = null } }
}

/** Wire global sounds: any .btn click, first-gesture ambient. Call once. */
export function installSfx() {
  const first = () => { startAmbient(); window.removeEventListener('pointerdown', first) }
  window.addEventListener('pointerdown', first)
  document.addEventListener('click', e => {
    const el = (e.target as HTMLElement | null)?.closest?.('button, [role="button"], select')
    if (el && !(el as HTMLButtonElement).disabled) play('click')
  }, true)
}
