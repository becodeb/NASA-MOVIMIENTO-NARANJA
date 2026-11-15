// Central i18n. Every module ships its own `strings.ts` next to its code:
//   export default { en: { 'ns.key': 'Text {param}' }, es: {...}, 'pt-BR': {...}, fr: {...} }
// Keys must be namespaced (e.g. 'avatar.title', 'l2.comms.title'). English is the default and fallback.
import { useSyncExternalStore } from 'react'

export type Lang = 'en' | 'es' | 'pt-BR' | 'fr'
export const LANGS: { id: Lang; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'es', label: 'Español' },
  { id: 'pt-BR', label: 'Português (BR)' },
  { id: 'fr', label: 'Français' },
]
type Dict = Record<string, string>
type Bundle = Partial<Record<Lang, Dict>>

const modules = import.meta.glob<{ default: Bundle }>('../**/strings.ts', { eager: true })
const dicts: Record<Lang, Dict> = { en: {}, es: {}, 'pt-BR': {}, fr: {} }
for (const mod of Object.values(modules)) {
  for (const [lang, d] of Object.entries(mod.default) as [Lang, Dict][]) Object.assign(dicts[lang], d)
}

const KEY = 'so.lang'
let current: Lang = (() => {
  try {
    const saved = localStorage.getItem(KEY) as Lang | null
    if (saved && saved in dicts) return saved
  } catch { /* storage unavailable */ }
  return 'en'
})()
const listeners = new Set<() => void>()

export function getLang(): Lang { return current }
export function setLang(l: Lang) {
  current = l
  try { localStorage.setItem(KEY, l) } catch { /* ignore */ }
  document.documentElement.lang = l
  listeners.forEach(f => f())
}

export function t(key: string, params?: Record<string, string | number>): string {
  let s = dicts[current][key] ?? dicts.en[key] ?? key
  if (params) for (const [k, v] of Object.entries(params)) s = s.split(`{${k}}`).join(String(v))
  return s
}

/** React hook: re-renders on language change and returns `t`. */
export function useT() {
  useSyncExternalStore(cb => { listeners.add(cb); return () => listeners.delete(cb) }, () => current)
  return t
}
