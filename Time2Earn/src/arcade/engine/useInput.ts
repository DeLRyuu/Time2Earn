import { useEffect, useState, useRef, type RefObject } from 'react';

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

export interface PointerPos {
  x: number;
  y: number;
}

export interface ArcadeInputState {
  pressedKeys: ReadonlySet<string>;
  pointerPos: PointerPos;
  lastSwipe: SwipeDirection | null;
  clearLastSwipe: () => void;
}

const SWIPE_THRESHOLD_PX = 30;

/**
 * Unified input tracker for keyboard, pointer position relative to a container ref, and touch swipes.
 */
export function useInput(containerRef?: RefObject<HTMLElement | null>): ArcadeInputState {
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const [pointerPos, setPointerPos] = useState<PointerPos>({ x: 0, y: 0 });
  const [lastSwipe, setLastSwipe] = useState<SwipeDirection | null>(null);

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // Keyboard listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setPressedKeys((prev) => {
        if (prev.has(e.code) || prev.has(e.key)) return prev;
        const next = new Set(prev);
        next.add(e.code);
        next.add(e.key);
        return next;
      });
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setPressedKeys((prev) => {
        if (!prev.has(e.code) && !prev.has(e.key)) return prev;
        const next = new Set(prev);
        next.delete(e.code);
        next.delete(e.key);
        return next;
      });
    };

    const handleBlur = () => {
      setPressedKeys(new Set());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Pointer position & touch swipe listeners
  useEffect(() => {
    const target = containerRef ? containerRef.current : window;
    if (!target) return;

    const handlePointerMove = (e: Event) => {
      const mouseEvent = e as MouseEvent | TouchEvent;
      let clientX = 0;
      let clientY = 0;

      if ('touches' in mouseEvent && mouseEvent.touches.length > 0) {
        clientX = mouseEvent.touches[0].clientX;
        clientY = mouseEvent.touches[0].clientY;
      } else if ('clientX' in mouseEvent) {
        clientX = mouseEvent.clientX;
        clientY = mouseEvent.clientY;
      }

      if (containerRef?.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setPointerPos({
          x: clientX - rect.left,
          y: clientY - rect.top,
        });
      } else {
        setPointerPos({ x: clientX, y: clientY });
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        touchStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          time: performance.now(),
        };
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current || e.changedTouches.length === 0) return;

      const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
      const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (Math.max(absX, absY) >= SWIPE_THRESHOLD_PX) {
        if (absX > absY) {
          setLastSwipe(deltaX > 0 ? 'right' : 'left');
        } else {
          setLastSwipe(deltaY > 0 ? 'down' : 'up');
        }
      }

      touchStartRef.current = null;
    };

    target.addEventListener('mousemove', handlePointerMove as EventListener);
    target.addEventListener('touchstart', handleTouchStart as EventListener, { passive: true });
    target.addEventListener('touchmove', handlePointerMove as EventListener, { passive: true });
    target.addEventListener('touchend', handleTouchEnd as EventListener, { passive: true });

    return () => {
      target.removeEventListener('mousemove', handlePointerMove as EventListener);
      target.removeEventListener('touchstart', handleTouchStart as EventListener);
      target.removeEventListener('touchmove', handlePointerMove as EventListener);
      target.removeEventListener('touchend', handleTouchEnd as EventListener);
    };
  }, [containerRef]);

  const clearLastSwipe = () => {
    setLastSwipe(null);
  };

  return {
    pressedKeys,
    pointerPos,
    lastSwipe,
    clearLastSwipe,
  };
}
