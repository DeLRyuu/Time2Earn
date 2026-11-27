import React, { useState, useRef, useCallback } from 'react';
import type { GameResult } from '../../types';
import type { RunnerState } from '../../engine/runner/runnerCore';
import { RunnerCanvas } from '../../engine/runner/RunnerCanvas';
import {
  getDifficultyBand,
  endlessDifficultyCurve,
  getComboMultiplier,
  calculateEndlessArcadeScore,
} from './logic';
import './EndlessRun.css';

export interface EndlessRunProps {
  onComplete: (result: GameResult) => void;
  onExit?: () => void;
}

export const EndlessRun: React.FC<EndlessRunProps> = ({ onComplete }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [hudDistance, setHudDistance] = useState<number>(0);
  const [hudScore, setHudScore] = useState<number>(0);
  const [hudBand, setHudBand] = useState<string>('Easy');
  const [combo, setCombo] = useState<number>(0);
  const [bestCombo, setBestCombo] = useState<number>(0);

  // Random run seed generated at start of each session
  const [runSeed, setRunSeed] = useState<number>(() => Math.floor(Math.random() * 1000000));
  const startTimeRef = useRef<number>(0);

  const handleStart = () => {
    setRunSeed(Math.floor(Math.random() * 1000000));
    setIsPlaying(true);
    setHudDistance(0);
    setHudScore(0);
    setHudBand('Easy');
    setCombo(0);
    setBestCombo(0);
    startTimeRef.current = Date.now();
  };

  const handleGameOver = (state: RunnerState) => {
    setIsPlaying(false);
    const durationMs = Math.max(1000, Date.now() - startTimeRef.current);
    const distanceM = Math.round(state.distance);
    const pickupsScore = state.score;

    // arcadeScore = distance + pickupsScore * 5
    const arcadeScore = calculateEndlessArcadeScore(distanceM, pickupsScore);

    const result: GameResult = {
      gameId: 'endless-run',
      sessionId: `endless_${Date.now()}`,
      mode: 'classic',
      score: arcadeScore,
      durationMs,
      difficulty: 'normal',
      performance: {
        distanceM,
        pickupsScore,
        bestCombo,
        durationMs,
      },
      clientVersion: '1.0.0',
      startedAt: new Date(startTimeRef.current).toISOString(),
      endedAt: new Date().toISOString(),
    };

    onComplete(result);
  };

  const handleProgress = useCallback((distance: number, score: number) => {
    const d = Math.round(distance);
    setHudDistance(d);
    setHudScore(score);
    const band = getDifficultyBand(d);
    setHudBand(band.label);
  }, []);

  const handlePickupCollected = useCallback(() => {
    setCombo((prev) => {
      const next = prev + 1;
      setBestCombo((b) => Math.max(b, next));
      return next;
    });
  }, []);

  const comboMult = getComboMultiplier(combo);

  return (
    <div className="endless-run-cabinet">
      {!isPlaying ? (
        <div className="er-lobby-card">
          <div className="er-bands-overview">
            <span className="er-bands-title">Difficulty Escalation</span>
            <div className="er-bands-list">
              <div className="er-band-chip easy">
                <span className="er-band-name">Easy</span>
                <span className="er-band-dist">0m+</span>
              </div>
              <div className="er-band-chip normal">
                <span className="er-band-name">Normal</span>
                <span className="er-band-dist">500m+</span>
              </div>
              <div className="er-band-chip fast">
                <span className="er-band-name">Fast</span>
                <span className="er-band-dist">1000m+</span>
              </div>
              <div className="er-band-chip hard">
                <span className="er-band-name">Hard</span>
                <span className="er-band-dist">2000m+</span>
              </div>
              <div className="er-band-chip extreme">
                <span className="er-band-name">Extreme</span>
                <span className="er-band-dist">3000m+</span>
              </div>
              <div className="er-band-chip insane">
                <span className="er-band-name">Insane</span>
                <span className="er-band-dist">5000m+</span>
              </div>
            </div>
          </div>

          <div className="er-instructions">
            <p>
              <strong>Endless Survival:</strong> How far can you survive as hazards accelerate? Collect consecutive
              tokens to build up your Score Combo (x1..x5).
            </p>
            <p>
              Rewards: 300m = 1, 800m = 2, 1500m = 3, 2500m = 4, 4000m = 5, 6000m = 6 tokens (cap 8/day).
            </p>
            <p>
              Controls: <strong>A / D or Left / Right Arrows</strong> to switch lanes, <strong>W / Up / Space</strong> to
              jump, <strong>S / Down</strong> to slide.
            </p>
          </div>

          <button type="button" className="er-start-btn" onClick={handleStart}>
            Start Run
          </button>
        </div>
      ) : (
        <>
          <div className="er-hud">
            <div className="er-hud-item">
              <span className="er-hud-label">Distance</span>
              <span className="er-hud-val">{hudDistance}m</span>
            </div>
            <div className="er-hud-item">
              <span className="er-hud-label">Pickups</span>
              <span className="er-hud-val">{hudScore}</span>
            </div>
            <div className="er-hud-item">
              <span className="er-hud-label">Combo</span>
              <span className={`er-hud-val ${comboMult > 1 ? 'combo' : ''}`}>
                {comboMult > 1 ? `${comboMult}x (${combo})` : `${combo}`}
              </span>
            </div>
            <div className="er-hud-item">
              <span className="er-hud-label">Hazard Level</span>
              <span className={`er-hud-val band-${hudBand.toLowerCase()}`}>{hudBand}</span>
            </div>
          </div>

          <RunnerCanvas
            seed={runSeed}
            difficultyCurve={endlessDifficultyCurve}
            onPickupCollected={handlePickupCollected}
            onGameOver={handleGameOver}
            onProgress={handleProgress}
          />
        </>
      )}
    </div>
  );
};
