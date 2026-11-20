import { createContext } from 'react';
import { type AppConfig, DEFAULT_CONFIG } from '../types/config';

export interface ConfigContextValue {
  config: AppConfig;
  loading: boolean;
  error: Error | null;
  refreshConfig: () => Promise<void>;
}

export const ConfigContext = createContext<ConfigContextValue>({
  config: DEFAULT_CONFIG,
  loading: false,
  error: null,
  refreshConfig: async () => {},
});
