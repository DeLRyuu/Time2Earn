import React from 'react';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../hooks/useToast';

export const AdminRewards: React.FC = () => {
  const { showToast } = useToast();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 900 }}>REWARDS CATALOG MANAGEMENT</h1>
      <Card variant="default">
        <EmptyState
          icon={<span>🏷️</span>}
          title="REWARDS INVENTORY SKELETON"
          description="Manage rewards, edit cooldowns, and toggle isActive status in Phase 12."
          actionText="Simulate Inventory"
          onAction={() => showToast('Reward controls connect in Phase 12.', 'info')}
        />
      </Card>
    </div>
  );
};
