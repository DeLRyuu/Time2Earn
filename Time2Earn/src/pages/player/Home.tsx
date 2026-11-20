import React from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Badge } from '../../components/ui/Badge';
import { useConfig } from '../../hooks/useConfig';
import { useToast } from '../../hooks/useToast';

export const Home: React.FC = () => {
  const { config, loading } = useConfig();
  const { showToast } = useToast();

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Hero Welcome Banner */}
      <Card
        variant="neon"
        header={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span>PLAYER CONSOLE</span>
            <Badge variant="gold" size="sm">Rank: Gamer</Badge>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)' }}>
            Welcome to <span style={{ color: 'var(--primary)', textShadow: '0 0 10px var(--primary-glow)' }}>Time2Earn</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Play. Earn. Rank Up. Redeem. Check in daily to build streaks, claim sessions, and unlock shop loot.
          </p>
          <div style={{ marginTop: '0.5rem' }}>
            <ProgressBar
              value={1251}
              max={2000}
              label="EXP Progress"
              subLabel="1,251 / 2,000 to Elite"
              variant="primary"
              showPercentage
            />
          </div>
        </div>
      </Card>

      {/* Live System Config Metrics */}
      <Card
        variant="default"
        header={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span>SHOP LIVE CONFIG</span>
            <Badge variant={loading ? 'warning' : 'success'} size="sm">
              {loading ? 'SYNCING...' : 'LIVE FIRESTORE'}
            </Badge>
          </div>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
          <div style={{ background: 'var(--bg-elevated)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Session Rate</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
              ₱{config.sessionRatePerHour}/hr
            </div>
          </div>
          <div style={{ background: 'var(--bg-elevated)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>PHP $\rightarrow$ Credit</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-gold)', fontFamily: 'var(--font-mono)' }}>
              {config.phpToCreditRate}x
            </div>
          </div>
          <div style={{ background: 'var(--bg-elevated)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>EXP Earn Rate</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--secondary)', fontFamily: 'var(--font-mono)' }}>
              {config.expPerMinute} EXP/min
            </div>
          </div>
          <div style={{ background: 'var(--bg-elevated)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Debt Payment</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
              ₱0.40/CR
            </div>
          </div>
        </div>
      </Card>

      {/* Quick Action Hub */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <Button
          variant="primary"
          onClick={() => showToast('Session request feature will be connected in Phase 5.', 'info')}
        >
          Claim Gaming Session
        </Button>
        <Button
          variant="accent"
          onClick={() => showToast('Daily streak claimed! +1 streak day.', 'success')}
        >
          Daily Check-in
        </Button>
      </div>
    </div>
  );
};
