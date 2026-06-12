// Writes the current build's version to public/version.json and exposes it to
// next.config so the running app can detect a newer deploy and reload itself.
// Imported (for its side effect) by next.config.mjs at build start.
import { writeFileSync, mkdirSync } from 'fs';

export const APP_VERSION = process.env.VERCEL_GIT_COMMIT_SHA || 'dev';

try {
  mkdirSync('public', { recursive: true });
  writeFileSync('public/version.json', JSON.stringify({ v: APP_VERSION }));
} catch {
  /* non-fatal: version watcher simply won't trigger */
}
