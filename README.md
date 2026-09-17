# Robianist.js

*A roboticist that happens to be a pianist, in your browser.*

## For users

Robianist.js is a full-screen 3D performance by a seated **Unitree G1 (29 DOF) + Wuji Hand**. The hardware is fixed. Choose a score beside the bottom timeline, upload MusicXML/MXL, or open the sheet music panel. Drag to orbit, scroll to zoom, or select one of six cameras: overview, hands close-up, elevated side, robot eyes, over the shoulder, or a moving arc. The six icon buttons sit in two rows beside the transport; hover for names. Clicking a preset highlights its border and restores that view, even when already selected. Dragging, panning or zooming clears the selection and keeps a custom view, including stopping the moving arc. The default elevated side view looks from the left. The arc follows song time, including pause and seek. The bottom controls and cursor hide after three seconds without input, and immediately on video export. Move the pointer, tap, scroll or use the keyboard to show them again. The title and description can be selected and copied.

The presets are **Human Light** (default) and **If Only...**. Web Audio synthesizes individual notes in a bounded rolling window.

The hardware names link to the manufacturers. Click **How?** below the upload icon for a MusicXML introduction and MuseScore audio, PDF and image conversion links. The sheet music panel uses a transparent background, light notation and a gray playback cursor, with linked artist and arranger credits for presets.

### Scale and assembly

One world unit is one metre. The app loads the user-provided assembled model at `public/models/g1_wuji/g1_wuji.urdf` directly, with its relative mesh paths, material colors, joint limits and left/right palm mounting transforms preserved. No additional adapter or hand mounting transform is inserted. G1's published standing height is approximately 1.32 m.

The procedural piano is built directly in metres, approximately 1.40 m wide and 2.24 m long, with 25 mm white-key spacing (1.30 m keyboard span), white key surfaces at 0.729 m, and a 0.62 × 0.34 m bench with a 0.442 m seat height and a raised foot support for G1. The piano pedal assembly is recessed 100 mm toward the piano interior for leg clearance. Its shape and internal details remain illustrative, not an exact Steinway CAD model. Earlier versions enlarged arms 2.4× and hands 3.2× and did not use real-world proportions.

Sitting is a fixed joint pose. The robot and bench sit 100 mm closer to the keyboard than the initial layout to improve low-bass reach. Arm/finger motion uses joint-limited damped least-squares IK: all seven arm joints solve wrist position and orientation together, with wrist targets derived from the assigned fingers' curved poses. Wide chords turn the hand within the keyboard plane and refine all active contacts together. Idle fingers return to a curved ready pose, then receive a separate lift after wrist solving, targeting 12 mm of pad clearance above unpressed black keys. Fingertip targets include a 7.5 mm approximate pad radius. Playing orientation is derived from the supplied hand geometry. The demo does not validate balance, collision avoidance, or reachability of every note; it is not a robot controller.

### Video export

Choose the camera and open sheet music if wanted, then click **Export video** and select the **Robianist.js tab** in the browser picker. Recording restarts the selected score from the beginning and includes the visible title, sheet music and moving camera. The bottom controls and cursor hide on export; moving the pointer shows them again, including in the recording. Audio comes directly from the synthesizer at the selected volume; no microphone or tab-audio permission is needed. Keep this tab visible and the window at the desired size throughout recording. Switching away pauses playback and saves the partial recording.

At the end the video downloads automatically; **Stop & save** saves a partial performance. A **Download last video** link remains available until the next recording or page reload. Score, timeline, volume and camera preset controls are locked during recording. The browser must support screen capture and MediaRecorder on HTTPS or localhost (desktop Chrome or Edge recommended). Select the current tab: the browser controls the picker, and the application cannot guarantee which tab you select. MP4 is used when its codec is supported, otherwise WebM. Files are created locally, with no server upload.

This is real-time capture: a three-minute song takes three minutes to record. Resolution follows the captured tab, and frame rate depends on rendering performance. Fixed-resolution, offline frame-by-frame export is not implemented.

## Score formats

Uploads accept `.musicxml`, `.xml` and compressed `.mxl` files up to 5 MB (also limited to 5 MB after decompression). Files are read locally and remain in the current browser session. The two presets are stored as independent MXL files in `public/scores/` and fetched on demand. Download exports the selected score as uncompressed MusicXML.

Scores must contain one piano part with up to two staves, pitches within A0–C8, and unfolded repeats. Voices, chords, ties (including changes of voice), tempo changes and sounding octave pitches are supported. Untimed grace notes use a short attack borrowed from the following note without changing the measure length. Multi-part scores, repeat navigation and transposing parts are rejected. PDF, images and MIDI are not upload formats.

OpenSheetMusicDisplay renders the original notation; a separate parser builds the playback timeline. Playback uses synthesized notes rather than expressive piano samples; dynamics, pedal markings and other expressive notation are not fully reproduced. Multiple voices sharing a key are merged at a unison attack, and a later attack releases the earlier press of that key.

Fingering uses a browser-native TypeScript adaptation of [PianoPlayer](https://github.com/marcomusy/pianoplayer). It looks ahead up to nine notes per hand, minimizing weighted finger movement speed with black-key preferences, thumb-crossing rules and chord stretch limits. It uses upstream's medium human-hand geometry as a heuristic, not a calibrated Wuji hand model. No Python installation or service is needed.

The integration keeps chords simultaneous and preserves held contacts where possible, allowing substitutions and early release while original audio continues to sustain. Before a repeated key or reused finger attacks, visual contacts release up to 80 ms early (at most a quarter of the attack interval), allowing the fingers to lift while audio sustains. The displayed key presses follow these visual contacts. If human transition/stretch rules leave no solution, the planner penalizes those violations while still requiring unique, pitch-ordered simultaneous fingers. A new chord requiring more than five fingers per hand disables playback with an explanation; the score can still be viewed. This remains a visual approximation, not physically validated pedal or hand control. Generated fingerings drive robot motion; they are not written into the displayed score.

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

The workflow reads the deployment base path from GitHub Pages, including repository subpaths such as `/robianist.js`. Model URDFs, meshes and textures use the same prefix. Local development defaults to the root path. If your default branch has another name, update `on.push.branches` in `.github/workflows/pages.yml`.

After the workflow succeeds, open the site link in **Settings > Pages**. Ensure the files under `public/models/` are committed so they are included in the published site.

Models are included under `public/models/g1_wuji/`. Keep `g1_wuji.urdf` and its `meshes/` directory together; the loader resolves mesh paths relative to the URDF, including on GitHub Pages. No download or assembly script is required.

### Architecture

- `app/page.tsx`, `app/globals.css`: English floating controls and monochrome stage layout.
- `components/Scene.tsx`: React Three Fiber scene, lighting and cameras.
- `lib/camera.ts`: six camera presets and song-clock-driven arc.
- `lib/use-recording.ts`, `lib/recording.ts`: tab video capture, synthesized audio routing, download and codec selection.
- `components/GrandPiano.tsx`: piano body and individually animated keys.
- `components/RobotAsset.tsx`: urdf-loader with STL meshes and one connected humanoid rig.
- `lib/presets.ts`: fixed G1 + Wuji model URL and joint names.
- `lib/arm-ik.ts`: joint-limited position/orientation IK and simultaneous finger contacts using world-space URDF axes.
- `lib/playing-pose.ts`: finger-relative wrist placement, chord posture, fingertip clearance and ready poses.
- `lib/pianoplayer.ts`: PianoPlayer motion cost, transition rules and memoized lookahead search; `public/licenses/pianoplayer.txt`: upstream MIT notice.
- `lib/fingering.ts`: score-to-contact integration, approximate substitutions and sustained early releases.
- `lib/music.ts`: score types and keyboard mapping; `lib/player.ts`: shared audio-clock transport and polyphonic synthesis.
- `lib/builtin-scores.ts`: ordered preset titles, artist/arranger credits and MXL paths.
- `lib/score.ts`: bounded MXL extraction, MusicXML parsing and note timing.
- `components/SheetMusic.tsx`: engraving and audio-clock cursor.
- `public/models/g1_wuji/g1_wuji.urdf`: user-supplied assembled model; `ASSETS.md`: provenance.

### Repository layout

- `app/`: Next.js routes, page metadata and global styling.
- `components/`: 3D scene, robot, piano and sheet-music UI.
- `lib/`: playback, score parsing, animation, recording and model helpers.
- `public/`: static models, scores and branding assets published with the app.
- `tests/`: Node test coverage for deterministic playback and geometry helpers.
- `.github/workflows/`: GitHub Pages CI and deployment.
- Generated recognition and other local scratch files belong in ignored `tmp/` or `output/` directories.

To add a preset, place its MXL in `public/scores/` and add its metadata to `lib/builtin-scores.ts`. Presets and uploads use the same reader. The first preset is the default.

All authored UI text, code comments and documentation are English. Upstream asset notices are preserved verbatim. Future commits should include `Co-authored-by: Codex <codex@openai.com>`.

Keyboard geometry is built directly in metres, with a matching keybed and enclosing piano shell: white keys are 180 × 24.4 mm and black keys 110 × 14.5 mm. Key animation and fingertip targets share the same pivot and depression transform. Sound and key presses are score-clock driven, not collision-triggered; an IK target does not prove actual contact. No physics engine is used.
