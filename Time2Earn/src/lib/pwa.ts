import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notifyListeners();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notifyListeners();
  });
}

/**
 * Registers the static app-shell service worker.
 */
export function registerServiceWorker(): void {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New static shell version available
                  console.info('Time2Earn app shell updated. Refresh to apply.');
                }
              };
            }
          };
        })
        .catch((error) => {
          console.warn('Service worker registration failed:', error);
        });
    });
  }
}

/**
 * Hook to support Add to Home Screen (A2HS) installation prompt.
 */
export function usePwaInstall() {
  const [isInstallable, setIsInstallable] = useState<boolean>(Boolean(deferredPrompt));
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-expect-error navigator.standalone is iOS Safari specific
      Boolean(window.navigator.standalone)
    );
  });

  useEffect(() => {
    const handleUpdate = () => {
      setIsInstallable(Boolean(deferredPrompt));
    };

    listeners.add(handleUpdate);
    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed'> => {
    if (!deferredPrompt) return 'dismissed';

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      deferredPrompt = null;
      setIsInstallable(false);
      return choice.outcome;
    } catch {
      return 'dismissed';
    }
  }, []);

  return {
    isInstallable,
    isInstalled,
    promptInstall,
  };
}
