# Asset sources and notices

Retrieved 2026-09-16. Original third-party notices remain beside the assets. No manufacturer endorsement is implied.

## Supplied G1 + Wuji assembly

The user supplied `public/models/g1_wuji/g1_wuji.urdf` and its `meshes/g1`, `meshes/left`, and `meshes/right` folders. This is the active model, loaded without rewriting the URDF. Relative mesh references, visual material colors, joint limits, and the fixed `left_hand_palm_joint` / `right_hand_palm_joint` origins are preserved. The browser disables collision rendering; source collision elements remain in the file.

The supplied folder contains no source URL or license notice identifying the assembly author. Its provenance is recorded here as user-provided; no license for the combined assembly is inferred. The previous separately downloaded vendor assets, generated assembly, and assembly/download scripts have been removed.

Meshes remain at the scale specified by the supplied URDF. Sitting and piano-playing motion are authored visualization, not a validated controller.

## Piano and bench

Original procedural meshes, with no downloaded piano asset or Steinway logo. The piano is authored directly in metres at approximately 1.40 m width and 2.24 m length, with a connected keybed, rim, soundboard, frame, lid prop and raised pedal assembly. It is an illustrative grand piano, not a dimensionally faithful Steinway CAD reproduction. The keyboard uses 25 mm white-key spacing and a 0.729 m top surface. The authored bench is 0.62 × 0.34 × 0.442 m.

## Scores and sound

User-provided `HumanLight.mxl` and `IfOnly.mxl` are retained as preset scores. Audio uses Web Audio oscillators and decaying harmonics; no recording or sample library is bundled.

## Libraries

Three.js / React Three Fiber / Drei supply rendering and CCD IK. urdf-loader loads articulated STL assets. Lucide supplies UI icons. Dependency versions and third-party notices remain in the installed packages and lockfile.

Keyboard geometry is built directly in metres, with a matching keybed and enclosing piano shell: white keys are 180 × 24.4 mm and black keys 110 × 14.5 mm. Key animation and fingertip targets share the same pivot and depression transform. Sound and key presses are score-clock driven, not collision-triggered; an IK target does not prove actual contact. No physics engine is used.
