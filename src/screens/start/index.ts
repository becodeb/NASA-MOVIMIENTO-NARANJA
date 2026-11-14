import type { ComponentType } from 'react'
import type { ScreenId } from '../../game/store'
import { Menu } from './Menu'
import { Intro } from './Intro'
import { AvatarScreen } from './AvatarScreen'
import { HowTo } from './HowTo'
import { Level1 } from './Level1'

export const screens: Partial<Record<ScreenId, ComponentType>> = {
  menu: Menu,
  intro: Intro,
  avatar: AvatarScreen,
  howto: HowTo,
  level1: Level1,
}
