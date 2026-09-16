# Robianist

*A roboticist that happens to be a pianist.*

## For users

Robianist is a full-screen 3D performance by a seated **Unitree G1 (29 DOF) + Wuji Hand**. The hardware is fixed. Choose a score beside the bottom timeline, upload MusicXML/MXL, or open the sheet music panel. Drag to orbit, scroll to zoom, or use the hands close-up camera.

The presets are **Human Light** (Easy, default) and **If Only...** (Hard). Web Audio synthesizes individual notes in a bounded rolling window.

### Scale and assembly

One world unit is one metre. The app loads the user-provided assembled model at `public/models/g1_wuji/g1_wuji.urdf` directly, with its relative mesh paths, material colors, joint limits and left/right palm mounting transforms preserved. No additional adapter or hand mounting transform is inserted. G1's published standing height is approximately 1.32 m.

The original procedural piano is resized to approximately 1.56 m wide and 2.74 m long, with 23.5 mm white-key spacing (1.222 m keyboard span), white key surfaces at 0.729 m, and a 0.62 × 0.34 m bench with a 0.442 m seat height and a raised foot support for G1. Its shape and internal details remain illustrative, not an exact Steinway CAD model. Earlier versions enlarged arms 2.4× and hands 3.2× and did not use real-world proportions.

Sitting is a fixed joint pose, and arm/finger motion uses approximate position IK. Playing orientation is derived from the supplied hand geometry. The demo does not validate balance, collision avoidance, or reachability of every note; it is not a robot controller.

## Score formats

Uploads accept `.musicxml`, `.xml` and compressed `.mxl` files up to 5 MB (also limited to 5 MB after decompression). Files are read locally and remain in the current browser session. The two presets are stored as independent MXL files in `public/scores/` and fetched on demand. Download exports the selected score as uncompressed MusicXML.

Scores must contain one piano part with up to two staves, pitches within A0–C8, and unfolded repeats. Voices, chords, ties (including changes of voice), tempo changes and sounding octave pitches are supported. Untimed grace notes use a short attack borrowed from the following note without changing the measure length. Multi-part scores, repeat navigation and transposing parts are rejected. PDF, images and MIDI are not upload formats.

OpenSheetMusicDisplay renders the original notation; a separate parser builds the playback timeline. Playback uses synthesized notes rather than expressive piano samples; dynamics, pedal markings and other expressive notation are not fully reproduced. Multiple voices sharing a key are merged at a unison attack, and a later attack releases the earlier press of that key.

Approximate fingering allows substitutions and early release of held keys while their original audio continues to sustain, for the fixed five-finger hands. The displayed key presses follow these visual contacts. A new chord requiring more than five fingers per hand disables playback with an explanation; the score can still be viewed and downloaded. This is a visual approximation of sustained playing, not physically validated pedal or hand control.

## For developers

Use Node.js 24 LTS and npm. From the repository directory:

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Production and checks:

```sh
npm test
npm run build
```

The production build exports a static site to `out/`. Serve that directory with a static HTTP server; `next start` is not supported with static export.

### GitHub Pages

Push this repository to GitHub with `main` as the deployment branch. In **Settings > Pages > Build and deployment**, set **Source** to **GitHub Actions**. The **Deploy GitHub Pages** workflow tests, builds and publishes `out/` on every push to `main`; it can also be started manually from the **Actions** tab after Pages is enabled.

The workflow reads the deployment base path from GitHub Pages, including repository subpaths such as `/robianist`. Model URDFs, meshes and textures use the same prefix. Local development defaults to the root path. If your default branch has another name, update `on.push.branches` in `.github/workflows/pages.yml`.

After the workflow succeeds, open the site link in **Settings > Pages**. Ensure the files under `public/models/` are committed so they are included in the published site.

Models are included under `public/models/g1_wuji/`. Keep `g1_wuji.urdf` and its `meshes/` directory together; the loader resolves mesh paths relative to the URDF, including on GitHub Pages. No download or assembly script is required.

### Architecture

- `app/page.tsx`, `app/globals.css`: English floating controls and monochrome stage layout.
- `components/Scene.tsx`: React Three Fiber scene, lighting and cameras.
- `components/GrandPiano.tsx`: piano body and individually animated keys.
- `components/RobotAsset.tsx`: urdf-loader with STL meshes and one connected humanoid rig.
- `lib/presets.ts`: fixed G1 + Wuji model URL and joint names.
- `lib/arm-ik.ts`: URDF transforms and arbitrary joint axes adapted to Three.js CCDIKSolver.
- `lib/fingering.ts`: pitch-ordered visual contacts, approximate substitutions and sustained early releases.
- `lib/music.ts`: score types and keyboard mapping; `lib/player.ts`: shared audio-clock transport and polyphonic synthesis.
- `lib/builtin-scores.ts`: ordered preset titles, difficulty and MXL paths.
- `lib/score.ts`: bounded MXL extraction, MusicXML parsing and note timing.
- `components/SheetMusic.tsx`: engraving and audio-clock cursor.
- `public/models/g1_wuji/g1_wuji.urdf`: user-supplied assembled model; `ASSETS.md`: provenance.

To add a preset, place its MXL in `public/scores/` and add its metadata to `lib/builtin-scores.ts`. Presets and uploads use the same reader. The first preset is the default.

All authored UI text, code comments and documentation are English. Upstream asset notices are preserved verbatim. Future commits should include `Co-authored-by: Codex <codex@openai.com>`.

Keyboard geometry is built directly in metres, independently of the illustrative piano shell: white keys are 155 × 22.9 mm and black keys 95 × 13.7 mm. Key animation and fingertip targets share the same pivot and depression transform. Sound and key presses are score-clock driven, not collision-triggered; an IK target does not prove actual contact. No physics engine is used.
