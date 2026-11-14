// Screen router. Each folder src/screens/<group>/index.ts exports `screens: Partial<Record<ScreenId, ComponentType>>`.
import { useEffect, type ComponentType } from 'react'
import { installSfx } from './game/sfx'
import { useGame, game, type ScreenId } from './game/store'
import { FallbackControls, RadioLog, ScreenFrame } from './game/ui'
import { useT } from './i18n'
import { SpaceBackdrop } from './art/worlds'

const groups = import.meta.glob<{ screens: Partial<Record<ScreenId, ComponentType>> }>('./screens/*/index.ts', { eager: true })
const SCREENS: Partial<Record<ScreenId, ComponentType>> = Object.assign({}, ...Object.values(groups).map(g => g.screens))

function ComingSoon() {
  const t = useT()
  return (
    <ScreenFrame title="SPACE ODYSSEY">
      <SpaceBackdrop fixed />
      <div className="surface-paper surface-paper--tape surface-paper--tilt-l" style={{ maxWidth: 520, margin: '10vh auto', padding: 24, textAlign: 'center' }}>
        <p style={{ fontWeight: 800, fontSize: 18, marginTop: 0 }}>{t('common.comingSoon')}</p>
        <button className="btn btn--yellow" onClick={() => game.go('menu')}>{t('common.menu')}</button>
      </div>
    </ScreenFrame>
  )
}

let sfxInstalled = false

export default function App() {
  useEffect(() => { if (!sfxInstalled) { sfxInstalled = true; installSfx() } }, [])
  const { screen } = useGame()
  const Screen: ComponentType = SCREENS[screen] ?? (screen === 'opening' ? SCREENS.menu : undefined) ?? ComingSoon
  return (
    <>
      <Screen key={screen} />
      {/* docked crew radio (the old toasts) and the sound button for screens without a corner cluster */}
      <RadioLog />
      <FallbackControls />
    </>
  )
}
