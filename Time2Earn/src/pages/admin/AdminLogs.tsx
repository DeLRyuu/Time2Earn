import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge, type BadgeProps } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../hooks/useToast';
import {
  fetchAdminLogs,
  getLogMeta,
  formatLogDate,
  formatLogAmount,
  KNOWN_LOG_ACTIONS,
  type LogEntry,
} from '../../services/logService';

const CATEGORIES = ['All', 'Session', 'Rewards', 'Balance', 'Debt', 'Security', 'Config'] as const;

export const AdminLogs: React.FC = () => {
  const { showToast } = useToast();

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Selected Log for inspection modal
  const [inspectedLog, setInspectedLog] = useState<LogEntry | null>(null);

  const refreshLogs = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAdminLogs({
        page,
        pageSize,
        action: actionFilter,
        category: categoryFilter === 'All' ? undefined : categoryFilter,
        userQuery: searchQuery,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      setLogs(result.logs);
      setTotalCount(result.totalCount);
      setTotalPages(result.totalPages);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve logs';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, actionFilter, categoryFilter, searchQuery, startDate, endDate, showToast]);

  useEffect(() => {
    let isMounted = true;
    const executeFetch = async () => {
      try {
        const result = await fetchAdminLogs({
          page,
          pageSize,
          action: actionFilter,
          category: categoryFilter === 'All' ? undefined : categoryFilter,
          userQuery: searchQuery,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        });

        if (isMounted) {
          setLogs(result.logs);
          setTotalCount(result.totalCount);
          setTotalPages(result.totalPages);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Failed to retrieve logs';
          showToast(msg, 'error');
          setLoading(false);
        }
      }
    };

    executeFetch();

    return () => {
      isMounted = false;
    };
  }, [page, pageSize, actionFilter, categoryFilter, searchQuery, startDate, endDate, showToast]);

  const handleResetFilters = () => {
    setActionFilter('all');
    setCategoryFilter('All');
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    setPage(1);
    showToast('Filters cleared', 'info');
  };

  const handleExportCsv = () => {
    if (logs.length === 0) {
      showToast('No logs available to export', 'warning');
      return;
    }

    const headers = ['ID', 'Action', 'Created At', 'User ID', 'Admin ID', 'Amount', 'Details'];
    const rows = logs.map((l) => [
      `"${l.id}"`,
      `"${l.action}"`,
      `"${l.createdAt}"`,
      `"${l.userId || ''}"`,
      `"${l.adminId || ''}"`,
      `"${l.amount !== undefined ? l.amount : 0}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `time2earn_audit_logs_page_${page}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${logs.length} log records to CSV`, 'success');
  };

  const mapVariantToBadge = (variant: string): BadgeProps['variant'] => {
    switch (variant) {
      case 'success':
        return 'success';
      case 'danger':
        return 'danger';
      case 'warning':
        return 'warning';
      case 'gold':
        return 'gold';
      case 'info':
        return 'secondary';
      case 'primary':
        return 'primary';
      default:
        return 'neutral';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '1200px' }}>
      {/* 1. Header & Quick Controls */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0, letterSpacing: '0.02em' }}>
              SYSTEM & AUDIT LOGS
            </h1>
            <Badge variant="neutral" size="sm">
              Immutable Trail
            </Badge>
          </div>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Append-only audit trail recording player actions, security events, balance adjustments, and staff approvals.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Button variant="ghost" size="sm" onClick={handleExportCsv} disabled={loading || logs.length === 0}>
            📥 Export CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={() => refreshLogs()} disabled={loading}>
            🔄 Refresh
          </Button>
        </div>
      </div>

      {/* 2. Security & Immutability Notice Banner */}
      <div
        style={{
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.825rem',
          color: 'var(--text-main)',
        }}
      >
        <span style={{ fontSize: '1.25rem' }}>🔒</span>
        <div>
          <strong>Append-Only Security Guarantee:</strong> All system and operational logs are permanent records. Direct updates, manual edits, and document deletions are strictly denied by Firestore security rules.
        </div>
      </div>

      {/* 3. Filter & Search Controls */}
      <Card variant="default">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Category Tabs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {CATEGORIES.map((cat) => {
              const isSelected = categoryFilter === cat;
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setCategoryFilter(cat);
                    setPage(1);
                  }}
                  style={{
                    padding: '0.4rem 0.85rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    borderRadius: 'var(--radius-full)',
                    border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                    background: isSelected ? 'var(--primary-dim)' : 'var(--surface-sunken)',
                    color: isSelected ? 'var(--primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Detailed Inputs */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '0.75rem',
              alignItems: 'flex-end',
            }}
          >
            {/* Search Input */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                SEARCH USER / DETAILS
              </label>
              <input
                type="text"
                placeholder="Username, user ID, details..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface-sunken)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                }}
              />
            </div>

            {/* Action Dropdown */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                ACTION TYPE
              </label>
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(1);
                }}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface-sunken)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                }}
              >
                <option value="all">All Action Types ({Object.keys(KNOWN_LOG_ACTIONS).length}+)</option>
                <optgroup label="Session Workflow">
                  <option value="session_requested">Session Requested</option>
                  <option value="session_approved">Session Approved</option>
                  <option value="session_rejected">Session Rejected</option>
                </optgroup>
                <optgroup label="Rewards & Redemptions">
                  <option value="reward_requested">Redemption Requested</option>
                  <option value="redemption_approved">Redemption Approved</option>
                  <option value="redemption_rejected">Redemption Rejected</option>
                  <option value="reward_toggled">Reward Toggled</option>
                  <option value="reward_updated">Reward Updated</option>
                  <option value="reward_created">Reward Created</option>
                  <option value="rewards_bulk_imported">Rewards Bulk Imported</option>
                </optgroup>
                <optgroup label="Tokens & Balances">
                  <option value="credits_added">Tokens Added</option>
                  <option value="credits_deducted">Tokens Deducted</option>
                </optgroup>
                <optgroup label="Debt Management">
                  <option value="debt_added">Debt Added</option>
                  <option value="debt_updated">Debt Updated</option>
                  <option value="debt_payment_requested">Debt Payment Requested</option>
                  <option value="debt_payment_approved">Debt Payment Approved</option>
                  <option value="debt_payment_rejected">Debt Payment Rejected</option>
                </optgroup>
                <optgroup label="System & Security">
                  <option value="staff_password_reset">Staff Password Reset</option>
                  <option value="config_updated">Config Updated</option>
                </optgroup>
              </select>
            </div>

            {/* Date Range Start */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                FROM DATE
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                style={{
                  width: '100%',
                  padding: '0.45rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface-sunken)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                }}
              />
            </div>

            {/* Date Range End */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                TO DATE
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                style={{
                  width: '100%',
                  padding: '0.45rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface-sunken)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                }}
              />
            </div>

            {/* Page Size & Reset */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  PER PAGE
                </label>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface-sunken)',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div style={{ alignSelf: 'flex-end' }}>
                <Button variant="ghost" size="sm" onClick={handleResetFilters} title="Reset all filters">
                  Clear
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 4. Filter Results Summary */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        <div>
          Showing <strong>{logs.length}</strong> of <strong>{totalCount}</strong> recorded events
          {categoryFilter !== 'All' && <span> in <strong>{categoryFilter}</strong></span>}
          {actionFilter !== 'all' && <span> with action <strong>{actionFilter}</strong></span>}
        </div>
        <div>
          Page {page} of {totalPages}
        </div>
      </div>

      {/* 5. Logs Feed / List */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[...Array(5)].map((_, i) => (
            <Card key={i} variant="default">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Skeleton width="160px" height="24px" />
                  <Skeleton width="120px" height="18px" />
                </div>
                <Skeleton width="90%" height="18px" />
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <Skeleton width="100px" height="16px" />
                  <Skeleton width="100px" height="16px" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : logs.length === 0 ? (
        <Card variant="default">
          <EmptyState
            icon={<span>📜</span>}
            title="NO AUDIT LOGS FOUND"
            description="No system records match your current filter criteria."
            actionText="Clear All Filters"
            onAction={handleResetFilters}
          />
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {logs.map((log) => {
            const meta = getLogMeta(log.action);
            const amountInfo = formatLogAmount(log);

            return (
              <Card
                key={log.id}
                variant="default"
                style={{
                  transition: 'border-color 0.15s ease',
                  borderLeft: `4px solid ${
                    meta.variant === 'success'
                      ? 'var(--success)'
                      : meta.variant === 'danger'
                      ? 'var(--danger)'
                      : meta.variant === 'warning'
                      ? 'var(--accent-gold)'
                      : 'var(--primary)'
                  }`,
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {/* Top Bar: Action Badge + Category + Timestamp + Amount */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '1.15rem' }}>{meta.icon}</span>
                      <Badge variant={mapVariantToBadge(meta.variant)} size="sm">
                        {meta.label}
                      </Badge>
                      <Badge variant="neutral" size="sm">
                        {meta.category}
                      </Badge>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {amountInfo && (
                        <span
                          style={{
                            fontWeight: 800,
                            fontSize: '0.9rem',
                            color:
                              amountInfo.positive === true
                                ? 'var(--success)'
                                : amountInfo.positive === false
                                ? 'var(--danger)'
                                : 'var(--text-main)',
                          }}
                        >
                          {amountInfo.text}
                        </span>
                      )}
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {formatLogDate(log.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Log Details Text */}
                  <div
                    style={{
                      fontSize: '0.925rem',
                      color: 'var(--text-main)',
                      fontWeight: 500,
                      lineHeight: 1.4,
                      padding: '0.35rem 0',
                    }}
                  >
                    {log.details || meta.description}
                  </div>

                  {/* Metadata & Identification Footer */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                      paddingTop: '0.35rem',
                      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      {log.userId && (
                        <span>
                          👤 User: <code style={{ color: 'var(--text-main)' }}>{log.userId.slice(0, 10)}…</code>
                        </span>
                      )}
                      {log.adminId && (
                        <span>
                          🛡️ Admin: <code style={{ color: 'var(--text-main)' }}>{log.adminId.slice(0, 10)}…</code>
                        </span>
                      )}
                      {log.unitId && (
                        <span>
                          🖥️ Unit: <strong style={{ color: 'var(--primary)' }}>{log.unitId}</strong>
                        </span>
                      )}
                      <span>ID: <code style={{ opacity: 0.6 }}>{log.id.slice(0, 8)}</code></span>
                    </div>

                    <button
                      onClick={() => setInspectedLog(log)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--primary)',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textDecoration: 'underline',
                        padding: 0,
                      }}
                    >
                      View Raw Payload
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* 6. Pagination Controls */}
      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            padding: '1rem 0',
          }}
        >
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Showing page {page} of {totalPages} ({totalCount} total events)
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ← Previous
            </Button>

            <span
              style={{
                padding: '0.25rem 0.75rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                color: 'var(--text-main)',
              }}
            >
              {page} / {totalPages}
            </span>

            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next →
            </Button>
          </div>
        </div>
      )}

      {/* 7. Modal for inspecting raw payload & metadata */}
      <Modal
        isOpen={!!inspectedLog}
        onClose={() => setInspectedLog(null)}
        title="Audit Log Record Details"
      >
        {inspectedLog && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.25rem' }}>{getLogMeta(inspectedLog.action).icon}</span>
              <span style={{ fontWeight: 800, fontSize: '1rem' }}>
                {getLogMeta(inspectedLog.action).label}
              </span>
              <Badge variant={mapVariantToBadge(getLogMeta(inspectedLog.action).variant)} size="sm">
                {inspectedLog.action}
              </Badge>
            </div>

            <div
              style={{
                background: 'var(--surface-sunken)',
                padding: '0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                fontSize: '0.825rem',
                lineHeight: 1.5,
              }}
            >
              <div><strong>Recorded At:</strong> {formatLogDate(inspectedLog.createdAt)}</div>
              <div><strong>Document ID:</strong> {inspectedLog.id}</div>
              <div><strong>Target User ID:</strong> {inspectedLog.userId || 'N/A (System)'}</div>
              <div><strong>Staff Admin ID:</strong> {inspectedLog.adminId || 'N/A (User Initiated)'}</div>
              <div><strong>Amount / Balance Delta:</strong> {inspectedLog.amount ?? 0}</div>
              <div><strong>Details Summary:</strong> {inspectedLog.details || 'N/A'}</div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                RAW JSON PAYLOAD
              </div>
              <pre
                style={{
                  background: '#090d16',
                  color: '#38bdf8',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  overflowX: 'auto',
                  border: '1px solid var(--border)',
                }}
              >
                {JSON.stringify(inspectedLog, null, 2)}
              </pre>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <Button variant="ghost" size="sm" onClick={() => setInspectedLog(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
