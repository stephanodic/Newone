import { useCallback, useRef, MouseEvent, TouchEvent } from 'react';

interface LongPressOptions {
  shouldPreventDefault?: boolean;
  delay?: number;
}

interface LongPressProps {
  onClick: () => void;
  onLongPress: () => void;
  onLongPressEnd?: () => void;
}

interface LongPressResult {
  onMouseDown: (e: MouseEvent) => void;
  onTouchStart: (e: TouchEvent) => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  onTouchEnd: () => void;
}

export const useLongPress = (
  { onClick, onLongPress, onLongPressEnd }: LongPressProps,
  { shouldPreventDefault = true, delay = 350 }: LongPressOptions = {}
): LongPressResult => {
  const longPressTimeout = useRef<NodeJS.Timeout>();
  const pressTriggered = useRef(false);

  const start = useCallback((event: MouseEvent | TouchEvent) => {
    if (shouldPreventDefault && event.target) {
      if (!['INPUT', 'TEXTAREA', 'SELECT'].includes((event.target as HTMLElement).tagName)) {
        event.preventDefault();
      }
    }
    pressTriggered.current = false;
    longPressTimeout.current = setTimeout(() => {
      onLongPress();
      pressTriggered.current = true;
    }, delay);
  }, [onLongPress, delay, shouldPreventDefault]);

  const clear = useCallback(() => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
    }
  }, []);

  const handleEnd = () => {
    if (pressTriggered.current) {
      if (onLongPressEnd) {
        onLongPressEnd();
      }
    } else {
      onClick();
    }
    clear();
  };

  return {
    onMouseDown: (e: MouseEvent) => start(e),
    onTouchStart: (e: TouchEvent) => start(e),
    onMouseUp: handleEnd,
    onMouseLeave: clear, 
    onTouchEnd: handleEnd,
  };
};
