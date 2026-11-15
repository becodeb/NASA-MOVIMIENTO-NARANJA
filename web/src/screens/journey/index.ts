import type { ComponentType } from 'react'
import type { ScreenId } from '../../game/store'
import { Opening } from './Opening'
import { Launch } from './Launch'
import { Arrival } from './Arrival'
import { Departure } from './Departure'

export { LevelComplete, type LevelCompleteProps } from './LevelComplete'

export const screens: Partial<Record<ScreenId, ComponentType>> = {
  opening: Opening,
  launch: Launch,
  arrival: Arrival,
  departure: Departure,
}
