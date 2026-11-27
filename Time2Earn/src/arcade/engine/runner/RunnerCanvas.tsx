import React, { useRef, useEffect, useCallback } from 'react';
import type { RunnerAction, RunnerState, RecordedInput } from './runnerCore';
import { createInitialRunnerState, stepRunner, RUNNER_CONFIG } from './runnerCore';
import type { Obstacle } from './obstacles';
import { generateObstaclePattern } from './obstacles';
import type { PickupItem } from './pickups';
import { generatePickups } from './pickups';
import { createMulberry32 } from '../seededRng';
import { useInput } from '../useInput';

export interface RunnerCanvasProps {
  seed: number;
  initialLives?: number;
  paused?: boolean;
  onGameOver?: (state: RunnerState, inputLog: RecordedInput[]) => void;
  onProgress?: (distance: number, score: number) => void;
  ghostInputs?: RecordedInput[];
}

export const RunnerCanvas: React.FC<RunnerCanvasProps> = ({
  seed,
  initialLives = 3,
  paused = false,
  onGameOver,
  onProgress,
  ghostInputs,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const input = useInput(containerRef);

  // Runner state refs
  const stateRef = useRef<RunnerState>(createInitialRunnerState(initialLives));
  const obstaclesRef = useRef<Obstacle[]>([]);
  const pickupsRef = useRef<PickupItem[]>([]);
  const inputLogRef = useRef<RecordedInput[]>([]);
  const pendingActionsRef = useRef<RunnerAction[]>([]);
  const nextSpawnZRef = useRef<number>(30); // Start spawning ahead of player
  const rngRef = useRef(createMulberry32(seed));

  // Ghost tracking
  const ghostIndexRef = useRef<number>(0);
  const ghostStateRef = useRef<RunnerState | null>(ghostInputs ? createInitialRunnerState(initialLives) : null);

  // Time accumulator for fixed 60Hz step
  const lastTimeRef = useRef<number>(0);
  const accumulatorRef = useRef<number>(0);
  const gameOverHandledRef = useRef<boolean>(false);

  // Key tracking to prevent repeating jumps/slides when key held
  const prevKeysRef = useRef<Set<string>>(new Set());

  // Reset or initialize on seed change
  const initEngine = useCallback(() => {
    stateRef.current = createInitialRunnerState(initialLives);
    obstaclesRef.current = [];
    pickupsRef.current = [];
    inputLogRef.current = [];
    pendingActionsRef.current = [];
    nextSpawnZRef.current = 30;
    rngRef.current = createMulberry32(seed);
    gameOverHandledRef.current = false;
    lastTimeRef.current = performance.now();
    accumulatorRef.current = 0;

    if (ghostInputs && ghostInputs.length > 0) {
      ghostIndexRef.current = 0;
      ghostStateRef.current = createInitialRunnerState(initialLives);
    } else {
      ghostStateRef.current = null;
    }

    // Pre-populate initial 120m track
    while (nextSpawnZRef.current < 150) {
      const z = nextSpawnZRef.current;
      const pattern = generateObstaclePattern(z, rngRef.current);
      obstaclesRef.current.push(...pattern.obstacles);

      const items = generatePickups(z + 8, pattern.passableLanes[0] ?? 1, rngRef.current);
      pickupsRef.current.push(...items);

      nextSpawnZRef.current += 24;
    }
  }, [seed, initialLives, ghostInputs]);

  useEffect(() => {
    initEngine();
  }, [initEngine]);

  // Handle inputs (Keyboard + Touch Swipe)
  useEffect(() => {
    if (paused || stateRef.current.isGameOver) return;

    const actions: RunnerAction[] = [];
    const pressed = input.pressedKeys;
    const prev = prevKeysRef.current;

    // Lane switches / Jump / Slide from keyboard edge triggers
    if ((pressed.has('ArrowLeft') || pressed.has('KeyA')) && !prev.has('ArrowLeft') && !prev.has('KeyA')) {
      actions.push('laneLeft');
    }
    if ((pressed.has('ArrowRight') || pressed.has('KeyD')) && !prev.has('ArrowRight') && !prev.has('KeyD')) {
      actions.push('laneRight');
    }
    if ((pressed.has('ArrowUp') || pressed.has('KeyW') || pressed.has('Space')) &&
        !prev.has('ArrowUp') && !prev.has('KeyW') && !prev.has('Space')) {
      actions.push('jump');
    }
    if ((pressed.has('ArrowDown') || pressed.has('KeyS')) && !prev.has('ArrowDown') && !prev.has('KeyS')) {
      actions.push('slide');
    }

    // Touch Swipes
    if (input.lastSwipe) {
      if (input.lastSwipe === 'left') actions.push('laneLeft');
      else if (input.lastSwipe === 'right') actions.push('laneRight');
      else if (input.lastSwipe === 'up') actions.push('jump');
      else if (input.lastSwipe === 'down') actions.push('slide');
      input.clearLastSwipe();
    }

    prevKeysRef.current = new Set(pressed);

    if (actions.length > 0) {
      const t = stateRef.current.timeElapsedMs;
      for (const act of actions) {
        pendingActionsRef.current.push(act);
        inputLogRef.current.push({ t, action: act });
      }
    }
  }, [input, paused]);

  // Main animation / simulation loop
  useEffect(() => {
    let animId: number;

    const render = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      ctx.clearRect(0, 0, width, height);

      // Background horizon & floor
      const horizonY = height * 0.35;
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#0a0d1a');
      gradient.addColorStop(0.35, '#13192e');
      gradient.addColorStop(1, '#05070d');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // 3-lane perspective lines
      ctx.strokeStyle = '#1d2a4a';
      ctx.lineWidth = 2;
      const centerX = width / 2;

      // Draw perspective lanes vanishing to horizon
      const lanes = [-1.5, -0.5, 0.5, 1.5]; // 3 lanes = 4 boundary lines
      for (const l of lanes) {
        ctx.beginPath();
        ctx.moveTo(centerX + l * 40, horizonY);
        ctx.lineTo(centerX + l * (width * 0.32), height);
        ctx.stroke();
      }

      // Draw track crossbars for speed illusion
      const playerDist = stateRef.current.distance;
      const stripeOffset = (playerDist % 4);
      ctx.strokeStyle = '#15203b';
      for (let z = 0; z < 40; z += 4) {
        const lineZ = z - stripeOffset;
        if (lineZ < 0) continue;
        const progress = lineZ / 40;
        const y = horizonY + (height - horizonY) * Math.pow(1 - progress, 2);
        const w = (width * 0.96) * Math.pow(1 - progress, 1.8);
        ctx.beginPath();
        ctx.moveTo(centerX - w / 2, y);
        ctx.lineTo(centerX + w / 2, y);
        ctx.stroke();
      }

      // Helper for 3D to 2D projection
      const project = (lanePos: number, zDist: number, elev: number = 0) => {
        const deltaZ = zDist - playerDist;
        if (deltaZ < 0 || deltaZ > 45) return null;
        const factor = 1 - (deltaZ / 45);
        const scale = Math.pow(factor, 2.2);
        const screenX = centerX + (lanePos - 1) * (width * 0.22) * scale;
        const screenY = horizonY + (height - horizonY) * scale - (elev * 35 * scale);
        return { x: screenX, y: screenY, scale };
      };

      // Draw Pickups
      for (const p of pickupsRef.current) {
        const pt = project(p.lane, p.z, 0.5);
        if (!pt) continue;

        ctx.save();
        const size = Math.max(4, 16 * pt.scale);
        ctx.translate(pt.x, pt.y);

        if (p.type === 'token' || p.type === 'golden-token') {
          ctx.fillStyle = p.type === 'golden-token' ? '#ffd700' : '#00e5ff';
          ctx.beginPath();
          ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'gem' || p.type === 'diamond' || p.type === 'crystal') {
          ctx.fillStyle = p.type === 'gem' ? '#00ff88' : p.type === 'diamond' ? '#bbf2f6' : '#bf55ec';
          ctx.beginPath();
          ctx.moveTo(0, -size / 2);
          ctx.lineTo(size / 2, 0);
          ctx.lineTo(0, size / 2);
          ctx.lineTo(-size / 2, 0);
          ctx.closePath();
          ctx.fill();
        } else {
          // Power-up icon (cube box)
          ctx.fillStyle = '#ffaa00';
          ctx.fillRect(-size / 2, -size / 2, size, size);
        }
        ctx.restore();
      }

      // Draw Obstacles
      for (const obs of obstaclesRef.current) {
        const pt = project(obs.lane, obs.z, 0);
        if (!pt) continue;

        const w = (width * 0.18) * pt.scale;
        const h = obs.type === 'barricade' ? 24 * pt.scale : 40 * pt.scale;
        ctx.fillStyle = obs.type === 'barricade' ? '#ff3366' : obs.type === 'low-barrier' ? '#ffcc00' : '#9933ff';
        const drawY = obs.type === 'low-barrier' ? pt.y - 30 * pt.scale : pt.y - h;
        ctx.fillRect(pt.x - w / 2, drawY, w, h);
      }

      // Draw Player
      const pState = stateRef.current;
      const effectiveLane = pState.lane + (pState.targetLane - pState.lane) * pState.laneTransitionProgress;
      const playerPt = project(effectiveLane, playerDist, pState.y);
      if (playerPt) {
        const pSize = 28 * playerPt.scale;
        const pH = pState.sliding ? pSize * 0.45 : pSize;
        ctx.save();
        ctx.translate(playerPt.x, playerPt.y - pH);

        // Power-up visual auras
        if (pState.shieldMs > 0) {
          ctx.strokeStyle = '#00e5ff';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, pH / 2, pSize * 0.8, 0, Math.PI * 2);
          ctx.stroke();
        }
        if (pState.ghostMs > 0) {
          ctx.globalAlpha = 0.5;
        }

        ctx.fillStyle = '#00ffcc';
        ctx.fillRect(-pSize / 2, 0, pSize, pH);
        ctx.restore();
      }
    };

    const loop = (now: number) => {
      const deltaSec = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      if (!paused && !stateRef.current.isGameOver) {
        accumulatorRef.current += deltaSec;
        const fixedDt = RUNNER_CONFIG.FIXED_DT_SEC;

        while (accumulatorRef.current >= fixedDt) {
          accumulatorRef.current -= fixedDt;

          // Consume actions
          const actionsToRun = [...pendingActionsRef.current];
          pendingActionsRef.current = [];

          // Spawning ahead
          if (nextSpawnZRef.current - stateRef.current.distance < 120) {
            const z = nextSpawnZRef.current;
            const pattern = generateObstaclePattern(z, rngRef.current);
            obstaclesRef.current.push(...pattern.obstacles);

            const items = generatePickups(z + 8, pattern.passableLanes[0] ?? 1, rngRef.current);
            pickupsRef.current.push(...items);

            nextSpawnZRef.current += 24;
          }

          // Step main runner
          const { nextState, remainingObstacles, remainingPickups } = stepRunner(
            stateRef.current,
            actionsToRun,
            obstaclesRef.current,
            pickupsRef.current
          );

          stateRef.current = nextState;
          obstaclesRef.current = remainingObstacles;
          pickupsRef.current = remainingPickups;

          if (onProgress) {
            onProgress(nextState.distance, nextState.score);
          }

          if (nextState.isGameOver && !gameOverHandledRef.current) {
            gameOverHandledRef.current = true;
            if (onGameOver) {
              onGameOver(nextState, inputLogRef.current);
            }
          }
        }
      }

      // Draw canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          render(ctx, canvas.width, canvas.height);
        }
      }

      animId = requestAnimationFrame(loop);
    };

    lastTimeRef.current = performance.now();
    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [paused, onGameOver, onProgress]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '540px',
        aspectRatio: '9 / 16',
        margin: '0 auto',
        backgroundColor: '#05070d',
        overflow: 'hidden',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
        userSelect: 'none',
        touchAction: 'none',
      }}
    >
      <canvas
        ref={canvasRef}
        width={360}
        height={640}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
    </div>
  );
};
