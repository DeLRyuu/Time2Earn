import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArcadeIcon } from '../../../components/ui/ArcadeIcon';
import type { GameResult } from '../../types';
import { createMulberry32 } from '../../engine/seededRng';
import {
  calculateAccuracy,
  calculateArcadeScore,
  generateQuestion,
  getTimeLimitForProgress,
  STROOP_COLORS,
  type StroopColorId,
  type StroopQuestion,
} from './logic';
import './ColorClash.css';

export interface ColorClashProps {
  onFinish: (result: GameResult) => void;
  mode?: 'classic';
}

const TOTAL_QUESTIONS = 20;

export const ColorClash: React.FC<ColorClashProps> = ({ onFinish, mode = 'classic' }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [questionIdx, setQuestionIdx] = useState<number>(0);
  const [currentQuestion, setCurrentQuestion] = useState<StroopQuestion | null>(null);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [bestCombo, setBestCombo] = useState<number>(0);
  const [responseTimesMs, setResponseTimesMs] = useState<number[]>([]);
  const [timeRemainingRatio, setTimeRemainingRatio] = useState<number>(1);

  const sessionIdRef = useRef<string>('');
  const startedAtRef = useRef<string>('');
  const rngRef = useRef<(() => number) | null>(null);
  const questionStartTimestampRef = useRef<number>(0);
  const countdownIntervalRef = useRef<number | null>(null);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current !== null) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  // Finish round callback
  const finishGame = useCallback(
    (finalCorrect: number, finalTimes: number[], finalBestCombo: number) => {
      setIsPlaying(false);
      if (countdownIntervalRef.current !== null) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }

      const endedAt = new Date().toISOString();
      const startTime = startedAtRef.current
        ? new Date(startedAtRef.current).getTime()
        : Date.now() - 20000;
      const durationMs = Math.max(8000, new Date(endedAt).getTime() - startTime);

      const total = TOTAL_QUESTIONS;
      const accuracy = calculateAccuracy(finalCorrect, total);
      const avgTimeMs =
        finalTimes.length > 0
          ? Math.round(finalTimes.reduce((a, b) => a + b, 0) / finalTimes.length)
          : 2000;

      const arcadeScore = calculateArcadeScore(finalCorrect, finalBestCombo, avgTimeMs);

      const result: GameResult = {
        gameId: 'color-clash',
        sessionId: sessionIdRef.current || `cc_${Date.now()}`,
        mode,
        score: arcadeScore,
        durationMs,
        difficulty: 'normal',
        performance: {
          correct: finalCorrect,
          total,
          accuracy,
          avgTimeMs,
          bestCombo: finalBestCombo,
        },
        clientVersion: '1.0.0',
        startedAt: startedAtRef.current || endedAt,
        endedAt,
      };

      onFinish(result);
    },
    [mode, onFinish]
  );

  const advanceQuestionRef = useRef<(isCorrect: boolean, timeSpentMs: number) => void>(() => {});

  // Advance to next question or end game
  const advanceQuestion = useCallback(
    (isCorrect: boolean, timeSpentMs: number) => {
      if (countdownIntervalRef.current !== null) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }

      const nextTimes = [...responseTimesMs, timeSpentMs];
      setResponseTimesMs(nextTimes);

      let nextCorrect = correctCount;
      let nextBestCombo = bestCombo;

      if (isCorrect) {
        nextCorrect = correctCount + 1;
        const nextCombo = combo + 1;
        nextBestCombo = Math.max(bestCombo, nextCombo);
        setCorrectCount(nextCorrect);
        setCombo(nextCombo);
        setBestCombo(nextBestCombo);
      } else {
        setCombo(0);
      }

      const nextIdx = questionIdx + 1;
      if (nextIdx >= TOTAL_QUESTIONS) {
        finishGame(nextCorrect, nextTimes, nextBestCombo);
        return;
      }

      setQuestionIdx(nextIdx);
      const rng = rngRef.current || Math.random;
      const nextQ = generateQuestion(rng, currentQuestion || undefined);
      setCurrentQuestion(nextQ);
      questionStartTimestampRef.current = performance.now();
      setTimeRemainingRatio(1);

      // Start timer with scaling speed
      const timeLimitMs = getTimeLimitForProgress(nextCorrect);
      const startTime = performance.now();

      countdownIntervalRef.current = window.setInterval(() => {
        const elapsed = performance.now() - startTime;
        const remainingFraction = Math.max(0, 1 - elapsed / timeLimitMs);
        setTimeRemainingRatio(remainingFraction);

        if (remainingFraction <= 0) {
          // Time expired = counted as incorrect
          advanceQuestionRef.current(false, timeLimitMs);
        }
      }, 50);
    },
    [
      responseTimesMs,
      correctCount,
      combo,
      bestCombo,
      questionIdx,
      currentQuestion,
      finishGame,
    ]
  );

  useEffect(() => {
    advanceQuestionRef.current = advanceQuestion;
  }, [advanceQuestion]);

  // Player selection of INK color
  const handleSelectColor = useCallback(
    (colorId: StroopColorId) => {
      if (!isPlaying || !currentQuestion) return;
      const timeSpent = Math.round(performance.now() - questionStartTimestampRef.current);
      const isCorrect = colorId === currentQuestion.inkColor;
      advanceQuestion(isCorrect, timeSpent);
    },
    [isPlaying, currentQuestion, advanceQuestion]
  );

  // Start new round
  const handleStartGame = () => {
    sessionIdRef.current = `cc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    startedAtRef.current = new Date().toISOString();
    rngRef.current = createMulberry32(Date.now());

    const firstQ = generateQuestion(rngRef.current);
    setCurrentQuestion(firstQ);
    setQuestionIdx(0);
    setCorrectCount(0);
    setCombo(0);
    setBestCombo(0);
    setResponseTimesMs([]);
    setTimeRemainingRatio(1);
    setIsPlaying(true);

    questionStartTimestampRef.current = performance.now();
    const timeLimitMs = getTimeLimitForProgress(0);

    countdownIntervalRef.current = window.setInterval(() => {
      const elapsed = performance.now() - questionStartTimestampRef.current;
      const remainingFraction = Math.max(0, 1 - elapsed / timeLimitMs);
      setTimeRemainingRatio(remainingFraction);

      if (remainingFraction <= 0) {
        advanceQuestion(false, timeLimitMs);
      }
    }, 50);
  };

  // Keyboard shortcut listener (1, 2, 3, 4)
  useEffect(() => {
    if (!isPlaying) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const colorDef = STROOP_COLORS.find((c) => c.keyShortcut === e.key);
      if (colorDef) {
        e.preventDefault();
        handleSelectColor(colorDef.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, handleSelectColor]);

  // Resolve active word and ink styling
  const inkDef = currentQuestion
    ? STROOP_COLORS.find((c) => c.id === currentQuestion.inkColor)
    : undefined;
  const wordDef = currentQuestion
    ? STROOP_COLORS.find((c) => c.id === currentQuestion.word)
    : undefined;

  return (
    <div className="color-clash-view">
      {/* Heads-up HUD */}
      <div className="clash-hud">
        <div className="clash-hud-stat">
          <span className="clash-hud-label">Trial</span>
          <span className="clash-hud-val">
            {questionIdx + 1} / {TOTAL_QUESTIONS}
          </span>
        </div>

        <div className="clash-hud-stat">
          <span className="clash-hud-label">Correct</span>
          <span className="clash-hud-val" style={{ color: 'var(--g)' }}>
            {correctCount}
          </span>
        </div>

        <div className="clash-hud-stat">
          <span className="clash-hud-label">Combo</span>
          <span className="clash-hud-val combo">
            {combo}x
          </span>
        </div>

        <div className="clash-hud-stat">
          <span className="clash-hud-label">Accuracy</span>
          <span className="clash-hud-val">
            {questionIdx > 0 ? calculateAccuracy(correctCount, questionIdx) : 100}%
          </span>
        </div>
      </div>

      {/* Main Playfield */}
      <div className="clash-playfield">
        {!isPlaying ? (
          <>
            <ArcadeIcon name="eye" size={64} style={{ color: 'var(--v)' }} />
            <h2 style={{ fontFamily: 'Lilita One', fontSize: '32px', margin: '8px 0 4px 0' }}>
              Color Clash
            </h2>
            <p style={{ color: 'var(--mute)', maxWidth: '440px', fontSize: '15px', fontWeight: 600, margin: 0 }}>
              20 Stroop trials. Match the <strong>INK COLOR</strong> of the text, NOT the word itself!
            </p>
            <button
              type="button"
              className="game-btn"
              style={{ width: 'auto', marginTop: '16px' }}
              onClick={handleStartGame}
            >
              <ArcadeIcon name="joystick" size={20} />
              <span>Start 20 trials</span>
            </button>
          </>
        ) : (
          <>
            {/* Speed countdown bar */}
            <div className="clash-timer-bar-wrapper">
              <div
                className={`clash-timer-bar-fill ${timeRemainingRatio < 0.3 ? 'urgent' : ''}`}
                style={{ width: `${Math.max(0, timeRemainingRatio * 100)}%` }}
              />
            </div>

            <p className="clash-prompt">Pick the INK COLOR (ignore the written word!):</p>

            {/* Stimulus Word rendered in ink color */}
            <div className="clash-word-box">
              <h1 className="clash-word" style={{ color: inkDef?.cssColor || 'var(--ink)' }}>
                {wordDef?.label || 'READY'}
              </h1>
            </div>

            {/* 4 Accessible Option Buttons with labels, colors, shape icons & shortcuts */}
            <div className="clash-buttons-grid">
              {STROOP_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="clash-color-btn"
                  style={{ background: c.cssColor }}
                  onClick={() => handleSelectColor(c.id)}
                  aria-label={`Select ${c.label} ink color (Shortcut: ${c.keyShortcut})`}
                >
                  <span className="clash-btn-shortcut">{c.keyShortcut}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ArcadeIcon name={c.shapeIcon} size={20} />
                    <span>{c.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
