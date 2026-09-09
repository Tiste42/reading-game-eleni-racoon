# Letter-sound (phoneme) audio credits

Except for L and voiced TH (credited below), the letter sounds in this folder are
human-recorded phonics sounds sourced from **buzzphonics** by Deborah
(hellodeborahuk), used under the MIT License.

- Source: https://github.com/hellodeborahuk/buzzphonics  (public/sounds/*.m4a)
- License: MIT (see repository)
- Processing: converted .m4a → .mp3 and volume-normalized to ~-1.5 dB peak
  (volume-only; no trimming). `k.mp3` reuses the `c` recording (same /k/ sound).

Recovery (2026-09-09): the alphabet upgrade (1369321) had replaced the 28
original recordings despite leaving these credits unchanged. 26 clips remain
byte-identical to 8783e74. X uses the /ks/ segment at 0.47-0.90s of that original
human recording, excluding the leading letter-name vowel (30ms end fade, 100ms
silence pad). Q is the library's qu.m4a, converted without trimming; it is the
initial /kw/ cue in queen, with a short release vowel, not the letter name cue.
`library-manifest.json` pins all 30 final file hashes and source details.

## L — /l/

Recorded by Peter Isotalo. Source: [Alveolar lateral approximant](https://commons.wikimedia.org/wiki/File:Alveolar_lateral_approximant.ogg).
Licensed under [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/).
This adapted MP3 is distributed under the same license. Changes: retain the
isolated consonant at 0.26-0.48s, remove surrounding demonstration vowels,
increase gain by 14.9dB, append 150ms silence, convert to MP3. No synthesized voice.

## Voiced TH — /ð/

Source: [Human American-English pronunciation of this, non-labial](https://commons.wikimedia.org/wiki/File:This-prounciation-audio-nonlabial.ogg),
published under [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
Retain only the initial consonant at 0.39-0.54s; remove the vowel and final S;
increase gain by 12.7dB, append 150ms silence, and convert to MP3. No synthesized voice.

Human provenance and valid decoding are not proof of correct pronunciation.
Audible review must be reported separately. ElevenLabs may generate whole
words, sentences, and narration, but NEVER isolated phonemes.
