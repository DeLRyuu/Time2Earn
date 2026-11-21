import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import {
  fetchAdminRewards,
  createAdminReward,
  updateAdminReward,
  toggleAdminRewardActive,
} from '../../services/adminService';
import type { RewardItem } from '../../types/rewards';

const RANKS = [
  'Newbie',
  'Visitor',
  'Regular',
  'Grinder',
  'Gamer',
  'Elite',
  'VIP',
  'VIP+',
  'MVP',
  'MVP+',
  'Legend',
  'OG Player',
];

const CATEGORIES = ['PLAY-TIME', 'SNACK-PACK', 'GAME TOP-UP'];

export const AdminRewards: React.FC = () => {
  const { user: currentAdmin } = useAuth();
  const { showToast } = useToast();

  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Modal State for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<RewardItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('PLAY-TIME');
  const [formCreditCost, setFormCreditCost] = useState(100);
  const [formExpReward, setFormExpReward] = useState(15);
  const [formMinRank, setFormMinRank] = useState('Newbie');
  const [formCooldownMinutes, setFormCooldownMinutes] = useState(0);
  const [formIsActive, setFormIsActive] = useState(true);

  // Toggle Confirm Modal
  const [toggleTarget, setToggleTarget] = useState<RewardItem | null>(null);

  const loadRewards = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAdminRewards();
      setRewards(data);
    } catch (err) {
      console.warn('Error loading admin rewards:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchInitial = async () => {
      try {
        const data = await fetchAdminRewards();
        if (isMounted) setRewards(data);
      } catch (err) {
        console.warn('Initial admin rewards error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchInitial();
    return () => {
      isMounted = false;
    };
  }, []);

  const openCreateModal = () => {
    setEditingReward(null);
    setFormName('');
    setFormDescription('');
    setFormCategory('PLAY-TIME');
    setFormCreditCost(100);
    setFormExpReward(15);
    setFormMinRank('Newbie');
    setFormCooldownMinutes(0);
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (reward: RewardItem) => {
    setEditingReward(reward);
    setFormName(reward.name);
    setFormDescription(reward.description || '');
    setFormCategory(reward.category);
    setFormCreditCost(reward.creditCost);
    setFormExpReward(reward.expReward);
    setFormMinRank(reward.minRank);
    setFormCooldownMinutes(reward.cooldownMinutes);
    setFormIsActive(reward.isActive);
    setIsModalOpen(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAdmin) {
      showToast('You must be signed in as administrator.', 'error');
      return;
    }

    if (!formName.trim()) {
      showToast('Reward name is required.', 'error');
      return;
    }
    if (formCreditCost <= 0) {
      showToast('Token cost must be greater than 0.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingReward) {
        // Edit existing reward
        await updateAdminReward(currentAdmin, editingReward.id, {
          name: formName.trim(),
          description: formDescription.trim(),
          category: formCategory,
          creditCost: Number(formCreditCost),
          expReward: Number(formExpReward),
          minRank: formMinRank,
          cooldownMinutes: Number(formCooldownMinutes),
          isActive: formIsActive,
        });
        showToast(`Reward "${formName}" updated successfully.`, 'success');
      } else {
        // Create new reward
        await createAdminReward(currentAdmin, {
          name: formName.trim(),
          description: formDescription.trim(),
          category: formCategory,
          creditCost: Number(formCreditCost),
          expReward: Number(formExpReward),
          minRank: formMinRank,
          cooldownMinutes: Number(formCooldownMinutes),
          isActive: formIsActive,
        });
        showToast(`Reward "${formName}" created successfully.`, 'success');
      }

      setIsModalOpen(false);
      await loadRewards();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Operation failed.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmToggle = async () => {
    if (!toggleTarget || !currentAdmin) return;
    setIsSubmitting(true);
    try {
      await toggleAdminRewardActive(currentAdmin, toggleTarget.id, !toggleTarget.isActive);
      showToast(
        `Reward "${toggleTarget.name}" is now ${!toggleTarget.isActive ? 'ACTIVE' : 'INACTIVE'}.`,
        'success'
      );
      setToggleTarget(null);
      await loadRewards();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Toggle failed.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRewards = rewards.filter((r) => {
    if (categoryFilter === 'ALL') return true;
    if (categoryFilter === 'INACTIVE') return !r.isActive;
    return r.category === categoryFilter;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* 1. Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0 }}>REWARDS CATALOG MANAGEMENT</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Configure store rewards, edit token costs, set rank gates, and toggle active status.
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={openCreateModal}>
          + Add New Reward
        </Button>
      </div>

      {/* 2. Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
        {['ALL', 'PLAY-TIME', 'SNACK-PACK', 'GAME TOP-UP', 'INACTIVE'].map((tab) => (
          <button
            key={tab}
            onClick={() => setCategoryFilter(tab)}
            style={{
              background: categoryFilter === tab ? 'var(--primary)' : 'var(--bg-elevated)',
              color: categoryFilter === tab ? 'var(--text-inverse)' : 'var(--text-secondary)',
              border: 'none',
              padding: '0.4rem 0.85rem',
              borderRadius: 'var(--radius-xs)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            {tab === 'INACTIVE' ? 'Inactive Items' : tab}
          </button>
        ))}
      </div>

      {/* 3. Rewards Grid / List */}
      <Card variant="default">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Skeleton height="70px" />
            <Skeleton height="70px" />
            <Skeleton height="70px" />
          </div>
        ) : filteredRewards.length === 0 ? (
          <EmptyState
            icon={<span>🏷️</span>}
            title="NO REWARDS FOUND"
            description="No reward items match the selected category filter."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {filteredRewards.map((reward) => (
              <div
                key={reward.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem',
                  backgroundColor: reward.isActive ? 'var(--bg-elevated)' : 'rgba(15, 23, 42, 0.4)',
                  border: reward.isActive ? '1px solid var(--border-medium)' : '1px dashed var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  opacity: reward.isActive ? 1 : 0.75,
                }}
              >
                {/* Left: Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-surface)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25rem',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    {reward.category === 'PLAY-TIME' ? '⏱️' : reward.category === 'SNACK-PACK' ? '🍿' : '💎'}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                        {reward.name}
                      </span>
                      <Badge variant={reward.isActive ? 'success' : 'neutral'} size="sm">
                        {reward.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant="primary" size="sm">
                        {reward.category}
                      </Badge>
                      <Badge variant="gold" size="sm">
                        Req: {reward.minRank}
                      </Badge>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      {reward.description || 'No description'} • Cooldown: {reward.cooldownMinutes > 0 ? `${reward.cooldownMinutes}m` : 'None'} • Redemptions: {reward.totalRedemptions ?? 0}
                    </div>
                  </div>
                </div>

                {/* Right: Cost & Operations */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                      {reward.creditCost} Tokens
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', fontFamily: 'var(--font-mono)' }}>
                      +{reward.expReward} EXP
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button variant="secondary" size="sm" onClick={() => openEditModal(reward)}>
                      Edit
                    </Button>
                    <Button
                      variant={reward.isActive ? 'danger' : 'primary'}
                      size="sm"
                      onClick={() => setToggleTarget(reward)}
                    >
                      {reward.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Create / Edit Reward Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingReward ? 'EDIT STORE REWARD' : 'CREATE NEW REWARD'}
        size="md"
      >
        <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              REWARD NAME *
            </label>
            <input
              type="text"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. 1 Hour VIP Session"
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              DESCRIPTION
            </label>
            <input
              type="text"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Tagline or details"
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                CATEGORY
              </label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                MIN RANK
              </label>
              <select
                value={formMinRank}
                onChange={(e) => setFormMinRank(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                }}
              >
                {RANKS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                TOKEN COST *
              </label>
              <input
                type="number"
                min="1"
                required
                value={formCreditCost}
                onChange={(e) => setFormCreditCost(Number(e.target.value))}
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
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                EXP REWARD
              </label>
              <input
                type="number"
                min="0"
                value={formExpReward}
                onChange={(e) => setFormExpReward(Number(e.target.value))}
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
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                COOLDOWN (MINS)
              </label>
              <input
                type="number"
                min="0"
                value={formCooldownMinutes}
                onChange={(e) => setFormCooldownMinutes(Number(e.target.value))}
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
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
            <input
              type="checkbox"
              id="isActiveToggle"
              checked={formIsActive}
              onChange={(e) => setFormIsActive(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
            />
            <label htmlFor="isActiveToggle" style={{ fontSize: '0.85rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
              Active in player Rewards shop immediately
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {editingReward ? 'Save Changes' : 'Create Reward'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Modal for Toggle */}
      <Modal
        isOpen={Boolean(toggleTarget)}
        onClose={() => setToggleTarget(null)}
        title="CONFIRM REWARD STATUS CHANGE"
        size="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Are you sure you want to {toggleTarget?.isActive ? 'deactivate' : 'activate'}{' '}
            <strong>{toggleTarget?.name}</strong>?
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <Button variant="ghost" onClick={() => setToggleTarget(null)}>
              Cancel
            </Button>
            <Button
              variant={toggleTarget?.isActive ? 'danger' : 'primary'}
              isLoading={isSubmitting}
              onClick={handleConfirmToggle}
            >
              Confirm {toggleTarget?.isActive ? 'Deactivation' : 'Activation'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
