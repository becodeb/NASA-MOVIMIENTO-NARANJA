// Small shared pieces for the level 3 screens: level stamp, hint stamp, icon notes.
import type { ReactNode } from 'react'
import { useT } from '../../i18n'
import { Icon, type IconName, type IconTone } from '../../game/icons'

/** "LEVEL 3" stamp. The title itself carries no level prefix. */
export function LevelStamp() {
  const t = useT()
  return <div className="l3-levelrow"><span className="stamp stamp-in">{t('l3.stamp')}</span></div>
}

/** Hint: a HINT stamp plus the line. Shown on easy mode only. */
export function Hint({ children }: { children: ReactNode }) {
  const t = useT()
  return <div className="l3-hint"><span className="stamp stamp--yellow stamp--flat">{t('l3.hint.stamp')}</span><span>{children}</span></div>
}

/** One-line note or warning with an icon in front. */
export function Line({ icon, tone, kind = 'note', children, role }: { icon: IconName; tone?: IconTone; kind?: 'note' | 'warn'; children: ReactNode; role?: 'alert' }) {
  return <div className={kind === 'warn' ? 'l3-warn' : 'l3-note'} role={role}><Icon name={icon} size={20} tone={tone} />{children}</div>
}
