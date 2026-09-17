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
Robianist.js is a browser-based demo of a robot playing a piano, built with Next.js, React and React Three Fiber.

## Maintenance Rules
- Keep authored UI, comments and documentation in English.
- Include `Co-authored-by: Codex <codex@openai.com>` in future commits.
- Whenever the code structure is changed, added to, or deleted from, update the "Code Structure" and "Important Files" sections in this file at the same time.
- Whenever the codes are modified, check whether README.md needs updates for user-facing setup.

## Code Structure
- `lib/camera.ts`: camera presets, manual override and song-clock-driven motion.
- `lib/use-recording.ts`, `lib/recording.ts`: local tab video recording and codec selection.
- `lib/keyboard.ts`: metre-scale key geometry and shared animated contact targets.
- `.github/workflows/`: GitHub Pages build and deployment automation.
- `next.config.mjs`: static export and deployment base path.
- `lib/asset-url.ts`: model URL prefix for subpath hosting.
- `app/`: Next.js page, root layout, global styles and generated robot-piano icon.
- `components/`: scene, grand piano, official URDF assets and live sheet music.
- `lib/`: song events, fixed humanoid descriptors and Web Audio transport.
- `lib/audio.ts`: bounded lookahead audio scheduling and voice cleanup.
- `lib/arm-ik.ts`: joint-limited damped least-squares IK with wrist orientation and multiple contacts.
- `lib/playing-pose.ts`: seated pose, finger-relative wrist targets, curved ready poses and idle-finger clearance.
- `lib/pianoplayer.ts`: PianoPlayer motion cost, transition rules and memoized lookahead search.
- `lib/fingering.ts`: optimized visual finger contacts with approximate substitutions, sustained early releases and pre-attack lift gaps.
- `public/licenses/pianoplayer.txt`: upstream source revision and MIT notice.
- `lib/score.ts`, `lib/builtin-scores.ts`: MusicXML/MXL parsing, tempo mapping and ordered preset metadata and artist/arranger links.
- `public/scores/`, `public/logo.png`: downloadable piano scores and robot-piano brand mark.
- `output/`: ignored local generated output; never commit it.
- `tmp/`: ignored local scratch space for recognition tools and generated artifacts; never commit it.
- `public/models/`: official source meshes, URDFs and license notices.
- `public/models/g1_wuji/`: user-supplied assembled G1 + Wuji URDF and relative meshes.
- `tests/`: asset reference, fingering, music event, keyboard mapping and IK checks.

## Important Files
- `lib/camera.ts`, `tests/camera.test.ts`: six views and deterministic moving camera checks.
- `lib/use-recording.ts`, `lib/recording.ts`, `tests/recording.test.ts`: recording lifecycle, audio capture and format checks.
- `public/models/g1_wuji/g1_wuji.urdf`: active model with supplied palm mounting transforms.
- `lib/keyboard.ts`, `tests/keyboard.test.ts`: visible key dimensions, travel and fingertip targets.
- `.github/workflows/pages.yml`: test, export and publish on pushes to main.
- `next.config.mjs`: static export configuration.
- `lib/asset-url.ts`: shared URDF and mesh URL adaptation.
- `tests/asset-url.test.ts`: root and subpath model URL checks.
- `app/page.tsx`: fixed configuration badge, score selection, expandable MusicXML help and playback controls.
- `components/Scene.tsx`: metre-scale stage, piano bench with foot support and camera views with manual override.
- `components/SheetMusic.tsx`: OpenSheetMusicDisplay engraving and audio-clock cursor.
- `components/GrandPiano.tsx`: 88 independent keys, graduated longitudinal strings, connected frame and a Steinway-style grand piano body.
- `components/RobotAsset.tsx`: cached G1 + Wuji assembly, seated pose and arm/finger IK.
- `lib/arm-ik.ts`, `lib/playing-pose.ts`: shared-arm contact solving and finger posture control.
- `tests/playing-pose.test.ts`, `tests/robot-fixture.ts`: actual G1 + Wuji kinematics, opening playback, repeated-key lifts, chord contacts, idle-finger clearance, wrist limits and pose reset checks.
- `lib/music.ts`: normalized score types and keyboard mapping.
- `lib/score.ts`: validated MusicXML/MXL piano imports, cross-voice ties, grace timing and tempo conversion.
- `lib/builtin-scores.ts`: Human Light (default) and If Only... metadata with artist/arranger links.
- `public/scores/HumanLight.mxl`, `public/scores/IfOnly.mxl`: original compressed preset scores.
- `tests/score.test.ts`: compressed imports, shared timing and preset consistency.
- `public/logo.png`, `app/icon.png`: generated robot-head and keyboard logo.
- `lib/pianoplayer.ts`, `tests/pianoplayer.test.ts`, `tests/fixtures/pianoplayer.json`: TypeScript optimizer and Python reference regressions.
- `lib/fingering.ts`, `tests/music.test.ts`: optimized finger assignment, approximate substitutions and sustained early releases.
- `public/licenses/pianoplayer.txt`: PianoPlayer provenance and redistributed MIT license.
- `lib/player.ts`: audio-clock playback, seeking and pause.
- `lib/audio.ts`, `tests/audio.test.ts`: incremental per-note synthesis and opening/seek/cleanup regressions.
- `lib/presets.ts`: fixed G1 + Wuji model, arm/finger joint descriptors and shared seated depth.
- `README.md`: setup, supported features and extension boundaries.
- `ASSETS.md`: third-party sources, licenses and asset limitations.
- `.gitignore`: local dependency, build, recognition and log artifact exclusions.

## Running
- `npm install`, then `npm run dev`.
- `npm run build` for production verification; `npm test` for music checks.
