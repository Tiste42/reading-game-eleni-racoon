# Learning Integrity

- Audio intent is part of the learning contract: letter-name prompts may say a letter name, but phoneme/sound prompts must play the verified isolated phoneme recording.
- A whole-game content upgrade cannot be certified from one anchor world. Audit all games and all child-facing audio call sites before release, including worlds the current child save has not reached.
- A neutral tap effect must be perceptually neutral. If a child or parent hears it as the wrong-answer buzzer, remove it from selection paths rather than debating the filename or implementation intent.
- Expanding a pool is not enough: measure immediate repeats, within-session variety, and cross-session cooldown behavior using the actual round selectors.

- Narration is assistive and must fail open: never disable gameplay controls while waiting for audio or browser speech to finish.
- Expanded content must either reuse validated static clips or ship complete new audio coverage; a dynamic spoken prompt is not covered merely because all of its individual words exist.
- For mobile playability, simulate missing audio and a browser speech callback that never fires, then prove the child can still answer and advance.
- Keep automated browsers muted unless audible playback is the explicit subject of a user-approved device test.

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
