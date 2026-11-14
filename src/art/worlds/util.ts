import { useEffect, useId, useState } from 'react'

export const INK = '#111326'

export const PALETTE = {
  space: '#101B3D',
  spaceDeep: '#0A1128',
  violet: '#6637B8',
  orange: '#FF8C32',
  yellow: '#FFD447',
  teal: '#38D9D0',
  pink: '#F46AA7',
  white: '#F5F7FF',
  metal: '#8896B3',
  red: '#F04452',
  green: '#65D68A',
  ink: INK,
} as const

export type Size = number | string

/** True when the OS asks for reduced motion. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mq) return
    const on = () => setReduced(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return reduced
}

/** Combines the `animate` prop with prefers-reduced-motion. */
export function useMotion(animate: boolean): boolean {
  const reduced = usePrefersReducedMotion()
  return animate && !reduced
}

/** DOM-safe unique id for clipPaths / gradients. */
export function useSvgId(prefix: string): string {
  return `${prefix}-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
}

/** Small deterministic PRNG so art is stable between renders. */
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export const r1 = (n: number) => Math.round(n * 10) / 10

/** Four-point cartoon sparkle centred on 0,0 with outer radius s. */
export function sparklePath(s: number): string {
  const k = s * 0.22
  return `M0,${-s} L${k},${-k} L${s},0 L${k},${k} L0,${s} L${-k},${k} L${-s},0 L${-k},${-k} Z`
}

export function cx(...parts: (string | false | undefined | null)[]): string {
  return parts.filter(Boolean).join(' ')
}
