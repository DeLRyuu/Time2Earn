import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { Link } from 'react-router-dom';
import { fetchAdminOverviewStats } from '../../services/adminService';
import type { AdminOverviewStats } from '../../services/adminService';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminOverviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadStats = async () => {
      try {
        const data = await fetchAdminOverviewStats();
        if (isMounted) setStats(data);
      } catch (err) {
        console.warn('Failed to load overview stats:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadStats();
    return () => {
      isMounted = false;
    };
  }, []);

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* 1. Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0 }}>ADMIN CONTROL CENTER</h1>
            <Badge variant="danger" size="md">STAFF DESK</Badge>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Store operations overview, pending queue processing, and player balance administration.
          </p>
        </div>

        {/* Quick Nav Hub */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link to="/admin/sessions">
            <Button variant="primary" size="sm">🎮 Sessions Queue</Button>
          </Link>
          <Link to="/admin/redemptions">
            <Button variant="secondary" size="sm">🎁 Redemptions Queue</Button>
          </Link>
        </div>
      </div>

      {/* 2. Urgent Alerts Banner (if any) */}
      {stats && stats.alerts.length > 0 && (
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
          }}
        >
          <span style={{ fontSize: '1.25rem' }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, color: 'var(--danger)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
              OPERATIONAL ALERTS
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              {stats.alerts.map((alert, idx) => (
                <li key={idx} style={{ marginBottom: '0.2rem' }}>{alert}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 3. Metric Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        {/* Pending Sessions */}
        <Card variant={stats && stats.pendingSessionsCount > 0 ? 'neon' : 'default'}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>PENDING SESSIONS</span>
            {stats && stats.pendingSessionsCount > 0 ? (
              <Badge variant="warning" size="sm">Action Req</Badge>
            ) : (
              <Badge variant="success" size="sm">Clear</Badge>
            )}
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 900, margin: '0.5rem 0', color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
            {loading ? <Skeleton width="40px" height="36px" /> : stats?.pendingSessionsCount ?? 0}
          </div>
          <Link to="/admin/sessions" style={{ textDecoration: 'none' }}>
            <Button variant="ghost" size="sm" style={{ padding: 0 }}>Review Sessions $\rightarrow$</Button>
          </Link>
        </Card>

        {/* Pending Redemptions */}
        <Card variant={stats && stats.pendingRedemptionsCount > 0 ? 'neon' : 'default'}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>PENDING REDEMPTIONS</span>
            {stats && stats.pendingRedemptionsCount > 0 ? (
              <Badge variant="warning" size="sm">Action Req</Badge>
            ) : (
              <Badge variant="success" size="sm">Clear</Badge>
            )}
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 900, margin: '0.5rem 0', color: 'var(--accent-gold)', fontFamily: 'var(--font-mono)' }}>
            {loading ? <Skeleton width="40px" height="36px" /> : stats?.pendingRedemptionsCount ?? 0}
          </div>
          <Link to="/admin/redemptions" style={{ textDecoration: 'none' }}>
            <Button variant="ghost" size="sm" style={{ padding: 0 }}>Review Claims $\rightarrow$</Button>
          </Link>
        </Card>

        {/* Active Registered Players */}
        <Card variant="default">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>REGISTERED PLAYERS</span>
            <Badge variant="primary" size="sm">Total</Badge>
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 900, margin: '0.5rem 0', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {loading ? <Skeleton width="40px" height="36px" /> : stats?.activePlayersCount ?? 0}
          </div>
          <Link to="/admin/users" style={{ textDecoration: 'none' }}>
            <Button variant="ghost" size="sm" style={{ padding: 0 }}>Manage Players $\rightarrow$</Button>
          </Link>
        </Card>

        {/* Outstanding Debts (Count Only) */}
        <Card variant="default">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>OUTSTANDING DEBTS</span>
            <Badge variant="danger" size="sm">Shop Ledger</Badge>
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 900, margin: '0.5rem 0', color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>
            {loading ? <Skeleton width="40px" height="36px" /> : stats?.outstandingDebtsCount ?? 0}
          </div>
          <Link to="/admin/debts" style={{ textDecoration: 'none' }}>
            <Button variant="ghost" size="sm" style={{ padding: 0 }}>View Debts (Phase 9) $\rightarrow$</Button>
          </Link>
        </Card>
      </div>

      {/* 4. Recent Store Activity Feed */}
      <Card
        variant="default"
        header={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <span>RECENT SHOP ACTIVITY</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Latest session and reward actions</span>
          </div>
        }
      >
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Skeleton height="45px" />
            <Skeleton height="45px" />
            <Skeleton height="45px" />
          </div>
        ) : !stats || stats.recentActivities.length === 0 ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No recent shop activity recorded yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {stats.recentActivities.map((act) => (
              <div
                key={act.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  backgroundColor: 'rgba(30, 41, 59, 0.4)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>
                    {act.type === 'session' ? '🖥️' : '🎁'}
                  </span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      {act.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {act.subtitle}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {formatDate(act.timestamp)}
                  </span>
                  <Badge variant={act.badgeVariant} size="sm">
                    {act.badgeText}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
