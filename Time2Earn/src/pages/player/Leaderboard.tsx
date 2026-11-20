import React from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useConfig } from '../../hooks/useConfig';

export const Leaderboard: React.FC = () => {
  const { config } = useConfig();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900 }}>LEADERBOARDS</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Top grinders ranked by lifetime EXP. Resets every {config.leaderboardResetDays} days.
          </p>
        </div>
        <Badge variant="warning" size="sm">CYCLE: 2 DAYS</Badge>
      </div>

      <Card variant="gold" header={<span>TOP SHOP CHAMPIONS</span>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[
            { rank: 1, name: 'sherwin', exp: 641, badge: 'Grinder' },
            { rank: 2, name: 'lois_123xx', exp: 1251, badge: 'Gamer' },
            { rank: 3, name: 'Daniel123', exp: 863, badge: 'Grinder' },
          ].map((u) => (
            <div
              key={u.rank}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-sm)',
                border: u.rank === 1 ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontWeight: 900, color: u.rank === 1 ? 'var(--accent-gold)' : 'var(--text-muted)' }}>
                  #{u.rank}
                </span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{u.name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Badge variant={u.rank === 1 ? 'gold' : 'neutral'} size="sm">{u.badge}</Badge>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--primary)' }}>
                  {u.exp} EXP
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
