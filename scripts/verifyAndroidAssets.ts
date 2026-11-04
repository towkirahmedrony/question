import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { loadEnv } from 'vite';
import { requireSupabaseBuildConfig } from '../src/config/supabaseBuildConfig.ts';

const projectRoot = process.cwd();
const viteEnvironment = {
  ...loadEnv('production', projectRoot, ''),
  ...process.env,
};
const { url, anonKey } = requireSupabaseBuildConfig(viteEnvironment);

const collectWebBundles = (root: string): Map<string, Buffer> => {
  if (!existsSync(root)) throw new Error(`Expected generated web assets at ${root}.`);
  const bundles = new Map<string, Buffer>();
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(path);
      } else if (/\.(?:js|mjs)$/.test(entry.name)) {
        bundles.set(relative(root, path).replace(/\\/g, '/'), readFileSync(path));
      }
    }
  };
  visit(root);
  if (bundles.size === 0) throw new Error(`No JavaScript bundles found under ${root}.`);
  return bundles;
};

const sha256 = (value: Buffer): string => createHash('sha256').update(value).digest('hex');
const verifyConfig = (bundles: Map<string, Buffer>, label: string): void => {
  const content = Buffer.concat([...bundles.values()]);
  if (!content.includes(Buffer.from(url)) || !content.includes(Buffer.from(anonKey))) {
    throw new Error(`${label} do not contain the configured Supabase URL and public key.`);
  }
};

const distBundles = collectWebBundles(resolve(projectRoot, 'dist'));
verifyConfig(distBundles, 'Production dist assets');
console.log('Verified configured Supabase values in production dist assets.');

const androidAssetsRoot = resolve(projectRoot, 'android/app/src/main/assets/public');
const androidBundles = collectWebBundles(androidAssetsRoot);
for (const [name, distBytes] of distBundles) {
  const syncedBytes = androidBundles.get(name);
  if (!syncedBytes || sha256(syncedBytes) !== sha256(distBytes)) {
    throw new Error(`Capacitor Android assets are stale or incomplete at ${name}. Run cap sync after building dist.`);
  }
}
verifyConfig(androidBundles, 'Capacitor Android assets');
console.log('Verified dist bundles were copied unchanged into Capacitor Android assets.');

const apkFlag = process.argv.indexOf('--apk');
if (apkFlag !== -1) {
  const apkPath = process.argv[apkFlag + 1];
  if (!apkPath || !existsSync(apkPath)) throw new Error('The APK path supplied to --apk does not exist.');
  const entries = execFileSync('unzip', ['-Z1', apkPath], { encoding: 'utf8' })
    .split(/\r?\n/)
    .filter((entry) => entry.startsWith('assets/public/') && /\.(?:js|mjs)$/.test(entry));
  const apkBundles = new Map<string, Buffer>();
  for (const [name, expectedBytes] of distBundles) {
    const apkEntry = `assets/public/${name}`;
    if (!entries.includes(apkEntry)) throw new Error(`The APK is missing ${apkEntry}.`);
    const actualBytes = execFileSync('unzip', ['-p', apkPath, apkEntry]);
    if (sha256(actualBytes) !== sha256(expectedBytes)) {
      throw new Error(`The APK contains stale or altered web assets at ${apkEntry}.`);
    }
    apkBundles.set(name, actualBytes);
  }
  verifyConfig(apkBundles, 'Packaged APK assets');
  console.log('Verified the APK contains the configured Supabase values and current dist bundles.');
}
