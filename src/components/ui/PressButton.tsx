'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';

type Props = HTMLMotionProps<'button'>;

/**
 * Chunky pressable button with a 3D bevel that physically depresses on tap.
 * Outcome sounds belong to the game handler so a neutral selection can never
 * be mistaken for a wrong-answer buzzer.
 */
export default function PressButton({ className = '', children, ...rest }: Props) {
  return (
    <motion.button
      whileTap={{ scale: 0.94, y: 3 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      className={`press-3d ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
