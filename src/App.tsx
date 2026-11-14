// Screen router. Each folder src/screens/<group>/index.ts exports `screens: Partial<Record<ScreenId, ComponentType>>`.
import type { ComponentType } from 'react'
import { useGame, game, type ScreenId } from './game/store'
import { ScreenFrame, Toasts } from './game/ui'
import { useT } from './i18n'
import { SpaceBackdrop } from './art/worlds'

const groups = import.meta.glob<{ screens: Partial<Record<ScreenId, ComponentType>> }>('./screens/*/index.ts', { eager: true })
const SCREENS: Partial<Record<ScreenId, ComponentType>> = Object.assign({}, ...Object.values(groups).map(g => g.screens))

function ComingSoon() {
  const t = useT()
  return (
    <ScreenFrame title="SPACE ODYSSEY">
      <SpaceBackdrop fixed />
      <div className="panel" style={{ maxWidth: 560, margin: '10vh auto', padding: 24, textAlign: 'center' }}>
        <p style={{ fontWeight: 800, fontSize: 18 }}>{t('common.comingSoon')}</p>
        <button className="btn btn--yellow" onClick={() => game.go('menu')}>{t('common.menu')}</button>
      </div>
    </ScreenFrame>
  )
}

export default function App() {
  const { screen } = useGame()
  const Screen: ComponentType = SCREENS[screen] ?? (screen === 'opening' ? SCREENS.menu : undefined) ?? ComingSoon
  return (
    <>
      <Screen key={screen} />
      <Toasts />
    </>
  )
}
