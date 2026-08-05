# V2.2 learning-integrity release candidate — 2026-08-05

## Scope

- Preserve existing saves and working game mechanics.
- Expand early-world rotating letter, sound, word, and picture pools.
- Remove pre-answer highlights, flashes, eliminations, spoken answers, and automatic reveals.
- Make sentence games require comprehension with picture-only answers.
- Block unclear pictures and untaught child-readable content at build time.

## Verified candidate

- Typecheck and lint: pass.
- Unit contracts: 27 passed.
- Content/assets: 5 packs, 124 word records, 99 pictures, 244 audio files.
- Production build: pass.
- Playwright: 43 passed, 26 intentional cross-project skips, 0 failed across Chromium, iPad/WebKit, and Firefox.
- Independent architecture review: GO.
- Independent phonics/content review: GO.
- Voiced `th` audio: separately identified as an isolated /ð/ with no following vowel.

## Release authority

Do not infer production status from this file. A release is complete only when
the candidate commit is on `origin/main`, Vercel reports the matching production
deployment `READY`, `/version.json` reports that commit, and public mobile and
desktop game journeys pass without console or asset failures.
