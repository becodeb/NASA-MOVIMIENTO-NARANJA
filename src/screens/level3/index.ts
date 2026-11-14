import type { ComponentType } from 'react'
import type { ScreenId } from '../../game/store'
import { Level3 } from './Level3'
import { Reentry } from './Reentry'
import { Report } from './Report'

export const screens: Partial<Record<ScreenId, ComponentType>> = { level3: Level3, reentry: Reentry, report: Report }
