# Robianist

*A roboticist that happens to be a pianist.*

## For users

Robianist is a playful, full-screen 3D robot piano performance. Combine a pair of robot arms with dexterous hands, choose a score, and watch the fingers and 88 piano keys move with synthesized, per-note sound. Drag to orbit, scroll to zoom, or use the close-up camera. Play, pause, restart, seek, and adjust volume from the floating player.

Available arms: Franka Emika Panda, Universal Robots UR5e, Flexiv Rizon 4 / mirrored 4R, and KUKA LBR iiwa 7 R800. Available hands: LEAP Hand v1, Wonik Robotics Allegro Hand, Shadow Dexterous Hand, Sharpa Wave, and Wuji Hand. Every hand loads separate upstream left and right models. These are well-established models with accessible assets; this project does not claim a verified sales/popularity ranking. Tianji Marvin is listed as unavailable pending an accessible, redistributable model.

Scores include Frère Jacques, Twinkle, Twinkle, Little Star, and an original six-note Chord Study. Audio is generated for individual note events with Web Audio oscillators, not a prerecorded song. The grand piano is an original Steinway-inspired approximation, not an official Steinway model or a Steinway sample library.

Lightweight rendering lowers pixel density and removes expensive shadows and piano strings. It keeps the selected hardware's actual meshes and joint structure. Models load on demand and are cached during the session. This option does not reduce model download size and does not perform convex decomposition.

This is entertainment, not a physics simulator. Position IK and heuristic fingering do not guarantee collision avoidance, mechanically feasible wrist orientation, or perfect contact for every hardware/score combination.

## Score formats

[MusicXML](https://www.w3.org/2021/06/musicxml40/) (`.musicxml`, `.xml`, compressed `.mxl`) is a broadly used interchange format for written notation, including voices, measures, and articulations. [Standard MIDI](https://midi.org/standard-midi-files) (`.mid`, `.midi`) is widely supported for timed note-on/note-off performance data and is a natural input to this player's timeline. A future upload feature should support both: MusicXML for notation and MIDI for performance. PDF and score images would require a separate optical music recognition step.

The current release uses normalized note events in `lib/music.ts`; file upload and commercial pop-song arrangements are not implemented. Add only scores you have permission to distribute.

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
npm start
```

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
- `lib/fingering.ts`: deterministic pitch-ordered fingering with held-finger reservations and travel cost and a preference for longer fingers.
- `lib/music.ts`: normalized scores; `lib/player.ts`: shared audio-clock transport and polyphonic synthesis.
- `scripts/fetch-models.mjs`: pinned asset acquisition; `ASSETS.md`: provenance.

To add an arm, provide a local URDF, end link, joint names, scale and initial pose in `lib/presets.ts`. To add a hand, supply left/right URLs, palm link and anatomical fingertip order (thumb, index, middle, ring, little). URDFs may reference GLB, STL, DAE or OBJ visual meshes. Verify joint limits, tip contact and orientation visually before claiming support.

To add a song, supply MIDI pitch, start time and duration in seconds, and a left/right hand assignment. Notes can overlap: simultaneous notes receive distinct fingers; sustained notes retain their assigned finger. The current planner rejects passages requiring more fingers than the selected hand has or finger crossings/substitutions. It is a heuristic, not an optimal piano fingering solver.

All authored UI text, code comments and documentation are English. Upstream asset notices are preserved verbatim. Future commits should include `Co-authored-by: Codex <codex@openai.com>`.
