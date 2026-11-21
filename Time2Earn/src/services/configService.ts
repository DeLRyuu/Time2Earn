/**
 * configService.ts
 * Time2Earn System Configuration Service (Phase 11)
 *
 * Implements admin-only protected configuration persistence,
 * strict validation checks, diff computation, and audit logging (config_updated)
 * matching existing database shape.
 */

import { doc, setDoc, collection, addDoc, getDoc } from 'firebase/firestore';
import { db, hasValidFirebaseConfig } from '../lib/firebase';
import { type AppConfig, DEFAULT_CONFIG } from '../types/config';
import { type AuthUser } from '../types/auth';
import {
  validateConfigSettings,
  computeConfigDiff,
  formatConfigDiffSummary,
  type ConfigDiffItem,
} from '../lib/settingsValidation';

export const LOCAL_CONFIG_KEY = 't2e_local_config';

/**
 * Retrieves cached configuration from local storage if present, or defaults.
 */
export function getLocalConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(LOCAL_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_CONFIG,
        ...parsed,
        debtTiers: { ...DEFAULT_CONFIG.debtTiers, ...(parsed.debtTiers || {}) },
        rankThresholds: { ...DEFAULT_CONFIG.rankThresholds, ...(parsed.rankThresholds || {}) },
      };
    }
  } catch {
    // fallback
  }
  return DEFAULT_CONFIG;
}

/**
 * Saves configuration to local storage cache.
 */
export function saveLocalConfig(cfg: AppConfig): void {
  try {
    localStorage.setItem(LOCAL_CONFIG_KEY, JSON.stringify(cfg));
  } catch {
    // ignore
  }
}

export interface UpdateConfigResult {
  config: AppConfig;
  diffs: ConfigDiffItem[];
  diffSummary: string;
}

/**
 * Protected Admin Function: Updates system settings in Firestore and records audit log.
 *
 * Security:
 * - Strictly rejects non-admin users.
 * - Enforces positive values, ascending debt tiers, and ascending rank thresholds.
 * - Appends immutable log entry (action: config_updated) without secrets.
 */
export async function updateAdminConfig(
  adminUser: AuthUser | null,
  newConfig: AppConfig,
  oldConfig: AppConfig
): Promise<UpdateConfigResult> {
  // 1. Role Authorization Check
  if (!adminUser || adminUser.role !== 'admin') {
    throw new Error('Unauthorized: Administrator privileges are strictly required to modify system settings.');
  }

  // 2. Input Validation
  const validation = validateConfigSettings(newConfig);
  if (!validation.isValid) {
    throw new Error(`Invalid Configuration: ${validation.errors.join('; ')}`);
  }

  // 3. Diff Calculation
  const diffs = computeConfigDiff(oldConfig, newConfig);
  if (diffs.length === 0) {
    return { config: oldConfig, diffs: [], diffSummary: 'No changes detected.' };
  }

  const diffSummary = formatConfigDiffSummary(diffs);
  const updatedAt = new Date().toISOString();

  const finalConfig: AppConfig = {
    sessionRatePerHour: Number(newConfig.sessionRatePerHour),
    phpToCreditRate: Number(newConfig.phpToCreditRate),
    creditToPhpRate: Number(newConfig.creditToPhpRate),
    expPerMinute: Number(newConfig.expPerMinute),
    leaderboardResetDays: Number(newConfig.leaderboardResetDays),
    debtTiers: {
      low: Number(newConfig.debtTiers.low),
      mid: Number(newConfig.debtTiers.mid),
      high: Number(newConfig.debtTiers.high),
    },
    rankThresholds: { ...newConfig.rankThresholds },
    updatedAt,
  };

  // 4. Persistence to Firestore
  if (hasValidFirebaseConfig && db) {
    try {
      const configDocRef = doc(db, 'config', 'settings');
      await setDoc(configDocRef, finalConfig, { merge: true });

      // 5. Append System Audit Log
      await addDoc(collection(db, 'logs'), {
        action: 'config_updated',
        adminId: adminUser.uid,
        userId: '',
        amount: 0.0,
        details: `System config updated — ${diffSummary}`,
        createdAt: updatedAt,
      });
    } catch (err) {
      console.warn('Firestore write error, falling back to local storage cache:', err);
    }
  }

  // 6. Update local cache for offline resilience and immediate UI reactivity
  saveLocalConfig(finalConfig);

  return {
    config: finalConfig,
    diffs,
    diffSummary,
  };
}

/**
 * Reads current system configuration from Firestore, falling back to local cache or defaults.
 */
export async function fetchCurrentConfig(): Promise<AppConfig> {
  if (hasValidFirebaseConfig && db) {
    try {
      const configRef = doc(db, 'config', 'settings');
      const snap = await getDoc(configRef);
      if (snap.exists()) {
        const data = snap.data();
        const loaded: AppConfig = {
          sessionRatePerHour: Number(data.sessionRatePerHour ?? DEFAULT_CONFIG.sessionRatePerHour),
          phpToCreditRate: Number(data.phpToCreditRate ?? DEFAULT_CONFIG.phpToCreditRate),
          creditToPhpRate: Number(data.creditToPhpRate ?? DEFAULT_CONFIG.creditToPhpRate),
          expPerMinute: Number(data.expPerMinute ?? DEFAULT_CONFIG.expPerMinute),
          leaderboardResetDays: Number(data.leaderboardResetDays ?? DEFAULT_CONFIG.leaderboardResetDays),
          debtTiers: data.debtTiers ?? DEFAULT_CONFIG.debtTiers,
          rankThresholds: data.rankThresholds ?? DEFAULT_CONFIG.rankThresholds,
          updatedAt: data.updatedAt,
        };
        saveLocalConfig(loaded);
        return loaded;
      }
    } catch {
      // fallback
    }
  }
  return getLocalConfig();
}
