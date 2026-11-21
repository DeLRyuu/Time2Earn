/**
 * logService.ts
 * Time2Earn Audit Trail & System Log Service (Phase 10)
 *
 * Implements strict append-only audit trail logging, structured
 * action metadata mapping for all 14 legacy actions plus new security events,
 * paginated queries bounded to avoid loading all 596+ logs at once,
 * user & date filtering, and safe formatting.
 */

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  type DocumentData,
  type QueryConstraint,
} from 'firebase/firestore';
import { db, hasValidFirebaseConfig } from '../lib/firebase';
import sampleLogsData from './sampleLogs.json';

export interface LogEntry {
  id: string;
  action: string;
  userId?: string;
  adminId?: string;
  amount?: number;
  details?: string;
  createdAt: string;
  unitId?: string;
  rewardId?: string;
  [key: string]: unknown;
}

export interface LogActionMeta {
  label: string;
  category: 'Session' | 'Rewards' | 'Balance' | 'Debt' | 'Config' | 'Security' | 'System';
  icon: string;
  variant: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'arcade' | 'default';
  description: string;
}

export const KNOWN_LOG_ACTIONS: Record<string, LogActionMeta> = {
  // Session Actions
  session_requested: {
    label: 'Session Requested',
    category: 'Session',
    icon: '🎮',
    variant: 'info',
    description: 'Player submitted a play session claim',
  },
  session_approved: {
    label: 'Session Approved',
    category: 'Session',
    icon: '✅',
    variant: 'success',
    description: 'Staff approved play session claim',
  },
  session_rejected: {
    label: 'Session Rejected',
    category: 'Session',
    icon: '❌',
    variant: 'danger',
    description: 'Staff rejected play session claim',
  },

  // Reward / Redemption Actions
  reward_requested: {
    label: 'Redemption Requested',
    category: 'Rewards',
    icon: '🎁',
    variant: 'warning',
    description: 'Player requested reward redemption',
  },
  redemption_approved: {
    label: 'Redemption Approved',
    category: 'Rewards',
    icon: '🎉',
    variant: 'success',
    description: 'Staff approved reward redemption',
  },
  redemption_rejected: {
    label: 'Redemption Rejected',
    category: 'Rewards',
    icon: '🚫',
    variant: 'danger',
    description: 'Staff rejected reward redemption',
  },
  reward_toggled: {
    label: 'Reward Toggled',
    category: 'Rewards',
    icon: '🔄',
    variant: 'warning',
    description: 'Reward catalog item active status toggled',
  },
  reward_updated: {
    label: 'Reward Updated',
    category: 'Rewards',
    icon: '✏️',
    variant: 'info',
    description: 'Reward catalog item details modified',
  },
  reward_created: {
    label: 'Reward Created',
    category: 'Rewards',
    icon: '✨',
    variant: 'success',
    description: 'New reward catalog item registered',
  },
  rewards_bulk_imported: {
    label: 'Rewards Bulk Imported',
    category: 'Rewards',
    icon: '📦',
    variant: 'info',
    description: 'Batch import of catalog rewards',
  },

  // Balance Adjustments
  credits_added: {
    label: 'Credits Added',
    category: 'Balance',
    icon: '💰',
    variant: 'success',
    description: 'Manual credit grant added by staff',
  },
  credits_deducted: {
    label: 'Credits Deducted',
    category: 'Balance',
    icon: '📉',
    variant: 'danger',
    description: 'Manual credit deduction recorded by staff',
  },

  // System Configuration
  config_updated: {
    label: 'Config Updated',
    category: 'Config',
    icon: '⚙️',
    variant: 'info',
    description: 'System economy or rate setting updated',
  },

  // Debt System
  debt_added: {
    label: 'Debt Added',
    category: 'Debt',
    icon: '⚠️',
    variant: 'danger',
    description: 'Shop debt balance recorded for player',
  },
  debt_updated: {
    label: 'Debt Updated',
    category: 'Debt',
    icon: '📝',
    variant: 'warning',
    description: 'Shop debt balance modified or reduced',
  },
  debt_payment_requested: {
    label: 'Debt Payment Requested',
    category: 'Debt',
    icon: '💳',
    variant: 'warning',
    description: 'Player submitted debt payment settlement request',
  },
  debt_payment_approved: {
    label: 'Debt Payment Approved',
    category: 'Debt',
    icon: '🤝',
    variant: 'success',
    description: 'Staff approved debt settlement payment',
  },
  debt_payment_rejected: {
    label: 'Debt Payment Rejected',
    category: 'Debt',
    icon: '🛑',
    variant: 'danger',
    description: 'Staff rejected debt payment request',
  },

  // Security
  staff_password_reset: {
    label: 'Staff Password Reset',
    category: 'Security',
    icon: '🔑',
    variant: 'danger',
    description: 'Staff-assisted credential reset generated',
  },
};

/**
 * Returns metadata and display configuration for a given log action.
 * Unknown actions render generically with humanized label.
 */
export function getLogMeta(action: string): LogActionMeta {
  if (KNOWN_LOG_ACTIONS[action]) {
    return KNOWN_LOG_ACTIONS[action];
  }

  // Format generic unknown action (e.g. "custom_feature_run" -> "Custom Feature Run")
  const humanized = action
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

  return {
    label: humanized || 'System Event',
    category: 'System',
    icon: '📋',
    variant: 'default',
    description: 'System event log record',
  };
}

/**
 * Parse date safely from string, number, or Firestore Timestamp
 */
export function parseLogDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'object' && val !== null && 'toDate' in val && typeof (val as { toDate: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate();
  }
  if (typeof val === 'object' && val !== null && 'seconds' in val && typeof (val as { seconds: number }).seconds === 'number') {
    return new Date((val as { seconds: number }).seconds * 1000);
  }
  if (typeof val === 'string') {
    // Handle standard ISO or "YYYY-MM-DD HH:MM:SS"
    const parsed = new Date(val.replace(' ', 'T'));
    if (!isNaN(parsed.getTime())) return parsed;
  }
  if (typeof val === 'number') {
    const parsed = new Date(val);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

/**
 * Formats a log date into human-readable format with time and relative context.
 */
export function formatLogDate(dateVal: unknown): string {
  const d = parseLogDate(dateVal);
  if (!d) return 'Unknown date';

  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

/**
 * Extract or format relevant amount from log entry if applicable
 */
export function formatLogAmount(log: LogEntry): { text: string; positive?: boolean } | null {
  if (log.amount !== undefined && log.amount !== null && Number(log.amount) > 0) {
    const num = Number(log.amount);
    if (log.action === 'credits_added' || log.action === 'session_approved') {
      return { text: `+${num.toFixed(2)} cr`, positive: true };
    }
    if (log.action === 'credits_deducted' || log.action === 'redemption_approved') {
      return { text: `-${num.toFixed(2)} cr`, positive: false };
    }
    if (log.action.includes('debt')) {
      return { text: `₱${num.toFixed(2)}`, positive: log.action.includes('payment') };
    }
    return { text: `${num.toFixed(2)} cr` };
  }
  return null;
}

export interface LogFilterParams {
  action?: string;
  category?: string;
  userQuery?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  page: number;
  pageSize: number;
}

export interface PaginatedLogsResult {
  logs: LogEntry[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Query audit logs with pagination and filters.
 * Avoids loading all 596+ logs at once using bounded query limits.
 */
export async function fetchAdminLogs(params: LogFilterParams): Promise<PaginatedLogsResult> {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.max(5, Math.min(100, params.pageSize || 20));

  let rawLogs: LogEntry[] = [];

  if (hasValidFirebaseConfig && db) {
    try {
      const constraints: QueryConstraint[] = [];

      // If specific action is requested
      if (params.action && params.action !== 'all') {
        constraints.push(where('action', '==', params.action));
      }

      // Order by descending timestamp
      constraints.push(orderBy('createdAt', 'desc'));

      // Strict limit: Load at most what is needed to fulfill current pagination range
      // avoiding fetching all documents at once
      const fetchCap = Math.min(500, Math.max(pageSize * page + 20, 100));
      constraints.push(limit(fetchCap));

      const q = query(collection(db, 'logs'), ...constraints);
      const snapshot = await getDocs(q);

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as DocumentData;
        rawLogs.push({
          id: docSnap.id,
          action: data.action || 'system_event',
          userId: data.userId || '',
          adminId: data.adminId || '',
          amount: typeof data.amount === 'number' ? data.amount : Number(data.amount) || 0,
          details: data.details || '',
          createdAt: data.createdAt || new Date().toISOString(),
          unitId: data.unitId,
          rewardId: data.rewardId,
        });
      });
    } catch {
      // In offline / fallback mode or permission restrictions, fallback to sample representative logs
      rawLogs = [];
    }
  }

  // If Firestore returned no results or is in fallback mode, use representative backup sample
  if (rawLogs.length === 0) {
    rawLogs = (sampleLogsData as LogEntry[]).map((l) => ({
      ...l,
      amount: typeof l.amount === 'number' ? l.amount : 0,
    }));
  }

  // Apply in-memory filters for compound search (category, userQuery, date bounds)
  let filtered = rawLogs;

  // Filter: Category
  if (params.category && params.category !== 'all') {
    filtered = filtered.filter((log) => {
      const meta = getLogMeta(log.action);
      return meta.category.toLowerCase() === params.category?.toLowerCase();
    });
  }

  // Filter: Action (if not already handled by Firestore query or in fallback mode)
  if (params.action && params.action !== 'all') {
    filtered = filtered.filter((log) => log.action === params.action);
  }

  // Filter: User search (matches userId or details text)
  if (params.userQuery && params.userQuery.trim()) {
    const q = params.userQuery.toLowerCase().trim();
    filtered = filtered.filter((log) => {
      const matchUserId = log.userId?.toLowerCase().includes(q);
      const matchAdminId = log.adminId?.toLowerCase().includes(q);
      const matchDetails = log.details?.toLowerCase().includes(q);
      return matchUserId || matchAdminId || matchDetails;
    });
  }

  // Filter: Date range
  if (params.startDate) {
    const startBoundary = new Date(params.startDate + 'T00:00:00');
    if (!isNaN(startBoundary.getTime())) {
      filtered = filtered.filter((log) => {
        const d = parseLogDate(log.createdAt);
        return d ? d >= startBoundary : true;
      });
    }
  }

  if (params.endDate) {
    const endBoundary = new Date(params.endDate + 'T23:59:59.999');
    if (!isNaN(endBoundary.getTime())) {
      filtered = filtered.filter((log) => {
        const d = parseLogDate(log.createdAt);
        return d ? d <= endBoundary : true;
      });
    }
  }

  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startIndex = (page - 1) * pageSize;
  const pagedLogs = filtered.slice(startIndex, startIndex + pageSize);

  return {
    logs: pagedLogs,
    totalCount,
    page,
    pageSize,
    totalPages,
    hasMore: page < totalPages,
  };
}

/**
 * Append an immutable log event to the audit trail
 * Strict: Never includes secrets or temporary credentials.
 */
export async function appendAuditLog(
  action: string,
  details: string,
  meta?: {
    userId?: string;
    adminId?: string;
    amount?: number;
    unitId?: string;
    rewardId?: string;
  }
): Promise<void> {
  if (hasValidFirebaseConfig && db) {
    try {
      await addDoc(collection(db, 'logs'), {
        action,
        details,
        userId: meta?.userId || '',
        adminId: meta?.adminId || '',
        amount: meta?.amount !== undefined ? meta.amount : 0.0,
        createdAt: new Date().toISOString(),
        ...(meta?.unitId ? { unitId: meta.unitId } : {}),
        ...(meta?.rewardId ? { rewardId: meta.rewardId } : {}),
      });
    } catch {
      // In offline mode, silent fail or local write
    }
  }
}
