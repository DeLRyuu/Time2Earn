import React from 'react';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../hooks/useToast';

export const AdminRedemptions: React.FC = () => {
  const { showToast } = useToast();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 900 }}>REWARD REDEMPTIONS</h1>
      <Card variant="default">
        <EmptyState
          icon={<span>🎁</span>}
          title="REDEMPTION QUEUE SKELETON"
          description="Reward claim approvals and cooldown lock management connect in Phase 10."
          actionText="Simulate Queue"
          onAction={() => showToast('Redemption approvals will connect in Phase 10.', 'info')}
        />
      </Card>
    </div>
  );
};
