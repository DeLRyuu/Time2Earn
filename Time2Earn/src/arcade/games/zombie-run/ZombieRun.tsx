import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { GameResult } from '../../types';
import type { RunnerState } from '../../engine/runner/runnerCore';
import type { PickupItem } from '../../engine/runner/pickups';
import { RunnerCanvas } from '../../engine/runner/RunnerCanvas';
import {
  createInitialChaserState,
  updateChaser,
  onObstacleHit,
  onChaserPickup,
  type ChaserState,
} from './chaser';
import './ZombieRun.css';

export interface ZombieRunProps {
  onComplete: (result: GameResult) => void;
  onExit?: () => void;
}

export const ZombieRun: React.FC<ZombieRunProps> = ({ onComplete }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [hudDistance, setHudDistance] = useState<number>(0);
  const [hudScore, setHudScore] = useState<number>(0);
  const [hudGap, setHudGap] = useState<number>(25);
  const [hudStamina, setHudStamina] = useState<number>(100);
  const [hudShields, setHudShields] = useState<number>(0);
  const [hudCrates, setHudCrates] = useState<number>(0);
  const [isSprintingState, setIsSprintingState] = useState<boolean>(false);

  // Chaser state ref
  const chaserRef = useRef<ChaserState>(createInitialChaserState());
  const wantsSprintRef = useRef<boolean>(false);
  const startTimeRef = useRef<number>(0);
  const prevCollisionsRef = useRef<number>(0);
  const [runSeed, setRunSeed] = useState<number>(() => Math.floor(Math.random() * 1000000));

  // Keyboard sprint listener (Shift key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        wantsSprintRef.current = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        wantsSprintRef.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleStart = () => {
    setRunSeed(Math.floor(Math.random() * 1000000));
    chaserRef.current = createInitialChaserState();
    wantsSprintRef.current = false;
    prevCollisionsRef.current = 0;
    startTimeRef.current = Date.now();

    setIsPlaying(true);
    setHudDistance(0);
    setHudScore(0);
    setHudGap(25);
    setHudStamina(100);
    setHudShields(0);
    setHudCrates(0);
    setIsSprintingState(false);
  };

  const handleGameOver = useCallback((state: RunnerState) => {
    setIsPlaying(false);
    const durationMs = Math.max(1000, Date.now() - startTimeRef.current);
    const survivedSec = Math.floor(durationMs / 1000);
    const distanceM = Math.round(state.distance);
    const chaser = chaserRef.current;

    const result: GameResult = {
      gameId: 'zombie-run',
      sessionId: `zombie_${Date.now()}`,
      mode: 'classic',
      score: distanceM + state.score * 2 + chaser.cratesOpened * 500,
      durationMs,
      difficulty: 'normal',
      performance: {
        distanceM,
        survivedSec,
        cratesOpened: chaser.cratesOpened,
        shieldsUsed: chaser.shields,
        durationMs,
      },
      clientVersion: '1.0.0',
      startedAt: new Date(startTimeRef.current).toISOString(),
      endedAt: new Date().toISOString(),
    };

    onComplete(result);
  }, [onComplete]);

  // Tick chaser logic on simulation progress
  const handleProgress = useCallback((distance: number, score: number) => {
    setHudDistance(Math.round(distance));
    setHudScore(score);

    // Update chaser (approx 16.67ms timestep per step)
    const dtSec = 1 / 60;
    let nextChaser = updateChaser(chaserRef.current, dtSec, wantsSprintRef.current);

    // Check collision count change from previous runner step
    if (prevCollisionsRef.current > 0) {
      nextChaser = onObstacleHit(nextChaser);
      prevCollisionsRef.current = 0;
    }
    chaserRef.current = nextChaser;

    setHudGap(Math.round(nextChaser.zombieGap * 10) / 10);
    setHudStamina(Math.round(nextChaser.stamina));
    setHudShields(nextChaser.shields);
    setHudCrates(nextChaser.cratesOpened);
    setIsSprintingState(nextChaser.isSprinting);

    // If caught, trigger game over
    if (nextChaser.isCaught) {
      handleGameOver({
        distance,
        speed: 0,
        lane: 1,
        targetLane: 1,
        laneTransitionProgress: 1,
        y: 0,
        vy: 0,
        sliding: false,
        slideTimeRemainingMs: 0,
        lives: 0,
        shieldMs: 0,
        magnetMs: 0,
        doubleMs: 0,
        speedBoostMs: 0,
        ghostMs: 0,
        score,
        pickupsCollected: 0,
        goldenTokensCollected: 0,
        collisions: 1,
        isGameOver: true,
        timeElapsedMs: Date.now() - startTimeRef.current,
      });
    }
  }, [handleGameOver]);

  const handlePickup = useCallback((pickup: PickupItem) => {
    // Risk/reward: Diamond/Crystal in lane 2 acts as Danger Lane Survivor Crate
    // Normal tokens act as Safe Cache
    if (pickup.type === 'diamond' || pickup.type === 'crystal') {
      chaserRef.current = onChaserPickup(chaserRef.current, 'danger-crate');
    } else if (pickup.type === 'speed-boost') {
      chaserRef.current = onChaserPickup(chaserRef.current, 'energy');
    } else if (pickup.type === 'shield') {
      chaserRef.current = onChaserPickup(chaserRef.current, 'shield');
    } else {
      chaserRef.current = onChaserPickup(chaserRef.current, 'safe-cache');
    }
  }, []);

  return (
    <div className="zombie-run-cabinet">
      {!isPlaying ? (
        <div className="zr-lobby-card">
          <div className="zr-threat-panel">
            <span className="zr-threat-title">Threat Assessment: Horde Approaching</span>
            <div className="zr-threat-grid">
              <div className="zr-threat-item">
                <span className="zr-threat-label">Enemy Threat</span>
                <span className="zr-threat-val">Walker Horde</span>
              </div>
              <div className="zr-threat-item">
                <span className="zr-threat-label">Starting Distance</span>
                <span className="zr-threat-val">25 Meters</span>
              </div>
              <div className="zr-threat-item">
                <span className="zr-threat-label">Sprint Power</span>
                <span className="zr-threat-val">Shift / Hold Sprint</span>
              </div>
              <div className="zr-threat-item">
                <span className="zr-threat-label">Lethal Condition</span>
                <span className="zr-threat-val" style={{ color: 'var(--r)' }}>Gap &le; 0m</span>
              </div>
            </div>
          </div>

          <div className="zr-instructions">
            <p>
              <strong>The Horde is behind you!</strong> Zombies steadily gain ground. Colliding with obstacles costs 6m of gap.
            </p>
            <p>
              Hold <strong>Shift</strong> or tap <strong>Sprint</strong> to burst ahead, but watch your stamina bar.
            </p>
            <p>
              <strong>Tactical Forks:</strong> Safe lanes hold modest token caches; risky right lanes hold high-reward
              Survivor Crates (+500 score, +bonus token) but pull zombies 4m closer!
            </p>
            <p>
              Rewards: 30s=1, 60s=2, 90s=3, 120s=4 tokens; Crates opened +1 token (max +2/run, cap 10/day).
            </p>
          </div>

          <button type="button" className="zr-start-btn" onClick={handleStart}>
            Escape the Horde
          </button>
        </div>
      ) : (
        <div className="zr-hud-wrap">
          <div className="zr-hud-top">
            <div className="zr-hud-item">
              <span className="zr-hud-label">Horde Distance</span>
              <span className={`zr-hud-val ${hudGap < 8 ? 'danger' : hudGap < 15 ? 'warning' : ''}`}>
                {hudGap}m
              </span>
            </div>
            <div className="zr-hud-item">
              <span className="zr-hud-label">Distance</span>
              <span className="zr-hud-val">{hudDistance}m</span>
            </div>
            <div className="zr-hud-item">
              <span className="zr-hud-label">Score</span>
              <span className="zr-hud-val">{hudScore}</span>
            </div>
            <div className="zr-hud-item">
              <span className="zr-hud-label">Crates</span>
              <span className="zr-hud-val">{hudCrates}</span>
            </div>
            <div className="zr-hud-item">
              <span className="zr-hud-label">Shields</span>
              <span className="zr-hud-val">{hudShields}</span>
            </div>
          </div>

          <div className="zr-bars-panel">
            <div className="zr-bar-row">
              <span className="zr-bar-label">Stamina</span>
              <div className="zr-bar-track">
                <div
                  className={`zr-bar-fill stamina ${isSprintingState ? 'sprinting' : ''}`}
                  style={{ width: `${hudStamina}%` }}
                />
              </div>
            </div>

            <div className="zr-bar-row">
              <span className="zr-bar-label">Gap</span>
              <div className="zr-bar-track">
                <div
                  className="zr-bar-fill gap"
                  style={{ width: `${Math.min(100, (hudGap / 40) * 100)}%` }}
                />
              </div>
            </div>

            <button
              type="button"
              className={`zr-sprint-btn ${isSprintingState ? 'active' : ''}`}
              onMouseDown={() => { wantsSprintRef.current = true; }}
              onMouseUp={() => { wantsSprintRef.current = false; }}
              onTouchStart={() => { wantsSprintRef.current = true; }}
              onTouchEnd={() => { wantsSprintRef.current = false; }}
            >
              {isSprintingState ? 'Sprinting!' : 'Hold to Sprint (Shift)'}
            </button>
          </div>

          <RunnerCanvas
            seed={runSeed}
            shortcutMode={true}
            onPickupCollected={handlePickup}
            onGameOver={handleGameOver}
            onProgress={handleProgress}
          />
        </div>
      )}
    </div>
  );
};
