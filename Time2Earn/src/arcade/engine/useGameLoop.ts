import { useEffect, useRef } from 'react';

/**
 * High-precision game loop hook using requestAnimationFrame.
 * Automatically clamps frame delta time (dtMs) to 50ms (preventing spiral of death / tab switch jumps),
 * pauses execution when document.hidden is true, and cleans up on unmount.
 */
export function useGameLoop(update: (dtMs: number) => void, running: boolean): void {
  const updateRef = useRef(update);
  const runningRef = useRef(running);

  useEffect(() => {
    updateRef.current = update;
    runningRef.current = running;
  }, [update, running]);

  useEffect(() => {

    if (!running) return;

    let rafId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const rawDt = now - lastTime;
      lastTime = now;

      // Only tick if tab is visible and still marked running
      if (!document.hidden && runningRef.current) {
        // Clamp frame step to max 50ms (at least 20fps simulation equivalent)
        const dtMs = Math.min(Math.max(0, rawDt), 50);
        updateRef.current(dtMs);
      }

      if (runningRef.current) {
        rafId = requestAnimationFrame(loop);
      }
    };

    rafId = requestAnimationFrame(loop);

    const handleVisibilityChange = () => {
      // Reset lastTime on return to foreground to avoid huge single dt jump
      if (!document.hidden) {
        lastTime = performance.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [running]);
}
