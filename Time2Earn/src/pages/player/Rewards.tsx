import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ArcadeIcon, type ArcadeIconName } from '../../components/ui/ArcadeIcon';
import { CooldownTimer } from '../../components/common/CooldownTimer';
import { useAuth } from '../../hooks/useAuth';
import { useConfig } from '../../hooks/useConfig';
import { useToast } from '../../hooks/useToast';
import {
  fetchShopRewards,
  fetchPlayerCooldowns,
  fetchPlayerRedemptions,
  submitRedemptionRequest,
} from '../../services/redemptionService';
import { evaluateRewardEligibility } from '../../lib/rewards';
import type { RewardItem } from '../../types/rewards';
import type { RewardCooldown, RedemptionRequest } from '../../types/redemption';
import './Rewards.css';

export const Rewards: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { config } = useConfig();
  const { showToast } = useToast();

  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [cooldowns, setCooldowns] = useState<RewardCooldown[]>([]);
  const [playerRedemptions, setPlayerRedemptions] = useState<RedemptionRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Redeem Confirmation Modal State
  const [selectedReward, setSelectedReward] = useState<RewardItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fallback demo user
  const currentUser = useMemo(() => {
    return user || {
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
  }, [user]);

  const loadShopData = useCallback(async () => {
    setLoading(true);
    try {
      const [rewardsData, cooldownsData, redempsData] = await Promise.all([
        fetchShopRewards(false), // Player view: isActive: true only
        fetchPlayerCooldowns(currentUser.uid),
        fetchPlayerRedemptions(currentUser.uid),
      ]);
      setRewards(rewardsData);
      setCooldowns(cooldownsData);
      setPlayerRedemptions(redempsData);
    } catch (err) {
      console.warn('Error loading shop data:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser.uid]);

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      try {
        const [rewardsData, cooldownsData, redempsData] = await Promise.all([
          fetchShopRewards(false),
          fetchPlayerCooldowns(currentUser.uid),
          fetchPlayerRedemptions(currentUser.uid),
        ]);
        if (isMounted) {
          setRewards(rewardsData);
          setCooldowns(cooldownsData);
          setPlayerRedemptions(redempsData);
        }
      } catch (err) {
        console.warn('Initial shop load warning:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    run();
    return () => {
      isMounted = false;
    };
  }, [currentUser.uid]);

  // Sort rewards ascending by price
  const sortedRewards = useMemo(() => {
    return [...rewards].sort((a, b) => a.creditCost - b.creditCost);
  }, [rewards]);

  // Split into "Ready to claim" and "Almost yours"
  const { readyPrizes, almostPrizes } = useMemo(() => {
    const ready: Array<{ reward: RewardItem; eligibility: ReturnType<typeof evaluateRewardEligibility> }> = [];
    const almost: Array<{ reward: RewardItem; eligibility: ReturnType<typeof evaluateRewardEligibility> }> = [];

    for (const reward of sortedRewards) {
      const hasPending = playerRedemptions.some(
        (r) => r.rewardId === reward.id && r.status === 'pending'
      );
      const eligibility = evaluateRewardEligibility(
        reward,
        currentUser,
        config,
        cooldowns,
        hasPending
      );

      // In "Ready to claim" if player can afford it and meets rank criteria (even if temporarily cooling down)
      const canAfford = currentUser.credits >= reward.creditCost;
      const rankMet = eligibility.state !== 'locked_rank';

      if (canAfford && rankMet) {
        ready.push({ reward, eligibility });
      } else {
        almost.push({ reward, eligibility });
      }
    }

    return { readyPrizes: ready, almostPrizes: almost };
  }, [sortedRewards, playerRedemptions, currentUser, config, cooldowns]);

  // Next locked prize calculation
  const nextLocked = almostPrizes[0]?.reward;
  const tokensToGo = nextLocked ? Math.max(0, nextLocked.creditCost - currentUser.credits) : 0;
  const nextPercent = nextLocked
    ? Math.min(100, Math.max(0, Math.round((currentUser.credits / nextLocked.creditCost) * 100)))
    : 100;

  // Icon mapping
  const getPrizeIcon = (reward: RewardItem): { icon: ArcadeIconName; color: string } => {
    const cat = (reward.category || '').toUpperCase();
    const name = reward.name.toLowerCase();

    if (cat === 'PLAY-TIME' || name.includes('hour') || name.includes('session') || name.includes('pass')) {
      return { icon: 'clock', color: 'var(--s)' };
    }
    if (name.includes('drink') || name.includes('water') || name.includes('coffee') || name.includes('soda')) {
      return { icon: 'trophy', color: 'var(--g)' };
    }
    if (name.includes('vip') || name.includes('crown') || name.includes('elite')) {
      return { icon: 'crown', color: 'var(--v)' };
    }
    if (name.includes('snack') || name.includes('combo') || name.includes('chips') || cat === 'SNACK-PACK') {
      return { icon: 'gift', color: 'var(--y)' };
    }
    if (name.includes('mystery') || name.includes('box')) {
      return { icon: 'gift', color: 'var(--r)' };
    }
    return { icon: 'bolt', color: 'var(--y)' };
  };

  const handleOpenRedeemModal = (reward: RewardItem) => {
    setSelectedReward(reward);
  };

  const handleConfirmRedeem = async () => {
    if (!selectedReward) return;

    setIsSubmitting(true);
    try {
      const hasPending = playerRedemptions.some(
        (r) => r.rewardId === selectedReward.id && r.status === 'pending'
      );

      await submitRedemptionRequest(
        selectedReward,
        currentUser,
        config,
        cooldowns,
        hasPending
      );

      showToast(`Claimed: ${selectedReward.name}. Show this at the counter.`, 'success');
      setSelectedReward(null);
      if (refreshUser) await refreshUser();
      await loadShopData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Redemption submission failed.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="shop-view">
      {/* 1. Shop Head */}
      <div className="shop-head">
        <div>
          <h1>Prize Shop</h1>
          <p className="m">Trade tokens for play time and snacks.</p>
        </div>
      </div>

      {/* 2. Wallet Banner (Yellow) */}
      <div className="wallet">
        <div className="wallet-icon">
          <ArcadeIcon name="gamepad" size={64} />
        </div>
        <div className="wallet-grow">
          <p>Your wallet</p>
          <div className="d">
            <span>{currentUser.credits.toLocaleString()}</span> tokens
          </div>
        </div>
        <div className="wallet-next">
          <p id="nextTxt">
            {nextLocked
              ? `Next unlock: ${nextLocked.name} · ${tokensToGo.toLocaleString()} tokens to go`
              : 'Everything is unlocked!'}
          </p>
          <div className="wallet-bar">
            <div className="wallet-bar-fill" style={{ width: `${nextPercent}%` }} />
          </div>
        </div>
      </div>

      {/* 3. Shelves */}
      {loading ? (
        <div className="shelf">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card prize" style={{ minHeight: '220px', opacity: 0.5 }}>
              <div className="ico" style={{ background: 'var(--panel2)' }} />
              <div style={{ height: '24px', background: 'var(--panel2)', borderRadius: '8px' }} />
              <div style={{ height: '36px', background: 'var(--panel2)', borderRadius: '8px' }} />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Shelf 1: Ready to Claim */}
          {readyPrizes.length > 0 && (
            <div>
              <div className="sec">
                <h2>Ready to claim</h2>
                <span className="tag" style={{ background: 'var(--g)' }}>
                  {readyPrizes.length}
                </span>
              </div>
              <div className="shelf">
                {readyPrizes.map(({ reward, eligibility }) => {
                  const { icon, color } = getPrizeIcon(reward);
                  const isAvailable = eligibility.canRedeem;

                  return (
                    <div key={reward.id} className="card prize can">
                      <div className="prize-top">
                        <div className="ico" style={{ background: color }}>
                          <ArcadeIcon name={icon} />
                        </div>
                        <div className="prize-badges">
                          {reward.minRank && reward.minRank !== 'Newbie' && (
                            <span className="prize-badge rank">{reward.minRank}</span>
                          )}
                          {reward.cooldownMinutes > 0 && (
                            <span className="prize-badge cooldown">{reward.cooldownMinutes}m cd</span>
                          )}
                        </div>
                      </div>

                      <h3>{reward.name}</h3>
                      <p className="prize-desc">{reward.description}</p>

                      <div className="price">
                        <ArcadeIcon name="gamepad" />
                        <span>{reward.creditCost.toLocaleString()}</span>
                      </div>

                      <button
                        type="button"
                        className="btn"
                        disabled={!isAvailable}
                        onClick={() => handleOpenRedeemModal(reward)}
                      >
                        {eligibility.state === 'available' ? (
                          'Claim prize'
                        ) : eligibility.state === 'on_cooldown' ? (
                          eligibility.cooldownExpiresAt ? (
                            <CooldownTimer expiresAt={eligibility.cooldownExpiresAt} onExpire={loadShopData} />
                          ) : (
                            'On cooldown'
                          )
                        ) : eligibility.state === 'pending' ? (
                          'Pending review'
                        ) : (
                          'Claim prize'
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Shelf 2: Almost Yours */}
          {almostPrizes.length > 0 && (
            <div>
              <div className="sec">
                <h2>Almost yours</h2>
                <span className="tag" style={{ background: 'var(--y)' }}>
                  {almostPrizes.length}
                </span>
              </div>
              <div className="shelf">
                {almostPrizes.map(({ reward, eligibility }) => {
                  const { color } = getPrizeIcon(reward);
                  const pct = Math.min(100, Math.round((currentUser.credits / reward.creditCost) * 100));
                  const tokensNeeded = Math.max(0, reward.creditCost - currentUser.credits);

                  return (
                    <div key={reward.id} className="card prize lock">
                      <div className="prize-top">
                        <div className="ico" style={{ background: color }}>
                          <ArcadeIcon name="lock" />
                        </div>
                        <div className="prize-badges">
                          {eligibility.state === 'locked_rank' ? (
                            <span className="prize-badge rank">Requires {reward.minRank}</span>
                          ) : (
                            <span className="prize-badge rank">{reward.minRank}</span>
                          )}
                        </div>
                      </div>

                      <h3>{reward.name}</h3>
                      <p className="prize-desc">{reward.description}</p>

                      <div className="price">
                        <ArcadeIcon name="gamepad" />
                        <span>{reward.creditCost.toLocaleString()}</span>
                      </div>

                      <div>
                        <div className="prize-bar">
                          <div className="prize-bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="need" style={{ marginTop: '6px' }}>
                          {eligibility.state === 'locked_rank'
                            ? `Requires ${reward.minRank} rank`
                            : `${tokensNeeded.toLocaleString()} more tokens to unlock`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* 4. Player's Redemption History */}
      {playerRedemptions.length > 0 && (
        <div className="history-card">
          <h2>My redemption claims</h2>
          <div className="history-list">
            {playerRedemptions.map((redemp) => (
              <div key={redemp.id} className="history-item">
                <div className="history-item-left">
                  <div>
                    <div className="history-item-name">{redemp.rewardName}</div>
                    <div className="history-item-time">
                      Requested: {new Date(redemp.requestedAt).toLocaleString()}
                      {redemp.rejectNote && ` · Reason: ${redemp.rejectNote}`}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div className="history-item-cost">-{redemp.creditCost} tokens</div>
                  <span
                    className="tag"
                    style={{
                      background:
                        redemp.status === 'approved'
                          ? 'var(--g)'
                          : redemp.status === 'rejected'
                          ? 'var(--r)'
                          : 'var(--y)',
                    }}
                  >
                    {redemp.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {selectedReward && (
        <div className="modal-overlay" onClick={() => setSelectedReward(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Claim prize</h2>
            <p style={{ color: 'var(--mute)', margin: 0, fontSize: '15px' }}>
              You are requesting to redeem <strong>{selectedReward.name}</strong>.
            </p>

            <div className="modal-summary">
              <div className="modal-row">
                <span>Current tokens</span>
                <b>{currentUser.credits.toLocaleString()} tokens</b>
              </div>
              <div className="modal-row">
                <span>Cost</span>
                <b style={{ color: 'var(--r)' }}>-{selectedReward.creditCost.toLocaleString()} tokens</b>
              </div>
              <div className="modal-row total">
                <span>Tokens remaining</span>
                <b style={{ color: 'var(--y)' }}>
                  {(currentUser.credits - selectedReward.creditCost).toLocaleString()} tokens
                </b>
              </div>
              {selectedReward.expReward > 0 && (
                <div className="modal-row" style={{ color: 'var(--v)' }}>
                  <span>EXP bonus</span>
                  <b>+{selectedReward.expReward} EXP</b>
                </div>
              )}
            </div>

            <p style={{ fontSize: '13px', color: 'var(--mute)', margin: 0 }}>
              Show this at the counter once submitted. Staff will review and grant your prize.
            </p>

            <div className="modal-actions">
              <button
                type="button"
                className="btn"
                style={{ background: 'var(--panel2)', color: 'var(--ink)' }}
                onClick={() => setSelectedReward(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                style={{ background: 'var(--g)' }}
                disabled={isSubmitting}
                onClick={handleConfirmRedeem}
              >
                {isSubmitting ? 'Submitting...' : 'Confirm claim'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
