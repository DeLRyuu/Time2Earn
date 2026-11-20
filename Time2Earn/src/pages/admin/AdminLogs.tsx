import React from 'react';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../hooks/useToast';

export const AdminLogs: React.FC = () => {
  const { showToast } = useToast();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 900 }}>SYSTEM & AUDIT LOGS</h1>
      <Card variant="default">
        <EmptyState
          icon={<span>📜</span>}
          title="AUDIT LOGS PLACEHOLDER"
          description="System event logging, audit trails, and administrative action records connect in Phase 10."
          actionText="Simulate Logs"
          onAction={() => showToast('Audit logs viewer connects in Phase 10.', 'info')}
        />
      </Card>
    </div>
  );
};
