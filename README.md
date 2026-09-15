# Robianist

*A roboticist that happens to be a pianist.*

## For users

Robianist is a playful, full-screen 3D robot piano performance. Combine a pair of robot arms with dexterous hands, choose a score, and watch the fingers and 88 piano keys move with synthesized, per-note sound. Drag to orbit, scroll to zoom, or use the close-up camera. Play, pause, restart, seek, and adjust volume from the floating player.

Available arms: Franka Emika Panda, Universal Robots UR5e, Flexiv Rizon 4 / mirrored 4R, and KUKA LBR iiwa 7 R800. Available hands: LEAP Hand v1, Wonik Robotics Allegro Hand, Shadow Dexterous Hand, Sharpa Wave, and Wuji Hand. Every hand loads separate upstream left and right models. These are well-established models with accessible assets; this project does not claim a verified sales/popularity ranking. Tianji Marvin is listed as unavailable pending an accessible, redistributable model.

The two presets are **Human Light** (Easy, selected by default) and **If Only...** (Hard). Upload your own uncompressed MusicXML or compressed MXL, or open the Sheet music tab to follow the score. Audio is generated for individual note events with Web Audio oscillators, not a prerecorded song. Notes are scheduled in a short rolling window so long scores do not allocate thousands of voices when playback starts. The grand piano is an original Steinway-inspired approximation, not an official Steinway model or a Steinway sample library.

Lightweight rendering lowers pixel density and removes expensive shadows and piano strings. It keeps the selected hardware's actual meshes and joint structure. Models load on demand and are cached during the session. This option does not reduce model download size and does not perform convex decomposition.

This is entertainment, not a physics simulator. Position IK and heuristic fingering do not guarantee collision avoidance, mechanically feasible wrist orientation, or perfect contact for every hardware/score combination.

## Score formats

Uploads accept `.musicxml`, `.xml` and compressed `.mxl` files up to 5 MB (also limited to 5 MB after decompression). Files are read locally and remain in the current browser session. The two presets are stored as independent MXL files in `public/scores/` and fetched on demand. Download exports the selected score as uncompressed MusicXML.

Scores must contain one piano part with up to two staves, pitches within A0–C8, and unfolded repeats. Voices, chords, ties (including changes of voice), tempo changes and sounding octave pitches are supported. Untimed grace notes use a short attack borrowed from the following note without changing the measure length. Multi-part scores, repeat navigation and transposing parts are rejected. PDF, images and MIDI are not upload formats.

OpenSheetMusicDisplay renders the original notation; a separate parser builds the playback timeline. Playback uses synthesized notes rather than expressive piano samples; dynamics, pedal markings and other expressive notation are not fully reproduced. Multiple voices sharing a key are merged at a unison attack, and a later attack releases the earlier press of that key.

Approximate fingering allows substitutions and early release of held keys while their original audio continues to sustain, so both presets can play on four- and five-finger hands. The displayed key presses follow these visual contacts. A new chord that needs more fingers than the selected hand has disables playback with an explanation; the score can still be viewed and downloaded. This is a visual approximation of sustained playing, not physically validated pedal or hand control.

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

Models are included under `public/models/`. To fetch the pinned upstream visual resources again (requires internet and GitHub API access):

```sh
node scripts/fetch-models.mjs
```

The downloader preserves upstream license notices and original URDFs as `.urdf.source`, removes collision elements from browser URDFs, and resolves mesh paths to local public URLs. Existing mesh files are reused. To update a model, change its pinned source commit and remove only the corresponding cached model directory before downloading again.

### Architecture

- `app/page.tsx`, `app/globals.css`: English floating controls and monochrome stage layout.
- `components/Scene.tsx`: React Three Fiber scene, lighting and cameras.
- `components/GrandPiano.tsx`: piano body and individually animated keys.
- `components/RobotAsset.tsx`: urdf-loader plus Three.js GLTF/OBJ/MTL loaders; preserved upstream materials and paired hand rigs.
- `lib/presets.ts`: independent arm/hand descriptors, model URLs, endpoints and initial arm poses.
- `lib/arm-ik.ts`: URDF transforms and arbitrary joint axes adapted to Three.js CCDIKSolver.
- `lib/fingering.ts`: pitch-ordered visual contacts, approximate substitutions and sustained early releases.
- `lib/music.ts`: score types and keyboard mapping; `lib/player.ts`: shared audio-clock transport and polyphonic synthesis.
- `lib/builtin-scores.ts`: ordered preset titles, difficulty and MXL paths.
- `lib/score.ts`: bounded MXL extraction, MusicXML parsing and note timing.
- `components/SheetMusic.tsx`: engraving and audio-clock cursor.
- `scripts/fetch-models.mjs`: pinned asset acquisition; `ASSETS.md`: provenance.

To add an arm, provide a local URDF, end link, joint names, scale and initial pose in `lib/presets.ts`. To add a hand, supply left/right URLs, palm link and anatomical fingertip order (thumb, index, middle, ring, little). URDFs may reference GLB, STL, DAE or OBJ visual meshes. Verify joint limits, tip contact and orientation visually before claiming support.

To add a preset, place its MXL in `public/scores/` and add its metadata to `lib/builtin-scores.ts`. Presets and uploads use the same reader. The first preset is the default.

All authored UI text, code comments and documentation are English. Upstream asset notices are preserved verbatim. Future commits should include `Co-authored-by: Codex <codex@openai.com>`.
