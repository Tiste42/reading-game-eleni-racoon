# Letter-sound (phoneme) audio credits

The isolated letter sounds in this folder (`a.mp3` … `z.mp3`, `sh/ch/th.mp3`) are
human-recorded phonics sounds sourced from **buzzphonics** by Deborah
(hellodeborahuk), used under the MIT License.

- Source: https://github.com/hellodeborahuk/buzzphonics  (public/sounds/*.m4a)
- License: MIT (see repository)
- Processing: converted .m4a → .mp3 and volume-normalized to ~-1.5 dB peak
  (volume-only; no trimming). `k.mp3` reuses the `c` recording (same /k/ sound).

Why: ElevenLabs (text-to-speech) produced unreliable isolated phonemes. Human
recordings are correct by construction. ElevenLabs is still used for whole
words, sentences, and narration. Originals backed up in `_originals/`,
`_prenorm/`, `_raw/`, `_broken/`.
