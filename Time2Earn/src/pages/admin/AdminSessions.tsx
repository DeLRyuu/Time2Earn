import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { fetchRecentSessionsAdmin, approveSessionRequest, rejectSessionRequest } from '../../services/sessionService';
import type { SessionRequest } from '../../types/session';

type FilterType = 'pending' | 'resolved' | 'all';

export const AdminSessions: React.FC = () => {
  const { user: currentAdmin } = useAuth();
  const { showToast } = useToast();

  const [sessions, setSessions] = useState<SessionRequest[]>([]);
  const [filter, setFilter] = useState<FilterType>('pending');
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Reject Modal State
  const [sessionToReject, setSessionToReject] = useState<SessionRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadSessions = useCallback(async (currentFilter: FilterType) => {
    setLoading(true);
    try {
      const data = await fetchRecentSessionsAdmin(currentFilter);
      setSessions(data);
    } catch (err) {
      console.warn('Error loading sessions for admin:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchInitial = async () => {
      try {
        const data = await fetchRecentSessionsAdmin(filter);
        if (isMounted) setSessions(data);
      } catch (err) {
        console.warn('Initial session load error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchInitial();
    return () => {
      isMounted = false;
    };
  }, [filter]);

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
      await loadSessions(filter);
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
      await loadSessions(filter);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Rejection failed.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = sessions.filter((s) => s.status === 'pending').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0 }}>SESSION APPROVAL QUEUE</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Review player playtime claims, verify PC stations, and authorize Credits & EXP awards.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Button variant="secondary" size="sm" onClick={() => loadSessions(filter)}>
            Refresh Queue
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setFilter('pending')}
          style={{
            background: filter === 'pending' ? 'var(--primary)' : 'var(--bg-elevated)',
            color: filter === 'pending' ? 'var(--text-inverse)' : 'var(--text-secondary)',
            border: 'none',
            padding: '0.4rem 0.85rem',
            borderRadius: 'var(--radius-xs)',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          Pending {pendingCount > 0 && `(${pendingCount})`}
        </button>
        <button
          onClick={() => setFilter('resolved')}
          style={{
            background: filter === 'resolved' ? 'var(--primary)' : 'var(--bg-elevated)',
            color: filter === 'resolved' ? 'var(--text-inverse)' : 'var(--text-secondary)',
            border: 'none',
            padding: '0.4rem 0.85rem',
            borderRadius: 'var(--radius-xs)',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          Resolved History
        </button>
        <button
          onClick={() => setFilter('all')}
          style={{
            background: filter === 'all' ? 'var(--primary)' : 'var(--bg-elevated)',
            color: filter === 'all' ? 'var(--text-inverse)' : 'var(--text-secondary)',
            border: 'none',
            padding: '0.4rem 0.85rem',
            borderRadius: 'var(--radius-xs)',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          All Claims
        </button>
      </div>

      <Card variant="default">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Skeleton height="70px" />
            <Skeleton height="70px" />
            <Skeleton height="70px" />
          </div>
        ) : sessions.length === 0 ? (
          <EmptyState
            icon={<span>✅</span>}
            title={filter === 'pending' ? 'QUEUE IS CLEAR' : 'NO SESSIONS RECORDED'}
            description={
              filter === 'pending'
                ? 'All player session requests have been resolved. New claims will appear here in real time.'
                : 'No session records matching the selected filter.'
            }
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {sessions.map((session) => (
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
                      {session.status === 'approved' && <Badge variant="success" size="sm">Approved</Badge>}
                      {session.status === 'rejected' && <Badge variant="danger" size="sm">Rejected</Badge>}
                      {session.status === 'pending' && <Badge variant="warning" size="sm">Pending</Badge>}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      Submitted: {new Date(session.requestedAt).toLocaleString()}
                      {session.rejectNote && (
                        <span style={{ color: 'var(--danger)', marginLeft: '0.5rem' }}>
                          Reason: {session.rejectNote}
                        </span>
                      )}
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

                  {session.status === 'pending' ? (
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
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {session.resolvedAt ? `Resolved: ${new Date(session.resolvedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Completed'}
                    </span>
                  )}
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
