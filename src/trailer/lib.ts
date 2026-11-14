// Tiny time helpers: every trailer animation is a pure function of the clock, so any frame can be seeked.
export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p
/** 0..1 progress of t between a and b. */
export const prog = (t: number, a: number, b: number) => clamp01((t - a) / (b - a))
export const easeOut = (p: number) => 1 - Math.pow(1 - p, 3)
export const easeIn = (p: number) => p * p * p
export const easeInOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2)
export const backOut = (p: number, k = 1.9) => 1 + (k + 1) * Math.pow(p - 1, 3) + k * Math.pow(p - 1, 2)

/** Cartoon pop: 0 before `at`, overshoots, settles at 1. */
export const pop = (t: number, at: number, dur = 0.28) => (t < at ? 0 : backOut(prog(t, at, at + dur)))
/** Slam: starts huge, lands at 1 (use with `appear` for opacity). */
export const slam = (t: number, at: number, dur = 0.16, from = 3) => lerp(from, 1, easeOut(prog(t, at, at + dur)))
export const appear = (t: number, at: number, dur = 0.07) => prog(t, at, at + dur)
/** A quick scale bump that decays back to 1. */
export const punch = (t: number, at: number, amp = 0.18, dur = 0.3) => {
  if (t < at || t > at + dur) return 1
  const p = (t - at) / dur
  return 1 + amp * Math.sin(p * Math.PI) * (1 - p)
}
/** Decaying shake offset in px. */
export const shake = (t: number, at: number, amp: number, dur: number): [number, number] => {
  if (t < at || t > at + dur) return [0, 0]
  const k = Math.pow(1 - (t - at) / dur, 2) * amp
  return [Math.sin(t * 97.3) * k, Math.cos(t * 131.7) * k]
}
export const countTo = (t: number, a: number, b: number, from: number, to: number) => Math.round(lerp(from, to, easeOut(prog(t, a, b))))
/** Deterministic pseudo-random 0..1 from an integer. */
export const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}
export const px = (n: number) => `${Math.round(n * 10) / 10}px`
