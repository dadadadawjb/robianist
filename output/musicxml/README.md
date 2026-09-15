# If Only - transcription status

`if-only-omr-draft.musicxml` is the complete, uncompressed output of local Audiveris 5.11.0 recognition of the seven-page PDF supplied by the user. It contains one piano part, 94 detected measures and 2,268 note/rest elements. Composer: JJ Lin. Source arrangement: MapleZS, as credited in the supplied PDF.

**This is an uncorrected recognition draft, not a verified transcription or playable preset.** The website correctly rejects it because ties do not connect matching consecutive notes. Visual inspection also found a missed mid-measure treble clef near the end of measure 3, affecting the pitches in measure 4, and a duplicated measure number 78. Audiveris reported multi-rest and rhythm recognition problems. A second recognition pass on a thresholded image produced split movements and further clef warnings, so it was not substituted.

Open the draft in MuseScore, compare all seven source pages, and correct pitches, rhythms, rests, voices, clef changes, octave shifts and ties. Set the opening tempo to quarter note = 80, as shown in the PDF. Then export an uncompressed `.musicxml` file and validate it with the site's upload feature. Successful import is a structural check, not proof of musical fidelity.

The installed MuseScore 4 command-line process exited with code 1320 without producing the requested export. Its desktop window launched, but subsequent UI inspection was stopped by the user. No successful MuseScore validation is claimed. The draft is intentionally kept outside `public/` and outside the preset library.
