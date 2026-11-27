import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArcadeIcon } from '../../../components/ui/ArcadeIcon';
import type { GameResult } from '../../types';
import { createMulberry32 } from '../../engine/seededRng';
import {
  getKeyPoolForStage,
  getNextKey,
  getComboMultiplier,
  calculateAccuracy,
  calculateKps,
  calculateArcadeScore,
} from './logic';
import './KeyboardNinja.css';

export interface KeyboardNinjaProps {
  onFinish: (result: GameResult) => void;
}

const GAME_DURATION_SEC = 45;
const KEYS_PER_STAGE = 15;
const INITIAL_LIVES = 3;

function checkIsTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
  return hasTouch && hasCoarsePointer;
}

export const KeyboardNinja: React.FC<KeyboardNinjaProps> = ({ onFinish }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [targetKey, setTargetKey] = useState<string>('A');
  const [stage, setStage] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [bestCombo, setBestCombo] = useState<number>(0);
  const [hits, setHits] = useState<number>(0);
  const [misses, setMisses] = useState<number>(0);
  const [lives, setLives] = useState<number>(INITIAL_LIVES);
  const [secondsLeft, setSecondsLeft] = useState<number>(GAME_DURATION_SEC);
  const [isTouchDevice] = useState<boolean>(() => checkIsTouchDevice());

  const sessionIdRef = useRef<string>('');
  const startedAtRef = useRef<string>('');
  const rngRef = useRef<(() => number) | null>(null);
  const timerRef = useRef<number | null>(null);

  // Finish round callback
  const finishGame = useCallback(
    (finalHits: number, finalMisses: number, finalBestCombo: number, finalStage: number) => {
      setIsPlaying(false);
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      const endedAt = new Date().toISOString();
      const startTime = startedAtRef.current
        ? new Date(startedAtRef.current).getTime()
        : Date.now() - 45000;
      const durationMs = Math.max(10000, new Date(endedAt).getTime() - startTime);

      const accuracy = calculateAccuracy(finalHits, finalMisses);
      const keysPerSec = calculateKps(finalHits, durationMs);
      const arcadeScore = calculateArcadeScore(finalHits, finalBestCombo, finalMisses);

      const result: GameResult = {
        gameId: 'keyboard-ninja',
        sessionId: sessionIdRef.current || `kn_${Date.now()}`,
        mode: 'classic',
        score: arcadeScore,
        durationMs,
        difficulty: 'normal',
        performance: {
          hits: finalHits,
          misses: finalMisses,
          accuracy,
          keysPerSec,
          bestCombo: finalBestCombo,
          stage: finalStage,
        },
        clientVersion: '1.0.0',
        startedAt: startedAtRef.current || endedAt,
        endedAt,
      };

      onFinish(result);
    },
    [onFinish]
  );

  // 45-second timer countdown
  useEffect(() => {
    if (!isPlaying) return;

    timerRef.current = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          finishGame(hits, misses, bestCombo, stage);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, hits, misses, bestCombo, stage, finishGame]);

  // Start new round
  const handleStartGame = () => {
    sessionIdRef.current = `kn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    startedAtRef.current = new Date().toISOString();
    rngRef.current = createMulberry32(Date.now());

    const firstPool = getKeyPoolForStage(0);
    const firstKey = getNextKey(firstPool, rngRef.current);

    setTargetKey(firstKey);
    setStage(0);
    setCombo(0);
    setBestCombo(0);
    setHits(0);
    setMisses(0);
    setLives(INITIAL_LIVES);
    setSecondsLeft(GAME_DURATION_SEC);
    setIsPlaying(true);
  };

  // Keyboard input listener
  useEffect(() => {
    if (!isPlaying) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent browser default actions (Space scroll, Tab navigation)
      if (e.code === 'Space' || e.code === 'Tab' || e.key === 'Tab') {
        e.preventDefault();
      }

      // Ignore held-key auto-repeat
      if (e.repeat) return;

      const pressed = e.key.toUpperCase();
      if (!/^[A-Z]$/.test(pressed)) {
        return; // ignore non-alphabetic keys
      }

      if (pressed === targetKey) {
        // Correct Hit!
        const nextHits = hits + 1;
        const nextCombo = combo + 1;
        const nextBestCombo = Math.max(bestCombo, nextCombo);
        const nextStage = Math.floor(nextHits / KEYS_PER_STAGE);

        setHits(nextHits);
        setCombo(nextCombo);
        setBestCombo(nextBestCombo);
        setStage(nextStage);

        // Advance to next key
        const pool = getKeyPoolForStage(nextStage);
        const rng = rngRef.current || Math.random;
        setTargetKey(getNextKey(pool, rng, targetKey));
      } else {
        // Wrong Key / Miss!
        const nextMisses = misses + 1;
        const nextLives = lives - 1;

        setMisses(nextMisses);
        setCombo(0);
        setLives(nextLives);

        if (nextLives <= 0) {
          finishGame(hits, nextMisses, bestCombo, stage);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, targetKey, hits, misses, combo, bestCombo, lives, stage, finishGame]);

  const activePool = getKeyPoolForStage(stage);
  const multiplier = getComboMultiplier(combo);

  // TODO: Add Boss Mode in future phase (as planned in prompt specifications)

  return (
    <div className="keyboard-ninja-view">
      {/* Heads-Up Display */}
      <div className="ninja-hud">
        <div className="ninja-hud-stat">
          <span className="ninja-hud-label">Time</span>
          <span
            className="ninja-hud-val"
            style={{ color: secondsLeft <= 10 ? 'var(--r)' : 'var(--ink)' }}
          >
            {secondsLeft}s
          </span>
        </div>

        <div className="ninja-hud-stat">
          <span className="ninja-hud-label">Combo</span>
          <span className="ninja-hud-val combo">
            {combo}x {multiplier > 1 ? `(${multiplier}x score)` : ''}
          </span>
        </div>

        <div className="ninja-hud-stat">
          <span className="ninja-hud-label">Lives</span>
          <span className="ninja-hud-val lives">
            {Array.from({ length: INITIAL_LIVES }).map((_, i) => (
              <ArcadeIcon
                key={i}
                name="flame"
                size={18}
                style={{ color: i < lives ? 'var(--r)' : 'var(--mute)' }}
              />
            ))}
          </span>
        </div>

        <div className="ninja-hud-stat">
          <span className="ninja-hud-label">Stage</span>
          <span className="ninja-hud-val">Stage {stage + 1}</span>
        </div>

        <div className="ninja-hud-stat">
          <span className="ninja-hud-label">Hits</span>
          <span className="ninja-hud-val" style={{ color: 'var(--g)' }}>
            {hits}
          </span>
        </div>
      </div>

      {/* Touch-Device Notice */}
      {isTouchDevice && (
        <div className="ninja-touch-warning">
          <ArcadeIcon name="lock" size={24} />
          <span>Keyboard required. Please connect a physical keyboard to play Keyboard Ninja.</span>
        </div>
      )}

      {/* Main Playfield */}
      <div className="ninja-playfield">
        {!isPlaying ? (
          <>
            <ArcadeIcon name="pad" size={64} style={{ color: 'var(--s)' }} />
            <h2 style={{ fontFamily: 'Lilita One', fontSize: '32px', margin: '14px 0 6px 0' }}>
              Keyboard Ninja
            </h2>
            <p style={{ color: 'var(--mute)', maxWidth: '440px', fontSize: '15px', fontWeight: 600, margin: 0 }}>
              45-second rhythm typing cabinet. Hit target keys on your keyboard without missing to build combo!
            </p>
            <button
              type="button"
              className="game-btn"
              disabled={isTouchDevice}
              style={{ width: 'auto', marginTop: '20px' }}
              onClick={handleStartGame}
            >
              <ArcadeIcon name="joystick" size={20} />
              <span>{isTouchDevice ? 'Keyboard required' : 'Start 45s run'}</span>
            </button>
          </>
        ) : (
          <>
            <span className="ninja-multiplier-badge">x{multiplier} Score Multiplier</span>

            <div className="ninja-target-tile">
              <span className="ninja-target-char">{targetKey}</span>
            </div>

            <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--mute)' }}>
              Press <strong>{targetKey}</strong> on your keyboard
            </span>

            {/* On-screen key hint row */}
            <div className="ninja-hint-row">
              <span className="ninja-hint-label">Active key pool (Stage {stage + 1})</span>
              <div className="ninja-key-badges">
                {activePool.split('').map((char) => (
                  <span
                    key={char}
                    className={`ninja-key-badge ${char === targetKey ? 'active' : ''}`}
                  >
                    {char}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
