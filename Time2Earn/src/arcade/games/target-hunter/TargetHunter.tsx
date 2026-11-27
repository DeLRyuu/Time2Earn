import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArcadeIcon } from '../../../components/ui/ArcadeIcon';
import type { GameResult } from '../../types';
import { createMulberry32 } from '../../engine/seededRng';
import { useGameLoop } from '../../engine/useGameLoop';
import {
  calculateAccuracy,
  calculateHitPoints,
  getComboMultiplier,
  isPointInsideTarget,
  spawnTarget,
  type TargetDef,
  type TargetType,
} from './logic';
import './TargetHunter.css';

export interface TargetHunterProps {
  onFinish: (result: GameResult) => void;
  mode?: 'classic'; // Typed mode prop with 'classic' only
}

const GAME_DURATION_MS = 30000;
const SPAWN_INTERVAL_MS = 650;

export const TargetHunter: React.FC<TargetHunterProps> = ({ onFinish, mode = 'classic' }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [bestCombo, setBestCombo] = useState<number>(0);
  const [hits, setHits] = useState<number>(0);
  const [misses, setMisses] = useState<number>(0);
  const [timeLeftSec, setTimeLeftSec] = useState<number>(30);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const sessionIdRef = useRef<string>('');
  const startedAtRef = useRef<string>('');
  const rngRef = useRef<(() => number) | null>(null);

  const targetsRef = useRef<TargetDef[]>([]);
  const lastSpawnTimeRef = useRef<number>(0);
  const elapsedGameTimeRef = useRef<number>(0);

  const goldenHitsRef = useRef<number>(0);
  const fakeHitsRef = useRef<number>(0);

  // Finish round callback
  const finishGame = useCallback(
    (finalScore: number, finalHits: number, finalMisses: number, finalBestCombo: number) => {
      setIsPlaying(false);
      const endedAt = new Date().toISOString();
      const accuracy = calculateAccuracy(finalHits, finalMisses);
      // arcadeScore = score * 10
      const arcadeScore = Math.max(0, finalScore * 10);

      const result: GameResult = {
        gameId: 'target-hunter',
        sessionId: sessionIdRef.current || `th_${Date.now()}`,
        mode,
        score: arcadeScore,
        durationMs: 30000,
        difficulty: 'normal',
        performance: {
          hits: finalHits,
          misses: finalMisses,
          accuracy,
          bestCombo: finalBestCombo,
          goldenHits: goldenHitsRef.current,
          fakeHits: fakeHitsRef.current,
        },
        clientVersion: '1.0.0',
        startedAt: startedAtRef.current || endedAt,
        endedAt,
      };

      onFinish(result);
    },
    [mode, onFinish]
  );

  // Resize canvas with devicePixelRatio
  const syncCanvasDimensions = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.resetTransform?.();
      ctx.scale(dpr, dpr);
    }
  }, []);

  useEffect(() => {
    syncCanvasDimensions();
    window.addEventListener('resize', syncCanvasDimensions);
    return () => window.removeEventListener('resize', syncCanvasDimensions);
  }, [syncCanvasDimensions]);

  // Start new round
  const handleStartGame = () => {
    sessionIdRef.current = `th_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    startedAtRef.current = new Date().toISOString();
    rngRef.current = createMulberry32(Date.now());

    targetsRef.current = [];
    lastSpawnTimeRef.current = 0;
    elapsedGameTimeRef.current = 0;
    goldenHitsRef.current = 0;
    fakeHitsRef.current = 0;

    setScore(0);
    setCombo(0);
    setBestCombo(0);
    setHits(0);
    setMisses(0);
    setTimeLeftSec(30);

    syncCanvasDimensions();
    setIsPlaying(true);
  };

  // Main game tick (driven by useGameLoop)
  const updateLoop = useCallback(
    (dtMs: number) => {
      if (!isPlaying) return;

      elapsedGameTimeRef.current += dtMs;
      const elapsed = elapsedGameTimeRef.current;
      const remainingMs = Math.max(0, GAME_DURATION_MS - elapsed);
      setTimeLeftSec(Math.ceil(remainingMs / 1000));

      if (remainingMs <= 0) {
        finishGame(score, hits, misses, bestCombo);
        return;
      }

      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const rng = rngRef.current || Math.random;

      // 1. Target spawning
      if (elapsed - lastSpawnTimeRef.current >= SPAWN_INTERVAL_MS && targetsRef.current.length < 6) {
        lastSpawnTimeRef.current = elapsed;

        // Determine target type: normal (45%), small (20%), moving (20%), golden (7%), fake (8%)
        const roll = rng();
        let type: TargetType;
        if (roll < 0.45) type = 'normal';
        else if (roll < 0.65) type = 'small';
        else if (roll < 0.85) type = 'moving';
        else if (roll < 0.92) type = 'golden';
        else type = 'fake';

        targetsRef.current.push(spawnTarget(type, width, height, rng));
      }

      // 2. Target aging, moving, and expiration
      const dtSec = dtMs / 1000;
      targetsRef.current = targetsRef.current
        .map((t) => {
          let nextX = t.x + t.vx * dtSec;
          let nextY = t.y + t.vy * dtSec;
          let nextVx = t.vx;
          let nextVy = t.vy;

          // Bounce off container walls
          if (nextX < t.radius) {
            nextX = t.radius;
            nextVx = -nextVx;
          } else if (nextX > width - t.radius) {
            nextX = width - t.radius;
            nextVx = -nextVx;
          }

          if (nextY < t.radius) {
            nextY = t.radius;
            nextVy = -nextVy;
          } else if (nextY > height - t.radius) {
            nextY = height - t.radius;
            nextVy = -nextVy;
          }

          return {
            ...t,
            x: nextX,
            y: nextY,
            vx: nextVx,
            vy: nextVy,
            ageMs: t.ageMs + dtMs,
          };
        })
        .filter((t) => t.ageMs < t.lifetimeMs);

      // 3. Render Canvas
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, width, height);

      // Draw active targets
      for (const t of targetsRef.current) {
        const remainingFraction = Math.max(0, 1 - t.ageMs / t.lifetimeMs);

        ctx.save();
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);

        switch (t.type) {
          case 'golden':
            ctx.fillStyle = '#ffc93c';
            ctx.shadowColor = '#ffc93c';
            ctx.shadowBlur = 12;
            break;
          case 'fake':
            ctx.fillStyle = '#ff4757';
            break;
          case 'moving':
            ctx.fillStyle = '#2ed573';
            break;
          case 'small':
            ctx.fillStyle = '#9c88ff';
            break;
          case 'normal':
          default:
            ctx.fillStyle = '#00d2d3';
            break;
        }
        ctx.fill();

        ctx.lineWidth = 3;
        ctx.strokeStyle = '#070920';
        ctx.stroke();

        // Inner timer indicator ring
        ctx.beginPath();
        ctx.arc(t.x, t.y, Math.max(4, t.radius * remainingFraction), 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fill();

        // Target Label / Icon indicator
        ctx.fillStyle = '#070920';
        ctx.font = 'bold 12px "Lilita One", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const label =
          t.type === 'golden'
            ? '+10'
            : t.type === 'fake'
            ? 'NO!'
            : t.type === 'moving'
            ? '+5'
            : t.type === 'small'
            ? '+3'
            : '+1';
        ctx.fillText(label, t.x, t.y);

        ctx.restore();
      }
    },
    [isPlaying, score, hits, misses, bestCombo, finishGame]
  );

  useGameLoop(updateLoop, isPlaying);

  // Pointer event handler for clicks / taps
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPlaying) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    // Check hit against targets in reverse order (topmost first)
    const targets = targetsRef.current;
    let hitIndex = -1;

    for (let i = targets.length - 1; i >= 0; i--) {
      if (isPointInsideTarget(px, py, targets[i])) {
        hitIndex = i;
        break;
      }
    }

    if (hitIndex !== -1) {
      // Target Hit!
      const target = targets[hitIndex];
      targetsRef.current = targets.filter((_, idx) => idx !== hitIndex);

      if (target.type === 'fake') {
        // Hit fake target! Penalty and combo reset
        fakeHitsRef.current += 1;
        const delta = calculateHitPoints('fake', combo);
        const nextScore = Math.max(0, score + delta);
        setScore(nextScore);
        setCombo(0);
        setMisses((prev) => prev + 1);
      } else {
        // Legitimate target hit!
        if (target.type === 'golden') {
          goldenHitsRef.current += 1;
        }
        const delta = calculateHitPoints(target.type, combo);
        const nextScore = Math.max(0, score + delta);
        const nextCombo = combo + 1;
        const nextBestCombo = Math.max(bestCombo, nextCombo);

        setScore(nextScore);
        setCombo(nextCombo);
        setBestCombo(nextBestCombo);
        setHits((prev) => prev + 1);
      }
    } else {
      // Empty canvas click = Miss!
      setCombo(0);
      setMisses((prev) => prev + 1);
    }
  };

  const multiplier = getComboMultiplier(combo);

  return (
    <div className="target-hunter-view">
      {/* Heads-up HUD */}
      <div className="hunter-hud">
        <div className="hunter-hud-stat">
          <span className="hunter-hud-label">Time</span>
          <span
            className="hunter-hud-val"
            style={{ color: timeLeftSec <= 5 ? 'var(--r)' : 'var(--ink)' }}
          >
            {timeLeftSec}s
          </span>
        </div>

        <div className="hunter-hud-stat">
          <span className="hunter-hud-label">Score</span>
          <span className="hunter-hud-val" style={{ color: 'var(--y)' }}>
            {score}
          </span>
        </div>

        <div className="hunter-hud-stat">
          <span className="hunter-hud-label">Combo</span>
          <span className="hunter-hud-val combo">
            {combo}x {multiplier > 1 ? `(${multiplier}x)` : ''}
          </span>
        </div>

        <div className="hunter-hud-stat">
          <span className="hunter-hud-label">Hits</span>
          <span className="hunter-hud-val" style={{ color: 'var(--g)' }}>
            {hits}
          </span>
        </div>

        <div className="hunter-hud-stat">
          <span className="hunter-hud-label">Accuracy</span>
          <span className="hunter-hud-val">
            {calculateAccuracy(hits, misses)}%
          </span>
        </div>
      </div>

      {/* Target Canvas Container */}
      <div className="hunter-canvas-container" ref={containerRef}>
        <canvas
          ref={canvasRef}
          className="hunter-canvas"
          onPointerDown={handlePointerDown}
        />

        {!isPlaying && (
          <div className="hunter-overlay-start">
            <ArcadeIcon name="joystick" size={56} style={{ color: 'var(--y)' }} />
            <h2>Target Hunter</h2>
            <p>
              30-second rapid click canvas. Click targets before they expire! Avoid red fake targets.
            </p>

            <div className="hunter-legend">
              <span className="hunter-legend-item">
                <span className="legend-dot" style={{ background: '#00d2d3' }} /> Normal (+1)
              </span>
              <span className="hunter-legend-item">
                <span className="legend-dot" style={{ background: '#9c88ff' }} /> Small (+3)
              </span>
              <span className="hunter-legend-item">
                <span className="legend-dot" style={{ background: '#2ed573' }} /> Moving (+5)
              </span>
              <span className="hunter-legend-item">
                <span className="legend-dot" style={{ background: '#ffc93c' }} /> Golden (+10)
              </span>
              <span className="hunter-legend-item">
                <span className="legend-dot" style={{ background: '#ff4757' }} /> Fake (-5)
              </span>
            </div>

            <button
              type="button"
              className="game-btn"
              style={{ width: 'auto', marginTop: '12px' }}
              onClick={handleStartGame}
            >
              <ArcadeIcon name="joystick" size={20} />
              <span>Start 30s hunt</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
