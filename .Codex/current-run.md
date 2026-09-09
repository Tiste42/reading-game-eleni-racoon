# Bounded reading refresh — 2026-09-09

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
