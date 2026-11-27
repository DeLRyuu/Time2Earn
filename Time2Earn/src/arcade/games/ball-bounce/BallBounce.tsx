import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { GameResult } from '../../types';
import {
  createInitialBallState,
  stepBallBounce,
  BALL_CONFIG,
  type BallPhysicsState,
  type ObstaclePlatform,
  type TargetItem,
} from './physics';
import './BallBounce.css';

export interface BallBounceProps {
  onComplete: (result: GameResult) => void;
  onExit?: () => void;
}

export const BallBounce: React.FC<BallBounceProps> = ({ onComplete }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [hudScore, setHudScore] = useState<number>(0);
  const [hudHoops, setHudHoops] = useState<number>(0);
  const [hudTokens, setHudTokens] = useState<number>(0);
  const [hudMultiplier, setHudMultiplier] = useState<number>(1);
  const [tokensEligible, setTokensEligible] = useState<boolean>(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<BallPhysicsState>(createInitialBallState());
  const platformsRef = useRef<ObstaclePlatform[]>([]);
  const targetsRef = useRef<TargetItem[]>([]);
  const wantsHopRef = useRef<boolean>(false);
  const nextSpawnXRef = useRef<number>(300);

  // Hop inputs: click/tap and Space key
  const triggerHop = useCallback(() => {
    if (!isPlaying) return;
    wantsHopRef.current = true;
  }, [isPlaying]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ' || e.key === 'ArrowUp' || e.key === 'KeyW') {
        wantsHopRef.current = true;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const spawnAhead = useCallback((x: number) => {
    const gapSize = Math.max(90, 140 - (x / 4000) * 40);
    const gapCenter = 120 + Math.random() * (BALL_CONFIG.CANVAS_HEIGHT - 240);
    const topY = gapCenter - gapSize / 2;
    const bottomY = gapCenter + gapSize / 2;

    const isMoving = x > 1200 && Math.random() < 0.4;
    platformsRef.current.push({
      id: `plat_${x}`,
      x,
      topY,
      bottomY,
      gapSize,
      width: 45,
      isMoving,
      vy: isMoving ? 40 : 0,
      minY: topY - 30,
      maxY: topY + 30,
    });

    // Targets in the gap
    const roll = Math.random();
    if (roll < 0.45) {
      // Hoop
      targetsRef.current.push({
        id: `hoop_${x}`,
        type: 'hoop',
        x: x + 22,
        y: gapCenter,
        radius: 18,
        scoreValue: 10,
      });
    } else if (roll < 0.7) {
      // Star
      targetsRef.current.push({
        id: `star_${x}`,
        type: 'star',
        x: x + 22,
        y: gapCenter,
        radius: 14,
        scoreValue: 5,
      });
    } else if (roll < 0.85) {
      // Token pickup
      targetsRef.current.push({
        id: `token_${x}`,
        type: 'token',
        x: x + 22,
        y: gapCenter,
        radius: 16,
        scoreValue: 15,
      });
    } else if (roll < 0.95) {
      // Gem
      targetsRef.current.push({
        id: `gem_${x}`,
        type: 'gem',
        x: x + 22,
        y: gapCenter,
        radius: 16,
        scoreValue: 25,
      });
    } else {
      // Bomb (resets multiplier)
      targetsRef.current.push({
        id: `bomb_${x}`,
        type: 'bomb',
        x: x + 22,
        y: gapCenter,
        radius: 14,
        scoreValue: 0,
      });
    }
  }, []);

  const handleStart = useCallback(() => {
    stateRef.current = createInitialBallState();
    platformsRef.current = [];
    targetsRef.current = [];
    wantsHopRef.current = false;
    nextSpawnXRef.current = 300;

    // Pre-populate platforms & targets
    while (nextSpawnXRef.current < 900) {
      spawnAhead(nextSpawnXRef.current);
      nextSpawnXRef.current += 180;
    }

    setIsPlaying(true);
    setHudScore(0);
    setHudHoops(0);
    setHudTokens(0);
    setHudMultiplier(1);
    setTokensEligible(true);
  }, [spawnAhead]);

  const handleGameOver = useCallback((finalState: BallPhysicsState) => {
    setIsPlaying(false);
    const durationMs = Math.max(1000, Math.round(finalState.timeElapsedMs));
    const nowIso = new Date().toISOString();
    const startIso = new Date(Date.now() - durationMs).toISOString();

    const result: GameResult = {
      gameId: 'ball-bounce',
      sessionId: `bounce_${Date.now()}`,
      mode: 'classic',
      score: finalState.score,
      durationMs,
      difficulty: 'normal',
      performance: {
        score: finalState.score,
        hoops: finalState.hoops,
        tokenPickups: finalState.tokenPickups,
        bestMultiplier: finalState.bestMultiplier,
        durationMs,
      },
      clientVersion: '1.0.0',
      startedAt: startIso,
      endedAt: nowIso,
    };

    onComplete(result);
  }, [onComplete]);

  // Main animation / simulation loop
  useEffect(() => {
    if (!isPlaying) return;

    let animId: number;
    let lastTime = performance.now();
    let accumulator = 0;

    const render = (ctx: CanvasRenderingContext2D) => {
      const w = BALL_CONFIG.CANVAS_WIDTH;
      const h = BALL_CONFIG.CANVAS_HEIGHT;
      ctx.clearRect(0, 0, w, h);

      // Background grid
      ctx.fillStyle = '#0a0d1a';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = '#151b2e';
      ctx.lineWidth = 1;
      const scrollOffset = stateRef.current.worldX % 30;
      for (let x = -scrollOffset; x < w; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      const worldX = stateRef.current.worldX;

      // Draw Platforms
      for (const plat of platformsRef.current) {
        const sx = plat.x - worldX + BALL_CONFIG.BALL_X;
        if (sx < -60 || sx > w + 60) continue;

        ctx.fillStyle = '#1b2640';
        ctx.strokeStyle = '#bf55ec';
        ctx.lineWidth = 2;

        // Upper pipe
        ctx.fillRect(sx, 0, plat.width, plat.topY);
        ctx.strokeRect(sx, 0, plat.width, plat.topY);

        // Lower pipe
        ctx.fillRect(sx, plat.bottomY, plat.width, h - plat.bottomY);
        ctx.strokeRect(sx, plat.bottomY, plat.width, h - plat.bottomY);
      }

      // Draw Targets
      for (const t of targetsRef.current) {
        const sx = t.x - worldX + BALL_CONFIG.BALL_X;
        if (sx < -30 || sx > w + 30) continue;

        ctx.save();
        ctx.translate(sx, t.y);

        if (t.type === 'hoop') {
          // Neon circular ring hoop
          ctx.strokeStyle = '#00e5ff';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(0, 0, t.radius, 0, Math.PI * 2);
          ctx.stroke();
        } else if (t.type === 'star') {
          ctx.fillStyle = '#fffa00';
          ctx.beginPath();
          ctx.arc(0, 0, t.radius * 0.7, 0, Math.PI * 2);
          ctx.fill();
        } else if (t.type === 'token') {
          ctx.fillStyle = '#00ff88';
          ctx.beginPath();
          ctx.arc(0, 0, t.radius, 0, Math.PI * 2);
          ctx.fill();
        } else if (t.type === 'gem') {
          ctx.fillStyle = '#bf55ec';
          ctx.beginPath();
          ctx.moveTo(0, -t.radius);
          ctx.lineTo(t.radius, 0);
          ctx.lineTo(0, t.radius);
          ctx.lineTo(-t.radius, 0);
          ctx.closePath();
          ctx.fill();
        } else if (t.type === 'bomb') {
          ctx.fillStyle = '#ff3366';
          ctx.beginPath();
          ctx.arc(0, 0, t.radius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Draw Ball
      const ball = stateRef.current;
      ctx.save();
      ctx.translate(ball.x, ball.y);
      ctx.fillStyle = '#bf55ec';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    };

    const loop = (now: number) => {
      const dtSec = (now - lastTime) / 1000;
      lastTime = now;
      accumulator += dtSec;

      const fixedDt = BALL_CONFIG.FIXED_DT_SEC;
      while (accumulator >= fixedDt) {
        accumulator -= fixedDt;

        const wantsHop = wantsHopRef.current;
        wantsHopRef.current = false;

        // Spawn platforms ahead
        if (nextSpawnXRef.current - stateRef.current.worldX < 600) {
          spawnAhead(nextSpawnXRef.current);
          nextSpawnXRef.current += 180;
        }

        const { nextState, remainingPlatforms, remainingTargets } = stepBallBounce(
          stateRef.current,
          wantsHop,
          platformsRef.current,
          targetsRef.current
        );

        stateRef.current = nextState;
        platformsRef.current = remainingPlatforms;
        targetsRef.current = remainingTargets;

        setHudScore(nextState.score);
        setHudHoops(nextState.hoops);
        setHudTokens(nextState.tokenPickups);
        setHudMultiplier(nextState.multiplier);
        setTokensEligible(nextState.tokensEligible);

        if (nextState.isGameOver) {
          handleGameOver(nextState);
          return;
        }
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) render(ctx);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, handleGameOver, spawnAhead]);

  return (
    <div className="ball-bounce-cabinet">
      {!isPlaying ? (
        <div className="bb-lobby-card">
          <div className="bb-rules-panel">
            <span className="bb-rules-title">Physics Mechanics & Targets</span>
            <div className="bb-rules-grid">
              <div className="bb-rule-item">
                <span className="bb-rule-label">Controls</span>
                <span className="bb-rule-val">Click / Tap / Space Hop</span>
              </div>
              <div className="bb-rule-item">
                <span className="bb-rule-label">Hoop Targets</span>
                <span className="bb-rule-val">+10 pts &bull; Chain x1..x5</span>
              </div>
              <div className="bb-rule-item">
                <span className="bb-rule-label">Token Pickups</span>
                <span className="bb-rule-val">Tokens Bonus (Max 3/run)</span>
              </div>
              <div className="bb-rule-item">
                <span className="bb-rule-label">Hazard</span>
                <span className="bb-rule-val" style={{ color: 'var(--r)' }}>Bomb resets combo</span>
              </div>
            </div>
          </div>

          <div className="bb-instructions">
            <p>
              <strong>Gravity & Hop:</strong> Tap or press Space to hop upward; gravity constantly pulls you down.
              Thread through the moving neon gates and clear hoops!
            </p>
            <p>
              <strong>3-Minute Token Limit:</strong> Only the first 3 minutes of a run qualify for tokens;
              surviving past 3 minutes is for leaderboard and high score glory!
            </p>
            <p>
              Rewards: Score 100=1, 300=2, 600=3 tokens, plus token pickups (max +3, cap 6/day).
            </p>
          </div>

          <button type="button" className="bb-start-btn" onClick={handleStart}>
            Start Bouncing
          </button>
        </div>
      ) : (
        <div className="bb-hud-wrap">
          <div className="bb-hud-top">
            <div className="bb-hud-item">
              <span className="bb-hud-label">Score</span>
              <span className="bb-hud-val">{hudScore}</span>
            </div>
            <div className="bb-hud-item">
              <span className="bb-hud-label">Hoops</span>
              <span className="bb-hud-val">{hudHoops}</span>
            </div>
            <div className="bb-hud-item">
              <span className="bb-hud-label">Multiplier</span>
              <span className={`bb-hud-val ${hudMultiplier > 1 ? 'multiplier' : ''}`}>
                {hudMultiplier}x
              </span>
            </div>
            <div className="bb-hud-item">
              <span className="bb-hud-label">Tokens</span>
              <span className="bb-hud-val">{hudTokens} / {BALL_CONFIG.MAX_TOKEN_PICKUPS}</span>
            </div>
          </div>

          <div className={`bb-eligibility-badge ${tokensEligible ? 'active' : 'expired'}`}>
            {tokensEligible ? 'Token Eligible (First 3 Minutes)' : 'Post 3 Min: Score Only'}
          </div>

          <div className="bb-canvas-container" onClick={triggerHop} onTouchStart={triggerHop}>
            <canvas
              ref={canvasRef}
              width={BALL_CONFIG.CANVAS_WIDTH}
              height={BALL_CONFIG.CANVAS_HEIGHT}
              style={{ width: '100%', height: '100%', display: 'block' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
