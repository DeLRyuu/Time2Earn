import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArcadeIcon } from '../../components/ui/ArcadeIcon';
import { RankBadge } from '../../components/ui/RankBadge';
import { useAuth } from '../../hooks/useAuth';
import { useConfig } from '../../hooks/useConfig';
import { usePwaInstall } from '../../lib/pwa';
import { fetchPlayerSessions } from '../../services/sessionService';
import { fetchPlayerRedemptions } from '../../services/redemptionService';
import { fetchPlayerDebt, fetchPlayerDebtRequests, submitDebtPaymentRequest } from '../../services/debtService';
import { calculateRankProgress, getRankLadder } from '../../lib/ranks';
import { DEBT_CREDIT_RATE, calculateDebtPaymentPhp } from '../../lib/debts';
import { useToast } from '../../hooks/useToast';
import type { SessionRequest } from '../../types/session';
import type { RedemptionRequest } from '../../types/redemption';
import type { DebtRecord, DebtPaymentRequest } from '../../types/debt';
import './Profile.css';

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
  const { user, updatePassword } = useAuth();
  const { config } = useConfig();
  const { showToast } = useToast();
  const { isInstallable, isInstalled, promptInstall } = usePwaInstall();

  const handleInstallApp = async () => {
    const res = await promptInstall();
    if (res === 'accepted') {
      showToast('Time2Earn installed to your home screen!', 'success');
    }
  };

  const [sessions, setSessions] = useState<SessionRequest[]>([]);
  const [redemptions, setRedemptions] = useState<RedemptionRequest[]>([]);
  const [debt, setDebt] = useState<DebtRecord | null>(null);
  const [debtRequests, setDebtRequests] = useState<DebtPaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [showAllLadder, setShowAllLadder] = useState(false);

  // Change Password State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  // Debt Payment Modal State
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [creditsToUse, setCreditsToUse] = useState<number>(38);
  const [isSubmittingDebt, setIsSubmittingDebt] = useState(false);

  const handlePlayerChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!newPassword || newPassword.length < 6) {
      const err = 'New password must be at least 6 characters.';
      setPasswordError(err);
      showToast(err, 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      const err = 'Passwords do not match.';
      setPasswordError(err);
      showToast(err, 'error');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const res = await updatePassword(newPassword);
      if (res.success) {
        showToast('Password changed successfully!', 'success');
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordForm(false);
      } else {
        const err = res.error || 'Failed to update password.';
        setPasswordError(err);
        showToast(err, 'error');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error updating password.';
      setPasswordError(msg);
      showToast(msg, 'error');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Fallback demo user if not logged in
  const currentUser = useMemo(() => {
    return user || {
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
  }, [user]);

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
      showToast('Please enter an amount of tokens greater than 0.', 'error');
      return;
    }
    if (creditsToUse > currentUser.credits) {
      showToast(`Insufficient tokens. You only have ${currentUser.credits} tokens.`, 'error');
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
      title: `PC Session (${s.unitId})`,
      subtitle: `Paid: ₱${s.amountPaid.toFixed(2)}`,
      timestamp: s.requestedAt,
      status: s.status,
      creditDelta: s.creditsEarned,
      badgeLabel: `+${s.creditsEarned} tokens`,
    }));

    const redemptionItems: ActivityItem[] = redemptions.map((r) => ({
      id: `redemp-${r.id}`,
      type: 'redemption',
      title: `Prize: ${r.rewardName}`,
      subtitle: 'Prize claim',
      timestamp: r.requestedAt,
      status: r.status,
      creditDelta: -r.creditCost,
      badgeLabel: `-${r.creditCost} tokens`,
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

  return (
    <div className="profile-view">
      {/* 1. Header & Identity */}
      <div className="profile-head">
        <div>
          <h1>Player profile</h1>
          <p className="profile-sub">
            Track your personal ranking ladder, tokens, and verified shop activity.
          </p>
        </div>
      </div>

      {/* 2. Overview Stat Grid */}
      <div className="profile-stats-grid">
        {/* Spendable Tokens */}
        <div className="profile-stat-card tokens">
          <div className="stat-icon-tile tokens">
            <ArcadeIcon name="gamepad" size={28} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Spendable tokens</span>
            <span className="stat-val" style={{ color: 'var(--y)' }}>
              {currentUser.credits.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Current Rank */}
        <div className="profile-stat-card">
          <div className="stat-icon-tile rank">
            <ArcadeIcon name="crown" size={28} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Current rank</span>
            <div style={{ marginTop: '2px' }}>
              <RankBadge rank={currentUser.rank} size="sm" />
            </div>
          </div>
        </div>

        {/* Lifetime EXP */}
        <div className="profile-stat-card">
          <div className="stat-icon-tile exp">
            <ArcadeIcon name="bolt" size={28} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Lifetime EXP</span>
            <span className="stat-val" style={{ color: 'var(--v)' }}>
              {currentUser.exp.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Active Streak */}
        <div className="profile-stat-card">
          <div className="stat-icon-tile streak">
            <ArcadeIcon name="flame" size={28} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Active streak</span>
            <span className="stat-val" style={{ color: 'var(--r)' }}>
              {currentUser.streak || 0} {currentUser.streak === 1 ? 'day' : 'days'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Rank Progression Ladder */}
      <div className="profile-panel">
        <div className="panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 className="panel-title">Rank progression ladder</h2>
            <span
              className="status-pill"
              style={{ background: 'var(--v)', color: 'var(--on)' }}
            >
              {rankProgress.isMaxRank ? 'Max tier' : `Next: ${rankProgress.nextRank}`}
            </span>
          </div>
          <button
            type="button"
            className="btn"
            style={{
              background: 'var(--panel2)',
              color: 'var(--ink)',
              padding: '6px 14px',
              fontSize: '14px',
            }}
            onClick={() => setShowAllLadder((prev) => !prev)}
          >
            {showAllLadder ? 'Collapse ladder' : 'View all 12 tiers'}
          </button>
        </div>

        {/* Segmented Tier Progress Meter */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>
            <span>
              {rankProgress.isMaxRank ? 'Master of Time2Earn' : `Progress to ${rankProgress.nextRank}`}
            </span>
            <span style={{ color: 'var(--mute)' }}>
              {rankProgress.isMaxRank
                ? 'Highest rank achieved'
                : `${rankProgress.expRemaining.toLocaleString()} EXP needed`}
            </span>
          </div>
          <div className="hud-bar" style={{ height: '14px' }}>
            <div
              className="hud-bar-fill"
              style={{ width: `${rankProgress.progressPercent}%` }}
            />
          </div>
        </div>

        {/* Ladder Rows */}
        <div className="ladder-list">
          {(showAllLadder
            ? rankLadder
            : rankLadder
                .filter((t) => t.status === 'current' || t.status === 'reached')
                .slice(-3)
                .concat(rankLadder.filter((t) => t.status === 'locked').slice(0, 2))
          ).map((tier) => {
            const isCurrent = tier.status === 'current';
            const isReached = tier.status === 'reached';

            return (
              <div
                key={tier.name}
                className={`ladder-item ${isCurrent ? 'current' : isReached ? 'reached' : 'locked'}`}
              >
                <div className="ladder-left">
                  <ArcadeIcon
                    name={isCurrent ? 'crown' : isReached ? 'check' : 'lock'}
                    size={20}
                    style={{
                      color: isCurrent ? 'var(--y)' : isReached ? 'var(--g)' : 'var(--mute)',
                    }}
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <RankBadge rank={tier.name} size="sm" />
                      {isCurrent && (
                        <span className="status-pill approved" style={{ fontSize: '11px' }}>
                          Current
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--mute)', marginTop: '2px' }}>
                      Threshold: {tier.threshold.toLocaleString()} EXP
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right', fontWeight: 800 }}>
                  {isReached && <span className="status-pill approved">Reached</span>}
                  {isCurrent && (
                    <span style={{ color: 'var(--y)', fontFamily: 'Lilita One', fontSize: '16px' }}>
                      Active
                    </span>
                  )}
                  {tier.status === 'locked' && (
                    <span style={{ fontSize: '13px', color: 'var(--mute)' }}>
                      Need {tier.expNeeded.toLocaleString()} EXP
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Shop Debt Account */}
      <div className={`debt-card ${debt && debt.amount > 0 ? 'has-debt' : ''}`}>
        <div className="panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 className="panel-title">Shop debt account</h2>
            {debt && debt.isRestricted && (
              <span className="status-pill rejected">Claims restricted</span>
            )}
          </div>
          <span
            className="status-pill"
            style={{
              background: debt && debt.amount > 0 ? 'var(--r)' : 'var(--g)',
              color: debt && debt.amount > 0 ? '#ffffff' : 'var(--on)',
            }}
          >
            {debt && debt.amount > 0 ? `₱${debt.amount.toFixed(2)} (${debt.tier})` : 'Clear (₱0.00)'}
          </span>
        </div>

        {debt && debt.amount > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ margin: 0, fontSize: '15px' }}>
              You have an outstanding shop balance of <strong>₱{debt.amount.toFixed(2)}</strong>.
              {debt.daysOverdue > 0 && ` Overdue by ${debt.daysOverdue} days.`}
            </p>

            {debt.isRestricted && (
              <div className="debt-banner danger">
                <ArcadeIcon name="lock" size={20} />
                <span>
                  High debt restriction active (₱30+). Playtime session claims and reward redemptions are locked until debt is below ₱30.00.
                </span>
              </div>
            )}

            {debtRequests.some((r) => r.status === 'pending') && (
              <div className="debt-banner warning">
                <ArcadeIcon name="clock" size={20} />
                <span>
                  You have a pending debt payment of ₱{debtRequests.find((r) => r.status === 'pending')?.phpEquivalent.toFixed(2)} ({debtRequests.find((r) => r.status === 'pending')?.creditsToUse} tokens) awaiting staff approval.
                </span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginTop: '6px' }}>
              <span style={{ fontSize: '14px', color: 'var(--mute)', fontWeight: 700 }}>
                Rate: 1 token = ₱{DEBT_CREDIT_RATE} debt relief
              </span>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setCreditsToUse(Math.min(currentUser.credits, Math.ceil(debt.amount / DEBT_CREDIT_RATE)));
                  setIsDebtModalOpen(true);
                }}
                disabled={currentUser.credits <= 0 || debtRequests.some((r) => r.status === 'pending')}
              >
                {debtRequests.some((r) => r.status === 'pending') ? 'Payment pending approval' : 'Pay debt with tokens'}
              </button>
            </div>
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: '15px', color: 'var(--mute)' }}>
            Your account is completely clear of shop debts. When debts occur, payments can be made with spendable tokens at <strong>₱{DEBT_CREDIT_RATE} per token</strong>.
          </p>
        )}
      </div>

      {/* 5. Activity & History Timeline */}
      <div className="profile-panel">
        <div className="panel-header">
          <h2 className="panel-title">Activity & history</h2>
          <div className="filter-tabs">
            <button
              type="button"
              className={`filter-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => { setActiveTab('all'); setVisibleCount(PAGE_SIZE); }}
            >
              All ({allActivities.length})
            </button>
            <button
              type="button"
              className={`filter-tab-btn ${activeTab === 'sessions' ? 'active' : ''}`}
              onClick={() => { setActiveTab('sessions'); setVisibleCount(PAGE_SIZE); }}
            >
              Sessions ({sessions.length})
            </button>
            <button
              type="button"
              className={`filter-tab-btn ${activeTab === 'redemptions' ? 'active' : ''}`}
              onClick={() => { setActiveTab('redemptions'); setVisibleCount(PAGE_SIZE); }}
            >
              Prizes ({redemptions.length})
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="activity-row" style={{ minHeight: '60px', opacity: 0.5 }} />
            ))}
          </div>
        ) : filteredActivities.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--mute)' }}>
            <ArcadeIcon name="gamepad" size={48} style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontFamily: 'Lilita One', fontSize: '20px', margin: 0, color: 'var(--ink)' }}>
              No activity records found
            </h3>
            <p style={{ fontSize: '14px', margin: '6px 0 0' }}>
              Your session claims and prize redemptions will appear here once submitted.
            </p>
          </div>
        ) : (
          <div className="activity-list">
            {displayedActivities.map((act) => (
              <div key={act.id} className="activity-row">
                <div className="activity-left">
                  <div className={`activity-icon-tile ${act.type}`}>
                    <ArcadeIcon name={act.type === 'session' ? 'clock' : 'gift'} size={24} />
                  </div>
                  <div className="activity-meta">
                    <span className="activity-title">{act.title}</span>
                    <span className="activity-sub">
                      {act.subtitle} · {formatDate(act.timestamp)}
                    </span>
                  </div>
                </div>

                <div className="activity-right">
                  <span className={`activity-delta ${act.creditDelta >= 0 ? 'plus' : 'minus'}`}>
                    {act.badgeLabel}
                  </span>
                  <span className={`status-pill ${act.status}`}>
                    {act.status}
                  </span>
                </div>
              </div>
            ))}

            {filteredActivities.length > visibleCount && (
              <button
                type="button"
                className="btn"
                style={{
                  background: 'var(--panel2)',
                  color: 'var(--ink)',
                  alignSelf: 'center',
                  marginTop: '8px',
                }}
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              >
                Load more activity ({filteredActivities.length - visibleCount} remaining)
              </button>
            )}
          </div>
        )}
      </div>

      {/* 6. Security & Credentials Box */}
      <div className="profile-panel">
        <div className="panel-header" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ArcadeIcon name="shield" size={22} style={{ color: 'var(--v)' }} />
            <h2 className="panel-title">Security & credentials</h2>
          </div>
          <button
            type="button"
            className="btn"
            style={{
              background: showPasswordForm ? 'var(--panel2)' : 'var(--v)',
              color: 'var(--ink)',
              padding: '8px 16px',
              fontSize: '14px',
            }}
            onClick={() => {
              setShowPasswordForm((prev) => !prev);
              setPasswordError(null);
            }}
          >
            {showPasswordForm ? 'Close form' : 'Change password'}
          </button>
        </div>

        {passwordError && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '12px',
              background: 'rgba(255, 90, 95, 0.15)',
              border: '2px solid var(--r)',
              color: 'var(--r)',
              fontWeight: 700,
              fontSize: '14px',
              marginBottom: '12px',
            }}
          >
            ⚠️ {passwordError}
          </div>
        )}

        {showPasswordForm ? (
          <form onSubmit={handlePlayerChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: 'var(--mute)', marginBottom: '6px' }}>
                New password
              </label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="field"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: 'var(--mute)', marginBottom: '6px' }}>
                Confirm new password
              </label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="field"
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="submit"
                className="btn"
                style={{ background: 'var(--g)', color: 'var(--on)' }}
                disabled={isUpdatingPassword}
              >
                {isUpdatingPassword ? 'Saving password...' : 'Update password'}
              </button>
              <button
                type="button"
                className="btn"
                style={{ background: 'var(--panel2)', color: 'var(--ink)' }}
                onClick={() => {
                  setShowPasswordForm(false);
                  setPasswordError(null);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <p style={{ margin: 0, fontSize: '15px', color: 'var(--mute)', lineHeight: 1.5 }}>
            You can change your password anytime directly from this console. For credential recovery or account verification, you may also visit the counter and present your username to shop staff.
          </p>
        )}
      </div>

      {/* 7. App Installation & QR */}
      <div className="profile-panel">
        <div className="panel-header">
          <h2 className="panel-title">App installation & desk QR</h2>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Link to="/qr" style={{ textDecoration: 'none' }}>
              <button
                type="button"
                className="btn"
                style={{ background: 'var(--panel2)', color: 'var(--ink)' }}
              >
                Shop desk QR
              </button>
            </Link>
            {isInstallable && !isInstalled && (
              <button
                type="button"
                className="btn"
                style={{ background: 'var(--y)' }}
                onClick={handleInstallApp}
              >
                Install app
              </button>
            )}
          </div>
        </div>
        <p style={{ margin: 0, fontSize: '15px', color: 'var(--mute)' }}>
          {isInstalled
            ? 'Running as installed standalone application.'
            : 'Install Time2Earn to your device home screen for 1-tap instant access at your gaming station.'}
        </p>
      </div>

      {/* Pay Debt with Tokens Modal */}
      {isDebtModalOpen && (
        <div className="modal-overlay" onClick={() => setIsDebtModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Pay debt with tokens</h2>
            <form onSubmit={handleSubmitDebtPayment} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="modal-summary">
                <div className="modal-row">
                  <span>Current shop debt</span>
                  <b style={{ color: 'var(--r)' }}>₱{debt?.amount.toFixed(2)}</b>
                </div>
                <div className="modal-row">
                  <span>Your token balance</span>
                  <b style={{ color: 'var(--y)' }}>{currentUser.credits.toLocaleString()} tokens</b>
                </div>
                <div className="modal-row total">
                  <span>Conversion rate</span>
                  <b>1 token = ₱{DEBT_CREDIT_RATE}</b>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 800, color: 'var(--mute)', marginBottom: '6px' }}>
                  Tokens to use
                </label>
                <input
                  type="number"
                  min="1"
                  max={currentUser.credits}
                  required
                  value={creditsToUse}
                  onChange={(e) => setCreditsToUse(Math.max(1, Number(e.target.value)))}
                  className="field"
                  style={{ width: '100%' }}
                />
              </div>

              <div className="modal-summary">
                <div className="modal-row">
                  <span>Debt relief preview</span>
                  <b style={{ color: 'var(--g)' }}>₱{calculateDebtPaymentPhp(creditsToUse).toFixed(2)}</b>
                </div>
                <div className="modal-row total">
                  <span>Remaining debt</span>
                  <b>₱{Math.max(0, (debt?.amount || 0) - calculateDebtPaymentPhp(creditsToUse)).toFixed(2)}</b>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn"
                  style={{ background: 'var(--panel2)', color: 'var(--ink)' }}
                  onClick={() => setIsDebtModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn"
                  style={{ background: 'var(--g)' }}
                  disabled={isSubmittingDebt}
                >
                  {isSubmittingDebt ? 'Submitting...' : 'Submit payment request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
