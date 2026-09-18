# Robianist.js

![logo](public/logo.png)

_A roboticist that happens to be a pianist, in your browser._

## Demo

![screenshot](public/screenshot.png)

## For developers

### How it works

Built with React, Next.js, Three.js, and React Three Fiber.

The scene is [assembled](https://r3f.docs.pmnd.rs/) as a browser-based [3D stage](https://threejs.org/) containing a procedurally modeled grand piano, bench, lighting, and cameras.
The [Unitree G1 humanoid](https://github.com/unitreerobotics/unitree_ros/tree/master/robots/g1_description) and [Wuji hands](https://github.com/wuji-technology/wuji-description/tree/main/hand) are [imported](https://github.com/gkjohnson/urdf-loaders) from URDF and STL assets.
Preset or user-uploaded MusicXML/MXL scores are [parsed](lib/score.ts) into [timed piano-note events](lib/music.ts), [rendered](https://opensheetmusicdisplay.github.io/) as synchronized sheet music, and [scheduled](lib/player.ts) with [Web Audio](lib/audio.ts).
The [fingering planner](https://github.com/marcomusy/pianoplayer) assigns playable left- and right-hand contacts while preserving chord ordering, sustained notes, substitutions, and short lift gaps before repeated attacks.
For each hand, custom [seated-pose logic](lib/playing-pose.ts) first establishes a relaxed finger posture, curved ready poses for inactive fingers, fingertip-to-wrist offsets, and a wrist orientation aligned to the keyboard.
Active fingertip targets follow the tilted key surface, with longer fingers landing slightly deeper on the keys. The wrist starts preparing for nearby attacks, while curved idle-finger poses avoid the hyperextended joints produced by vertical fingertip lifting.
Custom [joint-limited damped-least-squares inverse kinematics](lib/arm-ik.ts) solves the arm joints for wrist position and orientation, then solves each finger joint chain for its assigned key; chord contacts and difficult single-note transitions are corrected together with the shared arm chain. Gentle beat-based torso motion is compensated by the same world-space hand targets.
The resulting angles are applied to the URDF hierarchy.
The [damper pedal](lib/pedal.ts) extends audio decay after a finger releases a key, until the next pedal release. The right foot and piano's right pedal share the same seekable animation and contact geometry.

> MusicXML parsing is custom and currently supports single-part piano scores with up to two staves, pitches within A0–C8, multiple voices, chords, ties, tempo changes, octave-shift engraving, basic grace notes, arpeggios, discrete dynamics, paired crescendo/diminuendo wedges, and on/off damper pedal events (including repedalling). Repeats must be unfolded in advance. Slur articulation, half-pedalling, sostenuto/soft pedals, multi-part scores, transposing parts, and repeat navigation are not supported. Audio uses smplr SplendidGrandPiano Steinway samples with velocity layers. Seeking into an already sounding note approximates its tail with a softer new attack.
>
> The demo does not validate balance, collision avoidance, or the reachability of every note. It directly resets joint configurations for visualization rather than executing motions through a robot controller, and should not be interpreted as a physically valid or deployable control system.
>
> Audio playback and robot motion are driven independently; neither directly controls or causes the other.

Use the Speed control to play at 0.5×–2× without changing pitch. Audio, sheet music and robot animation share the adjusted score clock. The timeline shows score time. Changing speed during a held note resumes it with the same approximate tail used for seeking.

### How to run

Use Node.js and npm. From the repository directory:

```sh
npm ci
npm run dev
```

Open http://localhost:3000. After the stage loads, piano samples are downloaded and decoded in the background from `smpldsnds.github.io`; an internet connection is required. Audio is enabled only when Play is clicked. If samples are still loading, playback waits until they are ready. Samples are reused for subsequent playback and score changes while the page remains open. If loading fails, check the connection and press Play to retry.

Production and checks:

```sh
npm test
npm run build
```

The production build exports a static site to `out/`. Serve that directory with a static HTTP server; `next start` is not supported with static export.

The bundled If Only... score applies each dynamic marking to both piano staves for balanced playback.
