import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor shell for the Question Importer.
 *
 * The web build in `dist/` is the single source of truth; Android only adds the
 * native camera, gallery, network and secure-storage bridges. CapacitorHttp is
 * enabled so WebView requests go through the native HTTP stack: the deployed
 * backend's CORS allowlist cannot include every WebView origin, and the API
 * contract itself is unchanged.
 */
const config: CapacitorConfig = {
  appId: 'bd.porokh.questionimporter',
  appName: 'Porokh Importer',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
