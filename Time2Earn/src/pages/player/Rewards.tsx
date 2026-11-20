import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
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

const CATEGORY_TABS = [
  { id: 'ALL', label: 'All Rewards', filter: 'ALL' },
  { id: 'PLAY-TIME', label: 'Play Time', filter: 'PLAY-TIME' },
  { id: 'SNACK-PACK', label: 'Snacks', filter: 'SNACK-PACK' },
  { id: 'GAME TOP-UP', label: 'Game Top-Up', filter: 'GAME TOP-UP' },
];

export const Rewards: React.FC = () => {
  const { user } = useAuth();
  const { config } = useConfig();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('ALL');
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [cooldowns, setCooldowns] = useState<RewardCooldown[]>([]);
  const [playerRedemptions, setPlayerRedemptions] = useState<RedemptionRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Redeem Confirmation Modal State
  const [selectedReward, setSelectedReward] = useState<RewardItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fallback demo user
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

  // Filter rewards by category tab
  const filteredRewards = rewards.filter((r) => {
    if (activeTab === 'ALL') return true;
    return r.category.toUpperCase() === activeTab;
  });

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

      showToast(`Redemption request submitted for ${selectedReward.name}! Awaiting staff approval.`, 'success');
      setSelectedReward(null);
      await loadShopData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Redemption submission failed.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toUpperCase()) {
      case 'PLAY-TIME':
        return '⏱️';
      case 'SNACK-PACK':
        return '🥤';
      case 'GAME TOP-UP':
        return '💎';
      default:
        return '🎁';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 1. Shop Header with Balance Summary */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900 }}>REWARDS LOOT SHOP</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Exchange earned credits for playtime, snacks, and game top-ups.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div
            style={{
              padding: '0.4rem 0.85rem',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-neon)',
              borderRadius: 'var(--radius-full)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.9rem',
              fontWeight: 800,
              color: 'var(--primary)',
            }}
          >
            💰 {currentUser.credits.toLocaleString()} CR Available
          </div>
        </div>
      </div>

      {/* 2. Category Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
        {CATEGORY_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Badge
              key={tab.id}
              variant={isActive ? 'primary' : 'neutral'}
              style={{
                cursor: 'pointer',
                padding: '0.5rem 0.95rem',
                fontSize: '0.8rem',
                borderRadius: 'var(--radius-sm)',
              }}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </Badge>
          );
        })}
      </div>

      {/* 3. Rewards Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
          <Skeleton height="180px" />
          <Skeleton height="180px" />
          <Skeleton height="180px" />
          <Skeleton height="180px" />
        </div>
      ) : filteredRewards.length === 0 ? (
        <Card variant="default">
          <EmptyState
            icon={<span>🎁</span>}
            title="NO REWARDS IN THIS CATEGORY"
            description="Try selecting another category tab to view available loot items."
          />
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
          {filteredRewards.map((reward) => {
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

            return (
              <Card
                key={reward.id}
                variant={eligibility.canRedeem ? 'interactive' : 'default'}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: eligibility.canRedeem
                    ? '1px solid rgba(0, 229, 255, 0.4)'
                    : '1px solid var(--border-subtle)',
                  opacity: eligibility.canRedeem ? 1 : 0.85,
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.35rem' }}>{getCategoryIcon(reward.category)}</span>
                      <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                        {reward.name}
                      </span>
                    </div>
                    <Badge variant="primary" size="sm">{reward.category}</Badge>
                  </div>

                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem', minHeight: '34px', lineHeight: 1.35 }}>
                    {reward.description}
                  </p>

                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                    <Badge variant="gold" size="sm">Min: {reward.minRank}</Badge>
                    <Badge variant="neutral" size="sm">
                      {reward.cooldownMinutes > 0 ? `⏱️ ${reward.cooldownMinutes}m cooldown` : '⚡ Instant'}
                    </Badge>
                  </div>
                </div>

                <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                    <div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                        {reward.creditCost.toLocaleString()} CR
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--secondary)' }}>
                        +{reward.expReward} EXP bonus
                      </div>
                    </div>

                    {/* Eligibility Badge */}
                    <div>
                      {eligibility.state === 'available' && (
                        <Badge variant="success" size="sm">AVAILABLE</Badge>
                      )}
                      {eligibility.state === 'pending' && (
                        <Badge variant="warning" size="sm">PENDING</Badge>
                      )}
                      {eligibility.state === 'on_cooldown' && (
                        <Badge variant="danger" size="sm">{eligibility.statusMessage}</Badge>
                      )}
                      {eligibility.state === 'locked_rank' && (
                        <Badge variant="neutral" size="sm">RANK LOCKED</Badge>
                      )}
                      {eligibility.state === 'insufficient_credits' && (
                        <Badge variant="danger" size="sm">NEED CREDITS</Badge>
                      )}
                    </div>
                  </div>

                  {/* Status explanation helper if locked */}
                  {!eligibility.canRedeem && eligibility.statusMessage && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--danger)', marginBottom: '0.5rem', fontWeight: 600 }}>
                      ⚠️ {eligibility.statusMessage}
                    </div>
                  )}

                  <Button
                    variant={eligibility.canRedeem ? 'primary' : 'secondary'}
                    size="md"
                    disabled={!eligibility.canRedeem}
                    style={{ width: '100%' }}
                    onClick={() => handleOpenRedeemModal(reward)}
                  >
                    {eligibility.state === 'available' ? 'Redeem Loot' : 'Locked'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* 4. Player's Redemption History Section */}
      <Card
        variant="default"
        header={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.05em' }}>
              MY REDEMPTION CLAIMS
            </span>
            <Button variant="ghost" size="sm" onClick={loadShopData}>
              Refresh
            </Button>
          </div>
        }
      >
        {playerRedemptions.length === 0 ? (
          <EmptyState
            icon={<span>🎁</span>}
            title="NO REDEMPTIONS YET"
            description="When you redeem shop rewards, your requests and cooldown statuses will appear here."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {playerRedemptions.map((redemp) => (
              <div
                key={redemp.id}
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
                      {redemp.rewardName}
                    </span>
                    <Badge
                      variant={
                        redemp.status === 'approved'
                          ? 'success'
                          : redemp.status === 'rejected'
                          ? 'danger'
                          : 'warning'
                      }
                      size="sm"
                    >
                      {redemp.status}
                    </Badge>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Requested: {new Date(redemp.requestedAt).toLocaleString()}
                    {redemp.rejectNote && (
                      <span style={{ color: 'var(--danger)', marginLeft: '0.5rem' }}>
                        (Reason: {redemp.rejectNote})
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                    -{redemp.creditCost} CR
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Cooldown: {redemp.cooldownMinutes}m
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Confirmation Modal */}
      <Modal
        isOpen={Boolean(selectedReward)}
        onClose={() => setSelectedReward(null)}
        title="CONFIRM REWARD REDEMPTION"
        size="sm"
      >
        {selectedReward && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              You are requesting to redeem <strong>{selectedReward.name}</strong>.
            </p>

            <div style={{ background: 'var(--bg-app)', border: '1px solid var(--border-medium)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Current Balance:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{currentUser.credits} CR</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Cost:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--danger)' }}>
                  -{selectedReward.creditCost} CR
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.35rem' }}>
                <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.85rem' }}>Balance on Approval:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--primary)' }}>
                  {currentUser.credits - selectedReward.creditCost} CR
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem' }}>
                <span style={{ color: 'var(--secondary)', fontSize: '0.8rem' }}>EXP Bonus:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--secondary)' }}>
                  +{selectedReward.expReward} EXP
                </span>
              </div>
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Upon confirmation, your request is submitted for staff authorization. Credits are deducted once approved.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <Button variant="ghost" onClick={() => setSelectedReward(null)}>
                Cancel
              </Button>
              <Button variant="primary" isLoading={isSubmitting} onClick={handleConfirmRedeem}>
                Confirm Claim
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
