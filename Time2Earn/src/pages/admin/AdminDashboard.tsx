import React from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Link } from 'react-router-dom';

export const AdminDashboard: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900 }}>ADMIN DASHBOARD</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Time2Earn shop operations, pending request queues, and store management.
          </p>
        </div>
        <Badge variant="danger" size="md">STAFF MODE</Badge>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <Card variant="interactive">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>PENDING SESSIONS</span>
            <Badge variant="warning" size="sm">Action Req</Badge>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, margin: '0.5rem 0', color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
            3
          </div>
          <Link to="/admin/sessions">
            <Button variant="ghost" size="sm" style={{ padding: 0 }}>Review Sessions $\rightarrow$</Button>
          </Link>
        </Card>

        <Card variant="interactive">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>PENDING REDEMPTIONS</span>
            <Badge variant="warning" size="sm">Action Req</Badge>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, margin: '0.5rem 0', color: 'var(--accent-gold)', fontFamily: 'var(--font-mono)' }}>
            1
          </div>
          <Link to="/admin/redemptions">
            <Button variant="ghost" size="sm" style={{ padding: 0 }}>Review Redemptions $\rightarrow$</Button>
          </Link>
        </Card>

        <Card variant="interactive">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>DEBT PAYMENT QUEUE</span>
            <Badge variant="neutral" size="sm">1 Request</Badge>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, margin: '0.5rem 0', color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
            ₱15.20
          </div>
          <Link to="/admin/debts">
            <Button variant="ghost" size="sm" style={{ padding: 0 }}>Review Debts $\rightarrow$</Button>
          </Link>
        </Card>
      </div>
    </div>
  );
};
