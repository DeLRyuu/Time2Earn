import React, { useState, useEffect, useCallback } from 'react';
import { ArcadeIcon } from '../../components/ui/ArcadeIcon';
import { CooldownTimer } from '../../components/common/CooldownTimer';
import { GainFeedback, type GainFeedbackItem } from '../../components/common/GainFeedback';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import {
  getArcadeUserStatus,
  startArcadeSession,
  submitArcadeSession,
  MAX_ATTEMPTS_PER_DAY,
  DAILY_CREDIT_CAP,
} from '../../services/arcadeService';
import { ARCADE_TIERS } from '../../lib/arcadeQuiz';
import type {
  ArcadeUserStatus,
  SanitizedQuizQuestion,
  ArcadeRewardResult,
} from '../../types/arcade';
import './Arcade.css';

type GameState = 'idle' | 'playing' | 'submitting' | 'result';

interface CabinetPreview {
  id: string;
  name: string;
  rewardLine: string;
  color: string;
  icon: 'gamepad' | 'coin' | 'flame' | 'gift';
  status: string;
}

const UPCOMING_CABINETS: CabinetPreview[] = [
  {
    id: 'pixel-racer',
    name: 'Pixel Racer',
    rewardLine: '+15 tokens · +20 EXP',
    color: 'var(--s)',
    icon: 'gamepad',
    status: 'Coming soon',
  },
  {
    id: 'coin-hunt',
    name: 'Coin Hunt',
    rewardLine: '+25 tokens · +10 EXP',
    color: 'var(--y)',
    icon: 'coin',
    status: 'Coming soon',
  },
  {
    id: 'boss-rush',
    name: 'Boss Rush',
    rewardLine: '+10 tokens · +40 EXP',
    color: 'var(--r)',
    icon: 'flame',
    status: 'Coming soon',
  },
];

export const Arcade: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [status, setStatus] = useState<ArcadeUserStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState<boolean>(true);

  const [gameState, setGameState] = useState<GameState>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<SanitizedQuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<ArcadeRewardResult | null>(null);
  const [gains, setGains] = useState<GainFeedbackItem[]>([]);
  const [roundSecondsLeft, setRoundSecondsLeft] = useState<number>(180);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Load user status
  const loadStatus = useCallback(async () => {
    if (!user) return;
    try {
      const s = await getArcadeUserStatus(user);
      setStatus(s);
    } catch (err) {
      console.error('Failed to load arcade status:', err);
    } finally {
      setLoadingStatus(false);
    }
  }, [user]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadStatus();
    }, 50);
    return () => clearTimeout(timer);
  }, [loadStatus]);

  // Dismiss feedback chip
  const handleDismissGain = useCallback((id: string) => {
    setGains((prev) => prev.filter((g) => g.id !== id));
  }, []);

  // Submit completed quiz
  const handleSubmitQuiz = useCallback(async () => {
    if (!user || !sessionId || gameState !== 'playing') return;
    setGameState('submitting');
    try {
      const reward = await submitArcadeSession(user, sessionId, answers);
      setResult(reward);

      // Trigger gamified gain feedback
      const gainItems: GainFeedbackItem[] = [];
      if (reward.creditsAwarded > 0) {
        gainItems.push({ id: 'gain_cr_' + Date.now(), type: 'credits', amount: reward.creditsAwarded });
      }
      if (reward.expAwarded > 0) {
        gainItems.push({ id: 'gain_exp_' + Date.now(), type: 'exp', amount: reward.expAwarded });
      }
      if (gainItems.length > 0) {
        setGains(gainItems);
      }

      await refreshUser();
      await loadStatus();
      setGameState('result');
      showToast(`Quiz completed: ${reward.score}/${reward.totalQuestions} correct!`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit quiz attempt.';
      showToast(msg, 'error');
      setGameState('idle');
      loadStatus();
    }
  }, [user, sessionId, gameState, answers, refreshUser, loadStatus, showToast]);

  // Round countdown timer (3 minutes max)
  useEffect(() => {
    if (gameState !== 'playing') return;

    const timer = setInterval(() => {
      setRoundSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, handleSubmitQuiz]);

  // Start new game attempt
  const handleStartGame = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      const session = await startArcadeSession(user);
      setSessionId(session.sessionId);
      setQuestions(session.questions);
      setCurrentIdx(0);
      setAnswers({});
      setResult(null);
      setRoundSecondsLeft(180);
      setGameState('playing');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to start arcade round.';
      showToast(msg, 'error');
      loadStatus();
    } finally {
      setActionLoading(false);
    }
  };

  // Select option for current question
  const handleSelectOption = (optionIndex: number) => {
    if (gameState !== 'playing' || !questions[currentIdx]) return;
    const qid = questions[currentIdx].id;
    setAnswers((prev) => ({
      ...prev,
      [qid]: optionIndex,
    }));
  };

  // Reset back to idle
  const handleBackToLobby = () => {
    setGameState('idle');
    setSessionId(null);
    setQuestions([]);
    setAnswers({});
    setResult(null);
    loadStatus();
  };

  const currentQ = questions[currentIdx];
  const answeredCount = Object.keys(answers).length;
  const isLastQuestion = currentIdx === questions.length - 1;
  const hasCurrentAnswer = currentQ ? answers[currentQ.id] !== undefined : false;

  // Clean tier name (remove raw emojis from code for clean typography)
  const cleanTierName = (rawName: string) =>
    rawName.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();

  return (
    <div className="arcade-view">
      <GainFeedback items={gains} onDismiss={handleDismissGain} />

      {/* Header */}
      <div className="arcade-head">
        <div>
          <h1>Arcade Zone</h1>
          <p className="arcade-sub">Pick a cabinet. Every run pays out tokens and EXP.</p>
        </div>
      </div>

      {/* State 1: IDLE / LOBBY */}
      {gameState === 'idle' && (
        <>
          {/* Quota & Status HUD */}
          {status && (
            <div className="arcade-hud">
              {/* Daily Attempts */}
              <div className="hud-stat">
                <span className="hud-label">Daily attempts</span>
                <span className="hud-val">
                  {status.attemptsToday} / {status.maxAttemptsPerDay}
                </span>
                <div className="hud-bar">
                  <div
                    className="hud-bar-fill"
                    style={{
                      width: `${Math.min(100, (status.attemptsToday / status.maxAttemptsPerDay) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Daily Tokens Capped */}
              <div className="hud-stat">
                <span className="hud-label">Daily tokens capped</span>
                <span className="hud-val">
                  {status.dailyCreditsEarned} / {status.dailyCreditCap}
                </span>
                <div className="hud-bar">
                  <div
                    className="hud-bar-fill mint"
                    style={{
                      width: `${Math.min(100, (status.dailyCreditsEarned / status.dailyCreditCap) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Machine Status */}
              <div className="hud-stat">
                <span className="hud-label">Machine status</span>
                <div style={{ marginTop: '4px' }}>
                  {status.isRestricted ? (
                    <span className="hud-status-badge danger">Restricted</span>
                  ) : status.attemptsToday >= status.maxAttemptsPerDay ? (
                    <span className="hud-status-badge limit">Daily limit reached</span>
                  ) : status.secondsUntilNextAttempt > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span className="hud-status-badge cooldown">Cooling down</span>
                      {status.cooldownUntil && (
                        <CooldownTimer
                          expiresAt={status.cooldownUntil}
                          onExpire={loadStatus}
                          className="arcade-cooldown-text"
                        />
                      )}
                    </div>
                  ) : (
                    <span className="hud-status-badge ready">Ready to play</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Debt Restriction Notice */}
          {status?.isRestricted && (
            <div className="arcade-notes" style={{ borderColor: 'var(--r)', color: 'var(--r)' }}>
              <strong>Debt restriction active:</strong> {status.restrictionReason}
            </div>
          )}

          {/* Cabinets Grid */}
          <div className="games-grid">
            {/* Cabinet 1: Quick Quiz (Active playable cabinet) */}
            <div className="game-card featured">
              <div className="game-scr" style={{ background: 'var(--y)' }}>
                <span className="game-scr-badge">Playable</span>
                <ArcadeIcon name="joystick" />
              </div>
              <div className="game-info">
                <h3>Quick Quiz</h3>
                <p className="game-reward">Up to +5 tokens · +15 EXP</p>
              </div>
              <button
                type="button"
                className="game-btn"
                disabled={!status?.canPlay || actionLoading || loadingStatus}
                onClick={handleStartGame}
              >
                {actionLoading ? (
                  'Starting round...'
                ) : status?.isRestricted ? (
                  'Locked by debt'
                ) : status && status.attemptsToday >= status.maxAttemptsPerDay ? (
                  'Daily limit reached'
                ) : status && status.secondsUntilNextAttempt > 0 ? (
                  'Machine cooling down'
                ) : (
                  <>
                    <ArcadeIcon name="joystick" size={20} />
                    <span>Start game</span>
                  </>
                )}
              </button>
            </div>

            {/* Upcoming Cabinets */}
            {UPCOMING_CABINETS.map((cabinet) => (
              <div key={cabinet.id} className="game-card">
                <div className="game-scr" style={{ background: cabinet.color }}>
                  <span
                    className="game-scr-badge"
                    style={{ background: 'var(--panel)', color: 'var(--mute)' }}
                  >
                    {cabinet.status}
                  </span>
                  <ArcadeIcon name={cabinet.icon} />
                </div>
                <div className="game-info">
                  <h3>{cabinet.name}</h3>
                  <p className="game-reward">{cabinet.rewardLine}</p>
                </div>
                <button type="button" className="game-btn" disabled>
                  <span>Locked</span>
                </button>
              </div>
            ))}
          </div>

          {/* Quick Quiz Reward Tiers & Rules */}
          <div className="arcade-tiers-card">
            <h2>Quick Quiz reward tiers</h2>
            <div className="tiers-table-wrapper">
              <table className="tiers-table">
                <thead>
                  <tr>
                    <th>Tier</th>
                    <th>Score</th>
                    <th>Tokens</th>
                    <th>EXP</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(ARCADE_TIERS).map((tier) => (
                    <tr key={tier.name}>
                      <td>{cleanTierName(tier.name)}</td>
                      <td>
                        {tier.minScore === 5
                          ? '5 of 5'
                          : tier.minScore > 0
                          ? `${tier.minScore} of 5`
                          : '0–1 of 5'}
                      </td>
                      <td className="reward-tokens">+{tier.credits} tokens</td>
                      <td className="reward-exp">+{tier.exp} EXP</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="arcade-notes">
              <div>• <strong>Fair play:</strong> Maximum {MAX_ATTEMPTS_PER_DAY} attempts per day with a 15-minute cooldown between plays.</div>
              <div>• <strong>Economy safe:</strong> Maximum {DAILY_CREDIT_CAP} tokens can be earned per day from the arcade. EXP is never capped.</div>
              <div>• <strong>Anti-cheat:</strong> Questions are generated server-side. Answers are validated through single-use atomic transactions.</div>
            </div>
          </div>
        </>
      )}

      {/* State 2: PLAYING ACTIVE QUIZ */}
      {gameState === 'playing' && currentQ && (
        <div className="quiz-cabinet">
          {/* Top Bar with Step & Timer */}
          <div className="quiz-top">
            <span className="quiz-step">
              Question {currentIdx + 1} of {questions.length}
            </span>
            <div className={`quiz-timer-chip ${roundSecondsLeft <= 30 ? 'urgent' : ''}`}>
              <ArcadeIcon name="clock" size={18} />
              <span>
                {Math.floor(roundSecondsLeft / 60)}:{(roundSecondsLeft % 60).toString().padStart(2, '0')}
              </span>
            </div>
          </div>

          {/* Segmented Step Progress Bar */}
          <div className="hud-bar">
            <div
              className="hud-bar-fill"
              style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
            />
          </div>

          {/* Question Box */}
          <div className="quiz-question-box">
            {currentQ.question}
          </div>

          {/* 4 Chunky Option Buttons */}
          <div className="quiz-options">
            {currentQ.options.map((option, optIdx) => {
              const isSelected = answers[currentQ.id] === optIdx;
              return (
                <button
                  key={optIdx}
                  type="button"
                  className={`quiz-opt-btn ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectOption(optIdx)}
                >
                  <span className="quiz-opt-letter">{String.fromCharCode(65 + optIdx)}</span>
                  <span style={{ flex: 1 }}>{option}</span>
                  {isSelected && <ArcadeIcon name="check" size={20} />}
                </button>
              );
            })}
          </div>

          {/* Navigation Controls */}
          <div className="quiz-nav">
            <button
              type="button"
              className="game-btn"
              style={{ background: 'var(--panel2)', color: 'var(--ink)', width: 'auto' }}
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx((p) => Math.max(0, p - 1))}
            >
              Previous
            </button>

            {isLastQuestion ? (
              <button
                type="button"
                className="game-btn"
                disabled={answeredCount < questions.length}
                onClick={handleSubmitQuiz}
                style={{ width: 'auto' }}
              >
                Submit quiz ({answeredCount}/{questions.length})
              </button>
            ) : (
              <button
                type="button"
                className="game-btn"
                disabled={!hasCurrentAnswer}
                onClick={() => setCurrentIdx((p) => Math.min(questions.length - 1, p + 1))}
                style={{ width: 'auto' }}
              >
                Next question
              </button>
            )}
          </div>
        </div>
      )}

      {/* State 3: SUBMITTING / VALIDATING */}
      {gameState === 'submitting' && (
        <div className="quiz-cabinet" style={{ textAlign: 'center', padding: '48px 24px', alignItems: 'center' }}>
          <div style={{ color: 'var(--y)', animation: 'pulse 1s infinite alternate' }}>
            <ArcadeIcon name="joystick" size={64} />
          </div>
          <h2 style={{ fontFamily: 'Lilita One', fontSize: '28px', margin: '16px 0 8px 0' }}>
            Validating arcade results
          </h2>
          <p className="arcade-sub" style={{ maxWidth: '420px', margin: 0 }}>
            The server is grading your answers, checking daily caps, and depositing your rewards...
          </p>
        </div>
      )}

      {/* State 4: RESULT / CELEBRATION */}
      {gameState === 'result' && result && (
        <div className="quiz-result-card">
          <div className="result-banner">
            <ArcadeIcon name={result.score >= 4 ? 'trophy' : 'gamepad'} size={64} />
            <h2 className="result-tier-title">{cleanTierName(result.tier)}</h2>
            <div className="result-score-line">
              Score: {result.score} of {result.totalQuestions} correct (
              {Math.round((result.score / result.totalQuestions) * 100)}%)
            </div>

            <div className="result-rewards-row">
              <span className="reward-pill tokens">
                +{result.creditsAwarded} tokens
              </span>
              <span className="reward-pill exp">
                +{result.expAwarded} EXP
              </span>
            </div>

            {result.isClamped && (
              <div
                className="arcade-notes"
                style={{ marginTop: '12px', background: 'rgba(255, 201, 60, 0.1)', borderColor: 'var(--y)', color: 'var(--y)' }}
              >
                Daily token cap reached ({DAILY_CREDIT_CAP} tokens max/day). Full EXP was awarded!
              </div>
            )}
          </div>

          {/* Question Review Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontFamily: 'Lilita One', fontSize: '20px', margin: 0 }}>
              Question review & explanations
            </h3>
            <div className="review-list">
              {result.review.map((item, idx) => (
                <div
                  key={item.questionId}
                  className={`review-item ${item.isCorrect ? 'correct' : 'incorrect'}`}
                >
                  <div className="review-q">
                    {idx + 1}. {item.question}
                  </div>
                  <div className={`review-ans ${item.isCorrect ? 'good' : 'bad'}`}>
                    Your answer: {item.chosenOption} {item.isCorrect ? '(Correct)' : '(Incorrect)'}
                  </div>
                  {!item.isCorrect && (
                    <div className="review-ans good">
                      Correct answer: {item.correctOption}
                    </div>
                  )}
                  <div className="review-exp">
                    {item.explanation}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="game-btn"
            onClick={handleBackToLobby}
            style={{ marginTop: '12px' }}
          >
            Return to Arcade Zone
          </button>
        </div>
      )}
    </div>
  );
};
