// Destination-aware planet art: screens render <World> / <MoonA> / <MoonB> and get Saturn (Titan, Enceladus)
// or Mars (Phobos, Deimos) depending on the mission the player picked in the menu.
import { Deimos, Enceladus, Mars, Phobos, Saturn, Titan, type SaturnProps, type TitanProps } from '../art/worlds'
import { useGame } from './store'

export function useDestination(): 'saturn' | 'mars' { return useGame().destination === 'mars' ? 'mars' : 'saturn' }

export function World(props: SaturnProps) {
  return useDestination() === 'mars' ? <Mars {...props} /> : <Saturn {...props} />
}
/** Titan at Saturn, Phobos at Mars. */
export function MoonA(props: TitanProps) {
  return useDestination() === 'mars' ? <Phobos {...props} /> : <Titan {...props} />
}
/** Enceladus at Saturn, Deimos at Mars. */
export function MoonB(props: TitanProps) {
  return useDestination() === 'mars' ? <Deimos {...props} /> : <Enceladus {...props} />
}

/** Renders its children only on the Saturn mission (ring particles and other Saturn-only decor). */
export function RingsOnly({ children }: { children: React.ReactNode }) {
  return useDestination() === 'saturn' ? <>{children}</> : null
}
