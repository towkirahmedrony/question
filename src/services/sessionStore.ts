import { Capacitor } from '@capacitor/core';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';

/**
 * Token storage adapter.
 *
 * Android: EncryptedSharedPreferences backed by the Android Keystore through
 * the native plugin. The web build keeps its existing per-tab sessionStorage
 * behaviour, so deploying the web app does not change its session lifetime.
 * Tokens are never written to Capacitor Preferences or localStorage.
 */

const NATIVE_KEY = 'importer_session';
const WEB_KEY = 'porokh_importer_session';

const isNative = (): boolean => Capacitor.isNativePlatform();

export const readRawSession = async (): Promise<string | null> => {
  if (isNative()) {
    try {
      return await SecureStorage.getItem(NATIVE_KEY);
    } catch {
      return null;
    }
  }

  try {
    return sessionStorage.getItem(WEB_KEY);
  } catch {
    return null;
  }
};

export const writeRawSession = async (raw: string): Promise<void> => {
  if (isNative()) {
    try {
      await SecureStorage.setItem(NATIVE_KEY, raw);
    } catch {
      // A locked or unavailable keystore leaves the in-memory session usable.
    }
    return;
  }

  try {
    sessionStorage.setItem(WEB_KEY, raw);
  } catch {
    // A blocked storage API must not break a valid in-memory session.
  }
};

export const removeRawSession = async (): Promise<void> => {
  if (isNative()) {
    try {
      await SecureStorage.remove(NATIVE_KEY);
    } catch {
      // Ignore storage failures while clearing.
    }
    return;
  }

  try {
    sessionStorage.removeItem(WEB_KEY);
  } catch {
    // Ignore storage failures while clearing.
  }
};
