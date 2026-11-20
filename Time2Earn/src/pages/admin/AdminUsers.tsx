import React from 'react';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../hooks/useToast';

export const AdminUsers: React.FC = () => {
  const { showToast } = useToast();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 900 }}>PLAYER ACCOUNTS & ROLES</h1>
      <Card variant="default">
        <EmptyState
          icon={<span>👥</span>}
          title="USER MANAGEMENT SKELETON"
          description="Staff-assisted password resets, manual adjustments, and restrictions connect in Phase 13."
          actionText="Simulate User List"
          onAction={() => showToast('User management connects in Phase 13.', 'info')}
        />
      </Card>
    </div>
  );
};
