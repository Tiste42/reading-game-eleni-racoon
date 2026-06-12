'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import { playSoundEffect } from '@/lib/audio';

interface Props extends HTMLMotionProps<'button'> {
  /** Skip the tap sound (e.g. when the handler plays its own audio immediately) */
  silent?: boolean;
}

/**
 * Chunky pressable button: 3D bevel that physically depresses on tap,
 * with a tap sound. Use for every tappable game element.
 */
export default function PressButton({ silent, className = '', onClick, children, ...rest }: Props) {
  return (
    <motion.button
      whileTap={{ scale: 0.94, y: 3 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      onClick={(e) => {
        if (!silent) playSoundEffect('tap');
        onClick?.(e);
      }}
      className={`press-3d ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
