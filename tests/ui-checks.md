# Manual UI regression checks

Run `npm run dev` and open the local site. These checks complement `npm test`.

## Piano preloading

- Reload without pressing Play. After the robot finishes loading, sample requests to `smpldsnds.github.io` begin. The playback clock remains at zero and no sound plays.
- Wait for samples to finish, then press Play. Playback starts without flashing the sample-loading message. Pause, resume and change scores; samples are reused.
- With a throttled connection, press Play before preloading finishes. The loading message appears and playback starts only once samples are ready; only one instrument is loaded.
- Switch songs or hide the page during this wait. Completion must not start the cancelled playback.
- Block sample requests, reload and allow preloading to fail. Unblock requests and press Play; loading retries successfully.
- Navigate away while preloading. No delayed playback or unhandled rejection should occur.

## Sheet music

- On a fresh page, the sheet panel stays unloaded until Show sheet music is clicked.
- Open a score, wait for engraving, scroll down, close with X, and reopen. The same engraving remains and the panel follows the current playback cursor; no engraving message reappears.
- During playback, close the panel, let playback advance, and reopen. The cursor catches up to the current position. Repeat after seeking backwards while hidden.
- With the panel closed, switch songs. Reopening displays the new song, not the retained old score.
- Change viewport width with the panel open. The score fits the new width. Height-only changes must not trigger a full engraving pass (check `osmd.render()` with a debugger breakpoint).
- With a breakpoint on the cursor synchronization effect, verify that hiding the panel skips cursor traversal and scroll measurements while playback continues.

## MusicXML help

- Click How?; the help block has a visible X at its upper right, clear of the heading.
- Click X; the block closes and keyboard focus returns to How?.
- Open again with How?, then close with How?; the original toggle still works.
- Open with the keyboard, focus X and activate it; the help closes.

## Playback speed

- Select 0.5x and 2x before playing: pitch stays unchanged, while the score clock, notes, pedal and robot move at the selected speed.
- Change speed while playing: score position stays continuous and playback continues at the new rate.
- Pause, change speed and resume; seek while playing; change speed while samples load. Each resumes at the selected score position and latest speed.
- Switch songs: speed stays selected, the new score starts at zero, and playback still stops at its end.
