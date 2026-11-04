import { useEffect, useState } from 'react';
import { Network } from '@capacitor/network';

/**
 * Connectivity for the importer shell.
 *
 * The native plugin is the source of truth inside the Android WebView; the
 * browser events keep the web build working without native listeners.
 */
export const useNetworkStatus = (): boolean => {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  );

  useEffect(() => {
    let active = true;
    let removeNativeListener: (() => void) | undefined;

    const update = (connected: boolean) => {
      if (active) setIsOnline(connected);
    };

    void Network.getStatus()
      .then((status) => update(status.connected))
      .catch(() => {
        // The browser events below still report connectivity.
      });

    void Network.addListener('networkStatusChange', (status) => update(status.connected))
      .then((handle) => {
        removeNativeListener = () => {
          void handle.remove();
        };
        if (!active) removeNativeListener();
      })
      .catch(() => {
        // Native plugin unavailable; browser events remain the fallback.
      });

    const handleOnline = () => update(true);
    const handleOffline = () => update(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      active = false;
      removeNativeListener?.();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};
