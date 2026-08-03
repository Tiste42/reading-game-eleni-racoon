# V2.1 Early-World Expansion (2026-08-03)

Success: preserve every working World 1-3 mechanic while making repeat sessions
materially different through full-alphabet sound coverage, larger picture/word
pools, and persistent recent-content rotation. Existing progress must survive.

- [x] Inventory every World 1-3 content pool and available picture/audio asset
- [x] Add a default-on, removable Alphabet Adventure content pack
- [x] Expand World 1 rhyme, syllable, sorting, odd-one-out, and sound-hunt pools
- [x] Expand World 2 across all 26 letters with scientifically correct examples
- [x] Expand World 3 with a much larger decodable picture-word pool
- [x] Add and validate every required picture, word, phoneme, and narration asset
- [x] Prove early-game variety, no answer leakage, save migration, and responsive fit
- [x] Regression-test all 36 games and complete independent phonics/QA review
- [ ] Commit, deploy, and verify V2.1 on the public production PWA

# V2 Modular Content Packs (2026-08-02)

Success: preserve every existing game and saved-progress path while adding removable,
validated sound/word packs that produce varied rounds without answer leakage.

- [x] Capture clean main-branch build/typecheck and deployment baseline
- [x] Add typed pack/content registry and deterministic recent-history-aware selectors
- [x] Migrate existing gameplay to pack-backed content without changing behavior
- [x] Add curated harder sound/word packs using verified art and static audio
- [x] Add automated content, asset, prerequisite, and answer-contract validation
- [x] Preserve and migrate existing Zustand progress safely
- [x] Verify upgraded anchor games on phone, tablet, and desktop
- [x] Regression-smoke all existing worlds/games and old progress
- [x] Complete independent architecture, phonics, and QA reviews
- [ ] Commit, push, deploy, and verify the production PWA

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
- [x] W4 rebuilt: PotionLab (build + word-chain swap), WordTowers (family pick + tower stacks), KnightsDoors (big doors open to reveal art), DragonFeed + GardenGrow (read word w/ tappable letters → pick picture). All drive-tested.
- [x] W5 rebuilt: HeartWordMap (regular letters sound, heart letters ❤️), DigraphDiscovery (?? slot + sh/ch/th teams), RuinDecoder (digraph-as-one-stone sound-out), TreasureMemory (4 pairs, big cards), SoukSentences (read sign → I-read-it gate → answer). Drive-tested.
- [x] W6 rebuilt: StoryStroll/BeachDetective/ManateeRescue (read → I-read-it gate → spoken question → answer; never auto-reads her sentence), ComicCreator (comic strip fills), PostcardWriter (fill-the-blank + stamps). Drive-tested.
- NOTE: W4-6 done solo in main loop — subagents died on session limit (resets 1:30am).
- [x] iPhone audio root-cause fix (commit e151b8e): WebAudio + unload-every-clip; sounds no longer die after round 1. GLOBAL (shared speech.ts). See [[learnings]] mobile audio.
- [x] PHONE-WIDTH layout sweep (390px): converted all fixed-width 3-up choice rows (SurfSlide, SoundTelescope, SailboatRace, DragonFeed, GardenGrow, RuinDecoder, ComicCreator, SoundSafari) to grid-cols-3 max-w-md; KnightsDoors doors + HeartWordMap letters → flex-1 min-w-0. Verified 0 overflow across W2-6 at 390px. SoundSort/SoundHunt/OddSoundOut already fixed earlier.
- [x] Settings & audio polish batch: voice slider now actually controls speech volume (was hardcoded 0.9); AudioContext resumed before each clip (speech worked only when music kept ctx awake — why muting music seemed to kill speech); ducking to 5% + lazy unduck (no pumping between words); music clamped ≤60% of voice in store; defaults voice .9 / music .08; ⚙️ settings button in-game; progress bar clears the floating buttons.
- [x] VersionWatcher auto-update: version.json (no-store) + NEXT_PUBLIC_APP_VERSION; reloads home-screen PWA on new deploys (iOS standalone caches aggressively).
- [x] WordTowers slug fix ('-at' → textToSlug strips hyphen; KNOWN set had '--at' → TTS fallback). Audited ALL 257 slugs vs disk: 0 missing.
- [x] SoundHunt/SoundSorting: item-naming sequence RESTORED (root cause was the iOS audio leak, now fixed); hint 22s; network-verified all 6 items speak in order.
- [x] LENI'S SHOP shipped: /shop page — 24 wacky items (treats 10-15, toys 20-35, dream items 40-80 coins), buy with coins (buyItem guards: no negative, no dupes), owned items live in "Leni's Toybox", big home-map button. Art via scripts/generate-shop-items.ts → public/images/generated/shop/ (emoji fallback until art loads). Drive-tested: buy ✓, refuse-unaffordable ✓, toybox ✓, 0 overflow @390px.
- [ ] NEXT SESSION IDEAS: PWA service worker, W2 shaky-sound prioritization, per-game word art for remaining abstract words, shop restock (new item drops keep it fresh)
- [x] WORLD 6 REWORK (Baptiste: "just pick some so they're better"):
      - ComicCreator FIXED: read sentence → "I read it!" → recorded comprehension question ("Who sat on the mat?") → picture choices where a DISTRACTOR IS ANOTHER WORD FROM THE SENTENCE (mat) — word-matching loses, reading wins. 6 new recorded question clips.
      - PostcardWriter FIXED: postcard now shows a PHOTO that determines the answer; choices are TEXT-ONLY words (log/mug/bat) so the work is decoding. Logic hole closed.
      - KEEPERS unchanged: StoryStroll, BeachDetective, ManateeRescue (already real comprehension).
      - Slug audit after: 263/263 spoken lines have audio files.
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
