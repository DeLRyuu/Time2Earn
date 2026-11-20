import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db, hasValidFirebaseConfig } from '../lib/firebase';
import { type AppConfig, DEFAULT_CONFIG } from '../types/config';

interface ConfigContextValue {
  config: AppConfig;
  loading: boolean;
  error: Error | null;
  refreshConfig: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextValue>({
  config: DEFAULT_CONFIG,
  loading: false,
  error: null,
  refreshConfig: async () => {},
});

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchConfig = useCallback(async () => {
    if (!hasValidFirebaseConfig) {
      // Offline/Dev fallback without live Firebase env
      setConfig(DEFAULT_CONFIG);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const configRef = doc(db, 'config', 'settings');
      const snap = await getDoc(configRef);
      if (snap.exists()) {
        const data = snap.data();
        setConfig({
          sessionRatePerHour: Number(data.sessionRatePerHour ?? DEFAULT_CONFIG.sessionRatePerHour),
          phpToCreditRate: Number(data.phpToCreditRate ?? DEFAULT_CONFIG.phpToCreditRate),
          creditToPhpRate: Number(data.creditToPhpRate ?? DEFAULT_CONFIG.creditToPhpRate),
          expPerMinute: Number(data.expPerMinute ?? DEFAULT_CONFIG.expPerMinute),
          leaderboardResetDays: Number(data.leaderboardResetDays ?? DEFAULT_CONFIG.leaderboardResetDays),
          debtTiers: data.debtTiers ?? DEFAULT_CONFIG.debtTiers,
          rankThresholds: data.rankThresholds ?? DEFAULT_CONFIG.rankThresholds,
          updatedAt: data.updatedAt,
        });
      } else {
        console.warn('config/settings document not found in Firestore. Using default schema config.');
        setConfig(DEFAULT_CONFIG);
      }
    } catch (err) {
      console.error('Error fetching Firestore config/settings:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setConfig(DEFAULT_CONFIG);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return (
    <ConfigContext.Provider value={{ config, loading, error, refreshConfig: fetchConfig }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => useContext(ConfigContext);
