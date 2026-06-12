#!/usr/bin/env bash
# Gently boost each phoneme to a consistent, audible level.
# IMPORTANT: volume gain ONLY — no silenceremove / no trimming (that corrupted
# the sounds last time). A soft limiter just prevents clipping.
set -e
cd "$(dirname "$0")/../public/audio/phonemes"
mkdir -p _raw
PHONEMES="s a t p i n e l c k h r m d g o u f b j v w x y z sh ch th"
for p in $PHONEMES; do
  f="$p.mp3"
  [ -f "$f" ] || continue
  cp -f "$f" "_raw/$f"   # keep the un-boosted regenerated original
  max=$(ffmpeg -i "_raw/$f" -af volumedetect -f null - 2>&1 | grep 'max_volume:' | sed -E 's/.*max_volume: (-?[0-9.]+) dB.*/\1/')
  gain=$(awk "BEGIN{g=-1.5-($max); if(g<0)g=0; if(g>20)g=20; print g}")
  ffmpeg -y -loglevel error -i "_raw/$f" -af "volume=${gain}dB,alimiter=limit=0.97" "$f"
  newmax=$(ffmpeg -i "$f" -af volumedetect -f null - 2>&1 | grep 'max_volume:' | sed -E 's/.*max_volume: (-?[0-9.]+) dB.*/\1/')
  echo "$p: ${max}dB +${gain}dB -> ${newmax}dB"
done
echo "Done — gentle boost, no trimming."
