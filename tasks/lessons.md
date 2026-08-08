# Durable Lessons

## Audio requests are not audible-playback proof

- Validate the real child journey: open the title screen, tap Play, hear music, enter a game, replay a phoneme, use an effect, toggle both channels, and return from the background.
- On Apple mobile/PWAs, prefer a small fixed set of HTML media channels and reassign the source immediately before playback after a lost session. Keep desktop WebAudio where overlapping low-latency sounds work reliably.
- A music duck should pause and resume at the same playback position. Source recreation is reserved for track changes or foreground/session recovery.
- Audio probes must separate automatic narration from the specific control under test and fail on playback warnings, silent decoded buffers, missing assets, and media whose playback time does not advance.
- Browser automation cannot prove that a physical iPhone or iPad speaker produced sound. Report that last device check separately instead of overstating the automated result.

## Loading and asset smoke tests do not prove learning quality

- Never describe route, image, audio, save, or layout smoke tests as a full gameplay review.
- Every game needs a pre-answer audit: list exactly what the child sees and hears before choosing, and prove none of it identifies the correct answer.
- A retry must not identify the correct option. Replay the prompt or name the child's selected wrong choice, then keep every choice available; never highlight, flash, speak, eliminate, insert, accept, or auto-advance the answer.
- A sentence task is invalid when the answer can be copied directly from the visible or spoken sentence without understanding the question. Choices must test the intended meaning, not duplicate the prompt.
- Picture-based tasks are invalid unless a child can immediately name each picture without labels or filenames. Remove or replace ambiguous art before release.
- A release gate must exercise the child-facing decision, not merely confirm that the component renders.
- Sharp audit scripts run through this project's CommonJS `tsx` setup, so wrap asynchronous image work in `main()` instead of using top-level `await`.
- The chroma-key helper refuses to replace an existing project asset unless `--force` is explicit; use it only after the replacement target has been verified.

## Early-game upgrades must change the content the child actually sees

- Preserving a working mechanic does not mean preserving its tiny hardcoded pool.
- When repetition is the reported problem, measure and expand the most-played games first.
- A release is not a meaningful content upgrade if new material is concentrated in later worlds the child rarely reaches.
- Keep the piñata, matching, sorting, and blending interactions; move their prompts and answers into large reusable pools with cross-session cooldowns.
- Progression safety means explicitly teaching new sounds before blending them, not avoiding new sounds altogether.
- Eleni's already-progressed save may migrate the alphabet as taught because her project profile confirms she knows all 26 letter names and most sounds; new and reset profiles must still meet new letters in Letter Intro before blending them.
- Different letters can share one sound. Never present `c` and `k` together as competing answers to an isolated /k/ prompt.
- A shared spelling can represent more than one phoneme: teach and store unvoiced /θ/ and voiced /ð/ separately, and guarantee both appear before connected reading.
- Build-time learning validators must cover every authored picture and every child-readable option, including data kept outside content packs and distractor-only text.
