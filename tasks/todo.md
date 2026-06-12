# Overhaul Plan — Leni's Sound Safari (audited 2026-06-11)

Full audit findings: see `tasks/audit-2026-06-11.md`. This is the execution checklist.

## Session progress 2026-06-11 (overhaul session 1)
- [x] Phoneme fix pipeline: scripts/fix-phonemes.ts — IPA candidates + ffmpeg trims, judged best-of-3 by Gemini audio; installs winners, originals in public/audio/phonemes/_originals/
- [x] KEY FINDING: narration was already warm (8-9/10) — robotic voice = browser TTS fallback on uncovered strings + schwa phonemes. Did NOT regenerate narration (saved credits).
- [x] speech.ts: browser-TTS fallback on missing files (no more silence), music ducking, coverage-miss console warnings, speakClip/speakSyllables/speakBlend
- [x] store.ts: soundStats per-sound tracking + getShakySounds() — real diagnostics; shown in parent dashboard ("Sound Check")
- [x] Shared juice kit: WordCard (PNG art w/ emoji fallback + itemArt manifest), PressButton (3D + tap sfx), GameShell (progress bar), upgraded CelebrationOverlay (Eleni + confetti + sfx)
- [x] useComposedSpeech hook (instruction → phoneme → options)
- [x] World 1 rebuilt: RhymeBeach=piñata fiesta w/ scaffold-down + rhyme modeling; SyllableClap=maraca beats w/ segmented audio; SoundSorting=basket toss w/ fly animation; OddSoundOut=stage w/ clean phoneme compose; SoundHunt=scattered scene w/ idle hints
- [x] New narration manifest entries (rhyme models, beat counts, syllables, odd-out templates, coverage gaps) — generating
- [x] Word art generation expanded to ~110 words, no-text prompts — generating
- [x] /audio-check.html — listening page for Baptiste to verify sounds by ear
- [x] Spacing fix: World 1 games were clustering content in tall-screen center w/ tiny 84px Leni. Switched to justify-evenly + bigger Leni (120) + bigger pictures; GameShell max-w-xl wrapper. Verified tablet + mobile.
- [x] Verified: tsc exit 0; all 5 W1 games play-tested in preview (real art, clean audio, diagnostics tracking, no console errors)
- [!] First W2-6 bug-fix subagent STALLED (0 output in 84min) — re-dispatching
- [x] W2-6 bug fixes + WordCard adoption (3 parallel agents, all tsc-clean)
- [x] GLOBAL FIX: Eleni PNGs had raccoon at ~46% of a 1024 canvas → tiny everywhere. scripts/trim-eleni.ts trims transparent padding → every game's raccoon is now big. (originals in eleni/_untrimmed)
- [x] ReplayButton → prominent "🔊 Again" pill (user couldn't find hear-directions button)
- [x] BIG & SIMPLE template established (GameShell + justify-between + Leni 120-140 + pics 150-180 + letter tiles 96-104). See [[design-big-simple]].
- [x] Rebuilt big/simple on template: MarketBuilder (foolproof tap-in-order build), SurfSlide (foolproof tap-glowing-letter continuous blend). Both verified in preview.
- [x] SHIPPED (commit 8783e74): W1 complete + boss, SurfSlide/SoundTelescope/MarketBuilder, human phonemes, varied praise. Live on lenis-sound-safari.vercel.app
- [x] Sound-out truncation fix: soundOut must AWAIT each speakPhoneme (fixed timers cut the 1-1.5s human recordings off — "sounds don't blend")
- [x] W2 fully rebuilt: LetterIntro (hear REAL phoneme → pick letter), SoundSafari (sound → pick picture), LetterMatch (letter↔picture pairs), SoundSort (two-basket sort), LetterTrace (picture → first letter). All drive-tested, diagnostics recording.
- [x] W3 fully rebuilt: SailboatRace (read sail word w/ tappable letters → sail to 🏝️ island w/ picture), PlazaPuzzle (big picture → read 3 words, mosaic fills). Drive-tested.
- [ ] RETROFIT remaining games onto big-simple template:
      W4: potion-lab, word-towers, knights-doors, dragon-feed, garden-grow
      W5: heart-word-map, digraph-discovery, ruin-decoder, treasure-memory, souk-sentences
      W6: story-stroll, comic-creator, manatee-rescue, beach-detective, postcard-writer
- [ ] NEXT: coin shop/dress-up, PWA service worker

## Phase 1 — Fix the sounds (the #1 reported problem)
- [ ] Regenerate stop-sound phonemes (t, p, c, k, d, g, b, j, ch) without schwa: clipped, minimal release. Try ElevenLabs with tighter settings + trimming silence/schwa tail with audio post-processing (ffmpeg trim); verify each by ear.
- [ ] Fix 'x' (only teach in word context, e.g. "fox" — remove isolated /ks/ from games), 'j' and 'y' disambiguation.
- [ ] Add Starfall-style accelerating blend audio: pre-bake each blend at 3 speeds (slow → medium → fused word).
- [ ] Add fallback: if a static audio file fails to load, fall back to browser TTS instead of silence (speech.ts:348, :409).
- [ ] Audio ducking: lower music volume while Leni speaks.
- [ ] Fix wrong-feedback text bugs: SoundHunt.tsx:271 (passes first letter of emoji word instead of target sound), SoundSort.tsx:135 (repeats letter instead of phoneme).

## Phase 2 — Fix correctness bugs
- [ ] SailboatRace: boat progress never resets between rounds.
- [ ] KnightsDoors: correct door should highlight green on reveal (color logic inverted, line ~169).
- [ ] PlazaPuzzle: shuffle rounds; possible race condition on `solved` state.
- [ ] MarketBuilder: silent fail on wrong letter — add corrective feedback.
- [ ] SoundTelescope: blend text is shown but never spoken — play it.
- [ ] LetterIntro replay doesn't re-highlight options.
- [ ] BossLevel: warn/fix missing WORD_ICONS keys.
- [ ] StoryStroll: timeout cleanup leak on unmount.

## Phase 3 — Make it adaptive (currently fake)
- [ ] Implement real per-phoneme mastery tracking (attempts, success rate) — ADAPTIVE_THRESHOLDS in constants.ts is dead code today.
- [ ] World 1 actually feeds diagnostic data into World 2 letter selection.
- [ ] Scaffold DOWN on failure: after 2 misses → reduce 4 choices to 2, then Leni models the correct answer (never just "try again").
- [ ] Hint after ~5s of no input (HINT_DELAY constant exists, unused).

## Phase 4 — Kill the repetition (16 of 31 games are the same tap-the-icon quiz)
- [ ] Build 4-5 genuinely new mechanics, reuse across worlds with theme reskins:
  - Successive blending: drag tiles that magnetically merge and SPEAK their blend (/s/+/a/ → "sa", then +/t/ → "sat"). Spine of World 3. Use @dnd-kit (installed, unused).
  - Real letter tracing (LetterTrace currently isn't tracing) — finger-draw with path detection.
  - Word chaining potion lab as the spine of World 4 (sat→sit→sip→tip), vary initial/medial/final swaps.
  - Voice production: record-and-playback button ("now YOU say it") — production beats recognition.
  - Drag-to-sort with real drop zones (replace tap-tap SoundSort).
- [ ] Consolidate/replace the near-identical clones (SailboatRace ≈ PlazaPuzzle ≈ RuinDecoder ≈ DragonFeed ≈ GardenGrow; StoryStroll ≈ BeachDetective).

## Phase 5 — Game feel + rewards
- [ ] SFX on every interaction (tap/correct/wrong/coin sounds exist in /sfx, underused).
- [ ] Letters with personality: wiggle + voice sound on touch (Endless Alphabet pattern).
- [ ] Confetti/particle celebration; in-round progress meters.
- [ ] Leni idle animations + mid-game reactions; process praise ("you sounded out every letter!").
- [ ] Make coins spendable: dress-up shop for Leni (costumes exist, auto-applied only).
- [ ] Sticker book / passport screen; show companions (unlocked but invisible today).
- [ ] Reward = content: world completion unlocks a Leni story or free-play favorite game.

## Phase 6 — Visuals + infra
- [ ] Replace emoji word icons with generated art cards (Gemini image script exists: scripts/generate-images.ts).
- [ ] PWA: add service worker (manifest exists, no SW — offline doesn't work).
- [ ] Remove unused deps (idb-keyval) or wire them up; clean ~5MB unused PNGs from repo root.
- [ ] Verify on tablet (touch) end-to-end.
