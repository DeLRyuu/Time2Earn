import React from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useConfig } from '../../hooks/useConfig';
import { useToast } from '../../hooks/useToast';

export const AdminSettings: React.FC = () => {
  const { config, loading, error, refreshConfig } = useConfig();
  const { showToast } = useToast();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900 }}>SYSTEM SETTINGS (FIRESTORE)</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Live parameters read directly from Firestore <code>config/settings</code> document.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => { refreshConfig(); showToast('Refreshed Firestore configuration', 'success'); }}>
          Sync from Firestore
        </Button>
      </div>

      {error && (
        <Card variant="default" style={{ borderColor: 'var(--danger)' }}>
          <p style={{ color: 'var(--danger)' }}>Error loading config: {error.message}</p>
        </Card>
      )}

      <Card
        variant="neon"
        header={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <span>RATES & COEFFICIENTS</span>
            <Badge variant={loading ? 'warning' : 'primary'} size="sm">
              {loading ? 'READING...' : 'ACTIVE CONFIG'}
            </Badge>
          </div>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>PHP TO CREDIT RATE</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{config.phpToCreditRate}x</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>CREDIT TO PHP RATE</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>₱{config.creditToPhpRate}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>SHOP SESSION RATE</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>₱{config.sessionRatePerHour}/hr</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>EXP PER MINUTE</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{config.expPerMinute} EXP/min</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>LEADERBOARD RESET</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>Every {config.leaderboardResetDays} days</div>
          </div>
        </div>
      </Card>

      <Card variant="default" header={<span>DEBT TIERS</span>}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
          <div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>LOW TIER:</span>
            <div style={{ fontWeight: 800, fontFamily: 'var(--font-mono)' }}>₱{config.debtTiers.low}</div>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>MID TIER:</span>
            <div style={{ fontWeight: 800, fontFamily: 'var(--font-mono)' }}>₱{config.debtTiers.mid}</div>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>HIGH TIER:</span>
            <div style={{ fontWeight: 800, fontFamily: 'var(--font-mono)' }}>₱{config.debtTiers.high}</div>
          </div>
        </div>
      </Card>

      <Card variant="default" header={<span>12 RANK THRESHOLDS (EXP)</span>}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.75rem' }}>
          {Object.entries(config.rankThresholds)
            .sort(([, a], [, b]) => a - b)
            .map(([rankName, expVal]) => (
              <div
                key={rankName}
                style={{
                  padding: '0.5rem 0.75rem',
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--primary)' }}>{rankName}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {expVal.toLocaleString()} EXP
                </div>
              </div>
            ))}
        </div>
      </Card>
    </div>
  );
};
