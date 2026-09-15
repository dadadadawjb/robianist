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
This project is implementing a demo web page showing a robot playing a piano.
Maybe use Next.js + React + Three.js / React Three Fiber.

## Maintenance Rules
- Keep authored UI, comments and documentation in English.
- Include `Co-authored-by: Codex <codex@openai.com>` in future commits.
- Whenever the code structure is changed, added to, or deleted from, update the "Code Structure" and "Important Files" sections in this file at the same time.
- Whenever the codes are modified, check whether README.md needs updates for user-facing setup.

## Code Structure
- `.github/workflows/`: GitHub Pages build and deployment automation.
- `next.config.mjs`: static export and deployment base path.
- `lib/asset-url.ts`: model URL prefix for subpath hosting.
- `app/`: Next.js page, root layout, global styles and generated robot-piano icon.
- `components/`: scene, grand piano, official URDF assets and live sheet music.
- `lib/`: song events, hardware preset types and Web Audio transport.
- `lib/audio.ts`: bounded lookahead audio scheduling and voice cleanup.
- `lib/arm-ik.ts`: arbitrary-axis URDF joint adapter for Three.js CCDIKSolver.
- `lib/fingering.ts`: visual finger contacts with approximate substitutions and sustained early releases.
- `lib/score.ts`, `lib/builtin-scores.ts`: MusicXML/MXL parsing, tempo mapping and ordered preset metadata.
- `public/scores/`, `public/logo.png`: downloadable piano scores and robot-piano brand mark.
- `output/musicxml/`: user-provided PDF recognition draft and outstanding correction notes.
- `scripts/fetch-models.mjs`: pinned upstream visual model downloads.
- `public/models/`: official source meshes, URDFs and license notices.
- `scripts/prepare-franka.mjs`: derive the browser visual URDF from official xacro origins.
- `tests/`: asset reference, fingering, music event, keyboard mapping and IK checks.

## Important Files
- `.github/workflows/pages.yml`: test, export and publish on pushes to main.
- `next.config.mjs`: static export configuration.
- `lib/asset-url.ts`: shared URDF and mesh URL adaptation.
- `tests/asset-url.test.ts`: root and subpath model URL checks.
- `app/page.tsx`: configuration UI and playback controls.
- `components/Scene.tsx`: note-driven animation, presets and camera views.
- `components/SheetMusic.tsx`: OpenSheetMusicDisplay engraving and audio-clock cursor.
- `components/GrandPiano.tsx`: 88 independent keys and a Steinway-style grand piano body.
- `components/RobotAsset.tsx`: urdf-loader asset cache and articulated robot/hand rendering.
- `lib/arm-ik.ts`: library-based IK for imported arm and hand chains.
- `lib/music.ts`: normalized score types and keyboard mapping.
- `lib/score.ts`: validated MusicXML/MXL piano imports, cross-voice ties, grace timing and tempo conversion.
- `lib/builtin-scores.ts`: Human Light (default, Easy) and If Only... (Hard) metadata.
- `public/scores/HumanLight.mxl`, `public/scores/IfOnly.mxl`: original compressed preset scores.
- `tests/score.test.ts`: compressed imports, shared timing and preset consistency.
- `public/logo.png`, `app/icon.png`: generated robot-head and keyboard logo.
- `output/musicxml/README.md`: incomplete If Only transcription status and review requirements.
- `lib/fingering.ts`: pitch-ordered finger assignment, approximate substitutions and sustained early releases.
- `scripts/fetch-models.mjs`: pinned manufacturer and converted visual asset downloads.
- `lib/player.ts`: audio-clock playback, seeking and pause.
- `lib/audio.ts`, `tests/audio.test.ts`: incremental per-note synthesis and opening/seek/cleanup regressions.
- `lib/presets.ts`: independent robot/hand configuration and left/right model descriptors.
- `README.md`: setup, supported features and extension boundaries.
- `ASSETS.md`: third-party sources, licenses and asset limitations.

## Running
- `npm install`, then `npm run dev`.
- `npm run build` for production verification; `npm test` for music checks.
