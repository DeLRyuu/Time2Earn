import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Badge } from '../../components/ui/Badge';
import { RankBadge } from '../../components/ui/RankBadge';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { RankUpCelebrationModal } from '../../components/common/RankUpCelebrationModal';
import { GainFeedback, type GainFeedbackItem } from '../../components/common/GainFeedback';
import { useAuth } from '../../hooks/useAuth';
import { useConfig } from '../../hooks/useConfig';
import { useToast } from '../../hooks/useToast';
import { usePlayerDashboard } from '../../hooks/usePlayerDashboard';
import { calculateRankProgress } from '../../lib/ranks';
import { calculateCreditPreview, calculateAwardedCredits, calculateAwardedExp } from '../../lib/credits';
import { submitSessionRequest, fetchPlayerSessions } from '../../services/sessionService';
import type { SessionRequest } from '../../types/session';
import { Link } from 'react-router-dom';

const POPULAR_UNITS = ['PC-01', 'PC-02', 'PC-03', 'PC-04', 'PC-05', 'PC-06', 'PC-07', 'PC-08', 'PC-09', 'PC-10'];

export const Home: React.FC = () => {
  const { user } = useAuth();
  const { config, loading: configLoading } = useConfig();
  const { showToast } = useToast();
  const { featuredRewards, loading: dashLoading } = usePlayerDashboard();

  // Session Request Modal & Form State
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState('PC-01');
  const [amountPaidInput, setAmountPaidInput] = useState<number>(20);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Player's Session History State
  const [playerSessions, setPlayerSessions] = useState<SessionRequest[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  // Gamification & Polish States
  const [isCelebrationOpen, setIsCelebrationOpen] = useState(false);
  const [gainItems, setGainItems] = useState<GainFeedbackItem[]>([]);

  // Fallback demo user if not logged in
  const currentUser = user || {
    uid: 'player_test_uid',
    username: 'lois_123xx',
    role: 'user' as const,
    credits: 332,
    exp: 1251,
    rank: 'Gamer',
    streak: 3,
    isBanned: false,
    isRestricted: false,
  };

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const data = await fetchPlayerSessions(currentUser.uid);
      setPlayerSessions(data);
    } catch (err) {
      console.warn('Error fetching session history:', err);
    } finally {
      setSessionsLoading(false);
    }
  }, [currentUser.uid]);

  useEffect(() => {
    let isMounted = true;
    const fetchInitial = async () => {
      try {
        const data = await fetchPlayerSessions(currentUser.uid);
        if (isMounted) setPlayerSessions(data);
      } catch (err) {
        console.warn('Error fetching session history:', err);
      } finally {
        if (isMounted) setSessionsLoading(false);
      }
    };
    fetchInitial();
    return () => {
      isMounted = false;
    };
  }, [currentUser.uid]);

  // Dynamic preview calculations from config
  const creditPreview = calculateCreditPreview(amountPaidInput, config.phpToCreditRate);
  const creditsAward = calculateAwardedCredits(amountPaidInput, config.phpToCreditRate);
  const expAward = calculateAwardedExp(creditsAward);
  const rankProgress = calculateRankProgress(currentUser.exp, config.rankThresholds);

  // Check once on load/rank update if rank celebration should be shown
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (rankProgress.currentRank && currentUser.uid && active) {
        const storageKey = `t2e_last_celebrated_rank_${currentUser.uid}`;
        const lastCelebrated = localStorage.getItem(storageKey);
        if (!lastCelebrated) {
          if (rankProgress.currentRank !== 'Newbie') {
            setIsCelebrationOpen(true);
          }
        } else if (lastCelebrated !== rankProgress.currentRank) {
          setIsCelebrationOpen(true);
        }
      }
    }, 150);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [rankProgress.currentRank, currentUser.uid]);

  const handleDismissCelebration = () => {
    if (currentUser.uid) {
      localStorage.setItem(`t2e_last_celebrated_rank_${currentUser.uid}`, rankProgress.currentRank);
    }
    setIsCelebrationOpen(false);
  };

  const handleSubmitSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amountPaidInput <= 0) {
      showToast('Amount paid must be greater than ₱0.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitSessionRequest({
        userId: currentUser.uid,
        username: currentUser.username,
        unitId: selectedUnit,
        amountPaid: Number(amountPaidInput),
        phpToCreditRate: config.phpToCreditRate,
      });

      // Trigger floating gain feedback
      setGainItems([
        { id: `c-${Date.now()}`, type: 'credits', amount: Math.floor(creditPreview) },
        { id: `e-${Date.now() + 1}`, type: 'exp', amount: expAward },
      ]);

      showToast(`Session claim submitted for ${selectedUnit}! Awaiting staff approval.`, 'success');
      setIsSessionModalOpen(false);
      await loadSessions();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to submit claim.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dashboard-page" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* 1. Header: Welcome message */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '0.02em', color: 'var(--text-primary)' }}>
            Welcome back, <span style={{ color: 'var(--primary)', textShadow: '0 0 10px var(--primary-glow)' }}>{currentUser.username}</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Ready to grind? Play. Earn. Rank Up. Redeem.
          </p>
        </div>
        <Badge variant={currentUser.isRestricted ? 'danger' : 'success'} size="sm">
          {currentUser.isRestricted ? 'ACCOUNT FROZEN' : 'ACTIVE STATUS'}
        </Badge>
      </div>

      {/* 2. Stat Cards (Credits, Rank, EXP, Streak) - Visually Distinct */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.85rem', width: '100%' }}>
        {/* Credits Stat Card */}
        <Card
          variant="neon"
          style={{
            background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.9) 0%, rgba(0, 229, 255, 0.05) 100%)',
            border: '1px solid rgba(0, 229, 255, 0.35)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>CREDITS</span>
            <span style={{ fontSize: '1.2rem' }}>💰</span>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--primary)', fontFamily: 'var(--font-mono)', marginTop: '0.35rem' }}>
            {currentUser.credits.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--primary)', marginTop: '0.2rem', opacity: 0.85 }}>Spendable Loot</div>
        </Card>

        {/* Rank Stat Card */}
        <Card
          variant="gold"
          style={{
            background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.9) 0%, rgba(255, 183, 3, 0.05) 100%)',
            border: '1px solid rgba(255, 183, 3, 0.35)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>RANK</span>
            <span style={{ fontSize: '1.2rem' }}>🏆</span>
          </div>
          <div style={{ marginTop: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <RankBadge rank={currentUser.rank} size="md" />
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--accent-gold)', marginTop: '0.35rem', opacity: 0.85 }}>
            {rankProgress.isMaxRank ? 'Peak Legend' : `Tier ${rankProgress.currentThreshold.toLocaleString()} EXP`}
          </div>
        </Card>

        {/* EXP Stat Card */}
        <Card
          variant="interactive"
          style={{
            background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.9) 0%, rgba(139, 92, 246, 0.05) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.35)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>EXP</span>
            <span style={{ fontSize: '1.2rem' }}>⭐</span>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--secondary)', fontFamily: 'var(--font-mono)', marginTop: '0.35rem' }}>
            {currentUser.exp.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--secondary)', marginTop: '0.2rem', opacity: 0.85 }}>
            {rankProgress.isMaxRank ? 'Max Tier Achieved' : `${rankProgress.expRemaining.toLocaleString()} to ${rankProgress.nextRank}`}
          </div>
        </Card>

        {/* Streak Stat Card */}
        <Card
          variant="interactive"
          style={{
            background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.9) 0%, rgba(245, 158, 11, 0.05) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>STREAK</span>
            <span style={{ fontSize: '1.2rem' }}>🔥</span>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--warning)', fontFamily: 'var(--font-mono)', marginTop: '0.35rem' }}>
            {currentUser.streak ?? 1} <span style={{ fontSize: '1rem', fontWeight: 700 }}>days</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--warning)', marginTop: '0.2rem', opacity: 0.85 }}>Daily check-in active</div>
        </Card>
      </div>

      {/* 3. Rank Progression Progress Bar */}
      <Card
        variant="default"
        header={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.05em' }}>RANK PROGRESSION</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {rankProgress.isMaxRank ? 'OG TOP RANK' : `${currentUser.exp.toLocaleString()} / ${rankProgress.nextThreshold?.toLocaleString()} EXP`}
            </span>
          </div>
        }
      >
        {configLoading ? (
          <Skeleton height="24px" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RankBadge rank={rankProgress.currentRank} size="sm" />
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>current rank</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>next rank:</span>
                {rankProgress.isMaxRank ? (
                  <Badge variant="primary" size="sm">MAX REACHED</Badge>
                ) : (
                  <RankBadge rank={rankProgress.nextRank || 'Unknown'} size="sm" />
                )}
              </div>
            </div>

            <ProgressBar value={rankProgress.progressPercent} max={100} variant="purple" size="md" showPercentage />

            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span>
                {rankProgress.isMaxRank
                  ? '⭐ Congratulations! You have reached the pinnacle OG Player tier.'
                  : `⚡ Only ${rankProgress.expRemaining.toLocaleString()} EXP needed to reach ${rankProgress.nextRank}!`}
              </span>
              <button
                onClick={() => setIsCelebrationOpen(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-gold)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textDecoration: 'underline',
                  padding: 0,
                }}
              >
                🎉 View Celebration
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* 4. Quick Actions Hub */}
      <div>
        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
          QUICK ACTIONS
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.65rem' }}>
          <Button variant="primary" size="md" onClick={() => setIsSessionModalOpen(true)} style={{ width: '100%', minHeight: '48px' }}>
            🎮 Play & Earn
          </Button>
          <Link to="/player/rewards" style={{ textDecoration: 'none' }}>
            <Button variant="secondary" size="md" style={{ width: '100%', minHeight: '48px' }}>
              🎁 Rewards
            </Button>
          </Link>
          <Link to="/player/arcade" style={{ textDecoration: 'none' }}>
            <Button variant="arcade" size="md" style={{ width: '100%', minHeight: '48px' }}>
              🕹️ Arcade
            </Button>
          </Link>
          <Link to="/player/leaderboard" style={{ textDecoration: 'none' }}>
            <Button variant="accent" size="md" style={{ width: '100%', minHeight: '48px' }}>
              🏆 Rankings
            </Button>
          </Link>
        </div>
      </div>

      {/* 5. Player's Session Request History (Phase 5 Feature) */}
      <Card
        variant="default"
        header={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.05em' }}>
              MY GAMING SESSION REQUESTS
            </span>
            <Button variant="ghost" size="sm" onClick={loadSessions}>
              Refresh
            </Button>
          </div>
        }
      >
        {sessionsLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Skeleton height="45px" />
            <Skeleton height="45px" />
          </div>
        ) : playerSessions.length === 0 ? (
          <EmptyState
            icon={<span>🎮</span>}
            title="NO SESSIONS SUBMITTED YET"
            description="Play at any shop station, submit your paid amount, and earn Credits & EXP upon staff approval!"
            actionText="Claim a Session Now"
            onAction={() => setIsSessionModalOpen(true)}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {playerSessions.map((session) => (
              <div
                key={session.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 0.85rem',
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      Station {session.unitId}
                    </span>
                    <Badge
                      variant={
                        session.status === 'approved'
                          ? 'success'
                          : session.status === 'rejected'
                          ? 'danger'
                          : 'warning'
                      }
                      size="sm"
                    >
                      {session.status}
                    </Badge>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Paid ₱{session.amountPaid.toFixed(2)} • {new Date(session.requestedAt).toLocaleString()}
                    {session.rejectNote && (
                      <span style={{ color: 'var(--danger)', marginLeft: '0.5rem' }}>
                        (Reason: {session.rejectNote})
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                    +{Math.floor(session.creditsEarned)} CR
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--secondary)' }}>
                    +{Math.floor(session.creditsEarned)} EXP
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 6. Featured Active Rewards */}
      <Card
        variant="default"
        header={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.05em' }}>
              FEATURED ACTIVE REWARDS
            </span>
            <Link to="/player/rewards" style={{ color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700 }}>
              VIEW ALL $\rightarrow$
            </Link>
          </div>
        }
      >
        {dashLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
            <Skeleton height="110px" />
            <Skeleton height="110px" />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
            {featuredRewards.slice(0, 3).map((reward) => (
              <div
                key={reward.id}
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.85rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      {reward.name}
                    </span>
                    <Badge variant="primary" size="sm">{reward.category}</Badge>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem', lineHeight: 1.3 }}>
                    {reward.description}
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                  <div>
                    <span style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                      {reward.creditCost} CR
                    </span>
                    <div style={{ fontSize: '0.65rem', color: 'var(--secondary)' }}>
                      +{reward.expReward} EXP
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => showToast(`Redemption queue connects in Phase 6. Required: ${reward.creditCost} CR`, 'info')}
                  >
                    Redeem
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Play & Earn Session Claim Modal */}
      <Modal
        isOpen={isSessionModalOpen}
        onClose={() => setIsSessionModalOpen(false)}
        title="CLAIM GAMING SESSION"
        size="md"
      >
        <form onSubmit={handleSubmitSession} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              SELECT PC STATION / UNIT ID
            </label>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
              {POPULAR_UNITS.slice(0, 5).map((u) => (
                <Badge
                  key={u}
                  variant={selectedUnit === u ? 'primary' : 'neutral'}
                  style={{ cursor: 'pointer', padding: '0.4rem 0.65rem' }}
                  onClick={() => setSelectedUnit(u)}
                >
                  {u}
                </Badge>
              ))}
            </div>
            <input
              type="text"
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              placeholder="e.g. PC-01"
              required
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              AMOUNT PAID (PHP)
            </label>
            <input
              type="number"
              min="1"
              step="any"
              value={amountPaidInput}
              onChange={(e) => setAmountPaidInput(Math.max(0, Number(e.target.value)))}
              required
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '1.1rem',
                fontWeight: 700,
              }}
            />
          </div>

          {/* Dynamic Credit Preview */}
          <div
            style={{
              padding: '0.85rem',
              background: 'var(--bg-app)',
              border: '1px solid var(--primary-glow)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Conversion Rate:</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--primary)' }}>
                {config.phpToCreditRate} Credits / ₱1.00
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.35rem' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>Estimated Reward:</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: 900, color: 'var(--primary)' }}>
                {creditPreview.toFixed(2)} Credits
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--secondary)', textAlign: 'right', marginTop: '0.2rem' }}>
              +{creditsAward} Spendable Credits & +{expAward} EXP on approval
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <Button type="button" variant="ghost" onClick={() => setIsSessionModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Submit Request
            </Button>
          </div>
        </form>
      </Modal>
      {/* 9. Floating Gain Feedback */}
      <GainFeedback
        items={gainItems}
        onDismiss={(id) => setGainItems((prev) => prev.filter((i) => i.id !== id))}
      />

      {/* 10. Rank-Up Celebration Modal */}
      <RankUpCelebrationModal
        isOpen={isCelebrationOpen}
        onClose={handleDismissCelebration}
        newRank={rankProgress.currentRank}
        exp={currentUser.exp}
      />
    </div>
  );
};
