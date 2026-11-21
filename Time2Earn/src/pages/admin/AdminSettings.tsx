import React, { useState, useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useConfig } from '../../hooks/useConfig';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { type AppConfig, type DebtTiers } from '../../types/config';
import {
  ORDERED_RANKS,
  validateConfigSettings,
  computeConfigDiff,
} from '../../lib/settingsValidation';
import { updateAdminConfig } from '../../services/configService';

export const AdminSettings: React.FC = () => {
  const { config, loading, refreshConfig, updateConfig } = useConfig();
  const { user } = useAuth();
  const { showToast } = useToast();

  // Local draft state for editing
  const [draftConfig, setDraftConfig] = useState<AppConfig>(config);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Check if non-admin
  const isAdmin = user?.role === 'admin';

  // Live validation
  const validation = useMemo(() => validateConfigSettings(draftConfig), [draftConfig]);

  // Compute diff against live config
  const diffs = useMemo(() => computeConfigDiff(config, draftConfig), [config, draftConfig]);
  const hasChanges = diffs.length > 0;

  // Handlers for scalar fields
  const handleNumberChange = (field: keyof Omit<AppConfig, 'debtTiers' | 'rankThresholds' | 'updatedAt'>, value: string) => {
    const num = parseFloat(value);
    setDraftConfig((prev) => ({
      ...prev,
      [field]: isNaN(num) ? 0 : num,
    }));
  };

  // Handlers for debt tiers
  const handleDebtTierChange = (tier: keyof DebtTiers, value: string) => {
    const num = parseFloat(value);
    setDraftConfig((prev) => ({
      ...prev,
      debtTiers: {
        ...prev.debtTiers,
        [tier]: isNaN(num) ? 0 : num,
      },
    }));
  };

  // Handlers for rank thresholds
  const handleRankThresholdChange = (rank: string, value: string) => {
    const num = parseInt(value, 10);
    setDraftConfig((prev) => ({
      ...prev,
      rankThresholds: {
        ...prev.rankThresholds,
        [rank]: isNaN(num) ? 0 : num,
      },
    }));
  };

  // Reset draft to current active config
  const handleReset = () => {
    setDraftConfig(config);
    showToast('Reverted edits to current active settings', 'info');
  };

  // Execute Save
  const handleConfirmSave = async () => {
    if (!isAdmin) {
      showToast('Unauthorized: Administrator privileges required', 'error');
      return;
    }

    if (!validation.isValid) {
      showToast('Please resolve all validation errors before saving', 'error');
      return;
    }

    setSaving(true);
    try {
      const result = await updateAdminConfig(user, draftConfig, config);
      updateConfig(result.config);
      setDraftConfig(result.config);
      setIsDiffModalOpen(false);
      showToast(`Settings updated successfully: ${result.diffs.length} parameter(s) modified`, 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update system configuration';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div style={{ maxWidth: '800px', margin: '2rem auto' }}>
        <Card variant="default">
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🛡️</span>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.5rem' }}>ADMIN ACCESS REQUIRED</h2>
            <p style={{ color: 'var(--text-muted)' }}>
              Only authenticated administrators are authorized to inspect or modify system configuration.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '1200px' }}>
      {/* 1. Header & Actions Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0, letterSpacing: '0.02em' }}>
              SYSTEM SETTINGS & ECONOMY
            </h1>
            {hasChanges ? (
              <Badge variant="warning" size="sm">
                ● {diffs.length} UNSAVED CHANGES
              </Badge>
            ) : (
              <Badge variant="success" size="sm">
                IN SYNC
              </Badge>
            )}
          </div>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Live parameters stored in Firestore <code>config/settings</code>. Updates apply dynamically across the app without modifying stored user documents.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={!hasChanges || saving}
          >
            Revert Edits
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              await refreshConfig();
              setDraftConfig(config);
              showToast('Refreshed latest configuration from Firestore', 'info');
            }}
            disabled={saving || loading}
          >
            🔄 Sync Firestore
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsDiffModalOpen(true)}
            disabled={!hasChanges || !validation.isValid || saving}
          >
            Review & Save ({diffs.length})
          </Button>
        </div>
      </div>

      {/* 2. Validation Errors Alert Box (if any) */}
      {!validation.isValid && (
        <div
          style={{
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--danger)',
            color: 'var(--danger)',
          }}
        >
          <div style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>⚠️</span> CONFIGURATION VALIDATION ERRORS ({validation.errors.length})
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.825rem', lineHeight: 1.5 }}>
            {validation.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 3. Economy & Conversion Rates Card */}
      <Card
        variant="neon"
        header={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <span style={{ fontWeight: 800 }}>1. SHOP ECONOMY & CONVERSION COEFFICIENTS</span>
            <Badge variant="primary" size="sm">
              Live Rates
            </Badge>
          </div>
        }
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {/* PHP to Credit Rate */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              PHP TO CREDIT RATE (SESSIONS)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={draftConfig.phpToCreditRate}
              onChange={(e) => handleNumberChange('phpToCreditRate', e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--surface-sunken)',
                color: 'var(--text-main)',
                fontFamily: 'var(--font-mono)',
                fontSize: '1rem',
                fontWeight: 700,
              }}
            />
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.725rem', color: 'var(--text-muted)' }}>
              Multiplier for session claims: ₱10 paid = {(10 * draftConfig.phpToCreditRate).toFixed(2)} Credits.
            </p>
          </div>

          {/* Credit to PHP Rate */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              CREDIT TO PHP RATE (GLOBAL VALUATION)
            </label>
            <input
              type="number"
              step="0.001"
              min="0.001"
              value={draftConfig.creditToPhpRate}
              onChange={(e) => handleNumberChange('creditToPhpRate', e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--surface-sunken)',
                color: 'var(--text-main)',
                fontFamily: 'var(--font-mono)',
                fontSize: '1rem',
                fontWeight: 700,
              }}
            />
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.725rem', color: 'var(--text-muted)' }}>
              Global credit price: 100 Credits = ₱{(100 * draftConfig.creditToPhpRate).toFixed(2)}.
            </p>
          </div>

          {/* Session Rate Per Hour */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              SHOP PC HOURLY RATE (PHP)
            </label>
            <input
              type="number"
              step="1"
              min="1"
              value={draftConfig.sessionRatePerHour}
              onChange={(e) => handleNumberChange('sessionRatePerHour', e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--surface-sunken)',
                color: 'var(--text-main)',
                fontFamily: 'var(--font-mono)',
                fontSize: '1rem',
                fontWeight: 700,
              }}
            />
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.725rem', color: 'var(--text-muted)' }}>
              Counter PC gaming rental price: ₱{draftConfig.sessionRatePerHour} / hour.
            </p>
          </div>

          {/* EXP Per Minute */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              BASE EXP PER MINUTE
            </label>
            <input
              type="number"
              step="1"
              min="1"
              value={draftConfig.expPerMinute}
              onChange={(e) => handleNumberChange('expPerMinute', e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--surface-sunken)',
                color: 'var(--text-main)',
                fontFamily: 'var(--font-mono)',
                fontSize: '1rem',
                fontWeight: 700,
              }}
            />
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.725rem', color: 'var(--text-muted)' }}>
              Rate EXP is accumulated during gaming sessions.
            </p>
          </div>

          {/* Leaderboard Reset Days */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              LEADERBOARD RESET INTERVAL (DAYS)
            </label>
            <input
              type="number"
              step="1"
              min="1"
              value={draftConfig.leaderboardResetDays}
              onChange={(e) => handleNumberChange('leaderboardResetDays', e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--surface-sunken)',
                color: 'var(--text-main)',
                fontFamily: 'var(--font-mono)',
                fontSize: '1rem',
                fontWeight: 700,
              }}
            />
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.725rem', color: 'var(--text-muted)' }}>
              Leaderboard tournament cycle resets every {draftConfig.leaderboardResetDays} day(s).
            </p>
          </div>
        </div>
      </Card>

      {/* 4. Shop Debt Tiers Card */}
      <Card
        variant="default"
        header={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <span style={{ fontWeight: 800 }}>2. SHOP DEBT TIERS (PHP THRESHOLDS)</span>
            <Badge variant="warning" size="sm">
              Strictly Ascending (Low &lt; Mid &lt; High)
            </Badge>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Visual Step Indicator */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '0.75rem',
              padding: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--surface-sunken)',
              border: '1px solid var(--border)',
              fontSize: '0.8rem',
            }}
          >
            <div>
              <span style={{ color: 'var(--success)', fontWeight: 800 }}>● Tier: NONE</span>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>&lt; ₱{draftConfig.debtTiers.low} (Clean)</div>
            </div>
            <div>
              <span style={{ color: 'var(--primary)', fontWeight: 800 }}>● Tier: LOW</span>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>₱{draftConfig.debtTiers.low} - ₱{draftConfig.debtTiers.mid - 1}</div>
            </div>
            <div>
              <span style={{ color: 'var(--accent-gold)', fontWeight: 800 }}>● Tier: MID</span>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>₱{draftConfig.debtTiers.mid} - ₱{draftConfig.debtTiers.high - 1}</div>
            </div>
            <div>
              <span style={{ color: 'var(--danger)', fontWeight: 800 }}>● Tier: HIGH (RESTRICTED)</span>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>&ge; ₱{draftConfig.debtTiers.high} (Locks claims)</div>
            </div>
          </div>

          {/* Tier Inputs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                LOW TIER THRESHOLD (₱)
              </label>
              <input
                type="number"
                step="1"
                min="1"
                value={draftConfig.debtTiers.low}
                onChange={(e) => handleDebtTierChange('low', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface-sunken)',
                  color: 'var(--text-main)',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                MID TIER THRESHOLD (₱)
              </label>
              <input
                type="number"
                step="1"
                min="1"
                value={draftConfig.debtTiers.mid}
                onChange={(e) => handleDebtTierChange('mid', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface-sunken)',
                  color: 'var(--text-main)',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                HIGH TIER THRESHOLD (₱ - LOCKS ACCOUNT)
              </label>
              <input
                type="number"
                step="1"
                min="1"
                value={draftConfig.debtTiers.high}
                onChange={(e) => handleDebtTierChange('high', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface-sunken)',
                  color: 'var(--danger)',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 800,
                }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* 5. 12 Rank Thresholds Card */}
      <Card
        variant="default"
        header={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <span style={{ fontWeight: 800 }}>3. 12 RANK THRESHOLDS (EXP PROGRESSION)</span>
            <Badge variant="gold" size="sm">
              Newbie = 0; Strictly Ascending
            </Badge>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-muted)' }}>
            EXP requirements for player rank promotions. Changing thresholds alters dynamic rank calculation, rank ladders, and shop rank locks across the app in real time.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
              gap: '0.75rem',
            }}
          >
            {ORDERED_RANKS.map((rankName, index) => {
              const currentVal = draftConfig.rankThresholds[rankName] ?? 0;
              const prevRankName = index > 0 ? ORDERED_RANKS[index - 1] : null;
              const prevVal = prevRankName ? (draftConfig.rankThresholds[prevRankName] ?? 0) : 0;
              const isAscendingViolation = index > 0 && currentVal <= prevVal;
              const isNewbie = rankName === 'Newbie';

              return (
                <div
                  key={rankName}
                  style={{
                    padding: '0.75rem',
                    background: 'var(--surface-sunken)',
                    borderRadius: 'var(--radius-sm)',
                    border: `1px solid ${isAscendingViolation ? 'var(--danger)' : 'var(--border)'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--primary)' }}>
                      {rankName}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>#{index + 1}</span>
                  </div>

                  <input
                    type="number"
                    step="1"
                    min="0"
                    disabled={isNewbie}
                    value={currentVal}
                    onChange={(e) => handleRankThresholdChange(rankName, e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.4rem 0.5rem',
                      borderRadius: 'var(--radius-xs)',
                      border: '1px solid var(--border)',
                      background: isNewbie ? 'rgba(255, 255, 255, 0.04)' : '#0d131f',
                      color: isNewbie ? 'var(--text-muted)' : 'var(--text-main)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                    }}
                  />

                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {isNewbie ? (
                      <span>Starting Base Rank (0)</span>
                    ) : isAscendingViolation ? (
                      <span style={{ color: 'var(--danger)', fontWeight: 700 }}>Must be &gt; {prevVal.toLocaleString()}</span>
                    ) : (
                      <span>+{(currentVal - prevVal).toLocaleString()} from {prevRankName}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* 6. Diff & Confirmation Modal */}
      <Modal
        isOpen={isDiffModalOpen}
        onClose={() => setIsDiffModalOpen(false)}
        title="Confirm System Settings Update"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
              You are about to save <strong>{diffs.length}</strong> configuration change(s) to Firestore.
            </p>
            <div
              style={{
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                fontSize: '0.775rem',
                color: 'var(--text-main)',
              }}
            >
              🔒 <strong>Safe Execution:</strong> Changing thresholds alters UI progress and calculations dynamically. Existing user document balances, EXP, and ranks are strictly preserved and NOT rewritten.
            </div>
          </div>

          {/* Itemized Diff Table */}
          <div
            style={{
              maxHeight: '260px',
              overflowY: 'auto',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              background: 'var(--surface-sunken)',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255, 255, 255, 0.03)' }}>
                  <th style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)' }}>SETTING</th>
                  <th style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)' }}>CURRENT</th>
                  <th style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)' }}>NEW</th>
                </tr>
              </thead>
              <tbody>
                {diffs.map((d) => (
                  <tr key={d.field} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>{d.label}</td>
                    <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {d.oldValue}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', color: 'var(--success)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                      {d.newValue}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDiffModalOpen(false)}
              disabled={saving}
            >
              Back to Editing
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmSave}
              disabled={saving}
            >
              {saving ? 'Writing to Firestore...' : 'Confirm & Save Settings'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
