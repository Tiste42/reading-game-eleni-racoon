'use client';

import { useState } from 'react';
import { getIcon } from '@/lib/wordIcons';
import { ITEM_ART } from '@/lib/itemArt';

interface Props {
  word: string;
  size?: number;
  className?: string;
}

/**
 * Picture for a word: generated PNG art when available, emoji fallback otherwise.
 * Always render word pictures through this component so art upgrades apply everywhere.
 */
export default function WordCard({ word, size = 64, className = '' }: Props) {
  const key = word.toLowerCase();
  const [imgFailed, setImgFailed] = useState(false);

  if (!ITEM_ART.has(key) || imgFailed) {
    return (
      <span
        data-picture-word={key}
        className={`inline-block select-none ${className}`}
        style={{ fontSize: size * 0.78, lineHeight: `${size}px`, width: size, height: size }}
        role="img"
        aria-label={word}
      >
        {getIcon(key)}
      </span>
    );
  }

  return (
    <img
      data-picture-word={key}
      src={`/images/generated/items/${key}.png`}
      alt={word}
      width={size}
      height={size}
      draggable={false}
      className={`object-contain select-none ${className}`}
      style={{ width: size, height: size }}
      onError={() => setImgFailed(true)}
    />
  );
}
