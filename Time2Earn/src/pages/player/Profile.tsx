import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../hooks/useAuth';
import { useConfig } from '../../hooks/useConfig';
import { fetchPlayerSessions } from '../../services/sessionService';
import { fetchPlayerRedemptions } from '../../services/redemptionService';
import { fetchPlayerDebt, fetchPlayerDebtRequests, submitDebtPaymentRequest } from '../../services/debtService';
import { calculateRankProgress, getRankLadder } from '../../lib/ranks';
import { DEBT_CREDIT_RATE, calculateDebtPaymentPhp } from '../../lib/debts';
import { useToast } from '../../hooks/useToast';
import type { SessionRequest } from '../../types/session';
import type { RedemptionRequest } from '../../types/redemption';
import type { DebtRecord, DebtPaymentRequest } from '../../types/debt';

interface ActivityItem {
  id: string;
  type: 'session' | 'redemption';
  title: string;
  subtitle: string;
  timestamp: string;
  status: 'pending' | 'approved' | 'rejected';
  creditDelta: number;
  badgeLabel: string;
}

type TabType = 'all' | 'sessions' | 'redemptions';

const PAGE_SIZE = 8;

export const Profile: React.FC = () => {
  const { user } = useAuth();
  const { config } = useConfig();
  const { showToast } = useToast();

  const [sessions, setSessions] = useState<SessionRequest[]>([]);
  const [redemptions, setRedemptions] = useState<RedemptionRequest[]>([]);
  const [debt, setDebt] = useState<DebtRecord | null>(null);
  const [debtRequests, setDebtRequests] = useState<DebtPaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [showAllLadder, setShowAllLadder] = useState(false);

  // Debt Payment Modal State
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [creditsToUse, setCreditsToUse] = useState<number>(38);
  const [isSubmittingDebt, setIsSubmittingDebt] = useState(false);

  // Fallback demo user if not logged in
  const currentUser = user || {
    uid: '1DrJrVqcwfULvzDyyLV5S8b8ST03',
    username: 'lois_123xx',
    role: 'user' as const,
    credits: 332,
    exp: 1251,
    rank: 'Gamer',
    streak: 3,
    isBanned: false,
    isRestricted: false,
  };

  const loadProfileData = useCallback(async () => {
    setLoading(true);
    try {
      const [sessData, redempData, debtData, debtReqData] = await Promise.all([
        fetchPlayerSessions(currentUser.uid, 25),
        fetchPlayerRedemptions(currentUser.uid, 25),
        fetchPlayerDebt(currentUser.uid),
        fetchPlayerDebtRequests(currentUser.uid),
      ]);
      setSessions(sessData);
      setRedemptions(redempData);
      setDebt(debtData);
      setDebtRequests(debtReqData);
    } catch (err) {
      console.warn('Error fetching player history:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser.uid]);

  useEffect(() => {
    let isMounted = true;
    const loadHistory = async () => {
      setLoading(true);
      try {
        const [sessData, redempData, debtData, debtReqData] = await Promise.all([
          fetchPlayerSessions(currentUser.uid, 25),
          fetchPlayerRedemptions(currentUser.uid, 25),
          fetchPlayerDebt(currentUser.uid),
          fetchPlayerDebtRequests(currentUser.uid),
        ]);
        if (isMounted) {
          setSessions(sessData);
          setRedemptions(redempData);
          setDebt(debtData);
          setDebtRequests(debtReqData);
        }
      } catch (err) {
        console.warn('Error fetching player history:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadHistory();
    return () => {
      isMounted = false;
    };
  }, [currentUser.uid]);

  const handleSubmitDebtPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!debt || debt.amount <= 0) {
      showToast('You have no outstanding debt to pay.', 'info');
      return;
    }
    if (creditsToUse <= 0) {
      showToast('Please enter an amount of credits greater than 0.', 'error');
      return;
    }
    if (creditsToUse > currentUser.credits) {
      showToast(`Insufficient credits. You only have ${currentUser.credits} Credits.`, 'error');
      return;
    }

    setIsSubmittingDebt(true);
    try {
      await submitDebtPaymentRequest({
        userId: currentUser.uid,
        username: currentUser.username,
        currentDebt: debt.amount,
        creditsToUse: Number(creditsToUse),
        userCredits: currentUser.credits,
      });

      showToast(
        `Debt payment request submitted! ₱${calculateDebtPaymentPhp(creditsToUse).toFixed(2)} relief pending approval.`,
        'success'
      );
      setIsDebtModalOpen(false);
      await loadProfileData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to submit payment request.', 'error');
    } finally {
      setIsSubmittingDebt(false);
    }
  };

  // Rank progression details
  const rankProgress = useMemo(() => {
    return calculateRankProgress(currentUser.exp, config.rankThresholds);
  }, [currentUser.exp, config.rankThresholds]);

  // Full rank ladder
  const rankLadder = useMemo(() => {
    return getRankLadder(currentUser.exp, config.rankThresholds);
  }, [currentUser.exp, config.rankThresholds]);

  // Unified activity timeline
  const allActivities = useMemo<ActivityItem[]>(() => {
    const sessionItems: ActivityItem[] = sessions.map((s) => ({
      id: `sess-${s.id}`,
      type: 'session',
      title: `Play Session (${s.unitId})`,
      subtitle: `Amount paid: ₱${s.amountPaid.toFixed(2)}`,
      timestamp: s.requestedAt,
      status: s.status,
      creditDelta: s.creditsEarned,
      badgeLabel: `+${s.creditsEarned} CR`,
    }));

    const redemptionItems: ActivityItem[] = redemptions.map((r) => ({
      id: `redemp-${r.id}`,
      type: 'redemption',
      title: `Reward: ${r.rewardName}`,
      subtitle: `Redemption claim`,
      timestamp: r.requestedAt,
      status: r.status,
      creditDelta: -r.creditCost,
      badgeLabel: `-${r.creditCost} CR`,
    }));

    const combined = [...sessionItems, ...redemptionItems];
    return combined.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [sessions, redemptions]);

  // Filtered activity by active tab
  const filteredActivities = useMemo(() => {
    if (activeTab === 'sessions') {
      return allActivities.filter((a) => a.type === 'session');
    }
    if (activeTab === 'redemptions') {
      return allActivities.filter((a) => a.type === 'redemption');
    }
    return allActivities;
  }, [allActivities, activeTab]);

  const displayedActivities = useMemo(() => {
    return filteredActivities.slice(0, visibleCount);
  }, [filteredActivities, visibleCount]);

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const getStatusBadge = (status: 'pending' | 'approved' | 'rejected') => {
    switch (status) {
      case 'approved':
        return <Badge variant="success" size="sm">Approved</Badge>;
      case 'pending':
        return <Badge variant="gold" size="sm">Pending</Badge>;
      case 'rejected':
        return <Badge variant="danger" size="sm">Rejected</Badge>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
      {/* 1. Header & Identity */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>
            PLAYER PROFILE
          </h1>
          <Badge variant="primary" size="md">LEVEL {rankProgress.currentRank.toUpperCase()}</Badge>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          Track your personal ranking ladder, spendable credits, and verified activity history.
        </p>
      </div>

      {/* 2. Player Overview Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {/* Credits */}
        <Card variant="neon">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.75rem' }}>💰</span>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>SPENDABLE CREDITS</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                {currentUser.credits.toLocaleString()} CR
              </div>
            </div>
          </div>
        </Card>

        {/* Current Rank */}
        <Card variant="default">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.75rem' }}>🏆</span>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>CURRENT RANK</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {currentUser.rank}
              </div>
            </div>
          </div>
        </Card>

        {/* Lifetime EXP */}
        <Card variant="default">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.75rem' }}>⭐</span>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>LIFETIME EXP</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-gold)', fontFamily: 'var(--font-mono)' }}>
                {currentUser.exp.toLocaleString()} EXP
              </div>
            </div>
          </div>
        </Card>

        {/* Daily Streak */}
        <Card variant="default">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.75rem' }}>🔥</span>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>ACTIVE STREAK</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}>
                {currentUser.streak || 0} {currentUser.streak === 1 ? 'Day' : 'Days'}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* 3. Rank Progression Ladder Card */}
      <Card
        variant="default"
        header={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>RANK PROGRESSION LADDER</span>
              <Badge variant="gold" size="sm">
                {rankProgress.isMaxRank ? 'MAX TIER' : `NEXT: ${rankProgress.nextRank?.toUpperCase()}`}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllLadder((prev) => !prev)}
            >
              {showAllLadder ? 'Collapse Ladder' : 'View All 12 Tiers'}
            </Button>
          </div>
        }
      >
        {/* Tier Progress Bar */}
        <div style={{ marginBottom: '1.25rem' }}>
          <ProgressBar
            value={rankProgress.progressPercent}
            max={100}
            variant="gold"
            label={
              rankProgress.isMaxRank
                ? 'Master of Time2Earn'
                : `Progress to ${rankProgress.nextRank}`
            }
            subLabel={
              rankProgress.isMaxRank
                ? 'Highest rank achieved'
                : `${rankProgress.expRemaining.toLocaleString()} EXP needed`
            }
            showPercentage
          />
        </div>

        {/* Ladder Tiers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {(showAllLadder ? rankLadder : rankLadder.filter((t) => t.status === 'current' || t.status === 'reached').slice(-3).concat(rankLadder.filter((t) => t.status === 'locked').slice(0, 2))).map((tier) => {
            const isCurrent = tier.status === 'current';
            const isReached = tier.status === 'reached';

            return (
              <div
                key={tier.name}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: isCurrent
                    ? 'rgba(255, 183, 3, 0.08)'
                    : isReached
                    ? 'rgba(16, 185, 129, 0.05)'
                    : 'rgba(30, 41, 59, 0.4)',
                  border: isCurrent
                    ? '1px solid var(--accent-gold)'
                    : isReached
                    ? '1px solid rgba(16, 185, 129, 0.2)'
                    : '1px solid var(--border-subtle)',
                  opacity: tier.status === 'locked' ? 0.75 : 1,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>
                    {isCurrent ? '⭐' : isReached ? '✓' : '🔒'}
                  </span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: isCurrent ? 800 : 600, color: isCurrent ? 'var(--accent-gold)' : 'var(--text-primary)' }}>
                        {tier.name}
                      </span>
                      {isCurrent && <Badge variant="gold" size="sm">CURRENT</Badge>}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      Threshold: {tier.threshold.toLocaleString()} EXP
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  {isReached && <Badge variant="success" size="sm">REACHED</Badge>}
                  {isCurrent && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                      Active
                    </span>
                  )}
                  {tier.status === 'locked' && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Need {tier.expNeeded.toLocaleString()} EXP
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* 4. Shop Debt Account Card */}
      <Card
        variant={debt && debt.amount > 0 ? 'neon' : 'default'}
        header={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>SHOP DEBT ACCOUNT</span>
              {debt && debt.isRestricted && (
                <Badge variant="danger" size="sm">CLAIMS RESTRICTED</Badge>
              )}
            </div>
            <Badge variant={debt && debt.amount > 0 ? 'warning' : 'success'} size="sm">
              {debt && debt.amount > 0 ? `₱${debt.amount.toFixed(2)} (${debt.tier.toUpperCase()})` : 'CLEAR (₱0.00)'}
            </Badge>
          </div>
        }
        footer={
          debt && debt.amount > 0 ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Rate: 1 Credit = ₱{DEBT_CREDIT_RATE} debt relief
              </span>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setCreditsToUse(Math.min(currentUser.credits, Math.ceil(debt.amount / DEBT_CREDIT_RATE)));
                  setIsDebtModalOpen(true);
                }}
                disabled={currentUser.credits <= 0 || debtRequests.some((r) => r.status === 'pending')}
              >
                {debtRequests.some((r) => r.status === 'pending') ? 'Payment Pending Approval' : 'Pay Debt with Credits'}
              </Button>
            </div>
          ) : undefined
        }
      >
        {debt && debt.amount > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
              You have an outstanding shop balance of <strong>₱{debt.amount.toFixed(2)}</strong>.
              {debt.daysOverdue > 0 && ` Overdue by ${debt.daysOverdue} days.`}
            </p>

            {debt.isRestricted && (
              <div style={{ padding: '0.65rem 0.85rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--danger)' }}>
                ⚠️ High Debt Restriction Active (₱30+). Playtime session claims and reward redemptions are locked until your debt is reduced below ₱30.00.
              </div>
            )}

            {debtRequests.some((r) => r.status === 'pending') && (
              <div style={{ padding: '0.65rem 0.85rem', backgroundColor: 'rgba(255, 183, 3, 0.1)', border: '1px solid rgba(255, 183, 3, 0.3)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--accent-gold)' }}>
                ⏳ You have a pending credit debt payment of ₱{debtRequests.find((r) => r.status === 'pending')?.phpEquivalent.toFixed(2)} ({debtRequests.find((r) => r.status === 'pending')?.creditsToUse} CR) awaiting admin approval.
              </div>
            )}
          </div>
        ) : (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
            Your account is completely clear of shop debts. When debts occur, payments can be made with spendable credits at <strong>₱{DEBT_CREDIT_RATE} per credit</strong>.
          </p>
        )}
      </Card>

      {/* 5. Combined Activity & History Timeline */}
      <Card
        variant="default"
        header={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span>ACTIVITY & HISTORY</span>
            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '0.25rem', backgroundColor: 'var(--bg-elevated)', padding: '0.25rem', borderRadius: 'var(--radius-sm)' }}>
              <button
                onClick={() => { setActiveTab('all'); setVisibleCount(PAGE_SIZE); }}
                style={{
                  background: activeTab === 'all' ? 'var(--primary)' : 'transparent',
                  color: activeTab === 'all' ? 'var(--text-inverse)' : 'var(--text-secondary)',
                  border: 'none',
                  padding: '0.25rem 0.6rem',
                  borderRadius: 'var(--radius-xs)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                All ({allActivities.length})
              </button>
              <button
                onClick={() => { setActiveTab('sessions'); setVisibleCount(PAGE_SIZE); }}
                style={{
                  background: activeTab === 'sessions' ? 'var(--primary)' : 'transparent',
                  color: activeTab === 'sessions' ? 'var(--text-inverse)' : 'var(--text-secondary)',
                  border: 'none',
                  padding: '0.25rem 0.6rem',
                  borderRadius: 'var(--radius-xs)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Sessions ({sessions.length})
              </button>
              <button
                onClick={() => { setActiveTab('redemptions'); setVisibleCount(PAGE_SIZE); }}
                style={{
                  background: activeTab === 'redemptions' ? 'var(--primary)' : 'transparent',
                  color: activeTab === 'redemptions' ? 'var(--text-inverse)' : 'var(--text-secondary)',
                  border: 'none',
                  padding: '0.25rem 0.6rem',
                  borderRadius: 'var(--radius-xs)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Redemptions ({redemptions.length})
              </button>
            </div>
          </div>
        }
      >
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Skeleton height="50px" />
            <Skeleton height="50px" />
            <Skeleton height="50px" />
          </div>
        ) : filteredActivities.length === 0 ? (
          <EmptyState
            icon={activeTab === 'sessions' ? '🖥️' : activeTab === 'redemptions' ? '🎁' : '⚡'}
            title={
              activeTab === 'sessions'
                ? 'No Gaming Sessions Yet'
                : activeTab === 'redemptions'
                ? 'No Rewards Redeemed Yet'
                : 'No Activity History'
            }
            description={
              activeTab === 'sessions'
                ? 'Play at any PC unit in the gaming shop to start earning credits and leveling up.'
                : activeTab === 'redemptions'
                ? 'Redeem your earned credits in the Rewards shop for session time, snacks, or top-ups.'
                : 'Your session claims and reward redemptions will appear here once submitted.'
            }
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {displayedActivities.map((act) => (
              <div
                key={act.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(30, 41, 59, 0.4)',
                  border: '1px solid var(--border-subtle)',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                {/* Left: Icon & Title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: act.type === 'session' ? 'rgba(0, 229, 255, 0.1)' : 'rgba(255, 183, 3, 0.1)',
                      color: act.type === 'session' ? 'var(--primary)' : 'var(--accent-gold)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.1rem',
                    }}
                  >
                    {act.type === 'session' ? '🖥️' : '🎁'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      {act.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {act.subtitle} • {formatDate(act.timestamp)}
                    </div>
                  </div>
                </div>

                {/* Right: Badge & Impact */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span
                    style={{
                      fontWeight: 800,
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.95rem',
                      color: act.creditDelta >= 0 ? 'var(--primary)' : 'var(--accent-gold)',
                    }}
                  >
                    {act.badgeLabel}
                  </span>
                  {getStatusBadge(act.status)}
                </div>
              </div>
            ))}

            {/* Pagination / Load More */}
            {filteredActivities.length > visibleCount && (
              <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                >
                  Load More Activity ({filteredActivities.length - visibleCount} remaining)
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* 5. Account Security Information (Read-Only) */}
      <Card variant="default" header={<span>SECURITY & CREDENTIALS</span>}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <p style={{ margin: 0 }}>
            Time2Earn utilizes secure, staff-assisted credential recovery to safeguard your account against unauthorized access.
            If you need to change your password or verify account credentials, please visit the shop counter and present your username to staff.
          </p>
        </div>
      </Card>

      {/* Pay Debt with Credits Modal */}
      <Modal
        isOpen={isDebtModalOpen}
        onClose={() => setIsDebtModalOpen(false)}
        title="PAY DEBT WITH CREDITS"
        size="md"
      >
        <form onSubmit={handleSubmitDebtPayment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Current Shop Debt:</span>
              <strong style={{ color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>
                ₱{debt?.amount.toFixed(2)}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Your Available Balance:</span>
              <strong style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                {currentUser.credits.toLocaleString()} CR
              </strong>
            </div>
          </div>

          <div style={{ padding: '0.65rem 0.85rem', backgroundColor: 'rgba(0, 229, 255, 0.08)', borderRadius: 'var(--radius-xs)', fontSize: '0.8rem', color: 'var(--primary)' }}>
            💡 Conversion Rate: <strong>1 Credit = ₱0.40 debt relief</strong> (₱{DEBT_CREDIT_RATE} / credit).
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              CREDITS TO USE *
            </label>
            <input
              type="number"
              min="1"
              max={currentUser.credits}
              required
              value={creditsToUse}
              onChange={(e) => setCreditsToUse(Math.max(1, Number(e.target.value)))}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '1.1rem',
              }}
            />
          </div>

          {/* Dynamic Calculation Preview */}
          <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.4)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-xs)', fontSize: '0.85rem' }}>
            <div>
              Debt Relief Preview:{' '}
              <strong style={{ color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
                ₱{calculateDebtPaymentPhp(creditsToUse).toFixed(2)}
              </strong>
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.2rem' }}>
              Remaining Debt After Payment:{' '}
              <span style={{ fontFamily: 'var(--font-mono)' }}>
                ₱{Math.max(0, (debt?.amount || 0) - calculateDebtPaymentPhp(creditsToUse)).toFixed(2)}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <Button type="button" variant="ghost" onClick={() => setIsDebtModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmittingDebt}>
              Submit Payment Request
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
