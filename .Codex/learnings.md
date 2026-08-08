# Learning Integrity

- A route/assets smoke test is not a gameplay-quality review. Audit what Eleni sees and hears before every decision.
- Wrong retries must keep every choice available and must not identify, highlight, flash, speak, insert, accept, or auto-advance the correct answer. Replay the prompt or the selected wrong choice instead.
- Sentence games must ask a real comprehension question; the choices cannot repeat the visible sentence as a copyable answer.
- Any unlabeled picture choice must pass a blind name-the-picture review and match the intended word in American English.
- Report release state precisely: local fix, pushed branch, merged main, deployed production, and live-device verification are separate gates.
- Optional packs must never create a progression dead end; a prerequisite screen must restore any disabled teaching source it requires.
- Different sounds for the same grapheme need separate audio/mastery IDs and deterministic session coverage.
- Validate every child-facing answer and distractor, not only the correct option or the most common content registry.
- A successful audio request, a `running` AudioContext, or a resolved `play()` promise does not prove that an installed Apple PWA reaches the speakers. Exercise a real start tap, assert decoded audio is non-silent, verify playback time advances, and keep physical-device confirmation as a separate release gate.
- iPhone/iPad PWA recovery listeners must remain installed for later gestures. Recreate native media sources after foreground/session loss, but only pause/resume the existing music element during speech so the track does not restart after every phoneme.
- Sound and music switches must be tested at the playback boundary. Turning music on must call `play()` inside the trusted tap, and enabled persisted zero-volume settings must migrate back to audible defaults.
