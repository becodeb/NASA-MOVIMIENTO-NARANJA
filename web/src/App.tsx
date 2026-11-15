// Screen router. Each folder src/screens/<group>/index.ts exports `screens: Partial<Record<ScreenId, ComponentType>>`.
import { lazy, Suspense, useEffect, type ComponentType } from 'react'
import { installSfx } from './game/sfx'
import { useGame, game, type ScreenId } from './game/store'
import { FallbackControls, RadioLog, ScreenFrame } from './game/ui'
import { useT } from './i18n'
import { SpaceBackdrop } from './art/worlds'
import { DevFab } from './dev/DevFab'

const DevPage = lazy(() => import('./dev/DevPage'))

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

/** /dev is the team's feedback chat; everything else is the game. */
export default function App() {
  if (location.pathname.startsWith('/dev')) return <Suspense fallback={null}><DevPage /></Suspense>
  return <Game />
}

function Game() {
  useEffect(() => { if (!sfxInstalled) { sfxInstalled = true; installSfx() } }, [])
  const { screen } = useGame()
  const Screen: ComponentType = SCREENS[screen] ?? (screen === 'opening' ? SCREENS.menu : undefined) ?? ComingSoon
  return (
    <>
      <div id="app-scroll" className="app-scroll"><Screen key={screen} /></div>
      {/* docked crew radio (the old toasts) and the sound button for screens without a corner cluster */}
      <RadioLog />
      <FallbackControls />
      <DevFab />
    </>
  )
}
