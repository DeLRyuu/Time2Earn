import React from 'react';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../hooks/useToast';

export const Arcade: React.FC = () => {
  const { showToast } = useToast();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 900 }}>ARCADE ZONE</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Play mini-games, use streak recovery charges, and earn bonus loot.
        </p>
      </div>

      <Card variant="interactive">
        <EmptyState
          icon={<span>🕹️</span>}
          title="ARCADE MINI-GAMES INCOMING"
          description="Mini-games, daily arcade challenges, and streak shields are preparing for launch."
          actionText="Ping Arcade Machine"
          onAction={() => showToast('Arcade engine connected and ready.', 'success')}
        />
      </Card>
    </div>
  );
};
