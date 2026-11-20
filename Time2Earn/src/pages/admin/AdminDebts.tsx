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
  fetchAllDebtsAdmin,
  fetchPendingDebtPaymentsAdmin,
  fetchDebtHistoryAdmin,
  approveDebtPaymentRequest,
  rejectDebtPaymentRequest,
  addDebtAdmin,
  deductDebtAdmin,
} from '../../services/debtService';
import { fetchAdminPlayers } from '../../services/adminService';
import type { DebtRecord, DebtPaymentRequest, DebtHistoryRecord } from '../../types/debt';
import type { PlayerOverviewRecord } from '../../services/adminService';

export const AdminDebts: React.FC = () => {
  const { user: currentAdmin } = useAuth();
  const { showToast } = useToast();

  const [debts, setDebts] = useState<DebtRecord[]>([]);
  const [pendingRequests, setPendingRequests] = useState<DebtPaymentRequest[]>([]);
  const [history, setHistory] = useState<DebtHistoryRecord[]>([]);
  const [players, setPlayers] = useState<PlayerOverviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Add Debt Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [addAmount, setAddAmount] = useState<number>(10);
  const [addNote, setAddNote] = useState('');

  // Deduct / Cash Payment Modal
  const [deductTarget, setDeductTarget] = useState<DebtRecord | null>(null);
  const [deductAmount, setDeductAmount] = useState<number>(5);
  const [deductNote, setDeductNote] = useState('Cash payment at counter');

  // Reject Modal
  const [requestToReject, setRequestToReject] = useState<DebtPaymentRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [debtsData, requestsData, historyData, playersData] = await Promise.all([
        fetchAllDebtsAdmin(),
        fetchPendingDebtPaymentsAdmin(),
        fetchDebtHistoryAdmin(),
        fetchAdminPlayers(),
      ]);
      setDebts(debtsData);
      setPendingRequests(requestsData);
      setHistory(historyData);
      setPlayers(playersData);
    } catch (err) {
      console.warn('Error loading admin debts data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchInitial = async () => {
      try {
        const [debtsData, requestsData, historyData, playersData] = await Promise.all([
          fetchAllDebtsAdmin(),
          fetchPendingDebtPaymentsAdmin(),
          fetchDebtHistoryAdmin(),
          fetchAdminPlayers(),
        ]);
        if (isMounted) {
          setDebts(debtsData);
          setPendingRequests(requestsData);
          setHistory(historyData);
          setPlayers(playersData);
        }
      } catch (err) {
        console.warn('Initial admin debts error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchInitial();
    return () => {
      isMounted = false;
    };
  }, []);

  // 1. Approve Payment Request
  const handleApprovePayment = async (req: DebtPaymentRequest) => {
    if (!currentAdmin) return;
    setProcessingId(req.id);
    try {
      const res = await approveDebtPaymentRequest(req.id, currentAdmin);
      showToast(
        `Approved payment for ${req.username}! ₱${res.phpEquivalent.toFixed(2)} debt cleared (${res.creditsDeducted} CR deducted). Remaining debt: ₱${res.remainingDebt.toFixed(2)}.`,
        'success'
      );
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Approval failed.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // 2. Reject Payment Request
  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestToReject || !currentAdmin) return;
    setProcessingId(requestToReject.id);
    try {
      await rejectDebtPaymentRequest(requestToReject.id, currentAdmin, rejectReason);
      showToast(`Rejected payment request for ${requestToReject.username}.`, 'info');
      setRequestToReject(null);
      setRejectReason('');
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Rejection failed.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // 3. Add Debt
  const handleConfirmAddDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAdmin) return;
    const targetPlayer = players.find((p) => p.id === selectedPlayerId);
    if (!targetPlayer) {
      showToast('Please select a player.', 'error');
      return;
    }

    setProcessingId('add-debt');
    try {
      await addDebtAdmin({
        adminUser: currentAdmin,
        userId: targetPlayer.id,
        username: targetPlayer.username,
        amount: Number(addAmount),
        note: addNote.trim(),
      });
      showToast(`₱${addAmount.toFixed(2)} debt added to ${targetPlayer.username}.`, 'success');
      setIsAddModalOpen(false);
      setAddNote('');
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Adding debt failed.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // 4. Deduct Debt / Cash Payment
  const handleConfirmDeduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deductTarget || !currentAdmin) return;

    setProcessingId('deduct-debt');
    try {
      await deductDebtAdmin({
        adminUser: currentAdmin,
        userId: deductTarget.userId,
        username: deductTarget.username,
        amount: Number(deductAmount),
        note: deductNote.trim(),
      });
      showToast(`₱${deductAmount.toFixed(2)} cash payment recorded for ${deductTarget.username}.`, 'success');
      setDeductTarget(null);
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Deduction failed.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const totalOutstandingAmount = debts.reduce((acc, d) => acc + (d.amount || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* 1. Header & Quick Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0 }}>SHOP DEBT MANAGEMENT</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Store debt ledger, credit payment request verification, and restriction controls.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button variant="primary" size="sm" onClick={() => setIsAddModalOpen(true)}>
            + Add New Debt
          </Button>
          <Button variant="secondary" size="sm" onClick={loadData}>
            Refresh Ledger
          </Button>
        </div>
      </div>

      {/* 2. Overview Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <Card variant="default">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>ACTIVE DEBTORS</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', margin: '0.25rem 0' }}>
            {loading ? <Skeleton width="30px" height="28px" /> : debts.filter((d) => d.amount > 0).length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Players with unpaid balances</div>
        </Card>

        <Card variant="default">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>TOTAL OUTSTANDING DEBT</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--danger)', fontFamily: 'var(--font-mono)', margin: '0.25rem 0' }}>
            {loading ? <Skeleton width="60px" height="28px" /> : `₱${totalOutstandingAmount.toFixed(2)}`}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Across all store accounts</div>
        </Card>

        <Card variant={pendingRequests.length > 0 ? 'neon' : 'default'}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>PENDING PAYMENTS</span>
            {pendingRequests.length > 0 && <Badge variant="warning" size="sm">Action Req</Badge>}
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--accent-gold)', fontFamily: 'var(--font-mono)', margin: '0.25rem 0' }}>
            {loading ? <Skeleton width="30px" height="28px" /> : pendingRequests.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Credit debt payment claims</div>
        </Card>
      </div>

      {/* 3. Pending Payment Requests Queue */}
      {pendingRequests.length > 0 && (
        <Card
          variant="neon"
          header={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <span>PENDING CREDIT DEBT PAYMENTS</span>
              <Badge variant="warning" size="sm">{pendingRequests.length} PENDING</Badge>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem',
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-sm)',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                      {req.username}
                    </span>
                    <Badge variant="primary" size="sm">
                      Current Debt: ₱{req.currentDebt.toFixed(2)}
                    </Badge>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Using {req.creditsToUse} Credits @ rate ₱{req.rateUsed}/CR $\rightarrow$ ₱{req.phpEquivalent.toFixed(2)} relief
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
                      -₱{req.phpEquivalent.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                      -{req.creditsToUse} CR
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button
                      variant="primary"
                      size="sm"
                      isLoading={processingId === req.id}
                      onClick={() => handleApprovePayment(req)}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={processingId === req.id}
                      onClick={() => setRequestToReject(req)}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 4. Outstanding Debt Ledger */}
      <Card
        variant="default"
        header={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <span>OUTSTANDING DEBT LEDGER</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Existing store debt records</span>
          </div>
        }
      >
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Skeleton height="60px" />
            <Skeleton height="60px" />
          </div>
        ) : debts.length === 0 ? (
          <EmptyState
            icon={<span>💳</span>}
            title="NO OUTSTANDING DEBTS"
            description="All store accounts are currently clear of debts."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {debts.map((debt) => (
              <div
                key={debt.userId}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem',
                  backgroundColor: 'var(--bg-elevated)',
                  border: debt.isRestricted ? '1px solid var(--danger)' : '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-sm)',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: 'var(--radius-sm)',
                      background: debt.amount > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                      color: debt.amount > 0 ? 'var(--danger)' : 'var(--success)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25rem',
                    }}
                  >
                    💳
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                        {debt.username}
                      </span>
                      <Badge
                        variant={debt.tier === 'high' ? 'danger' : debt.tier === 'mid' ? 'warning' : debt.tier === 'low' ? 'gold' : 'neutral'}
                        size="sm"
                      >
                        Tier: {debt.tier.toUpperCase()}
                      </Badge>
                      {debt.isRestricted && (
                        <Badge variant="danger" size="sm">
                          RESTRICTED (CLAIMS LOCKED)
                        </Badge>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      Overdue: {debt.daysOverdue} days • Last updated: {new Date(debt.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: debt.amount > 0 ? 'var(--danger)' : 'var(--success)', fontFamily: 'var(--font-mono)' }}>
                      ₱{debt.amount.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {debt.amount > 0 ? 'Unpaid balance' : 'Cleared'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setDeductTarget(debt);
                        setDeductAmount(Math.min(10, debt.amount));
                      }}
                      disabled={debt.amount <= 0}
                    >
                      - Cash Payment
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 5. Debt Audit History */}
      <Card
        variant="default"
        header={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <span>DEBT AUDIT HISTORY</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Recent additions and repayments</span>
          </div>
        }
      >
        {history.length === 0 ? (
          <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No debt transaction history recorded.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto' }}>
            {history.map((h) => (
              <div
                key={h.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.65rem 0.85rem',
                  backgroundColor: 'rgba(30, 41, 59, 0.4)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-xs)',
                  fontSize: '0.85rem',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {h.username ? `${h.username}: ` : ''}{h.note}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(h.createdAt).toLocaleString()} • Action: {h.action.toUpperCase()}
                  </div>
                </div>
                <div style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', color: h.action === 'add' ? 'var(--danger)' : 'var(--success)' }}>
                  {h.action === 'add' ? `+₱${h.amount.toFixed(2)}` : `-₱${h.amount.toFixed(2)}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Add Debt Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="ADD DEBT TO PLAYER ACCOUNT"
        size="md"
      >
        <form onSubmit={handleConfirmAddDebt} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              SELECT PLAYER *
            </label>
            <select
              required
              value={selectedPlayerId}
              onChange={(e) => setSelectedPlayerId(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="">-- Choose registered player --</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.username} ({p.rank} • {p.credits} CR)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              DEBT AMOUNT (PHP ₱) *
            </label>
            <input
              type="number"
              min="1"
              step="0.5"
              required
              value={addAmount}
              onChange={(e) => setAddAmount(Number(e.target.value))}
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
              NOTE / REASON
            </label>
            <input
              type="text"
              value={addNote}
              onChange={(e) => setAddNote(e.target.value)}
              placeholder="e.g. Overtime session, front desk snacks"
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
            <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" isLoading={processingId === 'add-debt'}>
              Confirm Add Debt
            </Button>
          </div>
        </form>
      </Modal>

      {/* Deduct Debt Modal */}
      <Modal
        isOpen={Boolean(deductTarget)}
        onClose={() => setDeductTarget(null)}
        title={`RECORD CASH PAYMENT • ${deductTarget?.username}`}
        size="sm"
      >
        <form onSubmit={handleConfirmDeduct} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
            Current outstanding debt: <strong>₱{deductTarget?.amount.toFixed(2)}</strong>
          </p>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              CASH AMOUNT PAID (PHP ₱) *
            </label>
            <input
              type="number"
              min="0.5"
              step="0.5"
              max={deductTarget?.amount}
              required
              value={deductAmount}
              onChange={(e) => setDeductAmount(Number(e.target.value))}
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
              PAYMENT NOTE
            </label>
            <input
              type="text"
              value={deductNote}
              onChange={(e) => setDeductNote(e.target.value)}
              placeholder="e.g. Cash payment at counter"
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
            <Button type="button" variant="ghost" onClick={() => setDeductTarget(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={processingId === 'deduct-debt'}>
              Record Cash Payment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reject Payment Request Modal */}
      <Modal
        isOpen={Boolean(requestToReject)}
        onClose={() => setRequestToReject(null)}
        title="REJECT DEBT PAYMENT CLAIM"
        size="sm"
      >
        <form onSubmit={handleConfirmReject} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Reject credit payment of ₱{requestToReject?.phpEquivalent.toFixed(2)} ({requestToReject?.creditsToUse} CR) for{' '}
            <strong>{requestToReject?.username}</strong>.
          </p>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              REJECTION REASON (OPTIONAL)
            </label>
            <input
              type="text"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Ineligible credits balance"
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
            <Button type="button" variant="ghost" onClick={() => setRequestToReject(null)}>
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
