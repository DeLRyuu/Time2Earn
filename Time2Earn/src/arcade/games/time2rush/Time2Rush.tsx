import React, { useState, useMemo } from 'react';
import type { GameResult } from '../../types';
import type { RunnerState, RecordedInput } from '../../engine/runner/runnerCore';
import { RunnerCanvas } from '../../engine/runner/RunnerCanvas';
import {
  TIME2RUSH_CONFIG,
  getDailyTrackKey,
  getDailySeed,
  getStoredGhost,
  saveGhostRun,
  getPersonalBestTime,
  savePersonalBestTime,
  type Time2RushMode,
} from './logic';
import './Time2Rush.css';

export interface Time2RushProps {
  onComplete: (result: GameResult) => void;
  onExit?: () => void;
}

export const Time2Rush: React.FC<Time2RushProps> = ({ onComplete }) => {
  const [mode, setMode] = useState<Time2RushMode>('time-trial');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [hudDistance, setHudDistance] = useState<number>(0);
  const [hudScore, setHudScore] = useState<number>(0);
  const [hudSpeed, setHudSpeed] = useState<number>(14);

  const dateKey = useMemo(() => getDailyTrackKey(), []);
  const dailySeed = useMemo(() => getDailySeed(dateKey), [dateKey]);

  const personalBest = useMemo(() => getPersonalBestTime(dateKey, mode), [dateKey, mode]);
  const ghostRecord = useMemo(() => getStoredGhost(dateKey, mode), [dateKey, mode]);

  const handleStart = () => {
    setIsPlaying(true);
    setHudDistance(0);
    setHudScore(0);
    setHudSpeed(14);
  };

  const handleGameOver = (state: RunnerState, inputLog: RecordedInput[], completed: boolean) => {
    setIsPlaying(false);
    const finishTimeMs = Math.round(state.timeElapsedMs);

    // Save personal best & ghost run if completed
    if (completed) {
      savePersonalBestTime(dateKey, mode, finishTimeMs);
      saveGhostRun({
        dateKey,
        finishTimeMs,
        inputs: inputLog,
        mode,
      });
    }

    // Leaderboards store finishTimeMs as score for completed runs (lower is better; for scoring, we invert or store ms)
    // Here result.score is pickupsScore + finish bonus
    const finalScore = state.score + (completed ? 5000 : 0);

    const result: GameResult = {
      gameId: 'time2rush',
      sessionId: `t2r_${Date.now()}`,
      mode,
      score: finalScore,
      durationMs: finishTimeMs,
      difficulty: 'normal',
      performance: {
        completed: completed ? 1 : 0,
        finishTimeMs,
        pickupsScore: state.score,
        tokenPickups: state.pickupsCollected,
        collisions: state.collisions,
        trackLengthM: TIME2RUSH_CONFIG.TRACK_LENGTH_M,
        ...(personalBest !== null ? { trackRecordMs: personalBest } : {}),
      },
      clientVersion: '1.0.0',
      startedAt: new Date(Date.now() - finishTimeMs).toISOString(),
      endedAt: new Date().toISOString(),
    };

    onComplete(result);
  };

  const handleProgress = (distance: number, score: number, speed: number) => {
    setHudDistance(Math.round(distance));
    setHudScore(score);
    setHudSpeed(Math.round(speed));
  };

  const formatTime = (ms: number | null) => {
    if (ms === null) return '--:--';
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    const centi = Math.floor((ms % 1000) / 10);
    return `${m}:${s < 10 ? '0' : ''}${s}.${centi < 10 ? '0' : ''}${centi}`;
  };

  return (
    <div className="time2rush-cabinet">
      {!isPlaying ? (
        <div className="t2r-lobby-card">
          <div className="t2r-mode-selector">
            <button
              type="button"
              className={`t2r-mode-btn ${mode === 'time-trial' ? 'active' : ''}`}
              onClick={() => setMode('time-trial')}
            >
              Time Trial
            </button>
            <button
              type="button"
              className={`t2r-mode-btn ${mode === 'token-run' ? 'active' : ''}`}
              onClick={() => setMode('token-run')}
            >
              Token Run (Risky)
            </button>
          </div>

          <div className="t2r-stats-grid">
            <div className="t2r-stat-box">
              <span className="t2r-stat-label">Daily Track</span>
              <span className="t2r-stat-value">{dateKey}</span>
            </div>
            <div className="t2r-stat-box">
              <span className="t2r-stat-label">Personal Best</span>
              <span className="t2r-stat-value neon-yellow">{formatTime(personalBest)}</span>
            </div>
            <div className="t2r-stat-box">
              <span className="t2r-stat-label">Track Length</span>
              <span className="t2r-stat-value">{TIME2RUSH_CONFIG.TRACK_LENGTH_M}m</span>
            </div>
            <div className="t2r-stat-box">
              <span className="t2r-stat-label">Ghost Runner</span>
              <span className="t2r-stat-value neon-green">
                {ghostRecord ? `${formatTime(ghostRecord.finishTimeMs)}` : 'None'}
              </span>
            </div>
          </div>

          <div className="t2r-instructions">
            {mode === 'time-trial' ? (
              <p>
                <strong>Time Trial:</strong> Reach the finish line (1000m) in record time! Compare against your
                translucent ghost runner.
              </p>
            ) : (
              <p>
                <strong>Token Run:</strong> Risky shortcut lanes hold high-value Diamonds and Crystals (+25). Survive
                the dense obstacles!
              </p>
            )}
            <p>
              Controls: <strong>A / D or Left / Right Arrows</strong> to switch lanes, <strong>W / Up / Space</strong> to
              jump, <strong>S / Down</strong> to slide.
            </p>
          </div>

          <button type="button" className="t2r-start-btn" onClick={handleStart}>
            Launch Run
          </button>
        </div>
      ) : (
        <>
          <div className="t2r-hud">
            <div className="t2r-hud-item">
              <span className="t2r-hud-label">Distance</span>
              <span className="t2r-hud-val">
                {hudDistance} / {TIME2RUSH_CONFIG.TRACK_LENGTH_M}m
              </span>
            </div>
            <div className="t2r-hud-item">
              <span className="t2r-hud-label">Score</span>
              <span className="t2r-hud-val">{hudScore}</span>
            </div>
            <div className="t2r-hud-item">
              <span className="t2r-hud-label">Speed</span>
              <span className="t2r-hud-val">{hudSpeed} m/s</span>
            </div>
          </div>

          <RunnerCanvas
            seed={dailySeed}
            maxDistance={TIME2RUSH_CONFIG.TRACK_LENGTH_M}
            shortcutMode={mode === 'token-run'}
            ghostInputs={ghostRecord?.inputs}
            onGameOver={handleGameOver}
            onProgress={handleProgress}
          />
        </>
      )}
    </div>
  );
};
