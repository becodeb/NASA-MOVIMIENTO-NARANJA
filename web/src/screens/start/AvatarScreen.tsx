import { game } from '../../game/store'
import { SpaceBackdrop } from '../../art/worlds'
import { LangSwitch } from '../../game/ui'
import { AvatarCreator } from '../../avatar'
import './start.css'

export function AvatarScreen() {
  return (
    <div className="st-avatar">
      <SpaceBackdrop fixed />
      <div className="st-avatar__lang"><LangSwitch /></div>
      <div className="st-avatar__body">
        <AvatarCreator transparent
          onDone={a => { game.setAvatar(a); game.go('level1') }}
          onBack={() => game.go('menu')} />
      </div>
    </div>
  )
}
