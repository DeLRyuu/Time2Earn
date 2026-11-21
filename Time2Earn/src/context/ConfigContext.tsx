import React, { useEffect, useState, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db, hasValidFirebaseConfig } from '../lib/firebase';
import { type AppConfig, DEFAULT_CONFIG } from '../types/config';
import { ConfigContext } from './configContextDef';
import { getLocalConfig, saveLocalConfig } from '../services/configService';

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<AppConfig>(getLocalConfig);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchConfig = useCallback(async () => {
    if (!hasValidFirebaseConfig) {
      setConfig(getLocalConfig());
      setLoading(false);
      return;
    }

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
        setConfig(loaded);
        saveLocalConfig(loaded);
      } else {
        setConfig(getLocalConfig());
      }
    } catch (err) {
      console.error('Error fetching Firestore config/settings:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setConfig(getLocalConfig());
    } finally {
      setLoading(false);
    }
  }, []);

  const updateConfig = useCallback((newConfig: AppConfig) => {
    setConfig(newConfig);
    saveLocalConfig(newConfig);
  }, []);

  useEffect(() => {
    let active = true;
    const run = async () => {
      await fetchConfig();
      if (!active) return;
    };
    run();
    return () => {
      active = false;
    };
  }, [fetchConfig]);

  return (
    <ConfigContext.Provider value={{ config, loading, error, refreshConfig: fetchConfig, updateConfig }}>
      {children}
    </ConfigContext.Provider>
  );
};
