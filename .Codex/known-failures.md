# Known Release Failures

- Do not approve a release from route booting, asset counts, or CI alone; those checks previously missed direct-answer mechanics and unclear picture choices.
- Do not use Playwright `networkidle` as a readiness signal on the Next.js development server; assert the specific interactive control instead.
- Do not use abstract actions, look-alike art, unfamiliar regional vocabulary, or a pictured answer alongside a decoding target unless it passes the blind picture audit.
- Do not animate answer buttons with an infinite transform; it makes touch targets move and automated interaction waits for stability forever.
- Do not filter only target words by taught sounds while leaving untaught distractor tiles in the same round.
