import React, { useRef } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'motion/react';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SwipeableRowProps {
  children: React.ReactNode;
  onDelete: () => void;
  className?: string;
}

/** Left-swipe threshold (px) to trigger delete */
const SWIPE_THRESHOLD = 72;

/**
 * SwipeableRow — wraps any content and adds swipe-left-to-delete gesture.
 * - Swipe < threshold → snaps back
 * - Swipe ≥ threshold → calls `onDelete()`
 * - Tap (no swipe) → click propagates normally to children
 *
 * Replaces long-press-to-delete pattern in ItemRow (PR#3 Step 2).
 */
const SwipeableRow = ({ children, onDelete, className }: SwipeableRowProps) => {
  const x           = useMotionValue(0);
  const startX      = useRef(0);
  const hasSwiped   = useRef(false);
  const alreadyFired = useRef(false);

  // Reveal the trash icon as content slides left
  const trashOpacity = useTransform(x, [-SWIPE_THRESHOLD, -24, 0], [1, 0.5, 0]);
  const trashScale   = useTransform(x, [-SWIPE_THRESHOLD, -24, 0], [1, 0.75, 0.55]);
  const bgOpacity    = useTransform(x, [-SWIPE_THRESHOLD, 0],      [1, 0]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (alreadyFired.current) return;
    startX.current   = e.clientX;
    hasSwiped.current = false;
    // Capture so we receive move/up even if pointer leaves the element
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (alreadyFired.current) return;
    const dx = e.clientX - startX.current;
    if (dx < -5) {
      hasSwiped.current = true;
      x.set(Math.max(dx, -120));
    } else if (!hasSwiped.current) {
      x.set(0);
    }
  };

  const handlePointerUp = () => {
    if (alreadyFired.current) return;
    const currentX = x.get();
    if (currentX < -SWIPE_THRESHOLD) {
      alreadyFired.current = true;
      onDelete();
      // Snap back position silently so the row is ready if undo restores it
      animate(x, 0, { duration: 0 });
      setTimeout(() => { alreadyFired.current = false; }, 500);
    } else {
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });
    }
  };

  /**
   * Intercept click in capture phase.
   * If a swipe occurred, prevent the click from reaching the child's onClick.
   */
  const handleClickCapture = (e: React.MouseEvent) => {
    if (hasSwiped.current) {
      e.stopPropagation();
      e.preventDefault();
      hasSwiped.current = false;
    }
  };

  return (
    <div className={cn('relative overflow-hidden rounded-2xl', className)}>
      {/* Delete hint background (revealed as content slides) */}
      <motion.div
        style={{ opacity: bgOpacity }}
        className="absolute inset-0 bg-rose-500 rounded-2xl flex items-center justify-end px-5 pointer-events-none"
      >
        <motion.div style={{ opacity: trashOpacity, scale: trashScale }}>
          <Trash2 size={20} strokeWidth={2.5} className="text-white" />
        </motion.div>
      </motion.div>

      {/* Swipeable content layer */}
      <motion.div
        style={{ x }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClickCapture={handleClickCapture}
        className="relative"
      >
        {children}
      </motion.div>
    </div>
  );
};

export default SwipeableRow;
