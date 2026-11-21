import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ConfigProvider } from './context/ConfigContext.tsx';
import { ToastProvider } from './context/ToastContext.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { ErrorBoundary } from './components/common/ErrorBoundary.tsx';
import { registerServiceWorker } from './lib/pwa.ts';
import './index.css';

registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ConfigProvider>
        <ToastProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ToastProvider>
      </ConfigProvider>
    </ErrorBoundary>
  </StrictMode>,
);
