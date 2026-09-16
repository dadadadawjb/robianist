# Asset sources and notices

Retrieved 2026-09-16. Original third-party notices remain beside the assets. No manufacturer endorsement is implied.

## Supplied G1 + Wuji assembly

The user supplied `public/models/g1_wuji/g1_wuji.urdf` and its `meshes/g1`, `meshes/left`, and `meshes/right` folders. This is the active model, loaded without rewriting the URDF. Relative mesh references, visual material colors, joint limits, and the fixed `left_hand_palm_joint` / `right_hand_palm_joint` origins are preserved. The browser disables collision rendering; source collision elements remain in the file.

The supplied folder contains no source URL or license notice identifying the assembly author. Its provenance is recorded here as user-provided; no license for the combined assembly is inferred. The previous separately downloaded vendor assets, generated assembly, and assembly/download scripts have been removed.

Meshes remain at the scale specified by the supplied URDF. Sitting and piano-playing motion are authored visualization, not a validated controller.

## Piano and bench

Original procedural meshes, with no downloaded piano asset or Steinway logo. Overall piano proportions target approximately 1.56 m width and 2.74 m length, using the [Steinway Model D dimensions](https://www.steinway.com/spirio) as a size reference. This is not a dimensionally faithful D274 CAD reproduction. The keyboard uses 23.5 mm white-key spacing and a 0.729 m top surface. The authored bench is 0.62 × 0.34 × 0.442 m.

## Scores and sound

User-provided `HumanLight.mxl` and `IfOnly.mxl` are retained as preset scores. Audio uses Web Audio oscillators and decaying harmonics; no recording or sample library is bundled.

## Libraries

Three.js / React Three Fiber / Drei supply rendering and CCD IK. urdf-loader loads articulated STL assets. Lucide supplies UI icons. Dependency versions and third-party notices remain in the installed packages and lockfile.

Keyboard geometry is built directly in metres, independently of the illustrative piano shell: white keys are 155 × 22.9 mm and black keys 95 × 13.7 mm. Key animation and fingertip targets share the same pivot and depression transform. Sound and key presses are score-clock driven, not collision-triggered; an IK target does not prove actual contact. No physics engine is used.
