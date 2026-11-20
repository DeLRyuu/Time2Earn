import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { fetchPendingSessions, approveSessionRequest, rejectSessionRequest } from '../../services/sessionService';
import type { SessionRequest } from '../../types/session';

export const AdminSessions: React.FC = () => {
  const { user: currentAdmin } = useAuth();
  const { showToast } = useToast();

  const [pendingSessions, setPendingSessions] = useState<SessionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Reject Modal State
  const [sessionToReject, setSessionToReject] = useState<SessionRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadPending = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPendingSessions();
      setPendingSessions(data);
    } catch (err) {
      console.warn('Error loading pending sessions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchInitial = async () => {
      try {
        const data = await fetchPendingSessions();
        if (isMounted) setPendingSessions(data);
      } catch (err) {
        console.warn('Error loading pending sessions:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchInitial();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleApprove = async (session: SessionRequest) => {
    if (!currentAdmin) {
      showToast('You must be signed in as administrator.', 'error');
      return;
    }

    setProcessingId(session.id);
    try {
      const result = await approveSessionRequest(session.id, currentAdmin);
      showToast(
        `Session approved for ${session.username}! +${result.creditsAwarded} CR & +${result.expAwarded} EXP awarded.`,
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
    if (!sessionToReject || !currentAdmin) return;

    setProcessingId(sessionToReject.id);
    try {
      await rejectSessionRequest(sessionToReject.id, currentAdmin, rejectReason);
      showToast(`Session request rejected for ${sessionToReject.username}.`, 'info');
      setSessionToReject(null);
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
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900 }}>SESSION APPROVAL QUEUE</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Review player playtime claims, verify PC stations, and authorize Credits & EXP awards.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Badge variant="warning" size="md">
            {pendingSessions.length} PENDING
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
            <Skeleton height="70px" />
          </div>
        ) : pendingSessions.length === 0 ? (
          <EmptyState
            icon={<span>✅</span>}
            title="QUEUE IS CLEAR"
            description="All player session requests have been resolved. New claims will appear here in real time."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {pendingSessions.map((session) => (
              <div
                key={session.id}
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
                    🎮
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                        {session.username}
                      </span>
                      <Badge variant="primary" size="sm">
                        {session.unitId}
                      </Badge>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      Submitted: {new Date(session.requestedAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--accent-gold)', fontFamily: 'var(--font-mono)' }}>
                      ₱{session.amountPaid.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                      +{Math.floor(session.creditsEarned)} CR / +{Math.floor(session.creditsEarned)} EXP
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button
                      variant="primary"
                      size="sm"
                      isLoading={processingId === session.id}
                      onClick={() => handleApprove(session)}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={processingId === session.id}
                      onClick={() => setSessionToReject(session)}
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

      {/* Reject Reason Dialog Modal */}
      <Modal
        isOpen={Boolean(sessionToReject)}
        onClose={() => setSessionToReject(null)}
        title="REJECT SESSION REQUEST"
        size="sm"
      >
        <form onSubmit={handleConfirmReject} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Reject session claim for <strong>{sessionToReject?.username}</strong> on{' '}
            <strong>{sessionToReject?.unitId}</strong> (₱{sessionToReject?.amountPaid.toFixed(2)}).
          </p>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              REJECTION REASON (OPTIONAL)
            </label>
            <input
              type="text"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Unverified station payment"
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
            <Button type="button" variant="ghost" onClick={() => setSessionToReject(null)}>
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
