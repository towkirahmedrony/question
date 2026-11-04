import { Capacitor } from '@capacitor/core';

/** True inside the Capacitor Android shell, false in the deployed web build. */
export const isNativeApp = (): boolean => Capacitor.isNativePlatform();
