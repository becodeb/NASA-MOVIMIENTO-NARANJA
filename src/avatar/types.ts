// Avatar data model. Option ids are STABLE strings: they are persisted in localStorage,
// so art can change freely without ever breaking a saved avatar.

export const AVATAR_OPTIONS = {
  faceShape: ['round', 'oval', 'square', 'long', 'soft-triangle'],
  eyes: ['big-round', 'almond', 'small', 'droopy', 'wide-open'],
  nose: ['small', 'rounded', 'straight', 'wide', 'upturned'],
  mouth: ['big-smile', 'soft-smile', 'small', 'serious', 'smirk'],
  eyebrows: ['straight', 'arched', 'thick', 'thin', 'slanted'],
  ears: ['small', 'medium', 'large', 'rounded', 'long'],
  hair: ['short', 'long', 'curly', 'buzz', 'bun'],
  hairColor: ['black', 'brown', 'blonde', 'red', 'violet', 'teal', 'pink', 'silver'],
  skin: ['porcelain', 'light', 'tan', 'olive', 'brown', 'deep', 'mint', 'lilac'],
  suitColor: ['orange', 'teal', 'violet', 'pink', 'yellow', 'green', 'red'],
  helmet: ['open-visor', 'closed-visor', 'no-helmet'],
  gloves: ['white', 'orange', 'teal', 'violet', 'yellow'],
  accessory: ['none', 'glasses', 'headset', 'freckles', 'earring'],
} as const

export type AvatarCategory = keyof typeof AVATAR_OPTIONS
export const AVATAR_CATEGORIES = Object.keys(AVATAR_OPTIONS) as AvatarCategory[]

type Opt<K extends AvatarCategory> = (typeof AVATAR_OPTIONS)[K][number]
export type FaceShape = Opt<'faceShape'>
export type EyeStyle = Opt<'eyes'>
export type NoseStyle = Opt<'nose'>
export type MouthStyle = Opt<'mouth'>
export type EyebrowStyle = Opt<'eyebrows'>
export type EarStyle = Opt<'ears'>
export type HairStyle = Opt<'hair'>
export type HairColor = Opt<'hairColor'>
export type SkinTone = Opt<'skin'>
export type SuitColor = Opt<'suitColor'>
export type HelmetStyle = Opt<'helmet'>
export type GloveColor = Opt<'gloves'>
export type Accessory = Opt<'accessory'>

export type AvatarConfig = { [K in AvatarCategory]: Opt<K> } & { commanderName: string }

export const SKIN_TONES: Record<SkinTone, string> = {
  porcelain: '#FFE3CF',
  light: '#F7CBA4',
  tan: '#E3AC7C',
  olive: '#C98D5E',
  brown: '#9C633D',
  deep: '#6E452B',
  mint: '#8FE3C0', // fantasy
  lilac: '#BBA3F2', // fantasy
}
export const HAIR_COLORS: Record<HairColor, string> = {
  black: '#2A2540',
  brown: '#7A4A2A',
  blonde: '#FFD447',
  red: '#E2552B',
  violet: '#6637B8',
  teal: '#38D9D0',
  pink: '#F46AA7',
  silver: '#C9D2E6',
}
export const SUIT_COLORS: Record<SuitColor, string> = {
  orange: '#FF8C32',
  teal: '#38D9D0',
  violet: '#6637B8',
  pink: '#F46AA7',
  yellow: '#FFD447',
  green: '#65D68A',
  red: '#F04452',
}
export const GLOVE_COLORS: Record<GloveColor, string> = {
  white: '#DCE3F2',
  orange: '#FF8C32',
  teal: '#38D9D0',
  violet: '#8A5BD8',
  yellow: '#FFD447',
}

export const NAME_MAX = 16

export const DEFAULT_AVATAR: AvatarConfig = {
  faceShape: 'round',
  eyes: 'big-round',
  nose: 'rounded',
  mouth: 'soft-smile',
  eyebrows: 'arched',
  ears: 'medium',
  hair: 'short',
  hairColor: 'brown',
  skin: 'tan',
  suitColor: 'orange',
  helmet: 'open-visor',
  gloves: 'white',
  accessory: 'none',
  commanderName: '',
}

const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]

/** A random avatar. Fantasy skin tones are rarer than natural ones. */
export function randomAvatar(commanderName = ''): AvatarConfig {
  const out: Record<string, string> = { commanderName }
  for (const cat of AVATAR_CATEGORIES) out[cat] = pick(AVATAR_OPTIONS[cat])
  if ((out.skin === 'mint' || out.skin === 'lilac') && Math.random() < 0.6) {
    out.skin = pick(AVATAR_OPTIONS.skin.slice(0, 6))
  }
  return out as unknown as AvatarConfig
}

/** Coerce anything (old saves, hand-edited JSON) into a valid config. Unknown ids fall back to defaults. */
export function sanitizeAvatar(raw: unknown): AvatarConfig {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const out: Record<string, string> = {}
  for (const cat of AVATAR_CATEGORIES) {
    const v = src[cat]
    out[cat] = typeof v === 'string' && (AVATAR_OPTIONS[cat] as readonly string[]).includes(v) ? v : DEFAULT_AVATAR[cat]
  }
  out.commanderName = typeof src.commanderName === 'string' ? src.commanderName.slice(0, NAME_MAX) : ''
  return out as unknown as AvatarConfig
}

export const AVATAR_STORAGE_KEY = 'so.avatar'

/** Saved avatar, or null when nothing (valid) is stored. */
export function loadAvatar(): AvatarConfig | null {
  try {
    const raw = localStorage.getItem(AVATAR_STORAGE_KEY)
    if (!raw) return null
    return sanitizeAvatar(JSON.parse(raw))
  } catch {
    return null
  }
}

export function saveAvatar(config: AvatarConfig): boolean {
  try {
    localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(sanitizeAvatar(config)))
    return true
  } catch {
    return false
  }
}

export type AstronautPose = 'idle' | 'wave' | 'point' | 'cheer' | 'worried' | 'thumbs-up' | 'float'
export type AstronautExpression = 'happy' | 'worried' | 'surprised' | 'determined' | 'neutral'
export const ASTRONAUT_POSES: AstronautPose[] = ['idle', 'wave', 'point', 'cheer', 'worried', 'thumbs-up', 'float']
export const ASTRONAUT_EXPRESSIONS: AstronautExpression[] = ['happy', 'worried', 'surprised', 'determined', 'neutral']
