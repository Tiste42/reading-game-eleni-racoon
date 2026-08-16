# Known Release Failures

- Do not gate answer buttons on `speechSynthesis` completion. Mobile browsers can stay silent and never fire `onend` or `onerror`, leaving the game permanently untappable.
- Do not add dynamic narration strings without matching pre-generated files. The resulting browser-TTS fallback is less reliable on phones and installed PWAs.
- Do not treat the configured ElevenLabs value as usable until a build-time generation call succeeds; an account key identifier is not a valid secret API key.

- Do not approve a release from route booting, asset counts, or CI alone; those checks previously missed direct-answer mechanics and unclear picture choices.
- Do not use Playwright `networkidle` as a readiness signal on the Next.js development server; assert the specific interactive control instead.
- Do not use abstract actions, look-alike art, unfamiliar regional vocabulary, or a pictured answer alongside a decoding target unless it passes the blind picture audit.
- Do not animate answer buttons with an infinite transform; it makes touch targets move and automated interaction waits for stability forever.
- Do not filter only target words by taught sounds while leaving untaught distractor tiles in the same round.
- Do not approve audio from HTTP 200 responses, Howler state, or a looped silence keepalive. WebKit can report a running engine while an installed iOS/iPadOS PWA is silent, and it can stop a keepalive without restoring it on later taps.
- Do not direct-route audio tests past the real Play gesture or let automatic narration satisfy a replay assertion. Wait for automatic speech to finish, reset the playback probe, then test the named control.
- Do not remove audio recovery listeners after the first successful gesture; Apple media sessions can be lost after the PWA backgrounds and must recover on a later tap.
