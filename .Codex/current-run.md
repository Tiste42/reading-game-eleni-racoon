# Phoneme repair release candidate — 2026-09-09

FINAL CANDIDATE supersedes the historical notes below: all 30 files have human-library provenance and file-bound audio identity reviews. L now uses a normalized isolated light-L from Peter Isotalo (CC BY-SA 3.0); X removes its leading letter-name vowel from buzzphonics; voiced TH uses the isolated initial sound from a CC0 American-English recording of this. Final L/TH passed both current Flash and Pro checks. No synthesized phonemes.

Audio judgments are NOT uniformly reliable. Retained raw disagreements in tasks/phoneme-*-review*.json. tasks/phoneme-release-review.json distinguishes correct sound identity from pure-articulation quality: ten original stop/glide cues have brief release vowels; this is NOT a claim of zero-schwa blending or physical iPad listening. Final per-file hashes are locked in unit/browser tests.

Full local built-app Chromium+WebKit suite: 55 passed, 21 intentional browser-specific skips. Unit (44), typecheck, lint, build, content validation passed. Final-media focused browser rerun pending completion. Publication must verify all 30 public file hashes, exact production SHA, and live audio/progress routes.

This release repairs phonemes/shared initial-sound picture selection, not the separately blocked rhyme-narration prefix/voice continuity. Preserve that follow-up below and do not call it fixed. Rollback only the release if new regressions occur; do not erase user saves. Previous production SHA: 3ad7dca7954eb7f3db1625e19caabc2c56d4600b.

## Historical investigation — superseded by final candidate above

Root cause: alphabet expansion 1369321 replaced 28 original phoneme MP3s while leaving buzzphonics credits unchanged. Restored those bytes from 8783e74 and imported upstream qu.m4a at f51eeb71 as q.mp3 (format conversion only). Library hashes are pinned. th-voiced.mp3 remains unresolved; do not represent all sounds as verified. No ElevenLabs phoneme generation is permitted; generator manifest removed and old fixer disabled. AUDIO_VERSION bumped locally.

Shared initial-sound groups now merge duplicate letter/sound entries across packs and exclude the bug asset depicting a ladybug. SoundSafari's correct picture now uses the actual target instead of independently choosing another word. No save schema or reward changes.

Checks: 44 unit tests, typecheck, production build, content validation, seven muted Chromium browser checks passed. Browser checks compare 29 served MP3 hashes, three sound-request/answer mappings, trail layout and saved rewards. These are not audible phoneme-quality or physical iPad proof. No commit, push, or deployment this follow-up. Release still needs voiced-th provenance/listening and the separately blocked rhyme narration repair below. Original 28-file recovery script does not touch Q or voiced TH.

# Bounded reading refresh — 2026-09-09

## Rhyme narration follow-up — blocked before runtime changes

Parent reports missing question opening, jarring timing and backup voice. Source: RhymeBeach passes only current.target to useGameSpeechWithOptions, which has no pause before naming the first choice. Wrong retry builds a full dynamic question, while speech.ts only has recorded full questions for cat/bug/log/hen/pin; newer targets hit browser TTS. Correct feedback may also be cut off by the 700ms next-round handoff.

Needed repair: recorded question prefix, target, deliberate pause, evenly highlighted recorded choices; recorded-only retry and interruption ownership. Preserve trail/candies and choices remaining touchable when narration stalls.

Generating just narration/inst-what-rhymes-with.mp3 failed: ElevenLabs HTTP 400 api_key_id_used_as_api_key. User must securely repair ELEVENLABS_API_KEY in .env.local. No new audio or runtime changes were made, and nothing was published in this follow-up. Local changes are the generator's exact --only filter/manifest and diagnosis notes. Do not substitute a voice or guess an audio-trim boundary to bypass the missing recording.

## Changes and verified candidate

- Letter Intro selects remaining untaught letters before mixing review; at most two uncertain sounds are prioritized when enough other practice exists.
- World 1 Sound Hunt and First Sound rotate sound groups, then picture variants.
- Plaza Puzzle and Sailboat Race earn one closer safe distractor after at least three correct word attempts and 80% accuracy. No extra choices, time limits, answer hints, or audio changes.
- Shared adventure trail fits phone screens; all 31 game components explicitly signal final completion. Plaza choices and mosaic now fit 375px.
- One bounded Luna review; main review addressed final-checkpoint feedback and visually found/fixed mosaic clipping.
- Final production build, typecheck and lint passed; 41 unit tests passed. Content validation: 5 packs, 124 word records, 99 pictures, 262 audio files.
- Final fixed-build muted Chromium + iPad/WebKit: 50 passed, 18 intentional browser-specific skips. Includes full six-round playthroughs in both browsers, 36-route phone layout/asset/input checks, no-answer-leak contracts, saves/packs, music/replay/toggles, and Apple foreground recovery.
- Source frozen for publication. Exact deployed commit and public checks are recorded locally in `test-results/reading-refresh-release.md` after publishing; verify that evidence or the live version rather than inferring deployment from this candidate record.

## Boundaries

- Public validation: all unique smoke/gameplay/audio checks passed after correcting one fixture race. The initial live run had 13 passes and one tablet save assertion failure. Pre-hydration progress seeding fixed the fixture; the corrected save test passed six consecutive public runs (three per browser), including starting balance, post-reload balance/stamps, and recorded word success. Application save/audio code did not change. Test-only follow-up commit records this correction.

- No new media, dependencies, audio implementation, save schema, reward rules, or progression IDs.
- Physical iPad/phone speaker output and Lenny's experience are not confirmed by the muted tests. Earlier ambiguous parent text was not hardware confirmation.
- Deferred broader work: record actually presented rather than reserved batches; broader diagnostic key unification; new mechanics/artwork. Do not quietly widen this small release.
- Development HMR once caused transient input-check failures; fixed-build rerun passed. Full-session test initially inspected an exiting picture; corrected by waiting for the target to change. These were not dismissed as success.

---

# Whole-game sound semantics and variety release candidate - 2026-08-27

## Scope repaired

- Removed the shared tap SFX that made every neutral selection sound wrong.
- Sound/phoneme controls now use only the static human phoneme files and never
  fall back to browser TTS saying a letter name or artificial pseudo-phoneme.
- Rewired World 1 and fallback World 2 boss sound questions to compose the
  instruction with a real phoneme clip.
- Added recent-history-aware target selection to remaining Worlds 4-6 games,
  expanded connected-reading/boss pools, and added recorded digraph words.
- Preserved save schema/version and existing game/progression identifiers.

## Verified release candidate

- `npm run typecheck`, `npm run lint`, and `npm run build`: passed.
- `npm run validate:content`: 5 packs, 124 word records, 99 pictures, 262 audio files.
- `npm run test:unit`: 35 passed.
- Muted Chromium: 30 passed, 1 intentional Apple-only skip.
- Muted iPad/WebKit: 15 applicable passed, 16 intentional project-specific skips.
- Every game route boots; primary touch actions survive stalled narration; saves
  migrate; automatic answer reveal stays disabled; all 30 phoneme assets decode
  to non-silent signal.

## Remaining release boundary

- Commit/merge and verify the exact public `version.json` commit.
- Automated runs are intentionally silent. Physical iPad/phone speaker output
  still requires one human listening check after the public build is live.

---

# V2.2 Apple audio hotfix live - 2026-08-07

## Incident

- Production MP3 files were valid, but the iPhone/iPad installed-PWA path forced
  every channel through WebAudio. WebKit can leave that AudioContext reporting
  `running` while routing no sound to the speakers after launch or resume.
- The voice/sound switch was not connected to speech or effects, and the
  one-shot recovery path could permanently believe audio was unlocked.

## Candidate repair

- Apple mobile/PWAs use three reusable native media channels for music, speech,
  and effects. Sources are refreshed after foreground/session loss and every
  later trusted gesture can recover playback.
- Speech ducking pauses/resumes music at its existing position. Music enable is
  started inside the toggle tap. Apple settings use device volume controls.
- Desktop browsers retain Howler/WebAudio. Existing progress migrates to store
  version 5 without resetting learning history.
- Regression coverage checks non-silent decoded playback, advancing native
  playback time, real Play, voice/music/effect toggles, foreground recovery,
  audio warnings, and all runtime music/effect files.

## Live release evidence

- PR #4 merged to `main` as `95e7186ef60cef8c6e4a3d072ddbfb209b025266`.
- Vercel deployment `dpl_EfvWrKgHeTxVbXHnW7HbC4gMUuUn` is production `READY`.
- Public `/version.json` reported the exact merge commit.
- Public Chromium/WebKit audio and route suite: 10 passed, 4 intentional skips,
  0 failed. Main CI and both independent reviews passed.
- Physical iPhone/iPad speaker output remains Baptiste's final confirmation;
  browser automation cannot honestly claim the hardware speaker route.
