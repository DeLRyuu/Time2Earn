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
  fetchPendingRedemptions,
  approveRedemptionRequest,
  rejectRedemptionRequest,
} from '../../services/redemptionService';
import type { RedemptionRequest } from '../../types/redemption';

export const AdminRedemptions: React.FC = () => {
  const { user: currentAdmin } = useAuth();
  const { showToast } = useToast();

  const [pendingRedemptions, setPendingRedemptions] = useState<RedemptionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Reject Modal State
  const [itemToReject, setItemToReject] = useState<RedemptionRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadPending = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPendingRedemptions();
      setPendingRedemptions(data);
    } catch (err) {
      console.warn('Error fetching pending redemptions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchInitial = async () => {
      try {
        const data = await fetchPendingRedemptions();
        if (isMounted) setPendingRedemptions(data);
      } catch (err) {
        console.warn('Initial pending redemptions error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchInitial();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleApprove = async (redemption: RedemptionRequest) => {
    if (!currentAdmin) {
      showToast('You must be signed in as administrator.', 'error');
      return;
    }

    setProcessingId(redemption.id);
    try {
      const res = await approveRedemptionRequest(redemption.id, currentAdmin);
      showToast(
        `Redemption approved for ${redemption.username}! -${res.creditsDeducted} Tokens, +${res.expAwarded} EXP`,
        'success'
      );
      await loadPending();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Approval failed.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemToReject || !currentAdmin) return;

    setProcessingId(itemToReject.id);
    try {
      await rejectRedemptionRequest(itemToReject.id, currentAdmin, rejectReason);
      showToast(`Redemption request rejected for ${itemToReject.username}.`, 'info');
      setItemToReject(null);
      setRejectReason('');
      await loadPending();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Rejection failed.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900 }}>REWARD REDEMPTION QUEUE</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Authorize player reward redemptions, verify stock/services, and activate cooldown timers.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Badge variant="warning" size="md">
            {pendingRedemptions.length} PENDING
          </Badge>
          <Button variant="secondary" size="sm" onClick={loadPending}>
            Refresh Queue
          </Button>
        </div>
      </div>

      <Card variant="default">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Skeleton height="70px" />
            <Skeleton height="70px" />
          </div>
        ) : pendingRedemptions.length === 0 ? (
          <EmptyState
            icon={<span>🎁</span>}
            title="NO PENDING REDEMPTIONS"
            description="All reward claims have been processed. New claims will appear here."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {pendingRedemptions.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem',
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-medium)',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25rem',
                    }}
                  >
                    🎁
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                        {item.username}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>wants to claim</span>
                      <Badge variant="primary" size="sm">
                        {item.rewardName}
                      </Badge>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      Requested: {new Date(item.requestedAt).toLocaleString()} • Cooldown: {item.cooldownMinutes}m
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                      -{item.creditCost} Tokens
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--secondary)' }}>
                      Deducted upon approval
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button
                      variant="primary"
                      size="sm"
                      isLoading={processingId === item.id}
                      onClick={() => handleApprove(item)}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={processingId === item.id}
                      onClick={() => setItemToReject(item)}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Reject Modal */}
      <Modal
        isOpen={Boolean(itemToReject)}
        onClose={() => setItemToReject(null)}
        title="REJECT REDEMPTION CLAIM"
        size="sm"
      >
        <form onSubmit={handleConfirmReject} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Reject redemption for <strong>{itemToReject?.username}</strong> claiming{' '}
            <strong>{itemToReject?.rewardName}</strong>.
          </p>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              REJECTION REASON (OPTIONAL)
            </label>
            <input
              type="text"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Snack out of stock / System maintenance"
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <Button type="button" variant="ghost" onClick={() => setItemToReject(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" isLoading={Boolean(processingId)}>
              Confirm Rejection
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
