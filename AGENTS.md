# Agent Guide

## General Guidelines

### Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios. No fallback that wasn't requested. Just "throw" instead of "try catch".
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## Project Overview
Robianist.js is a browser-based demo of a robot playing a piano, built with React, Next.js, Three.js, and React Three Fiber.

## Maintenance Rules
- Whenever the code structure is changed, added to, or deleted from, update the "Code Structure" and "Important Files" sections in this file at the same time.
- Whenever the codes are modified, check whether README.md needs updates for user-facing setup.
- Whenever some features are changed, added to, or deleted from, update the tests and run tests.
- Whenever code is modified, added, or removed, assess whether the version in `package.json` should be bumped. Before changing it, tell the user whether a bump is needed; when it is, recommend the exact next SemVer version and ask for approval.

## Code Structure
```
robianist.js/
├── app/                         Next.js page, layout, styles and generated icon
├── components/                  scene, grand piano, robot asset and live sheet music
├── lib/                         playback, animation, score parsing and robot kinematics
│   ├── arm-ik.ts                joint-limited IK with wrist orientation and multiple contacts
│   ├── asset-url.ts             model URL prefix for subpath hosting
│   ├── audio.ts                 dynamic synthesis, pedal sustain and bounded scheduling
│   ├── builtin-scores.ts        ordered preset metadata and artist/arranger links
│   ├── camera.ts                camera presets, manual override and song-clock motion
│   ├── fingering.ts             visual finger assignment, substitutions and early releases
│   ├── keyboard.ts              metre-scale key geometry and animated contact targets
│   ├── pianoplayer.ts           motion cost, transition rules and memoized lookahead search
│   ├── pedal.ts                 damper timing, foot/pedal motion and shared geometry
│   ├── playing-pose.ts          expressive seated pose, elbow-down selection and finger clearance
│   └── score.ts                 MusicXML/MXL timing, arpeggios, dynamics and pedal events
├── public/
│   ├── licenses/                third-party licenses and preset-score rights notice
│   ├── models/g1_wuji/          user-supplied assembled G1 + Wuji URDF and meshes
│   ├── scores/                  bundled MXL preset scores
│   └── logo.png                 robot-piano brand mark
├── tests/                       asset, fingering, music, keyboard and IK checks
├── .github/workflows/           GitHub Pages build and deployment automation
├── next.config.mjs              static export and deployment base path
├── output/                      ignored local generated output; never commit
└── tmp/                         ignored scratch space and generated artifacts; never commit
```

## Important Files
- `lib/camera.ts`, `tests/camera.test.ts`: six views and deterministic moving camera checks.
- `lib/pedal.ts`, `tests/pedal.test.ts`: damper release timing, full-width rearward foot support and shared foot/pedal animation geometry.
- `lib/keyboard.ts`, `tests/keyboard.test.ts`: visible key dimensions, travel and depth-aware fingertip targets.
- `app/page.tsx`: fixed configuration badge, score selection, expandable MusicXML help and playback controls.
- `components/Scene.tsx`: metre-scale stage, piano bench with foot support and camera views with manual override.
- `components/SheetMusic.tsx`: OpenSheetMusicDisplay engraving and audio-clock cursor.
- `components/GrandPiano.tsx`: 88 independent keys, animated damper pedal, graduated strings and a Steinway-style grand piano body.
- `components/RobotAsset.tsx`: cached G1 + Wuji assembly, seated pose and arm/finger IK.
- `lib/arm-ik.ts`, `lib/playing-pose.ts`: shared-arm contact solving, mirrored seated arm seeds, elbow-down solution selection, curved idle fingers, anticipatory wrists, torso sway and right-foot pedal contact.
- `tests/playing-pose.test.ts`, `tests/robot-fixture.ts`: real G1 + Wuji kinematics, continuous If Only bars 9–12 and 29/91, elbow posture, finger depths, foot/pedal alignment, sway, opening playback, key lifts and pose reset checks.
- `lib/music.ts`: normalized score types and keyboard mapping.
- `lib/score.ts`: validated MusicXML/MXL imports, ties, grace timing, tempo conversion, arpeggios, staff dynamics and pedal events.
- `lib/builtin-scores.ts`: preset scores' metadata with artist/arranger links.
- `tests/score.test.ts`: compressed imports, shared timing and preset consistency.
- `lib/pianoplayer.ts`, `tests/pianoplayer.test.ts`, `tests/fixtures/pianoplayer.json`: TypeScript optimizer and Python reference regressions.
- `lib/fingering.ts`, `tests/music.test.ts`: optimized finger assignment, approximate substitutions and sustained early releases.
- `lib/player.ts`: audio-clock playback, seeking and pause.
- `lib/audio.ts`, `tests/audio.test.ts`: dynamic synthesis, pedal-held tails, repeated attacks and seek/cleanup regressions.
- `lib/presets.ts`: fixed G1 + Wuji model, arm/finger joint descriptors and shared seated depth.

## Running
- `npm install`, then `npm run dev`.
- `npm run build` for production verification; `npm test` for music checks.
