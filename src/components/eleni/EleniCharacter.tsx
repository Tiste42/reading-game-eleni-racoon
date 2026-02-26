'use client';

import { motion, type TargetAndTransition } from 'framer-motion';
import { useState } from 'react';
import { useWorldContext } from '@/lib/WorldContext';

export type EleniPose = 'standing' | 'excited' | 'celebrating' | 'waving';
export type EleniCostume = 'sombrero' | 'beret' | 'sailor' | 'knight' | 'explorer' | 'surfer' | 'reading' | 'thinking';

const POSE_IMAGES: Record<EleniPose, string> = {
  standing: '/images/generated/eleni/eleni-standing.png',
  excited: '/images/generated/eleni/eleni-excited.png',
  celebrating: '/images/generated/eleni/eleni-celebrating.png',
  waving: '/images/generated/eleni/eleni-waving.png',
};

const COSTUME_IMAGES: Record<EleniCostume, string> = {
  sombrero: '/images/generated/eleni/eleni-sombrero.png',
  beret: '/images/generated/eleni/eleni-beret.png',
  sailor: '/images/generated/eleni/eleni-sailor.png',
  knight: '/images/generated/eleni/eleni-knight.png',
  explorer: '/images/generated/eleni/eleni-explorer.png',
  surfer: '/images/generated/eleni/eleni-surfer.png',
  reading: '/images/generated/eleni/eleni-reading.png',
  thinking: '/images/generated/eleni/eleni-thinking.png',
};

const FALLBACK = '/images/eleni/eleni-base.png';

interface EleniCharacterProps {
  pose?: EleniPose;
  costume?: EleniCostume;
  size?: number;
  className?: string;
  onClick?: () => void;
  animate?: boolean;
}

export default function EleniCharacter({
  pose = 'standing',
  costume,
  size = 200,
  className = '',
  onClick,
  animate = true,
}: EleniCharacterProps) {
  const [useFallback, setUseFallback] = useState(false);
  const world = useWorldContext();

  const effectiveCostume = costume ?? world.costume;

  const imageSrc = useFallback
    ? FALLBACK
    : effectiveCostume
      ? COSTUME_IMAGES[effectiveCostume]
      : POSE_IMAGES[pose];

  const animations: Record<EleniPose, TargetAndTransition> = {
    standing: animate
      ? { y: [0, -6, 0], transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' } }
      : {},
    excited: animate
      ? { rotate: [-3, 3, -3], transition: { duration: 0.5, repeat: Infinity, ease: 'easeInOut' } }
      : {},
    celebrating: animate
      ? { y: [0, -20, 0], scale: [1, 1.1, 1], transition: { duration: 0.6, repeat: Infinity, ease: 'easeInOut' } }
      : {},
    waving: animate
      ? { rotate: [-2, 2, -2], y: [0, -4, 0], transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } }
      : {},
  };

  return (
    <motion.div
      className={`relative inline-block ${className}`}
      style={{ width: size, height: size }}
      animate={animations[pose]}
      whileTap={onClick ? { scale: 0.9 } : undefined}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <img
        src={imageSrc}
        alt="Eleni the Raccoon"
        width={size}
        height={size}
        className="object-contain drop-shadow-lg w-full h-full"
        onError={() => setUseFallback(true)}
      />
    </motion.div>
  );
}
