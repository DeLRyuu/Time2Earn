import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../hooks/useAuth';
import { assertRateLimit, RATE_LIMITS } from '../../lib/rateLimit';
import { useToast } from '../../hooks/useToast';
import { doc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { db, hasValidFirebaseConfig } from '../../lib/firebase';
import {
  fetchAdminPlayers,
  fetchPlayerDetails,
  adjustPlayerCredits,
} from '../../services/adminService';
import type { PlayerOverviewRecord, PlayerDetailsRecord } from '../../services/adminService';

export const AdminUsers: React.FC = () => {
  const { user: currentAdmin } = useAuth();
  const { showToast } = useToast();

  const [players, setPlayers] = useState<PlayerOverviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Player Profile Modal State
  const [selectedPlayerDetails, setSelectedPlayerDetails] = useState<PlayerDetailsRecord | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Credit Adjustment Modal State
  const [adjustTargetPlayer, setAdjustTargetPlayer] = useState<PlayerOverviewRecord | null>(null);
  const [adjustType, setAdjustType] = useState<'add' | 'deduct'>('add');
  const [adjustAmount, setAdjustAmount] = useState<number>(50);
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Staff Password Reset Modal State (Preserved from Phase 3)
  const [userForReset, setUserForReset] = useState<PlayerOverviewRecord | null>(null);
  const [tempPasswordGenerated, setTempPasswordGenerated] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const loadPlayers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAdminPlayers();
      setPlayers(data);
    } catch (err) {
      console.warn('Error fetching admin players:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchInitial = async () => {
      try {
        const data = await fetchAdminPlayers();
        if (isMounted) setPlayers(data);
      } catch (err) {
        console.warn('Initial admin players error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchInitial();
    return () => {
      isMounted = false;
    };
  }, []);

  // Open Full Player Profile
  const handleOpenProfile = async (player: PlayerOverviewRecord) => {
    setIsLoadingDetails(true);
    setSelectedPlayerDetails(null);
    try {
      const details = await fetchPlayerDetails(player.id);
      setSelectedPlayerDetails(details);
    } catch {
      showToast('Could not load full player details.', 'error');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Open Credit Adjustment
  const handleOpenAdjustCredits = (player: PlayerOverviewRecord) => {
    setAdjustTargetPlayer(player);
    setAdjustType('add');
    setAdjustAmount(50);
    setAdjustReason('');
  };

  // Execute Credit Adjustment
  const handleConfirmAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTargetPlayer || !currentAdmin) return;

    if (!adjustReason.trim()) {
      showToast('A reason is strictly required for administrative balance adjustments.', 'error');
      return;
    }
    if (adjustAmount <= 0) {
      showToast('Adjustment amount must be greater than 0.', 'error');
      return;
    }

    setIsAdjusting(true);
    try {
      const result = await adjustPlayerCredits({
        adminUser: currentAdmin,
        targetUserId: adjustTargetPlayer.id,
        targetUsername: adjustTargetPlayer.username,
        amount: Number(adjustAmount),
        type: adjustType,
        reason: adjustReason.trim(),
      });

      showToast(
        `Successfully ${adjustType === 'add' ? 'added' : 'deducted'} ${adjustAmount} CR for ${adjustTargetPlayer.username}. New balance: ${result.newCredits} CR`,
        'success'
      );

      setAdjustTargetPlayer(null);
      await loadPlayers();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Credit adjustment failed.', 'error');
    } finally {
      setIsAdjusting(false);
    }
  };

  // Execute Staff Password Reset (Phase 3)
  const handleOpenReset = (player: PlayerOverviewRecord) => {
    setUserForReset(player);
    setTempPasswordGenerated(null);
  };

  const handleExecuteReset = async () => {
    if (!userForReset || !currentAdmin) return;

    try {
      assertRateLimit(currentAdmin.uid, RATE_LIMITS.STAFF_RESET, 'staff password reset');
    } catch (rateErr) {
      showToast(rateErr instanceof Error ? rateErr.message : 'Rate limit exceeded.', 'error');
      return;
    }

    setIsResetting(true);
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const tempPassword = `T2E-Temp#${randomSuffix}`;

    try {
      if (hasValidFirebaseConfig) {
        await updateDoc(doc(db, 'users', userForReset.id), {
          password: tempPassword,
          mustChangePassword: true,
        });

        await addDoc(collection(db, 'logs'), {
          action: 'staff_password_reset',
          adminId: currentAdmin.uid,
          userId: userForReset.id,
          amount: 0.0,
          details: `Staff-assisted password reset initiated for ${userForReset.username}`,
          createdAt: new Date().toISOString(),
        });
      }

      setTempPasswordGenerated(tempPassword);
      showToast(`Temporary password generated for ${userForReset.username}`, 'success');
    } catch (err) {
      console.error('Staff reset failed:', err);
      showToast('Failed to complete reset in Firestore.', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const filteredPlayers = players.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      p.username.toLowerCase().includes(q) ||
      p.rank.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* 1. Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0 }}>PLAYERS & BALANCE CONTROL</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Search registered players, view verified profiles, execute credit adjustments, and manage credentials.
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={loadPlayers}>
          Refresh Players
        </Button>
      </div>

      {/* 2. Search Input */}
      <div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search player by username or rank..."
          style={{
            width: '100%',
            maxWidth: '450px',
            padding: '0.65rem 1rem',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
          }}
        />
      </div>

      {/* 3. Players Table / List */}
      <Card variant="default">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Skeleton height="65px" />
            <Skeleton height="65px" />
            <Skeleton height="65px" />
          </div>
        ) : filteredPlayers.length === 0 ? (
          <EmptyState
            icon={<span>👥</span>}
            title="NO PLAYERS FOUND"
            description="No player accounts matching your search query."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {filteredPlayers.map((player) => (
              <div
                key={player.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem',
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-sm)',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                {/* Left: Player Identity & Ranks */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: 'var(--radius-full)',
                      background: 'rgba(0, 229, 255, 0.1)',
                      border: '1px solid rgba(0, 229, 255, 0.3)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: '1rem',
                    }}
                  >
                    {player.username.charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                        {player.username}
                      </span>
                      <Badge variant="gold" size="sm">
                        {player.rank}
                      </Badge>
                      {player.debtAmount > 0 && (
                        <Badge variant="danger" size="sm">
                          ₱{player.debtAmount.toFixed(2)} Debt
                        </Badge>
                      )}
                      {player.isRestricted && (
                        <Badge variant="warning" size="sm">
                          Restricted
                        </Badge>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      EXP: {player.exp.toLocaleString()} • Streak: {player.streak}d • Sessions: {player.totalSessions}
                    </div>
                  </div>
                </div>

                {/* Right: Balance & Operations */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                      {player.credits.toLocaleString()} CR
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Spendable Credits
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Button variant="ghost" size="sm" onClick={() => handleOpenProfile(player)}>
                      Profile
                    </Button>
                    <Button variant="primary" size="sm" onClick={() => handleOpenAdjustCredits(player)}>
                      ± Credits
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => handleOpenReset(player)}>
                      Reset Pass
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 4. Manual Credit Adjustment Modal */}
      <Modal
        isOpen={Boolean(adjustTargetPlayer)}
        onClose={() => setAdjustTargetPlayer(null)}
        title={`MANUAL CREDIT ADJUSTMENT • ${adjustTargetPlayer?.username}`}
        size="md"
      >
        <form onSubmit={handleConfirmAdjust} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Current Player Balance:</span>
              <strong style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                {adjustTargetPlayer?.credits.toLocaleString()} CR
              </strong>
            </div>
          </div>

          {/* Operation Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
              ADJUSTMENT TYPE
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setAdjustType('add')}
                style={{
                  padding: '0.65rem',
                  borderRadius: 'var(--radius-xs)',
                  border: adjustType === 'add' ? '2px solid var(--primary)' : '1px solid var(--border-medium)',
                  background: adjustType === 'add' ? 'rgba(0, 229, 255, 0.15)' : 'var(--bg-elevated)',
                  color: adjustType === 'add' ? 'var(--primary)' : 'var(--text-secondary)',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                + Add Credits (Award)
              </button>
              <button
                type="button"
                onClick={() => setAdjustType('deduct')}
                style={{
                  padding: '0.65rem',
                  borderRadius: 'var(--radius-xs)',
                  border: adjustType === 'deduct' ? '2px solid var(--danger)' : '1px solid var(--border-medium)',
                  background: adjustType === 'deduct' ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-elevated)',
                  color: adjustType === 'deduct' ? 'var(--danger)' : 'var(--text-secondary)',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                - Deduct Credits (Charge)
              </button>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              AMOUNT (CREDITS) *
            </label>
            <input
              type="number"
              min="1"
              required
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(Math.max(1, Number(e.target.value)))}
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

          {/* Required Reason */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              REASON (REQUIRED FOR AUDIT LOG) *
            </label>
            <input
              type="text"
              required
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              placeholder="e.g. Tournament 1st place prize, Cash top-up at counter, Billing correction"
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
              }}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
              Logged to credit_transactions and system audit logs with your admin username ({currentAdmin?.username}).
            </span>
          </div>

          {/* Resulting Balance Calculation Preview */}
          <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.4)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-xs)', fontSize: '0.85rem' }}>
            Resulting Balance Preview:{' '}
            <strong style={{ color: adjustType === 'add' ? 'var(--primary)' : 'var(--accent-gold)', fontFamily: 'var(--font-mono)' }}>
              {adjustTargetPlayer && (
                adjustType === 'add'
                  ? `${adjustTargetPlayer.credits} + ${adjustAmount} = ${adjustTargetPlayer.credits + adjustAmount} CR`
                  : `${adjustTargetPlayer.credits} - ${adjustAmount} = ${Math.max(0, adjustTargetPlayer.credits - adjustAmount)} CR`
              )}
            </strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <Button type="button" variant="ghost" onClick={() => setAdjustTargetPlayer(null)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant={adjustType === 'add' ? 'primary' : 'danger'}
              isLoading={isAdjusting}
            >
              Confirm {adjustType === 'add' ? 'Credit Addition' : 'Credit Deduction'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 5. Player Detailed Profile View Modal */}
      <Modal
        isOpen={Boolean(selectedPlayerDetails) || isLoadingDetails}
        onClose={() => setSelectedPlayerDetails(null)}
        title={`PLAYER PROFILE • ${selectedPlayerDetails?.username || 'Loading...'}`}
        size="lg"
      >
        {isLoadingDetails || !selectedPlayerDetails ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Skeleton height="50px" />
            <Skeleton height="100px" />
            <Skeleton height="50px" />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Quick Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
              <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>CREDITS</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                  {selectedPlayerDetails.credits.toLocaleString()} CR
                </div>
              </div>
              <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>RANK</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {selectedPlayerDetails.rank}
                </div>
              </div>
              <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>EXP</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--accent-gold)', fontFamily: 'var(--font-mono)' }}>
                  {selectedPlayerDetails.exp.toLocaleString()}
                </div>
              </div>
              <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>STREAK</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}>
                  {selectedPlayerDetails.streak} Days
                </div>
              </div>
              <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>SHOP DEBT</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: selectedPlayerDetails.debtAmount > 0 ? 'var(--danger)' : 'var(--success)' }}>
                  ₱{selectedPlayerDetails.debtAmount.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Recent Sessions */}
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                RECENT PLAY SESSIONS ({selectedPlayerDetails.recentSessions.length})
              </div>
              {selectedPlayerDetails.recentSessions.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0.5rem 0' }}>No recent sessions.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '140px', overflowY: 'auto' }}>
                  {selectedPlayerDetails.recentSessions.slice(0, 5).map((s) => (
                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.4rem 0.6rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-xs)' }}>
                      <span>🖥️ {s.unitId} • ₱{s.amountPaid.toFixed(2)}</span>
                      <span style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>+{s.creditsEarned} CR ({s.status})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Redemptions */}
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                RECENT REDEMPTIONS ({selectedPlayerDetails.recentRedemptions.length})
              </div>
              {selectedPlayerDetails.recentRedemptions.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0.5rem 0' }}>No recent redemptions.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '140px', overflowY: 'auto' }}>
                  {selectedPlayerDetails.recentRedemptions.slice(0, 5).map((r) => (
                    <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.4rem 0.6rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-xs)' }}>
                      <span>🎁 {r.rewardName}</span>
                      <span style={{ color: 'var(--accent-gold)', fontFamily: 'var(--font-mono)' }}>-{r.creditCost} CR ({r.status})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const target = players.find((p) => p.id === selectedPlayerDetails.id);
                  if (target) handleOpenAdjustCredits(target);
                }}
              >
                Adjust Credits
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedPlayerDetails(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 6. Staff Password Reset Modal (Phase 3) */}
      <Modal
        isOpen={Boolean(userForReset)}
        onClose={() => { setUserForReset(null); setTempPasswordGenerated(null); }}
        title="STAFF-ASSISTED PASSWORD RESET"
        size="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {tempPasswordGenerated ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>
                Temporary password generated for <strong>{userForReset?.username}</strong>:
              </p>
              <div
                style={{
                  padding: '0.85rem',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-neon)',
                  borderRadius: 'var(--radius-sm)',
                  textAlign: 'center',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '1.25rem',
                  color: 'var(--primary)',
                  letterSpacing: '0.05em',
                }}
              >
                {tempPasswordGenerated}
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                Instruct the player to log in with this temporary password. They will be immediately prompted to set their own permanent password.
              </p>
              <Button
                variant="primary"
                onClick={() => { setUserForReset(null); setTempPasswordGenerated(null); }}
              >
                Done
              </Button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                Initiate a staff-assisted password reset for <strong>{userForReset?.username}</strong>.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <Button variant="ghost" onClick={() => setUserForReset(null)}>
                  Cancel
                </Button>
                <Button variant="danger" isLoading={isResetting} onClick={handleExecuteReset}>
                  Generate Temporary Password
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
