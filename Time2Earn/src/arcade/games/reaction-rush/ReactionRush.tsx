import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArcadeIcon } from '../../../components/ui/ArcadeIcon';
import type { GameResult } from '../../types';
import { createMulberry32 } from '../../engine/seededRng';
import { computeStats, type ReactionGrade } from './logic';
import './ReactionRush.css';

export interface ReactionRushProps {
  onFinish: (result: GameResult) => void;
}

type StepState = 'idle' | 'waiting' | 'ready' | 'round-complete' | 'early';

const TOTAL_ROUNDS = 10;

export const ReactionRush: React.FC<ReactionRushProps> = ({ onFinish }) => {
  const [step, setStep] = useState<StepState>('idle');
  const [roundIdx, setRoundIdx] = useState<number>(0);
  const [rounds, setRounds] = useState<number[]>([]);
  const [falseStarts, setFalseStarts] = useState<number>(0);
  const [lastRoundMs, setLastRoundMs] = useState<number | null>(null);

  const sessionIdRef = useRef<string>('');
  const startedAtRef = useRef<string>('');
  const rngRef = useRef<(() => number) | null>(null);
  const waitTimeoutRef = useRef<number | null>(null);
  const goTimestampRef = useRef<number>(0);

  // Initialize refs in an effect to keep initial render strictly pure
  useEffect(() => {
    sessionIdRef.current = `rr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    startedAtRef.current = new Date().toISOString();
    rngRef.current = createMulberry32(Date.now());
  }, []);

  // Stats calculation
  const stats = computeStats(rounds, falseStarts);

  // Clear pending timers on unmount
  useEffect(() => {
    return () => {
      if (waitTimeoutRef.current !== null) {
        clearTimeout(waitTimeoutRef.current);
      }
    };
  }, []);

  // Finish game after 10 rounds
  const finishGame = useCallback(
    (finalRounds: number[], totalFalseStarts: number) => {
      const finalStats = computeStats(finalRounds, totalFalseStarts);
      const minRoundMs = finalRounds.length > 0 ? Math.min(...finalRounds) : 0;
      // arcadeScore = max(0, 1000 - avgMs*2), rounded
      const arcadeScore = Math.max(0, Math.round(1000 - finalStats.effectiveAvgMs * 2));
      const endedAt = new Date().toISOString();
      const startTime = startedAtRef.current ? new Date(startedAtRef.current).getTime() : Date.now() - 10000;
      const durationMs = Math.max(10000, new Date(endedAt).getTime() - startTime);

      const result: GameResult = {
        gameId: 'reaction-rush',
        sessionId: sessionIdRef.current || `rr_${Date.now()}`,
        mode: 'classic',
        score: arcadeScore,
        durationMs,
        difficulty: 'normal',
        performance: {
          avgMs: finalStats.effectiveAvgMs,
          rawAvgMs: finalStats.avgMs,
          bestMs: finalStats.bestMs,
          minRoundMs,
          falseStarts: totalFalseStarts,
          rounds: finalRounds.length,
        },
        clientVersion: '1.0.0',
        startedAt: startedAtRef.current || endedAt,
        endedAt,
      };

      onFinish(result);
    },
    [onFinish]
  );

  // Start next round
  const scheduleNextRound = useCallback(() => {
    setStep('waiting');
    // Random delay between 1.2s and 4.0s (1200ms - 4000ms)
    const rng = rngRef.current || Math.random;
    const delay = 1200 + Math.floor(rng() * 2800);

    waitTimeoutRef.current = window.setTimeout(() => {
      goTimestampRef.current = performance.now();
      setStep('ready');
    }, delay);
  }, []);

  const handleStartGame = useCallback(() => {
    sessionIdRef.current = `rr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    startedAtRef.current = new Date().toISOString();
    rngRef.current = createMulberry32(Date.now());
    setRoundIdx(0);
    setRounds([]);
    setFalseStarts(0);
    setLastRoundMs(null);
    scheduleNextRound();
  }, [scheduleNextRound]);

  // Primary action triggered by touch/click or Spacebar
  const handleAction = useCallback(() => {
    if (step === 'idle') {
      handleStartGame();
      return;
    }

    if (step === 'waiting') {
      // Early click / false start!
      if (waitTimeoutRef.current !== null) {
        clearTimeout(waitTimeoutRef.current);
        waitTimeoutRef.current = null;
      }
      setFalseStarts((prev) => prev + 1);
      setStep('early');
      return;
    }

    if (step === 'ready') {
      // Measured reaction!
      const elapsed = Math.round(performance.now() - goTimestampRef.current);
      setLastRoundMs(elapsed);
      const nextRounds = [...rounds, elapsed];
      setRounds(nextRounds);

      if (nextRounds.length >= TOTAL_ROUNDS) {
        setStep('idle');
        finishGame(nextRounds, falseStarts);
      } else {
        setRoundIdx((prev) => prev + 1);
        setStep('round-complete');
      }
      return;
    }

    if (step === 'early' || step === 'round-complete') {
      scheduleNextRound();
    }
  }, [step, rounds, falseStarts, handleStartGame, scheduleNextRound, finishGame]);

  // Spacebar listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleAction();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAction]);

  return (
    <div className="reaction-rush-view">
      {/* Heads-Up HUD */}
      <div className="reaction-hud">
        <div className="reaction-hud-stat">
          <span className="reaction-hud-label">Round</span>
          <span className="reaction-hud-val">
            {Math.min(TOTAL_ROUNDS, rounds.length + 1)} / {TOTAL_ROUNDS}
          </span>
        </div>

        <div className="reaction-hud-stat">
          <span className="reaction-hud-label">Average</span>
          <span className="reaction-hud-val">
            {rounds.length > 0 ? `${stats.effectiveAvgMs} ms` : '--'}
          </span>
        </div>

        <div className="reaction-hud-stat">
          <span className="reaction-hud-label">Best</span>
          <span className="reaction-hud-val" style={{ color: 'var(--g)' }}>
            {rounds.length > 0 ? `${stats.bestMs} ms` : '--'}
          </span>
        </div>

        <div className="reaction-hud-stat">
          <span className="reaction-hud-label">False Starts</span>
          <span
            className="reaction-hud-val"
            style={{ color: falseStarts > 3 ? 'var(--r)' : 'var(--ink)' }}
          >
            {falseStarts} {falseStarts > 3 ? `(+${(falseStarts - 3) * 100}ms)` : ''}
          </span>
        </div>

        <div className="reaction-hud-stat">
          <span className="reaction-hud-label">Current Grade</span>
          <span className="reaction-hud-val" style={{ color: 'var(--y)' }}>
            {rounds.length > 0 ? stats.grade : '--'}
          </span>
        </div>
      </div>

      {/* Chunky Interactive Reaction Area */}
      <div
        className={`reaction-target-zone ${step}`}
        onClick={handleAction}
        role="button"
        tabIndex={0}
        aria-label="Reaction target zone"
      >
        {step === 'idle' && (
          <>
            <ArcadeIcon name="clock" size={64} style={{ color: 'var(--g)' }} />
            <h2 className="reaction-state-text">Reaction Rush</h2>
            <p className="reaction-sub-text">
              10 rounds of reflex testing. Tap or press Space when the screen turns green!
            </p>
            <button
              type="button"
              className="game-btn"
              style={{ width: 'auto', marginTop: '16px' }}
              onClick={(e) => {
                e.stopPropagation();
                handleStartGame();
              }}
            >
              <ArcadeIcon name="joystick" size={20} />
              <span>Start 10 rounds</span>
            </button>
          </>
        )}

        {step === 'waiting' && (
          <>
            <ArcadeIcon name="lock" size={64} style={{ color: '#ffffff' }} />
            <h2 className="reaction-state-text" style={{ color: '#ffffff' }}>WAIT FOR GREEN</h2>
            <p className="reaction-sub-text" style={{ color: '#ffffff' }}>
              Do not click early. Waiting for random signal...
            </p>
          </>
        )}

        {step === 'ready' && (
          <>
            <ArcadeIcon name="bolt" size={72} style={{ color: 'var(--on)' }} />
            <h2 className="reaction-state-text" style={{ color: 'var(--on)' }}>GO! CLICK / TAP!</h2>
            <p className="reaction-sub-text" style={{ color: 'var(--on)' }}>
              Press Space or tap anywhere NOW!
            </p>
          </>
        )}

        {step === 'early' && (
          <>
            <ArcadeIcon name="x" size={64} style={{ color: 'var(--on)' }} />
            <h2 className="reaction-state-text">FALSE START!</h2>
            <p className="reaction-sub-text">
              You clicked before green! Round repeated. (3 free, then +100ms penalty).
            </p>
            <span style={{ fontSize: '13px', fontWeight: 800, marginTop: '12px' }}>
              Tap or press Space to retry
            </span>
          </>
        )}

        {step === 'round-complete' && (
          <>
            <ArcadeIcon name="check" size={56} style={{ color: 'var(--g)' }} />
            <h2 className="reaction-state-text">{lastRoundMs} ms</h2>
            <p className="reaction-sub-text">
              Round {roundIdx} finished. Grade: {lastRoundMs ? getGradeLabel(lastRoundMs) : ''}
            </p>
            <span style={{ fontSize: '13px', fontWeight: 800, marginTop: '12px' }}>
              Tap or press Space for next round
            </span>
          </>
        )}
      </div>

      {/* Round Breakdown History */}
      {rounds.length > 0 && (
        <div className="reaction-history">
          <span className="reaction-history-title">Round History</span>
          <div className="reaction-rounds-grid">
            {rounds.map((ms, idx) => {
              const isBest = ms === stats.bestMs;
              return (
                <div
                  key={idx}
                  className={`reaction-round-chip ${isBest ? 'best' : ''}`}
                >
                  <span style={{ color: 'var(--mute)' }}>R{idx + 1}</span>
                  <b>{ms}ms</b>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

function getGradeLabel(ms: number): ReactionGrade {
  if (ms < 150) return 'S+';
  if (ms <= 180) return 'S';
  if (ms <= 220) return 'A';
  if (ms <= 270) return 'B';
  if (ms <= 350) return 'C';
  return 'D';
}
