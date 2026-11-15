import type { ComponentType } from 'react'
import type { ScreenId } from '../../game/store'
import Level2 from './Level2'

export const screens: Partial<Record<ScreenId, ComponentType>> = { level2: Level2 }
