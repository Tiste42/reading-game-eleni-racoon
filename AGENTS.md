# Leni's Sound Safari — Reading Game

## Project Overview
A phonics-based reading game for a 4-year-old girl named Eleni. The main character is Leni the Raccoon — a cute, adventurous cartoon raccoon who travels the world teaching letter sounds and reading. Built as a Next.js PWA that works on mobile browsers and desktop.

## The Child (Eleni)
- 4 years old, knows all 26 letter names and most letter sounds
- Needs practice with BLENDING sounds into words — this is the critical skill gap
- Has short attention span (8-12 min) — mini-games must be 3-5 minutes max
- Uses a tablet (touch) and sometimes a laptop (keyboard)

## Tech Stack
- Next.js 14+ (App Router)
- Tailwind CSS
- Framer Motion (animations — squash/stretch, sparkles, transitions)
- Howler.js (audio playback — handles overlapping sounds, mobile quirks)
- Zustand (state management, persistent)
- idb-keyval (offline storage for progress)
- @dnd-kit (drag and drop for letter tiles)
- next-pwa (service worker, offline support)

## API Keys
- ElevenLabs API key is in .env.local as ELEVENLABS_API_KEY — used for Leni's voice generation at BUILD TIME only, never at runtime
- Gemini API key is in .env.local as GEMINI_API_KEY
- NEVER hardcode API keys in source files
- .env.local MUST be in .gitignore

## Audio Architecture
- All audio is pre-generated static .mp3 files in /public/audio/
- ElevenLabs generates: Leni narration, full word pronunciations, sentences
- For isolated phonemes: try ElevenLabs with SSML phoneme tags first, fall back to University of Iowa Sounds of Speech clips
- Howler.js handles all playback — use audio sprites where possible
- The app NEVER calls external APIs at runtime — everything is pre-baked

## World/Level Progression (MUST follow this order — difficulty builds sequentially)

### World 1: The Sound Fiesta — Mexico
- **Focus:** Phonological awareness warm-up — rhyming, initial sounds, syllable counting, letter-sound validation
- **Difficulty:** EASIEST. Eleni should fly through this. It confirms what she already knows and catches gaps.
- **Games should include:** rhyme matching, "which word starts with /m/?", clap the syllables, match letter to its sound
- **This world is diagnostic** — it tracks which sounds she's solid on vs. shaky, feeding into World 2

### World 2: The Letter Garden — France
- **Focus:** SATPIN letter-sound mastery (S, A, T, P, I, N) plus E and L from Eleni's name
- **Difficulty:** Still foundational but more focused. She's not just identifying — she's practicing specific letter-sound pairs repeatedly.
- **Games should include:** letter tracing with phoneme audio, sound-to-letter matching, "feed the animal that starts with /t/", letter memory match, spelling her own name
- **Must be harder than World 1** — World 1 is broad awareness, World 2 is targeted mastery of specific letters
- **Key principle:** Games must be INTERACTIVE and ENGAGING, not passive tap-and-listen. Every game must require the child to think and make a choice.

### World 3: The Blending Coast — Spain & Majorca
- **Focus:** Continuous blending — THE critical level. Turning individual letter sounds into words.
- **Difficulty:** This is where reading begins. Hardest conceptual leap.
- **Games should include:** sailboat slide (drag across letters to blend sounds), word building from letter tiles, picture matching after blending, blend-then-choose
- **Key mechanic:** continuous motion blending — the child drags across letters and sounds play without gaps. Stopping = sound stops. This prevents the pause-between-sounds problem.
- **Only use SATPIN + E, L letters** — never introduce unknown sounds during blending practice

### World 4: The Castle of Words — England & Wales
- **Focus:** CVC word families (-at, -an, -it, -ip, -in, -ot, -ug), phoneme manipulation (swap one letter to make a new word)
- **Difficulty:** Building speed and confidence with reading CVC words
- **Games should include:** potion lab (swap letters), word family towers, read-the-word-to-open-the-door, dragon egg word scramble
- **Expands letter set** — introduces c, k, e, h, r, m, d beyond SATPIN

### World 5: The Market of Mysteries — Morocco
- **Focus:** High-frequency sight words ("heart words": the, was, said, is, to, he, she) + digraphs (sh, ch, th)
- **Difficulty:** Expanding beyond pure phonics into irregular words
- **Games should include:** heart word mapping (highlight regular vs. irregular parts), digraph discovery, treasure memory with sight words, simple phrase reading ("the cat sat"), souk sentence building
- **Heart word approach:** Don't just memorize — map which parts ARE decodable and which parts must be learned "by heart"

### World 6: The Everglades Explorer — Florida
- **Focus:** Sentence reading, comprehension, and connected text
- **Difficulty:** Putting it all together — reading for meaning
- **Games should include:** story stroll (read sentence + answer question), comic panel reading, fill-in-the-blank sentences, manatee rescue (read instructions to solve problems), postcard writer
- **All text uses only taught phonics patterns and known sight words** — no surprises

## Design Principles
- **Sequential difficulty is non-negotiable.** Each world must be harder than the last. Each game within a world should build on prior games.
- **Science of reading, not randomness.** Follow the evidence: phonological awareness → letter-sound correspondence → blending → CVC decoding → sight words → connected text.
- **No passive games.** Every game requires the child to think and make a choice. "Tap a letter to hear its sound" is a tutorial, not a game.
- **Immediate corrective feedback.** When wrong, model the correct answer — don't just say "try again."
- **Short sessions.** Each game is 3-5 minutes. A full play session is 2-3 games max.
- **Continuous sounds first.** When introducing blending, start with continuous sounds (s, m, f, n, r) that can be stretched, not stop sounds (b, d, g, t, p) that add schwa.
- **Only use taught letters.** Never put a letter or sound in a game before it has been explicitly taught in a prior world/game.

## Key Files
- `/src/lib/constants.ts` — World/game config, word/phoneme data
- `/src/lib/gameData.ts` — All phoneme, word, and sentence data
- `/src/lib/store.ts` — Zustand state management for progression
- `/src/components/game/*.tsx` — Individual game components (31 total)
- `/src/lib/speech.ts` — Text-to-speech and audio playback
- `/src/lib/useGameSpeech.ts` — Custom hook for game speech/audio
