import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Skeleton } from '../../components/ui/Skeleton';
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

type GameState = 'idle' | 'playing' | 'submitting' | 'result';

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
          // Auto submit when time runs out
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '800px', margin: '0 auto' }}>
      <GainFeedback items={gains} onDismiss={handleDismissGain} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.75rem' }}>🕹️</span>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0, letterSpacing: '0.05em' }}>
              CYBER ARCADE
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
            Quick Quiz challenge • Earn up to {DAILY_CREDIT_CAP} Credits & EXP daily
          </p>
        </div>

        {gameState === 'playing' && (
          <div
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              background: roundSecondsLeft <= 30 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(168, 85, 247, 0.15)',
              border: `1px solid ${roundSecondsLeft <= 30 ? 'var(--color-danger)' : 'var(--color-arcade)'}`,
              color: roundSecondsLeft <= 30 ? 'var(--color-danger)' : 'var(--color-arcade)',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <span>⏳</span>
            <span>
              {Math.floor(roundSecondsLeft / 60)}:{(roundSecondsLeft % 60).toString().padStart(2, '0')}
            </span>
          </div>
        )}
      </div>

      {/* HUD & Daily Quota Overview */}
      {gameState === 'idle' && (
        <Card>
          {loadingStatus ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Skeleton width="100%" height="24px" />
              <Skeleton width="60%" height="20px" />
            </div>
          ) : status ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                {/* Daily Attempts */}
                <div style={{ background: 'var(--bg-card-subtle, rgba(255,255,255,0.03))', padding: '0.85rem', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Daily Attempts
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, marginTop: '0.25rem' }}>
                    {status.attemptsToday} / {status.maxAttemptsPerDay}
                  </div>
                  <ProgressBar
                    value={status.attemptsToday}
                    max={status.maxAttemptsPerDay}
                    variant={status.attemptsToday >= status.maxAttemptsPerDay ? 'gold' : 'primary'}
                    size="sm"
                  />
                </div>

                {/* Daily Credits Earned */}
                <div style={{ background: 'var(--bg-card-subtle, rgba(255,255,255,0.03))', padding: '0.85rem', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Daily Credits Capped
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, marginTop: '0.25rem' }}>
                    {status.dailyCreditsEarned} / {status.dailyCreditCap} CR
                  </div>
                  <ProgressBar
                    value={status.dailyCreditsEarned}
                    max={status.dailyCreditCap}
                    variant={status.dailyCreditsEarned >= status.dailyCreditCap ? 'success' : 'purple'}
                    size="sm"
                  />
                </div>

                {/* Machine Status */}
                <div style={{ background: 'var(--bg-card-subtle, rgba(255,255,255,0.03))', padding: '0.85rem', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Machine Status
                  </div>
                  <div style={{ marginTop: '0.35rem' }}>
                    {status.isRestricted ? (
                      <Badge variant="danger">RESTRICTED</Badge>
                    ) : status.attemptsToday >= status.maxAttemptsPerDay ? (
                      <Badge variant="neutral">DAILY LIMIT REACHED</Badge>
                    ) : status.secondsUntilNextAttempt > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <Badge variant="warning">COOLING DOWN</Badge>
                        {status.cooldownUntil && (
                          <CooldownTimer
                            expiresAt={status.cooldownUntil}
                            onExpire={loadStatus}
                            className="arcade-cooldown-text"
                          />
                        )}
                      </div>
                    ) : (
                      <Badge variant="success">READY TO PLAY</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Debt Restriction Notice */}
              {status.isRestricted && (
                <div
                  style={{
                    padding: '0.85rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid var(--color-danger)',
                    color: 'var(--color-danger)',
                    fontSize: '0.85rem',
                  }}
                >
                  ⚠️ <strong>Debt Restriction Active:</strong> {status.restrictionReason}
                </div>
              )}

              {/* Play Button */}
              <div>
                <Button
                  variant="arcade"
                  size="lg"
                  disabled={!status.canPlay || actionLoading}
                  onClick={handleStartGame}
                  style={{ width: '100%', minHeight: '52px', fontSize: '1rem', fontWeight: 900 }}
                >
                  {actionLoading ? (
                    'STARTING ARCADE SESSION...'
                  ) : status.isRestricted ? (
                    'LOCKED BY DEBT RESTRICTION'
                  ) : status.attemptsToday >= status.maxAttemptsPerDay ? (
                    'DAILY LIMIT REACHED (RESETS 00:00 UTC)'
                  ) : status.secondsUntilNextAttempt > 0 ? (
                    'MACHINE COOLING DOWN'
                  ) : (
                    '🕹️ INSERT COIN • PLAY QUICK QUIZ'
                  )}
                </Button>
              </div>
            </div>
          ) : null}
        </Card>
      )}

      {/* Rules & Rewards Tier Table (when idle) */}
      {gameState === 'idle' && (
        <Card title="⚡ REWARD TIERS & RULES">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
              Test your gaming, esports, and hardware knowledge in 5 fast-paced trivia questions. High scores grant immediate Credits and rank EXP.
            </p>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '0.5rem 0.25rem' }}>Tier</th>
                    <th style={{ padding: '0.5rem 0.25rem' }}>Score</th>
                    <th style={{ padding: '0.5rem 0.25rem' }}>Credits</th>
                    <th style={{ padding: '0.5rem 0.25rem' }}>EXP</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(ARCADE_TIERS).map((tier) => (
                    <tr key={tier.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '0.6rem 0.25rem', fontWeight: 700 }}>{tier.name}</td>
                      <td style={{ padding: '0.6rem 0.25rem' }}>
                        {tier.minScore === 5 ? '5 / 5' : tier.minScore > 0 ? `${tier.minScore} / 5` : '0–1 / 5'}
                      </td>
                      <td style={{ padding: '0.6rem 0.25rem', color: 'var(--color-primary)', fontWeight: 800 }}>
                        +{tier.credits} CR
                      </td>
                      <td style={{ padding: '0.6rem 0.25rem', color: 'var(--color-arcade)', fontWeight: 800 }}>
                        +{tier.exp} EXP
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div>• <strong>Fair Play:</strong> Max {MAX_ATTEMPTS_PER_DAY} attempts per calendar day with a 15-minute cooldown between plays.</div>
              <div>• <strong>Economy Safe:</strong> Maximum {DAILY_CREDIT_CAP} Credits can be earned per day from the arcade. EXP is never capped.</div>
              <div>• <strong>Anti-Cheat:</strong> Questions are generated server-side. Answers are validated through single-use atomic transactions.</div>
            </div>
          </div>
        </Card>
      )}

      {/* Active Game View */}
      {gameState === 'playing' && currentQ && (
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Round Progress */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-arcade)', textTransform: 'uppercase' }}>
                  Question {currentIdx + 1} of {questions.length}
                </span>
                <Badge variant="secondary">{currentQ.category}</Badge>
              </div>
              <ProgressBar
                value={currentIdx + 1}
                max={questions.length}
                variant="purple"
                size="sm"
              />
            </div>

            {/* Question Text */}
            <div
              style={{
                fontSize: '1.15rem',
                fontWeight: 700,
                lineHeight: 1.45,
                padding: '0.5rem 0',
                minHeight: '60px',
              }}
            >
              {currentQ.question}
            </div>

            {/* Options List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {currentQ.options.map((option, optIdx) => {
                const isSelected = answers[currentQ.id] === optIdx;
                return (
                  <button
                    key={optIdx}
                    type="button"
                    onClick={() => handleSelectOption(optIdx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.85rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'rgba(168, 85, 247, 0.2)' : 'var(--bg-card-subtle, rgba(255,255,255,0.03))',
                      border: isSelected
                        ? '2px solid var(--color-arcade)'
                        : '1px solid var(--border-color, rgba(255,255,255,0.1))',
                      color: isSelected ? '#ffffff' : 'var(--text-color)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '0.95rem',
                      fontWeight: isSelected ? 700 : 500,
                      transition: 'all 0.15s ease',
                      minHeight: '48px',
                    }}
                  >
                    <span
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isSelected ? 'var(--color-arcade)' : 'rgba(255,255,255,0.1)',
                        color: isSelected ? '#000000' : 'var(--text-muted)',
                        fontWeight: 900,
                        fontSize: '0.8rem',
                        flexShrink: 0,
                      }}
                    >
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                    <span style={{ flex: 1 }}>{option}</span>
                    {isSelected && <span>✓</span>}
                  </button>
                );
              })}
            </div>

            {/* Navigation Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', marginTop: '0.5rem' }}>
              <Button
                variant="secondary"
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx((p) => Math.max(0, p - 1))}
              >
                ← Previous
              </Button>

              {isLastQuestion ? (
                <Button
                  variant="arcade"
                  disabled={answeredCount < questions.length}
                  onClick={handleSubmitQuiz}
                  style={{ minWidth: '150px', fontWeight: 800 }}
                >
                  Submit Quiz ({answeredCount}/{questions.length})
                </Button>
              ) : (
                <Button
                  variant="primary"
                  disabled={!hasCurrentAnswer}
                  onClick={() => setCurrentIdx((p) => Math.min(questions.length - 1, p + 1))}
                  style={{ minWidth: '120px' }}
                >
                  Next Question →
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Submitting Animation State */}
      {gameState === 'submitting' && (
        <Card>
          <div style={{ textAlign: 'center', padding: '3rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '3rem', animation: 'spin 1.5s linear infinite' }}>🕹️</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, letterSpacing: '0.05em' }}>
              VALIDATING ARCADE RESULTS
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '400px', margin: 0 }}>
              The server is grading your answers, checking daily caps, and depositing your rewards...
            </p>
          </div>
        </Card>
      )}

      {/* Result & Victory View */}
      {gameState === 'result' && result && (
        <Card variant="interactive">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Victory Header */}
            <div
              style={{
                textAlign: 'center',
                padding: '1.5rem 1rem',
                borderRadius: 'var(--radius-lg)',
                background: 'linear-gradient(180deg, rgba(168, 85, 247, 0.15) 0%, rgba(0, 0, 0, 0.4) 100%)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
                {result.score >= 4 ? '🏆' : result.score >= 2 ? '🎮' : '🔰'}
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: '0 0 0.25rem 0', color: 'var(--color-arcade)' }}>
                {result.tier}
              </h2>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-color)' }}>
                Score: {result.score} / {result.totalQuestions} Correct ({Math.round((result.score / result.totalQuestions) * 100)}%)
              </div>

              {/* Reward Gains Summary */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                <div
                  style={{
                    padding: '0.6rem 1.25rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(0, 255, 204, 0.15)',
                    border: '1px solid var(--color-primary)',
                    fontWeight: 900,
                    color: 'var(--color-primary)',
                    fontSize: '1.05rem',
                  }}
                >
                  +{result.creditsAwarded} CREDITS
                </div>
                <div
                  style={{
                    padding: '0.6rem 1.25rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(168, 85, 247, 0.15)',
                    border: '1px solid var(--color-arcade)',
                    fontWeight: 900,
                    color: 'var(--color-arcade)',
                    fontSize: '1.05rem',
                  }}
                >
                  +{result.expAwarded} EXP
                </div>
              </div>

              {result.isClamped && (
                <div
                  style={{
                    marginTop: '0.85rem',
                    fontSize: '0.8rem',
                    color: 'var(--color-warning)',
                    background: 'rgba(234, 179, 8, 0.1)',
                    padding: '0.4rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    display: 'inline-block',
                  }}
                >
                  ⚡ Daily credit cap reached ({DAILY_CREDIT_CAP} CR max/day). Full EXP was awarded!
                </div>
              )}
            </div>

            {/* Answer Review Section */}
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.75rem' }}>
                QUESTION REVIEW & EXPLANATIONS
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {result.review.map((item, idx) => (
                  <div
                    key={item.questionId}
                    style={{
                      padding: '0.85rem',
                      borderRadius: 'var(--radius-md)',
                      background: item.isCorrect ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                      borderLeft: `4px solid ${item.isCorrect ? 'var(--color-success)' : 'var(--color-danger)'}`,
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                      {idx + 1}. {item.question}
                    </div>
                    <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <div style={{ color: item.isCorrect ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 600 }}>
                        Your Answer: {item.chosenOption} {item.isCorrect ? '✓' : '✗'}
                      </div>
                      {!item.isCorrect && (
                        <div style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                          Correct Answer: {item.correctOption}
                        </div>
                      )}
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                        💡 {item.explanation}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div>
              <Button
                variant="arcade"
                size="lg"
                onClick={handleBackToLobby}
                style={{ width: '100%', minHeight: '48px', fontWeight: 800 }}
              >
                RETURN TO ARCADE HALL
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
