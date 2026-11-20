import React from 'react';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../hooks/useToast';

export const AdminSessions: React.FC = () => {
  const { showToast } = useToast();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 900 }}>SESSION APPROVALS</h1>
      <Card variant="default">
        <EmptyState
          icon={<span>🎮</span>}
          title="SESSION QUEUE SKELETON"
          description="Live session request approvals with atomic credit/EXP additions connect in Phase 9."
          actionText="Simulate Queue"
          onAction={() => showToast('Session approvals will connect in Phase 9.', 'info')}
        />
      </Card>
    </div>
  );
};
