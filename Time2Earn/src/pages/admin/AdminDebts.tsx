import React from 'react';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../hooks/useToast';

export const AdminDebts: React.FC = () => {
  const { showToast } = useToast();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 900 }}>DEBT MANAGEMENT</h1>
      <Card variant="default">
        <EmptyState
          icon={<span>💳</span>}
          title="DEBT CONTROLS SKELETON"
          description="Debt tier management, restriction toggles, and credit payment approvals connect in Phase 11."
          actionText="Simulate Controls"
          onAction={() => showToast('Debt administration connects in Phase 11.', 'info')}
        />
      </Card>
    </div>
  );
};
