# Space Odyssey: Mission Saturn

An educational browser game for NASA Space Apps Challenge 2026. You design a ship, keep four astronauts alive at Saturn, and bring them home. It is made for students aged 15 to 18.

- **Play:** https://nasa.becode.com.ar
- **30-second demo (English captions):** https://nasa.becode.com.ar/media/space-odyssey-trailer.mp4

## What it is

The game is one persistent mission in three levels:

1. **Design.** Pick the structure, propulsion, power, life support and communications under a budget of 105 credits and a launch mass limit of 130.
2. **Saturn.** Survive six months: six technical emergencies and four science investigations.
3. **Return.** Choose a route, optionally use a Titan gravity assist, and fly the capsule re-entry.

Nothing resets between levels. Every decision shows its consequence and a short explanation of why. The game runs in English, Spanish, Brazilian Portuguese and French, with Easy and Hard modes.

All numbers are simplified, normalized game units, not real mission data. The crewed Saturn mission is hypothetical. The science notes rely on NASA sources, listed in the submission.

## Use of AI (Super Intelligence) disclosure

- **Designed by the team:** the concept, the mission rules and every number, the science content and the educational goals. The team also playtested and accepted the result.
- **Written with AI coding assistance (Anthropic Claude models):** the source code in this repository. That includes the rules engine, the screens, all art and animation (drawn with SVG, Canvas and CSS), the synthesized sound and music, the translations, and the trailer.
- **Assets:** the game contains no image, audio or video files made by generative-image or generative-audio tools. Everything you see and hear is rendered by this code at runtime.
- **The trailer:** a screen capture of the game. It carries a visible "Made with AI-assisted code (Claude)" mark and an MP4 metadata note.

## Develop

```bash
npm install
npm run dev      # game at http://localhost:5173
npm test         # rules-engine tests (Vitest)
npm run build
```

Production runs `server/server.mjs` (Node 22). It serves `dist/` and the team-feedback API. See the `Dockerfile`.

## Tech

TypeScript, React 19, Vite, Vitest, the Web Audio API, and Google Fonts (Lilita One and Nunito, under the SIL Open Font License).
