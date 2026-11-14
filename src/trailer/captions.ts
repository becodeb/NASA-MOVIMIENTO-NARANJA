/** English subtitle track of the 30 s trailer (seconds). Used on screen and to generate the .srt. */
export interface Caption {
  start: number
  end: number
  text: string
  /** Words painted in the accent colour on screen (purely visual). */
  hi?: string[]
}

export const TRAILER_SECONDS = 30

export const CAPTIONS: Caption[] = [
  { start: 0, end: 3, text: 'The year is 2061. Destination: SATURN.', hi: ['SATURN.'] },
  { start: 3, end: 4.5, text: 'You are the Commander.', hi: ['Commander.'] },
  { start: 4.5, end: 9, text: 'Design your ship. Every part costs budget, mass and power.', hi: ['budget,', 'mass', 'power.'] },
  { start: 9, end: 11.5, text: 'Launch!', hi: ['Launch!'] },
  { start: 11.5, end: 14, text: '4 years to Saturn… every resource counts.', hi: ['4', 'years'] },
  { start: 14, end: 17, text: '6 months. 6 emergencies.', hi: ['emergencies.'] },
  { start: 17, end: 20, text: 'Your decisions have consequences.', hi: ['consequences.'] },
  { start: 20, end: 23.5, text: 'Slingshot around Titan to save fuel.', hi: ['Titan'] },
  { start: 23.5, end: 27, text: 'Hit the entry corridor. Bring your crew home.', hi: ['home.'] },
  { start: 27, end: 30, text: 'Play free at nasa.becode.com.ar', hi: ['nasa.becode.com.ar'] },
]
