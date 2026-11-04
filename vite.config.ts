import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { requireSupabaseBuildConfig } from './src/config/supabaseBuildConfig.ts';

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  if (command === 'build') {
    // Match Vite's .env loading rules and let explicitly injected CI values win.
    const environment = {
      ...loadEnv(mode, process.cwd(), ''),
      ...process.env,
    };
    requireSupabaseBuildConfig(environment);
  }

  return {
    plugins: [react(), tailwindcss()],
  };
});
