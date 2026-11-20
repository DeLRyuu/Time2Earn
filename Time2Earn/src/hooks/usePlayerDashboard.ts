import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db, hasValidFirebaseConfig } from '../lib/firebase';
import type { RewardItem } from '../types/rewards';
import type { ActivityItem } from '../types/activity';
import { useAuth } from './useAuth';

// Fallback featured rewards from verified backup (isActive: true only)
const FALLBACK_FEATURED_REWARDS: RewardItem[] = [
  {
    id: '8BIQ5L5GgEMZtnHpfPxA',
    name: '25 Minute Session',
    description: 'Dagdag na 25 minuto sa iyong laro',
    category: 'PLAY-TIME',
    creditCost: 75,
    expReward: 15,
    cooldownMinutes: 50,
    minRank: 'Visitor',
    isActive: true,
  },
  {
    id: 'qZiMPvZ6PTfuuoitYBCl',
    name: '30 Minute Session',
    description: 'Dagdag na 30 minuto sa gaming console',
    category: 'PLAY-TIME',
    creditCost: 90,
    expReward: 20,
    cooldownMinutes: 70,
    minRank: 'Regular',
    isActive: true,
  },
  {
    id: 'BtjJqNpAK2QSy7Amspnu',
    name: '1 Hour Session',
    description: 'Isa pang oras ng gaming, grind na!',
    category: 'PLAY-TIME',
    creditCost: 180,
    expReward: 40,
    cooldownMinutes: 120,
    minRank: 'Grinder',
    isActive: true,
  },
];

// Fallback activity items from verified backup for demo player
const FALLBACK_ACTIVITY: ActivityItem[] = [
  {
    id: 'act-1',
    type: 'session',
    title: 'PC-01 Gaming Session',
    details: '₱20.00 payment $\\rightarrow$ +27 Credits, +27 EXP',
    status: 'approved',
    date: 'Aug 25, 2026',
    badgeText: '+27 CR',
    badgeVariant: 'primary',
  },
  {
    id: 'act-2',
    type: 'redemption',
    title: 'Redeemed 25 Minute Session',
    details: 'Cost: 75 Credits $\\rightarrow$ +15 EXP awarded',
    status: 'approved',
    date: 'Aug 20, 2026',
    badgeText: '-75 CR',
    badgeVariant: 'gold',
  },
  {
    id: 'act-3',
    type: 'session',
    title: 'PC-02 Gaming Session',
    details: '₱35.00 payment $\\rightarrow$ +48 Credits, +48 EXP',
    status: 'approved',
    date: 'Aug 14, 2026',
    badgeText: '+48 CR',
    badgeVariant: 'primary',
  },
];

export function usePlayerDashboard() {
  const { user } = useAuth();
  const [featuredRewards, setFeaturedRewards] = useState<RewardItem[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    if (!hasValidFirebaseConfig) {
      setFeaturedRewards(FALLBACK_FEATURED_REWARDS);
      setRecentActivity(FALLBACK_ACTIVITY);
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch Featured Active Rewards (Limit 3)
      const rewardsQuery = query(
        collection(db, 'rewards'),
        where('isActive', '==', true),
        limit(3)
      );
      const rewardsSnap = await getDocs(rewardsQuery);
      const rewardsList: RewardItem[] = rewardsSnap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          name: String(d.name || ''),
          description: String(d.description || ''),
          category: String(d.category || 'PLAY-TIME'),
          creditCost: Number(d.creditCost ?? 0),
          expReward: Number(d.expReward ?? 0),
          cooldownMinutes: Number(d.cooldownMinutes ?? 0),
          minRank: String(d.minRank || 'Newbie'),
          isActive: Boolean(d.isActive),
          totalRedemptions: d.totalRedemptions ? Number(d.totalRedemptions) : undefined,
        };
      });
      setFeaturedRewards(rewardsList.length > 0 ? rewardsList : FALLBACK_FEATURED_REWARDS);

      // 2. Fetch Player's Recent Sessions (Limit 5)
      const sessionQuery = query(
        collection(db, 'session_requests'),
        where('userId', '==', user.uid),
        orderBy('requestedAt', 'desc'),
        limit(5)
      );
      const sessionSnap = await getDocs(sessionQuery);
      const sessionItems: ActivityItem[] = sessionSnap.docs.map((d) => {
        const data = d.data();
        const cr = Math.floor(Number(data.creditsEarned ?? 0));
        return {
          id: d.id,
          type: 'session',
          title: `Session ${data.unitId || 'Shop PC'}`,
          details: `₱${Number(data.amountPaid ?? 0).toFixed(2)} $\\rightarrow$ ${cr} Credits, ${cr} EXP`,
          status: data.status === 'approved' ? 'approved' : data.status === 'rejected' ? 'rejected' : 'pending',
          date: data.requestedAt ? new Date(data.requestedAt).toLocaleDateString() : 'Recent',
          badgeText: `${cr > 0 ? '+' : ''}${cr} CR`,
          badgeVariant: 'primary',
        };
      });

      // 3. Fetch Player's Recent Redemptions (Limit 5)
      const redempQuery = query(
        collection(db, 'redemption_requests'),
        where('userId', '==', user.uid),
        orderBy('requestedAt', 'desc'),
        limit(5)
      );
      const redempSnap = await getDocs(redempQuery);
      const redempItems: ActivityItem[] = redempSnap.docs.map((d) => {
        const data = d.data();
        const cost = Number(data.creditCost ?? 0);
        return {
          id: d.id,
          type: 'redemption',
          title: `Redeemed ${data.rewardName || 'Reward'}`,
          details: `Cost: ${cost} Credits`,
          status: data.status === 'approved' ? 'approved' : data.status === 'rejected' ? 'rejected' : 'pending',
          date: data.requestedAt ? new Date(data.requestedAt).toLocaleDateString() : 'Recent',
          badgeText: `-${cost} CR`,
          badgeVariant: 'gold',
        };
      });

      // Combine and take top 5
      const combined = [...sessionItems, ...redempItems]
        .slice(0, 5);

      setRecentActivity(combined.length > 0 ? combined : FALLBACK_ACTIVITY);
    } catch (err) {
      console.warn('Dashboard fetch error (falling back to cached data):', err);
      setFeaturedRewards(FALLBACK_FEATURED_REWARDS);
      setRecentActivity(FALLBACK_ACTIVITY);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      await fetchDashboardData();
      if (!active) return;
    };
    run();
    return () => {
      active = false;
    };
  }, [fetchDashboardData]);

  return {
    featuredRewards,
    recentActivity,
    loading,
    error,
    refreshDashboard: fetchDashboardData,
  };
}
